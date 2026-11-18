#!/usr/bin/env bash
#
# deploy.sh — Despliegue de CONTIKIDS con Docker Compose (VPS o laptop).
#
# Flujo: git pull --ff-only → build api → build web (uno a la vez, por la RAM)
#        → docker compose up -d → espera el health → seed si la BD está vacía → limpieza.
#
# Seguridad:
#   - flock: nunca corren 2 deploys a la vez (el segundo espera su turno).
#   - Antes de construir, las imágenes actuales se guardan como :previous.
#   - Si el health falla, se avisa en el log y NO se borra nada (rollback manual abajo).
#   - La limpieza solo toca imágenes con la etiqueta de Contikids y la caché de build
#     por encima de un tope (no vacía la caché de otras apps).
#
# Uso:  ./deploy.sh            (lo llama también el webhook de GitHub)
#
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${CONTIKIDS_LOG_DIR:-/root/logs}"
LOG="$LOG_DIR/contikids-deploy.log"
LOCK="/tmp/contikids-deploy.lock"
BRANCH="main"
APP_LABEL="org.contikids.app=contikids"
BUILD_CACHE_MAX="1GB" # el disco del VPS está al ~82 %: caché de build acotada
HEALTH_TIMEOUT=180

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG") 2>&1

ts()   { date '+%Y-%m-%d %H:%M:%S'; }
log()  { echo "[$(ts)] $*"; }
fail() { log "✖ ERROR: $*"; log "Deploy ABORTADO. Las imágenes anteriores se conservan."; exit 1; }
trap 'fail "falló el comando en la línea $LINENO"' ERR

cd "$REPO_DIR"

# ---------- Un solo deploy a la vez ----------
exec 9>"$LOCK"
if ! flock -n 9; then
  log "⏳ Hay otro deploy en curso; esperando su turno…"
  flock -w 1800 9 || fail "el otro deploy no terminó en 30 min"
fi

log "=== Deploy CONTIKIDS (${DEPLOY_TRIGGER:-manual}) ==="

[[ -f .env ]] || fail "no existe $REPO_DIR/.env"
set -a
# shellcheck disable=SC1091
. ./.env
set +a
HEALTH_URL="${HEALTH_URL:-${PUBLIC_URL%/}/api/v1/health}"

# ---------- 1. Código ----------
BEFORE="$(git rev-parse --short HEAD)"
log "1/6 git pull --ff-only origin $BRANCH (antes: $BEFORE)"
git pull --ff-only origin "$BRANCH" || fail "git pull --ff-only falló (¿cambios locales o historia divergente?)"
AFTER="$(git rev-parse --short HEAD)"
log "    commit: $BEFORE → $AFTER  ($(git log -1 --format=%s))"

# ---------- 2. Guardar las imágenes actuales como :previous ----------
for svc in api web; do
  if docker image inspect "contikids-$svc:latest" >/dev/null 2>&1; then
    docker tag "contikids-$svc:latest" "contikids-$svc:previous"
  fi
done

# ---------- 3. Build, de a uno ----------
log "2/6 build api"
docker compose build api
log "3/6 build web"
docker compose build web

# ---------- 4. Levantar ----------
log "4/6 docker compose up -d"
docker compose up -d --remove-orphans

# ---------- 5. Health ----------
log "5/6 esperando el health: $HEALTH_URL (máx. ${HEALTH_TIMEOUT}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT))
until curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; do
  if ((SECONDS >= deadline)); then
    trap - ERR
    log "✖ El health NO respondió en ${HEALTH_TIMEOUT}s."
    docker compose ps
    log "Las imágenes anteriores quedan como contikids-api:previous y contikids-web:previous. Rollback:"
    log "  docker tag contikids-api:previous contikids-api:latest && docker tag contikids-web:previous contikids-web:latest && docker compose up -d"
    exit 1
  fi
  sleep 5
done
log "    ✔ health OK: $(curl -fsS --max-time 5 "$HEALTH_URL")"

# ---------- Seed solo si la BD está vacía (el seed además es idempotente) ----------
modules="$(docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'SELECT count(*) FROM "LearningModule"' | tr -d '[:space:]')"
if [[ "$modules" == "0" ]]; then
  log "    BD vacía → corriendo el seed (los PIN de demo quedan solo en este log)"
  docker compose run --rm -e SEED_TEACHER_EMAIL -e SEED_TEACHER_PASSWORD -e SEED_RESET_DEMO_PINS=0 \
    api node dist-seed/seed.js
else
  log "    BD con datos ($modules módulos) → no se corre el seed"
fi

# ---------- 6. Limpieza (solo lo de Contikids) ----------
log "6/6 limpieza"
docker image prune -f --filter "label=$APP_LABEL" >/dev/null
docker builder prune -f --max-used-space "$BUILD_CACHE_MAX" >/dev/null
log "✅ Deploy COMPLETO ($AFTER)"

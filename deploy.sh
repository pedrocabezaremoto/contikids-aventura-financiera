#!/usr/bin/env bash
#
# deploy.sh — Despliegue de CONTIKIDS con Docker Compose (VPS o laptop).
#
# Flujo: git pull --ff-only → ¿solo docs? → build migrate+api → build web (uno a la vez, por la RAM)
#        → docker compose up -d (migrate corre antes que la api) → espera el health
#        → seed si la BD está vacía → limpieza.
#
# "Solo docs": si entre el ÚLTIMO COMMIT DESPLEGADO con éxito y el nuevo solo cambiaron
# *.md, docs/** o progreso.md, no se reconstruye nada (se registra y termina).
# El último commit desplegado se guarda en $LOG_DIR/contikids-last-deploy.
# Para forzar un rebuild completo:  FORCE_REBUILD=1 ./deploy.sh
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
STATE="$LOG_DIR/contikids-last-deploy"
LOCK="/tmp/contikids-deploy.lock"
BRANCH="main"
APP_LABEL="org.contikids.app=contikids"
BUILD_CACHE_MAX="1GB" # caché de build acotada (el disco del VPS es chico)
HEALTH_TIMEOUT=180
IMAGES=(migrate api web)

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG") 2>&1

ts()   { date '+%Y-%m-%d %H:%M:%S'; }
log()  { echo "[$(ts)] $*"; }
fail() { log "✖ ERROR: $*"; log "Deploy ABORTADO. Las imágenes anteriores se conservan."; exit 1; }
trap 'fail "falló el comando en la línea $LINENO"' ERR

# Archivos que no afectan a la app: *.md en cualquier carpeta, docs/** y progreso.md.
is_doc() {
  local f="$1"
  [[ "$f" == docs/* || "$f" == "progreso.md" || "${f,,}" == *.md ]]
}

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
AFTER_FULL="$(git rev-parse HEAD)"
AFTER="$(git rev-parse --short HEAD)"
log "    commit: $BEFORE → $AFTER  ($(git log -1 --format=%s))"

# ---------- ¿Hace falta reconstruir? ----------
LAST="$(cat "$STATE" 2>/dev/null || true)"
if [[ "${FORCE_REBUILD:-0}" == "1" ]]; then
  log "    FORCE_REBUILD=1 → rebuild completo"
elif [[ -z "$LAST" ]] || ! git cat-file -e "${LAST}^{commit}" 2>/dev/null; then
  log "    sin registro de un deploy anterior válido → rebuild completo"
elif [[ "$LAST" == "$AFTER_FULL" ]]; then
  log "    sin cambios desde el último deploy (${LAST:0:7}) → nada que hacer (FORCE_REBUILD=1 para forzar)"
  log "✅ Deploy COMPLETO ($AFTER, sin cambios)"
  exit 0
else
  mapfile -t changed < <(git diff --name-only "$LAST" "$AFTER_FULL")
  only_docs=1
  for f in "${changed[@]}"; do is_doc "$f" || { only_docs=0; break; }; done
  if ((only_docs)); then
    log "    cambios desde ${LAST:0:7}: ${changed[*]}"
    log "    📝 solo docs, sin rebuild"
    echo "$AFTER_FULL" >"$STATE"
    log "✅ Deploy COMPLETO ($AFTER, solo docs)"
    exit 0
  fi
  log "    ${#changed[@]} archivo(s) cambiaron desde ${LAST:0:7} → rebuild"
fi

# ---------- 2. Guardar las imágenes actuales como :previous ----------
for img in "${IMAGES[@]}"; do
  if docker image inspect "contikids-$img:latest" >/dev/null 2>&1; then
    docker tag "contikids-$img:latest" "contikids-$img:previous"
  fi
done

# ---------- 3. Build, de a uno (migrate construye también las capas de la api) ----------
log "2/6 build migrate + api"
docker compose build migrate
docker compose build api
log "3/6 build web"
docker compose build web

# ---------- 4. Levantar (migrate corre y termina; luego arranca la api) ----------
log "4/6 docker compose up -d"
docker compose up -d --remove-orphans

# ---------- 5. Health ----------
log "5/6 esperando el health: $HEALTH_URL (máx. ${HEALTH_TIMEOUT}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT))
until curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; do
  if ((SECONDS >= deadline)); then
    trap - ERR
    log "✖ El health NO respondió en ${HEALTH_TIMEOUT}s."
    docker compose ps -a
    log "Las imágenes anteriores quedan como contikids-{migrate,api,web}:previous. Rollback:"
    log "  for i in migrate api web; do docker tag contikids-\$i:previous contikids-\$i:latest; done && docker compose up -d"
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

echo "$AFTER_FULL" >"$STATE"

# ---------- 6. Limpieza (solo lo de Contikids) ----------
log "6/6 limpieza"
docker image prune -f --filter "label=$APP_LABEL" >/dev/null
docker builder prune -f --max-used-space "$BUILD_CACHE_MAX" >/dev/null
log "✅ Deploy COMPLETO ($AFTER)"

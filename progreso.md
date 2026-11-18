# CONTIKIDS — Progreso

> Leer esto al empezar cada sesión. Fuente de verdad técnica: `docs/CONTIKIDS_CONTEXTO_LLM.md` (v1.1).
> Puertos y recursos del servidor: `/root/reporte-servidor.md` (fuera del repo).

## Estado al 2026-11-18

**Dónde quedamos:** la Fase 0.5 está **aprobada** y el mantenimiento previo a la Fase 1 está hecho. Lo próximo es la Fase 1, **solo con el OK de Pedro**.
- Pausa hasta el 2026-11-19: ver **Plan para mañana** abajo.

## 🗓️ Plan para mañana (2026-11-19) — en este orden, cada paso con el OK de Pedro
> Pausa decidida por Pedro el 2026-11-18. Lo que tiene nombres de proyectos ajenos o detalles de seguridad del servidor está en `/root/reporte-limpieza.md` (privado, fuera del repo).

1. **Limpieza del VPS** (decisiones de Pedro, detalle en `/root/reporte-limpieza.md`):
   - Borrar las carpetas viejas ya decididas, respaldando antes en GitHub lo que falte.
   - Una carpeta se decide mañana (respaldar o borrar directo).
   - Confirmar las propuestas de disco: caché de npm (3.9 GB), `git gc` en `/root/.git` (895 MB), logs rotados y límite `SystemMaxUse=200M` en journald.
2. **Seguridad del servidor:** una tarea de endurecimiento de puertos (detalle en `/root/reporte-limpieza.md`).
3. **Fase 1 — Acceso:**
   - Primero:
     - §8 del contexto a **v1.2** con claves únicas en `Lesson(moduleId, order)`, `Quiz(moduleId, type)`, `Question(quizId, order)` y `ContentBlock(lessonId, order)`;
     - nueva migración;
     - seed con `upsert` en esos modelos.
   - Después: bienvenida (¿Docente o Estudiante?), login docente, código de sección + perfiles + PIN, y guards por rol.
   - **Modo claro por defecto.** El modo oscuro solo se activa si el niño lo elige en Ajustes, nunca automático. Hoy `apps/web/src/styles/index.css` usa `prefers-color-scheme: dark` y hay que cambiarlo a una clase/atributo que se active desde Ajustes.

### ✅ Mantenimiento antes de la Fase 1 (2026-11-18)
- **Disco: 83 % → 72 %.**
  - Hecho: `pnpm store prune` (−1.8 GB), `journalctl --vacuum-size=200M` (−3.8 GB), `apt-get clean` (−0.3 GB) y vaciar la caché de build de Contikids (−6.3 GB).
  - Sin tocar nada de otras apps. El volumen huérfano `fresh-service-digital_fresh_db` es de Fresh: **no se borró**.
  - Propuestas para Pedro: caché de npm (3.9 GB), objetos sueltos de `/root/.git` (895 MB), logs rotados y límite de journald (detalle en `/root/reporte-limpieza.md`).
- **Imagen de la api: 697 MB → 271 MB** (commit `aede2c2`).
  - Runtime con `pnpm deploy --prod` sobre `alpine:3.24` + el binario de Node 22 de `node:22-alpine`.
  - Sin CLI de Prisma, sin WASM/edge de Prisma, sin tipos, source maps ni docs. `node_modules`: 339 → 57 MB.
- **Nuevo servicio `migrate`** (imagen `contikids-migrate`: el runtime más el CLI de Prisma en `/opt/prisma-cli`).
  - Corre `prisma migrate deploy` y termina. La api arranca solo si termina bien (`service_completed_successfully`).
  - La api ya no migra al arrancar.
- **Deploy inteligente** (`deploy.sh`):
  - Compara contra el último commit desplegado con éxito (`/root/logs/contikids-last-deploy`). Si solo cambiaron `*.md`, `docs/**` o `progreso.md` → `📝 solo docs, sin rebuild`.
  - `FORCE_REBUILD=1 ./deploy.sh` fuerza el rebuild.
  - Probado con `74971dd`: tardó 2 s, no reinició contenedores, health OK y las 4 páginas igual.
- **Limpieza de caché:** `--max-used-space` no recorta nada con el almacén de containerd, así que `deploy.sh` ahora corre `docker builder prune -af` tras cada deploy exitoso.
  - ⚠️ Esto vacía toda la caché de build sin uso del host. Hoy solo Contikids construye imágenes aquí.
  - El precio: cada rebuild vuelve a bajar los paquetes (~1 min más).
- Se quitó el script raíz `"deploy"` del `package.json`: chocaba con el comando `pnpm deploy`.
- ✅ Webhook de GitHub **activo** (2026-11-18): Pedro lo configuró y el ping llegó (✔ 200 `pong`, 03:04:55 UTC).
- ✅ **Auto-deploy probado** con el commit `aede9a2`:
  - push → webhook (03:07:49 UTC) → `deploy.sh` → build api (1 min 31 s) → build web (34 s) → up → health OK → sin seed (la BD ya tenía datos) → limpieza → **✅ Deploy COMPLETO** (03:10:18 UTC, ~2.5 min).
  - Después del deploy, las 4 páginas de Pedro seguían igual (www 200, fresh 200, api 404, inmoya 200).
- **Desde ahora, cada push a `main` despliega solo** (también los commits de Claude al cerrar cada fase).
- Desde `aede2c2`: si un push solo cambia docs (`*.md`, `docs/**`, `progreso.md`), `deploy.sh` hace pull y **no reconstruye** (este commit es la prueba).
- La Fase 1 **NO se empieza hasta su OK**.

### ✅ Fase 0.5 — Despliegue (terminada y probada)
- **En vivo:** https://contikids.pedroservicios.xyz
  - HTTPS de Let's Encrypt (vence 2027-02-16, Traefik lo renueva solo); http → https (308).
  - Cabecera `X-Robots-Tag: noindex, nofollow`.
  - Health: `/api/v1/health` · Swagger: `/api/docs`.
- **Contenedores de producción** (`docker-compose.yml`, un solo archivo para VPS y laptop):
  - `contikids-postgres`: `postgres:16-alpine`, `127.0.0.1:5433`, 256 MB.
  - `contikids-migrate`: imagen `contikids-migrate` (runtime + CLI de Prisma). Corre `prisma migrate deploy` y termina (queda "Exited (0)").
  - `contikids-api`: imagen `contikids-api` (271 MB; runtime Alpine + Node 22, usuario `node`). Arranca después de `migrate`. **No se publica.** 384 MB de límite.
  - `contikids-web`: imagen `contikids-web` (build de Vite → `nginx:alpine`), publicada en `${WEB_BIND}:${WEB_PORT}`, que en el VPS es **172.18.0.1:4400**. 64 MB.
    - Nginx (`infra/nginx/contikids.conf`): proxy `/api` → `api:4410`, fallback SPA, gzip, cache larga en `/assets` y `noindex`.
  - El seed se compila a `dist-seed/` dentro de la imagen de la api: `docker compose run --rm api node dist-seed/seed.js`.
  - `pnpm db:up` ahora levanta **solo** postgres (para `pnpm dev`).
- **Traefik** (Opción C del reporte):
  - Archivo nuevo `/etc/easypanel/traefik/config/contikids.yaml`, copia del patrón de `inmoya.yaml`. Copia idéntica en el repo: `infra/traefik/contikids.yaml`.
  - Rutas: `contikids.pedroservicios.xyz` → `172.18.0.1:4400`, y `/deploy-hook` (priority 100) → `172.18.0.1:4420`.
  - Los YAML existentes quedaron **sin cambios** (verificado con md5).
- **`deploy.sh`** (raíz del repo):
  - flock (un deploy a la vez; el segundo espera) → `git pull --ff-only` → build api → build web (de a uno) → `docker compose up -d` → health por HTTPS → seed solo si la BD está vacía → limpieza.
  - Antes de construir guarda las imágenes como `:previous`. Si el health falla, no borra nada y escribe el comando de rollback en el log.
  - Limpieza: solo imágenes con la etiqueta `org.contikids.app=contikids` + caché de build acotada a 1 GB.
  - Log: `/root/logs/contikids-deploy.log`.
- **Webhook de auto-deploy** (`infra/webhook/webhook.mjs`, copia del patrón de Fresh, que no se tocó):
  - Proceso PM2 **`contikids-webhook`** en **172.18.0.1:4420**. Guardado con `pm2 save`; respaldo previo en `/root/.pm2/dump.pm2.bak.*`.
  - Verifica HMAC SHA-256 con `WEBHOOK_SECRET` del `.env`, solo acepta push a `main`, responde 202 y corre `deploy.sh` aparte.
  - Log: `/root/logs/contikids-webhook.log`.
  - Probado por Traefik: GET → activo; POST sin firma → 401; ping firmado → 200 `pong`; push a otra rama → ignorado.
- **UFW:** se **agregó una regla** (no se cambió ninguna existente): `4420/tcp ALLOW 172.16.0.0/12` ("contikids webhook (solo Traefik)"). Sin ella, Traefik no alcanza al webhook del host; es el mismo patrón que el 4200 de Fresh.
- **Las 4 páginas de Pedro, antes → después:** www 200→200 · fresh 200→200 · api 404→404 (su backend no tiene ruta `/`) · inmoya 200→200.
- **Recursos tras el deploy:**
  - RAM: postgres 37 MB, api 40 MB, web 5 MB; 4.3 GB disponibles.
  - Disco al **83 %** (antes 75 %): imágenes (+1.2 GB), caché de build (~1.8 GB) y store de pnpm. ⚠️ Vigilar el 85 %.
  - Durante un build, el swap llega a ~1.2 GB (normal: para eso se agregó). La caché queda en ~1.8 GB aunque el tope de `deploy.sh` es 1 GB, porque Docker cuenta aparte la parte en uso.

### ✅ Fase 0 — Base (APROBADA)
- **Commit `040fe62` — docs:** referencias de diseño (HTML del equipo + diagramas de casos de uso y ER).
- **Commit `910f228` — docs:** mockup del panel docente.
  - Nombres y PIN **inventados** (confirmado por Pedro).
  - ⚠️ Se toma **solo el diseño**: la columna PIN **NO se implementa** (§12). Solo existe el botón "Restablecer PIN", que muestra el PIN nuevo **una sola vez**.
- **Commit `55ef050` — feat: base del monorepo (Fase 0).**
  - Monorepo pnpm 11.5.2 (Node 22): `apps/web`, `apps/api`, `packages/shared`. TS estricto, ESLint 9 y Prettier.
  - Versiones: TS 5.9, NestJS 11, Prisma 6.19, Vite 7, Vitest 3, React 19, Tailwind 4.3. Se evitaron TS 7, NestJS 12, Prisma 8 RC y Vite 8 por ser muy recientes.
  - `packages/shared`: `formatBs()` → `Bs. 1.250,00` (7 tests).
  - `apps/api`: schema EXACTO de §8, migración `20261117190727_init`, Swagger, `GET /api/v1/health` (503 si la BD falla), helmet, CORS y ValidationPipe (2 tests).
  - Seed idempotente:
    - SystemSettings, 5 módulos con medalla, M1 completo desde el prototipo (en Bs.), M2–M5 con lección placeholder.
    - Plan de cuentas 1.1–5.1 y el escenario `M5_LEMONADE_WEEK` (6 ejercicios, montos provisionales).
    - Demo ficticia: `docente@contikids.test`, sección `DEMO-5A` y 6 alumnos.
  - `apps/web`: tokens §5 en `@theme`, `.card-game`/`.btn-game` y fuentes self-hosted (solo latín). Página de prueba con paleta, botones, `formatBs` y health.
  - CI: install → prisma validate → generate → lint → typecheck → test.

### Antes (2026-11-17)
- Repo propio en `/root/Contikids-Project` (rama `main`, remote SSH). `/root/.gitignore` ignora `Contikids-Project/`.
- Contexto v1.1 (`2ebdfe8`): `Section.code`, `Scenario`, `JournalAttempt`, Mayor/Balance solo con asientos correctos, `PlaySession → LearningModule`, códigos cortos, 6 operaciones, todo en Bs.
- Servidor: 2 GB de swap (`/swapfile`, swappiness 10).

### ⏳ Pendiente
**De Pedro:**
- [x] Configurar el webhook en GitHub (hecho 2026-11-18; ping ✔). El secreto está solo en el `.env` del VPS.
- [ ] Subir `libro_diario_propuesta.html` a `docs/design-refs/`.
- [ ] Mañana: confirmar la limpieza del VPS y las propuestas de disco (`/root/reporte-limpieza.md`). Lo que no esté completo en GitHub se respalda antes.
- [ ] Dar el **OK para la Fase 1**.

**Inicio de la Fase 1 (decidido por Pedro):**
- [ ] Primero actualizar la §8 del contexto a **v1.2** con claves únicas en `Lesson(moduleId, order)`, `Quiz(moduleId, type)`, `Question(quizId, order)` y `ContentBlock(lessonId, order)`.
- [ ] Después: nueva migración + seed con `upsert` en esos modelos.

**Mejoras anotadas (sin urgencia):**
- [ ] Desarrollo y producción comparten la misma BD (`contikids-postgres`). Si la demo necesita datos limpios, separar.

**Equipo de Contenido:**
- [ ] Lecciones de M2–M5; en M1, trueque y necesidad vs deseo.
- [ ] Montos finales del escenario de la limonada.
- [ ] Arte de las medallas (`/badges/m1..m5.webp`).

## Reglas de trabajo acordadas (desde 2026-11-18)
- Claude codea directo en el VPS.
- Un commit por fase (Conventional Commits).
- Al terminar cada fase: resumen + cómo probarla.
- **No avanzar de fase sin el OK de Pedro.**
- **Al cerrar cada fase: commit Y push** (autorizado de forma general por Pedro), porque otro Claude revisa el código desde GitHub. Con el webhook activo, **cada push a `main` despliega solo**.
- Antes de cada push: `git ls-files` → que no aparezca `files-htmlsANDother/`, `.env`, llaves ni PDFs con cédulas.
- Repo público: nada de cédulas, `.env`, llaves, secretos ni datos reales de niños.
- No se modifican los YAML existentes de Traefik, EasyPanel, PM2 de otras apps ni el Postgres del host: solo se agregan cosas nuevas.

## Puertos de Contikids
| Servicio | Desarrollo | Producción |
|---|---|---|
| Postgres | `127.0.0.1:5433` | `127.0.0.1:5433` (mismo contenedor) |
| API NestJS | `127.0.0.1:4410` (`pnpm dev:api`) | no se publica (red interna del compose) |
| Web | `127.0.0.1:5173` (`pnpm dev:web`) | `172.18.0.1:4400` (Nginx, solo Traefik) |
| Webhook | — | `172.18.0.1:4420` (PM2 `contikids-webhook`) |

Nada de Contikids escucha en `0.0.0.0`. Ojo: `pnpm dev:api` y la api de producción no chocan (la de producción no publica el 4410).

## Fases (§14 del contexto)
- [x] **Fase 0 — Base** (2026-11-18, aprobada).
- [x] **Fase 0.5 — Despliegue** (2026-11-18): en vivo, con auto-deploy por webhook probado.
- [ ] Fase 1 — Acceso (bienvenida, login docente, código de sección + perfiles + PIN, guards).
- [ ] Fase 2 — Estudiante (mapa, lección, quiz, prueba, monedas/XP/medallas, M1 completo).
- [ ] Fase 3 — Simulador contable (Diario, Mayor, Balance por escenario).
- [ ] Fase 4 — Docente (KPIs, CRUD alumnos, progreso, tiempos, reportes).
- [ ] Fase 5 — Pulido (PWA offline, sonidos, modo oscuro, pruebas 360px).

## Operación rápida
- Deploy manual: `cd /root/Contikids-Project && ./deploy.sh`
- Logs: `tail -f /root/logs/contikids-deploy.log` · `tail -f /root/logs/contikids-webhook.log` · `docker logs -f contikids-api`
- Rollback: `for i in migrate api web; do docker tag contikids-$i:previous contikids-$i:latest; done && docker compose up -d`
- Forzar rebuild: `FORCE_REBUILD=1 ./deploy.sh` (por defecto, un push con solo docs no reconstruye).
- PIN de demo: se imprimieron en el primer seed. Para regenerarlos: `SEED_RESET_DEMO_PINS=1 pnpm db:seed`.
- CI: pestaña **Actions** de GitHub (`gh` no está instalado en el VPS).

## Notas para el mockup → app
- Waddles como asset en `apps/web/src/assets` (no base64).
- Fuentes self-hosted (el mockup usa Google Fonts).
- Validación del asiento en el backend (el mockup valida en el navegador).
- Los bloques `diagram` del seed usan la notación del prototipo (`COIN`, `PIG`, `@g/@r/@b`); el render se hace en la Fase 2.

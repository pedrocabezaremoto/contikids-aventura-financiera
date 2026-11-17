# CONTIKIDS — Progreso

> Leer esto al empezar cada sesión. Fuente de verdad técnica: `docs/CONTIKIDS_CONTEXTO_LLM.md` (v1.1).
> Puertos y recursos del servidor: `/root/reporte-servidor.md` (fuera del repo).

## Estado al 2026-11-18 (pausa: Pedro descansa, se continúa más tarde)

**Dónde quedamos:** la Fase 0 está **aprobada por Pedro** (la revisó desde GitHub). La Fase 0.5 **NO se empieza hasta su OK**.

### ✅ Fase 0 — Base (APROBADA)
- **Commit `040fe62` — docs: referencias de diseño.** HTML del equipo y 3 diagramas (casos de uso, ER detallado y ER resumido) en `docs/design-refs/`.
- **Commit de cierre — docs:** se subió `WhatsApp Image 2026-11-16 at 21.57.42.jpeg`, el mockup del panel docente.
  - Pedro confirmó que los nombres y el PIN son **inventados**.
  - ⚠️ Del panel docente se toma **solo el diseño**. La columna PIN **NO se implementa** (§12): solo el botón "Restablecer PIN", que muestra el PIN nuevo **una sola vez**.
- **Commit `55ef050` — feat: base del monorepo (Fase 0).**
  - Monorepo pnpm 11.5.2 (Node 22): `apps/web`, `apps/api`, `packages/shared`. TypeScript estricto, ESLint 9 (flat config) y Prettier.
  - Versiones elegidas: TypeScript 5.9, NestJS 11, Prisma 6.19, Vite 7, Vitest 3, React 19, Tailwind 4.3. Las mayores nuevas (TS 7, NestJS 12, Prisma 8 RC, Vite 8) se evitaron por ser muy recientes.
  - `packages/shared`: `formatBs()` → `Bs. 1.250,00`, con 7 tests.
  - `docker-compose.yml`: `postgres:16-alpine` (`contikids-postgres`) en `127.0.0.1:5433`, con healthcheck, volumen `contikids_pgdata` y `mem_limit: 256m`.
  - `apps/api` (NestJS):
    - Prisma con el schema EXACTO de §8 y migración `20261117190727_init`.
    - Swagger en `/api/docs`, `GET /api/v1/health` (`{status, db, timestamp}`, 503 si la BD falla), helmet, CORS y ValidationPipe. 2 tests (Jest).
  - Seed idempotente (`pnpm db:seed`):
    - SystemSettings, 5 módulos con su medalla, M1 completo desde `C[0]` del prototipo (en Bs.), y M2–M5 con lección placeholder (`TODO contenido`).
    - Plan de cuentas 1.1–5.1, y el escenario `M5_LEMONADE_WEEK` con 6 ejercicios (montos provisionales).
    - Demo ficticia: `docente@contikids.test` + sección `DEMO-5A` + 6 alumnos. Los PIN se imprimen solo en consola; `SEED_RESET_DEMO_PINS=1` los regenera.
  - `apps/web`:
    - React 19 + Vite 7 + Tailwind 4. Tokens §5 en `@theme`, más `.card-game` y `.btn-game`.
    - Montserrat + Quicksand con `@fontsource`, solo el subset latino: cero CDN.
    - Página de prueba con la paleta, los botones, `formatBs` y el estado de `/api/v1/health` (proxy de Vite → 4410). JS inicial: 70.9 KB gzip.
  - CI (`.github/workflows/ci.yml`): install → prisma validate → prisma generate → lint → typecheck → test.
  - `.env` real en la raíz (chmod 600, ignorado por git) con claves aleatorias. Plantilla: `.env.example`.

### Antes (2026-11-17)
- Repo propio en `/root/Contikids-Project` (rama `main`, remote SSH). `/root/.gitignore` ignora `Contikids-Project/`.
- Contexto v1.1 (`2ebdfe8`): `Section.code`, `Scenario`, `JournalAttempt`, Mayor/Balance solo con asientos correctos, `PlaySession → LearningModule`, códigos cortos, 6 operaciones, todo en Bs.
- Servidor: 2 GB de swap agregados (`/swapfile`, swappiness 10).

### ⏳ Pendiente
**De Pedro (para más tarde):**
- [ ] Probar la Fase 0 él mismo:
  - `pnpm dev:api` + `pnpm dev:web`, con reenvío de puertos 5173 y 4410 en VS Code;
  - abrir http://127.0.0.1:5173 y http://127.0.0.1:4410/api/docs.
- [ ] Subir `libro_diario_propuesta.html` a `docs/design-refs/` (no está en disco; trae a Waddles en base64) → luego commit.
- [ ] Dar el **OK para la Fase 0.5**.

**Inicio de la Fase 1 (decidido por Pedro):**
- [ ] Primero actualizar la §8 del contexto a **v1.2** con claves únicas en `Lesson(moduleId, order)`, `Quiz(moduleId, type)`, `Question(quizId, order)` y `ContentBlock(lessonId, order)`.
- [ ] Después: nueva migración + simplificar el seed para usar `upsert` en esos modelos (hoy los busca a mano).

**Equipo de Contenido:**
- [ ] Lecciones de M2–M5.
- [ ] En M1: trueque y necesidad vs deseo.
- [ ] Montos finales del escenario de la limonada.
- [ ] Arte de las medallas (`/badges/m1..m5.webp`).

## Reglas de trabajo acordadas (desde 2026-11-18)
- Claude codea directo en el VPS.
- Un commit por fase (Conventional Commits).
- Al terminar cada fase: resumen + cómo probarla.
- **No avanzar de fase sin el OK de Pedro.**
- **Al cerrar cada fase: commit Y push** (autorizado de forma general por Pedro), porque otro Claude revisa el código desde GitHub.
- Antes de cada push: `git ls-files` → que no aparezca `files-htmlsANDother/`, `.env`, llaves ni PDFs con cédulas.
- Repo público: nada de cédulas, `.env`, llaves ni datos reales de niños.

## Puertos de Contikids (ver `/root/reporte-servidor.md`)
| Servicio | Desarrollo | Producción |
|---|---|---|
| Postgres | `127.0.0.1:5433` | no se publica (red interna del compose) |
| API NestJS | `127.0.0.1:4410` | no se publica (red interna del compose) |
| Web (Vite dev) | `127.0.0.1:5173` | — |
| Web (Nginx) | — | `172.18.0.1:4400` (Fase 0.5) |

Nada de Contikids escucha en `0.0.0.0`. No se tocan Traefik, EasyPanel, PM2, el Postgres del host ni las otras apps.

## Fases (§14 del contexto)
- [x] **Fase 0 — Base** (2026-11-18, aprobada por Pedro).
- [ ] **Fase 0.5 — Despliegue** en `contikids.pedroservicios.xyz`: Opción C del reporte (compose publicado en `172.18.0.1:4400` + `/etc/easypanel/traefik/config/contikids.yaml`) + webhook de auto-deploy como el de Fresh.
- [ ] Fase 1 — Acceso (bienvenida, login docente, código de sección + perfiles + PIN, guards).
- [ ] Fase 2 — Estudiante (mapa, lección, quiz, prueba, monedas/XP/medallas, M1 completo).
- [ ] Fase 3 — Simulador contable (Diario, Mayor, Balance por escenario).
- [ ] Fase 4 — Docente (KPIs, CRUD alumnos, progreso, tiempos, reportes).
- [ ] Fase 5 — Pulido (PWA offline, sonidos, modo oscuro, pruebas 360px).

## Estado del entorno al pausar
- El contenedor `contikids-postgres` queda **corriendo** (healthy, `127.0.0.1:5433`, `restart: unless-stopped`) con la migración y el seed aplicados.
- La API y Vite **están apagados**: se levantan con `pnpm dev:api` / `pnpm dev:web`.
- `.env` en la raíz (no se sube): claves de Postgres, JWT y `SEED_TEACHER_PASSWORD`. Los PIN de los alumnos demo se imprimieron en el primer seed; para verlos de nuevo: `SEED_RESET_DEMO_PINS=1 pnpm db:seed`.
- El CI se revisa en la pestaña **Actions** de GitHub (`gh` no está instalado en el VPS).

## Notas para el mockup → app
- Waddles como asset en `apps/web/src/assets` (no base64).
- Fuentes self-hosted (el mockup usa Google Fonts).
- Validación del asiento en el backend (el mockup valida en el navegador).
- Los bloques `diagram` del seed usan la notación del prototipo (`COIN`, `PIG`, `@g/@r/@b`); el render se hace en la Fase 2.

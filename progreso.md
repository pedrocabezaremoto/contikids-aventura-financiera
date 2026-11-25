# CONTIKIDS — Progreso

> Leer esto al empezar cada sesión. Fuente de verdad técnica: `docs/CONTIKIDS_CONTEXTO_LLM.md` (v1.3).
> Puertos y recursos del servidor: `/root/reporte-servidor.md` (fuera del repo).

## Estado al 2026-11-24 — Sub-fase 2.2 (CU-04) implementada y probada en local

- **Lección de M1.** Desde el mapa se puede entrar a `/mapa/m1/leccion`. Los siete bloques del seed forman cuatro pasos: ingreso, gasto, ahorro y consejo de Waddles. Cada imagen o diagrama conserva las explicaciones que le siguen. La bienvenida y los diagramas usan los SVG locales de Twemoji con atribución en el README.
- **API.** `GET /api/v1/lessons/:id` entrega los bloques ordenados. `POST /api/v1/lessons/:id/complete` recibe `{ timeSecs }` y devuelve `{ xpAwarded }`. Ambas rutas exigen rol estudiante y acceso al módulo. El primer cierre guarda el tiempo, completa la lección, abre el Quiz, lleva M1 al 33 % y suma 20 XP en una transacción con `RewardGrant`. El repaso devuelve 0 XP y conserva el avance posterior.
- **Verificación.** Lint, typecheck y build completo aprobados. Pasaron 20 pruebas de shared (incluidos los diagramas del seed), 2 de web, 34 unitarias de API y 11 de integración HTTP/Prisma exclusivamente en `contikids_test`. Se verificaron dos cierres concurrentes, el repaso y las denegaciones por rol y contenido cerrado.
- **Prueba móvil.** Chrome a 360×740 con el build y respuestas HTTP simuladas: cuatro pasos sin desbordamiento horizontal, Atrás/Siguiente de 56 px, estados de carga, vacío y error, reintento al guardar, celebración con confeti y repaso con movimiento reducido. Regreso a M1 con Quiz abierto. Cero solicitudes a dominios externos.
- **Pendiente.** Revisión de Pedro, commit, push y verificación en el dominio. La pantalla y los endpoints del Quiz corresponden a la sub-fase 2.3, pendiente de autorización.

## Estado al 2026-11-20 (Fase 2 — sub-fase 2.1 CERRADA y verificada por Pedro; la 2.2 espera su OK)

**Dónde quedamos:** la **2.1 (mapa de islas + base de la Fase 2)** está **cerrada**: desplegada y **probada en el navegador por Pedro** (mapa, zoom a M1, Recompensas, Perfil y Salir: todo bien). **Alumno demo de prueba: Andrés M. (`DEMO-5A`, id 4)**, con un PIN que le puso Pedro (el PIN no se guarda en el repo; los otros 5 alumnos conservan sus PIN originales). **Próximo paso: 2.2 Lección, SOLO con el OK de Pedro; todavía no se empezó.** Antes de seguir, leer `docs/FASE2_PLAN.md` completo (§5 = decisiones de Pedro). **No avanzar a la 2.2 sin el OK de Pedro.**
- **Cambio de orden aprobado por Pedro:** la BD `contikids_test` y el candado de las pruebas se adelantaron de la 2.2 a la 2.1 y se hicieron **antes** de la migración. Twemoji sigue en la 2.2. Plan actualizado.
- **Hecho en la 2.1:**
  1. **`contikids_test`** creada en el mismo contenedor `contikids-postgres`. Pruebas de integración: `pnpm --filter @contikids/api test:int` (archivos `*.int-spec.ts`); leen solo `TEST_DATABASE_URL` (en el `.env` del VPS; plantilla en `.env.example`). **Candado** en `apps/api/src/testing/`: `globalSetup` cancela si la BD no es exactamente `contikids_test`, si falta la variable o si coincide con `DATABASE_URL`; confirma con `current_database()` y `truncateAll` revisa la BD antes de cada `TRUNCATE`. Probado a mano: con la URL de producción cancela. `pnpm test` = solo unitarias (sin BD). CI con servicio `postgres:16-alpine`.
  2. **Migración v1.3** `20261120120000_game_v1_3` (aditiva): `AttemptAnswer.tryNumber`, `Attempt.stars`, `SubmoduleProgress.bestStars`, `AnswerOption.order` (relleno con `ROW_NUMBER()` por pregunta) y tabla `RewardGrant`. Probada antes sobre una copia con los datos reales. **Respaldo de producción previo:** `/root/backups/contikids-pre-v1.3-20261120-0246.sql` (chmod 600, fuera del repo). §8 del contexto → **v1.3** (schema + historial). El seed ahora hace `upsert` de las opciones por `(pregunta, order)`.
  3. **`packages/shared/src/game-rules.ts`**: todos los valores del juego (1/0,5/0, XP 20/30/50, +1 moneda por acierto, bono 5, estrellas, % del módulo, tope 600 s). La api ahora **depende de `@contikids/shared`**: el Dockerfile de la api compila shared antes; en local/CI hace falta `pnpm --filter @contikids/shared build` (o `pnpm build`) antes de typecheck/tests de la api. Los tipos del mapa (`MapData`, `ModuleDetail`…) también están en shared.
  4. **Rate limit para el aula** (`apps/api/src/rate-limit/`, números en `rate-limits.ts`): login de alumno **por alumno** (10/min) + por IP 200/min; perfiles **por sección** (60/min) + por IP 200/min; rutas autenticadas **por usuario** (120/min, un contador para todas sus rutas); resto por IP 2000/min; login docente por IP (10/min). Tests: 40 alumnos distintos desde la misma IP pasan; el 11.º intento al mismo alumno → 429.
  5. **API:** `GET /me/map` y `GET /modules/:ref` (id o código `M1`; módulo cerrado → 403 `CONTENT_LOCKED`; docente → 403). `computeMap` es una función pura (tests). Se quitó `GET /student/home`.
  6. **Web:** TanStack Query (caché vaciada al entrar/salir: varios niños comparten equipo), layout del estudiante con HUD (monedas/XP de `/me/map`) y barra inferior Mapa · Recompensas · Perfil (sidebar en ≥ 1024 px), `/mapa` (camino con 5 islas en rombo), `/mapa/:code` (zoom CSS a Lección/Quiz/Prueba, respeta `prefers-reduced-motion`), Recompensas y Perfil como "próximamente" (Perfil ya tiene Salir). Íconos SVG propios (sin emojis; Twemoji llega en la 2.2). JS inicial **102 KB gzip** (< 200).
- **Deploy 2.1 verificado (commit `66ffe89`):** migración v1.3 aplicada en producción (6 alumnos intactos, `AnswerOption.order` relleno, `RewardGrant` vacía); contikids/www/fresh = 200, `/api/v1/health` = 200, `/me/map` sin token = 401, `/student/home` = 404 (quitada), lista de perfiles de `DEMO-5A` responde. **Login real en producción verificado** con Andrés M. (login, `/me/map`, `/modules/m1` 200, `/modules/m2` 403, refresh 200); los PIN demo solo existen como hash. El flujo completo login → mapa → zoom sí se probó en un clon aislado con la misma build.
- **Pruebas:** 34 unitarias api + 7 integración (contra `contikids_test`) + 11 shared; lint, typecheck y prettier limpios. Capturas con Chrome headless a 360/390/1366 px: sin scroll horizontal y sin islas solapadas.
- **Pendiente de la Fase 2:** 2.2 Lección (+ Twemoji + arreglo de emojis de la bienvenida), 2.3 Quiz, 2.4 Prueba/medalla, 2.5 Recompensas/perfil, 2.6 M1 completo + progreso demo. Las pantallas de submódulo aún no existen: en el zoom, la Lección sale "Abierto" pero todavía no se puede entrar.
- **Decisiones de Pedro (2026-11-20, siguen vigentes):**
  1. Rate limit por alumno/sección, no por IP (login docente sigue por IP).
  2. Nota: 1.er intento = 1, 2.º = 0,5, fallo = 0; todos los valores en `game-rules.ts`.
  3. Premios solo la primera vez por submódulo + bono de 5 monedas al aprobar la prueba.
  4. Twemoji en SVG local (también arregla los emojis de la bienvenida).
  5. `contikids` = base real de la profesora; `contikids_test` solo para pruebas, con candado.
  6. Tiempo de juego → Fase 4.
  - **Escala:** UNA sección de ~30–40 alumnos. Las claves y los PIN los crea y restablece el docente.

## Estado al 2026-11-18 (Fase 1 terminada)

**Dónde quedamos:** la **Fase 1 — Acceso** está en vivo y probada en https://contikids.pedroservicios.xyz (commit `f3bbae9`).
- La Fase 2 **NO se empieza sin el OK de Pedro**.
- La limpieza del VPS y el cierre del puerto quedaron **para después** (decisión de Pedro); el plan sigue abajo y en `/root/reporte-limpieza.md`.
- Las credenciales demo se dan **solo por chat**, nunca en el repo.

### ✅ Fase 1 — Acceso (2026-11-18)
- **§8 → v1.2:** claves únicas `Lesson(moduleId, order)`, `ContentBlock(lessonId, order)`, `Quiz(moduleId, type)` y `Question(quizId, order)`.
  - Migración `20261118110000_unique_keys_v1_2`. `prisma migrate dev` no corre en modo no interactivo, así que se generó con `prisma migrate diff` y se aplicó con `migrate deploy`.
  - El seed usa `upsert` en esos modelos (sigue idempotente).
- **API (NestJS):**
  - `POST /auth/teacher/login`: argon2, con hash de relleno si el correo no existe.
  - `GET /auth/students?sectionCode=`: solo `id`, `name` (primer nombre) y `avatarColor`. Nunca el PIN.
  - `POST /auth/student/login`: argon2.
    - Al llegar a `maxPinAttempts` fallidos, el perfil queda bloqueado `pinLockMinutes` (423, `code: LOCKED`). Valores de `SystemSettings`.
    - Cada fallo devuelve `attemptsLeft`. El login correcto resetea el contador y actualiza `lastLoginAt`.
  - JWT:
    - access de 15 min, solo en memoria del navegador;
    - refresh de 7 días en el cookie `ck_refresh` (`HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`);
    - `POST /auth/refresh` y `POST /auth/logout`. El refresh no se puede revocar en el servidor: no hay tabla de sesiones.
  - `AuthGuard` + `@Roles('TEACHER'|'STUDENT')`, y `GET /me`.
  - Rutas provisionales protegidas por rol: `GET /student/home` y `GET /teacher/home`.
  - Rate limit (`@nestjs/throttler`):
    - global de 120/min por IP;
    - logins con 10/min;
    - lista de perfiles con 30/min;
    - el health no tiene límite.
    - `trust proxy` toma la IP real del cliente detrás de Traefik + Nginx.
  - Tests Jest: 14 en total. 6 de login de estudiante (PIN correcto, incorrecto, bloqueo, bloqueo vigente, bloqueo vencido, perfil inexistente), 6 del guard por rol y 2 del health.
  - `@nestjs/jwt` se quedó en la **v11**: la v12 es solo ESM y no carga en una API CommonJS.
- **Web (React):**
  - `react-router` v7 con rutas protegidas por rol (`RequireRole`). La sesión se recupera al abrir la app vía `/auth/refresh`.
  - Rutas:
    - `/` bienvenida (¿Docente o Estudiante?) · `/docente/entrar` login docente;
    - `/estudiante` código de sección (se recuerda en el dispositivo) · `/estudiante/:code` elegir perfil · `/estudiante/:code/:id` PIN;
    - `/mapa` destino del estudiante · `/docente` destino del docente (ambos provisionales, con Salir);
    - `/estado` página técnica de la Fase 0.
  - PIN con teclado propio de 4 dígitos: teclas de 64 px, también acepta el teclado físico. Waddles avisa con mensaje amable, intentos restantes y aviso de bloqueo.
  - **Modo claro por defecto.** Se quitó el oscuro automático (`prefers-color-scheme`); el oscuro queda en `:root[data-theme='dark']` para activarlo desde Ajustes.
  - Waddles y el logo se extrajeron del prototipo como archivos (`apps/web/src/assets/`), sin base64.
  - Probado a 360 px (capturas con Chrome headless): sin scroll horizontal. Cero CDN.
- **Probado en el dominio:**
  - docente: login, `/me`, panel, 403 en la ruta del estudiante, refresh, logout y refresh rechazado tras el logout;
  - estudiantes: 2 alumnos entran con PIN y reciben 403 en la ruta del docente;
  - bloqueo tras 5 PIN incorrectos (423), que rechaza incluso el PIN correcto.

### Pendiente de la Fase 1 (pulido visual, después)
- El logo (`logo-contikids.webp`) tiene fondo blanco: hace falta una versión con fondo transparente.
- Revisar los emojis de los botones de bienvenida (en dispositivos sin fuente de emojis se ven como cuadros). → **Se arregla en la 2.2 con Twemoji** (decisión de Pedro).
- Comparar con la referencia `ContiKids · Pantallas de inicio de sesión.html` (panel teal con el logo a la izquierda en desktop).

## 🗓️ Plan pendiente (pospuesto por Pedro) — cada paso con su OK
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
- [ ] Probar la Fase 1 en el dominio con las credenciales demo (se dieron por chat).
- [ ] Más adelante: confirmar la limpieza del VPS y las propuestas de disco (`/root/reporte-limpieza.md`). Lo que no esté completo en GitHub se respalda antes.
- [x] Responder las dudas de `docs/FASE2_PLAN.md` §5 (hecho 2026-11-20). La 2.1 la empieza otra sesión.

**Fase 1 (hecho):**
- [x] §8 del contexto a **v1.2** con claves únicas + migración + seed con `upsert`.

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
- [x] **Fase 1 — Acceso** (2026-11-18): en vivo y probada.
- [ ] Fase 2 — Estudiante (mapa, lección, quiz, prueba, monedas/XP/medallas, M1 completo). **Planificada y aprobada** (2026-11-20): `docs/FASE2_PLAN.md`, sub-fases 2.1–2.6 (el tiempo de juego pasó a la Fase 4).
- [ ] Fase 3 — Simulador contable (Diario, Mayor, Balance por escenario).
- [ ] Fase 4 — Docente (KPIs, CRUD alumnos, progreso, tiempos, reportes).
- [ ] Fase 5 — Pulido (PWA offline, sonidos, modo oscuro, pruebas 360px).

## Operación rápida
- Deploy manual: `cd /root/Contikids-Project && ./deploy.sh`
- Logs: `tail -f /root/logs/contikids-deploy.log` · `tail -f /root/logs/contikids-webhook.log` · `docker logs -f contikids-api`
- Rollback: `for i in migrate api web; do docker tag contikids-$i:previous contikids-$i:latest; done && docker compose up -d`
- Forzar rebuild: `FORCE_REBUILD=1 ./deploy.sh` (por defecto, un push con solo docs no reconstruye).
- Credenciales demo: docente `docente@contikids.test` (contraseña = `SEED_TEACHER_PASSWORD` del `.env`), sección `DEMO-5A`. Los PIN se imprimieron en el primer seed y se pasaron por chat; para regenerarlos: `SEED_RESET_DEMO_PINS=1 pnpm db:seed`.
- Desbloquear un alumno a mano (si se pasa de intentos): esperar `pinLockMinutes` (5 min) o `docker compose exec postgres psql -U contikids -d contikids -c 'UPDATE "Student" SET "lockedUntil"=NULL, "failedPinCount"=0 WHERE username=...'`.
- Probar la API: Swagger en https://contikids.pedroservicios.xyz/api/docs · estado técnico en `/estado`.
- CI: pestaña **Actions** de GitHub (`gh` no está instalado en el VPS).

## Estado del entorno al pausar (2026-11-18, 07:30 Caracas)
- En vivo: `contikids-postgres`, `contikids-api` y `contikids-web` (healthy); `contikids-migrate` terminó con 0. Último deploy: `44c679f` (solo docs, sin rebuild); último build completo: `f3bbae9`.
- El webhook `contikids-webhook` (PM2) sigue activo: cada push a `main` despliega solo.
- No queda ningún servidor de desarrollo corriendo (la API y Vite de prueba se apagaron con `timeout`).
- El alumno demo "Gabriel" quedó bloqueado a propósito por la prueba de bloqueo; se desbloquea solo a los 5 minutos (07:31).
- Disco ~72 %, swap 2 GB.

## Notas para el mockup → app
- ✅ Waddles y el logo ya están como archivos en `apps/web/src/assets` (no base64).
- Fuentes self-hosted (el mockup usa Google Fonts).
- Validación del asiento en el backend (el mockup valida en el navegador).
- Los bloques `diagram` del seed se interpretan con `parseDiagram` de shared desde la sub-fase 2.2.

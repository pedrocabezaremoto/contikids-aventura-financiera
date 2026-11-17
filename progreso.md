# CONTIKIDS — Progreso

> Leer esto al empezar cada sesión. Fuente de verdad técnica: `docs/CONTIKIDS_CONTEXTO_LLM.md` (v1.1).

## Estado al 2026-11-17

### ✅ Hecho
- Carpeta `/root/Contikids-Project` creada con las referencias del equipo en `files-htmlsANDother/Contikids-Project/` (NO se sube: tiene el PDF con cédulas).
- Repo git propio inicializado: rama `main`, remote `git@github.com:pedrocabezaremoto/contikids-aventura-financiera.git`.
- `.gitignore`: `node_modules/ dist/ .env *.env.local coverage/ *.db *.sql.gz files-htmlsANDother/`.
- Commit `2ebdfe8` — `docs/CONTIKIDS_CONTEXTO_LLM.md` v1.1 con las correcciones aprobadas:
  - `Section.code String @unique` (el aula lista sus perfiles por código).
  - Modelo `Scenario` (agrupa las operaciones de una historia, ej. la semana de la limonada).
  - `JournalAttempt` guarda cada intento del Libro Diario; `JournalEntry` solo se crea con asientos correctos.
  - Mayor y Balance se calculan solo con los asientos correctos del escenario.
  - Relación `PlaySession → LearningModule`.
  - Códigos de cuenta cortos (`1.1` … `5.1`), desafío final = 6 operaciones, todos los ejemplos en Bs.
- Repo de `/root`: se agregó `Contikids-Project/` a `/root/.gitignore`. Revisión: sin remoto, sin `.ssh` ni `.env` commiteados (1 solo commit con `memory/2026-05-07.md`, limpio). No se cambió nada más.
- 2026-11-18: primer push a GitHub autorizado por Pedro (`main` → origin). `progreso.md` se queda en el repo.

### ⏳ Pendiente inmediato
- [ ] Pedro sube `libro_diario_propuesta.html` a `docs/design-refs/` (no estaba en disco; trae a Waddles en base64, no se reescribe a mano) → commit.
- [ ] Copiar el resto de referencias (`*.html`, `*.jpeg`) a `docs/design-refs/` (§0 del contexto). Revisar antes que las imágenes de WhatsApp no tengan datos reales.
- [ ] Pedro manda el resto de sus instrucciones: el punto 4 llegó cortado ("Despliegue con dominio (subdominio a confirmar, ej. contikids.pedroservicios.x…") y falta el 5.
- [x] `progreso.md` se commitea al repo (decidido por Pedro).

## Reglas de trabajo acordadas (desde 2026-11-18)
- Claude codea directo en el VPS.
- Un commit por fase (Conventional Commits).
- Al terminar cada fase: resumen + cómo probarla.
- **No avanzar de fase sin el OK de Pedro.**
- **Al cerrar cada fase: commit Y push** (autorizado de forma general por Pedro), porque otro Claude revisa el código desde GitHub.
- Antes de cada push: `git ls-files` → que no aparezca `files-htmlsANDother/`, `.env`, llaves ni PDFs con cédulas.
- Repo público: nada de cédulas, `.env`, llaves ni datos reales de niños.

## Fases (§14 del contexto)
- [ ] **Fase 0 — Base:** monorepo pnpm, Docker Compose (Postgres), NestJS + Prisma + seed (módulos, contenido del prototipo, plan de cuentas, escenario limonada), Vite + Tailwind con tokens, CI.
- [ ] Fase 1 — Acceso (bienvenida, login docente, código de sección + perfiles + PIN, guards).
- [ ] Fase 2 — Estudiante (mapa, lección, quiz, prueba, monedas/XP/medallas, M1 completo).
- [ ] Fase 3 — Simulador contable (Diario, Mayor, Balance por escenario).
- [ ] Fase 4 — Docente (KPIs, CRUD alumnos, progreso, tiempos, reportes).
- [ ] Fase 5 — Pulido (PWA offline, sonidos, modo oscuro, pruebas 360px, despliegue HTTPS).

## Notas para el mockup → app
- Waddles como asset en `apps/web/src/assets` (no base64).
- Fuentes self-hosted (el mockup usa Google Fonts).
- Validación del asiento en el backend (el mockup valida en el navegador).

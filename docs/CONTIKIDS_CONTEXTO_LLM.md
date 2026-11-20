# CONTIKIDS · Aventura Financiera — Contexto maestro para el agente de desarrollo

> Este archivo es la fuente de verdad del proyecto. Léelo completo antes de generar código.
> Si algo de aquí choca con un archivo de referencia (HTML/imagen), **este documento manda**.
> Responde y comenta el código en **español**; nombres de código (variables, funciones, tablas) en **inglés**.

### Historial de cambios
- **v1.3 (2026-11-20, Fase 2):** `AttemptAnswer.tryNumber` (+ único `(attemptId, questionId, tryNumber)`) para el reintento con pista; `Attempt.stars` y `SubmoduleProgress.bestStars` (estrellas 0–3); `AnswerOption.order` (+ único `(questionId, order)`; el seed usa `upsert` y la migración rellena `order` por pregunta); tabla nueva `RewardGrant` con único `(studentId, key)`: cada premio se paga **una sola vez** y queda el historial. Todo aditivo: no se borró ni renombró nada. Los valores del juego (puntos, XP, monedas) viven en `packages/shared/src/game-rules.ts`.
- **v1.2 (2026-11-18):** claves únicas `Lesson(moduleId, order)`, `ContentBlock(lessonId, order)`, `Quiz(moduleId, type)` y `Question(quizId, order)` (el seed usa `upsert`; un módulo tiene a lo sumo un QUIZ y un EXAM).
- **v1.1 (2026-11-17):** `Section.code`; nuevo modelo `Scenario` (agrupa las operaciones de una historia); intentos del Libro Diario en `JournalAttempt` (solo los asientos correctos son `JournalEntry`); Mayor y Balance calculados solo con asientos correctos del escenario; relación `PlaySession → LearningModule`; códigos de cuenta cortos (`1.1`, `4.1`); desafío final = **6 operaciones**; todos los ejemplos en **Bs.**
- **v1.0 (2026-11-16):** versión inicial.

---

## 0. Repositorio y entorno de trabajo (LEER PRIMERO)

| Dato | Valor |
|---|---|
| Repositorio GitHub (**público**) | `pedrocabezaremoto/contikids-aventura-financiera` |
| Remote SSH (usar este) | `git@github.com:pedrocabezaremoto/contikids-aventura-financiera.git` |
| Web | https://github.com/pedrocabezaremoto/contikids-aventura-financiera |
| Carpeta de trabajo en el VPS | `/root/Contikids-Project` (repo git propio; el repo de `/root` lo ignora) |
| Referencias del equipo (originales) | `/root/Contikids-Project/files-htmlsANDother/Contikids-Project/` (no se sube) |
| Referencias en el repo | `docs/design-refs/` |
| Rama principal | `main` |

El VPS ya tiene llave SSH conectada a GitHub. **No usar HTTPS ni tokens.**

### Primer arranque
```bash
cd /root/Contikids-Project
ssh -T git@github.com                      # debe saludar a pedrocabezaremoto
git init -b main
git remote add origin git@github.com:pedrocabezaremoto/contikids-aventura-financiera.git
mkdir -p docs/design-refs
cp files-htmlsANDother/Contikids-Project/*.html docs/design-refs/
cp files-htmlsANDother/Contikids-Project/*.jpeg docs/design-refs/
# docs/CONTIKIDS_CONTEXTO_LLM.md y docs/design-refs/libro_diario_propuesta.html ya van en el repo
echo "files-htmlsANDother/" >> .gitignore   # la carpeta original NO se sube
git add . && git commit -m "docs: contexto del proyecto y referencias de diseño"
git push -u origin main
```

### ⚠️ Reglas por ser repositorio PÚBLICO
- **NO subir `CONTIKIDS_Documento_Informativo.pdf`**: contiene números de cédula de los integrantes. Si se necesita en el repo, subir una versión sin cédulas.
- Nunca commitear `.env`, llaves, contraseñas ni backups de la base de datos. Solo `.env.example`.
- Los datos del seed (alumnos, docente) deben ser **ficticios**.
- `.gitignore` mínimo: `node_modules/ dist/ .env *.env.local coverage/ *.db *.sql.gz files-htmlsANDother/`.

### Demo sin internet (laptop)
El objetivo final es poder presentar el proyecto en una laptop **sin conexión**:
- Todo dentro de Docker Compose; **cero dependencias de CDN** en la app final (fuentes, íconos e imágenes self-hosted; Tailwind compilado, nunca `cdn.tailwindcss.com`).
- En el VPS: `docker compose build` → `docker save -o contikids-images.tar <imágenes>`.
- En la laptop: `docker load -i contikids-images.tar` → `docker compose up -d` → abrir `http://localhost`.
- El seed debe crear una sección demo con alumnos ficticios y progreso variado para mostrar el panel docente con datos.

---

## 1. Qué es el proyecto

- **Producto:** CONTIKIDS "Aventura financiera" — aplicación web educativa gamificada para enseñar contabilidad básica a niños de **9 a 11 años**.
- **Contexto académico:** UNERG (Universidad Rómulo Gallegos), cátedra Sistemas de Información III, Sección 1, Prof. Adriana Roa. Grupo de 7 integrantes; Pedro Cabeza lleva la parte técnica.
- **Título académico:** "Simulador de Procesos Contables Básicos (Libro Diario, Mayor y Balance de Comprobación) bajo un Entorno Gamificado para Estudiantes de Primaria".
  → **Obligatorio:** el sistema DEBE tener actividades reales de **Libro Diario, Libro Mayor y Balance de Comprobación** (adaptadas a niños).
- **Mascota guía:** **Waddles**, un cerdito-alcancía. Da bienvenida, pistas, ánimo y celebra logros.
- **Base pedagógica:** criterios de Pere Marquès (motivación, simplicidad, ritmo autónomo, **sin penalizaciones frustrantes**).
- **Base contable:** Fernando Catacora Carpio (adaptado a ahorro, mesada, útiles, metas).

### Decisión de plataforma (definitiva)
El PDF del equipo menciona escritorio con Python + Tkinter + SQLite. **Eso queda descartado.** CONTIKIDS es una **aplicación web responsiva** (TypeScript de punta a punta), usable en celulares Android de cualquier gama, tablets y PC. El requisito de funcionar sin internet (RNF-02) se cumple con: (a) **PWA instalable** con caché del contenido y (b) **despliegue local con Docker** en una laptop para la demo (ver §0).

---

## 2. Actores

| Actor | Acceso | Qué hace |
|---|---|---|
| **Estudiante** (9–11 años) | Código de sección → elige su perfil (avatar) + **PIN de 4 dígitos** | Mapa de 5 módulos, lecciones, quiz, prueba, simulador contable, monedas, medallas, perfil |
| **Docente** (admin) | Correo + contraseña | CRUD de alumnos, secciones/grados, progreso M1–M5, tiempos, reportes Excel/PDF |
| **Sistema** | Interno | Cronometra tiempo activo, registra última conexión, aplica reglas de desbloqueo |

---

## 3. Stack tecnológico (decidido)

### Frontend — `apps/web`
- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (los diseños de referencia ya usan Tailwind → se reutilizan clases)
- **React Router** (rutas por rol, rutas protegidas)
- **TanStack Query** (datos del servidor, caché, reintentos)
- **Zustand** (estado de sesión de juego: monedas, XP, sonido)
- **Framer Motion** (zoom del mapa, transiciones, celebraciones) + **canvas-confetti**
- **dnd-kit** (arrastrar y soltar con soporte **táctil** para clasificar movimientos / armar asientos)
- **vite-plugin-pwa** (instalable en Android, offline)
- **React Hook Form + Zod** (formularios del docente)
- Fuentes self-hosted: **Montserrat** (títulos, 800) y **Quicksand** (cuerpo, 600–700)

### Backend — `apps/api`
- **Node.js 22 LTS + TypeScript + NestJS** (módulos, guards por rol, DTOs validados; mapea 1:1 con los casos de uso)
- **Prisma ORM + PostgreSQL 16**
- **Auth:** JWT (access 15 min + refresh en cookie httpOnly). Contraseñas y PINs con **argon2**
- **Rate limit** (`@nestjs/throttler`): login de alumno **por alumno**, perfiles **por sección**, rutas autenticadas **por usuario**, y un límite **por IP alto** como red de seguridad (UNA aula comparte IP); login docente por IP. Números en `apps/api/src/rate-limit/rate-limits.ts`. + bloqueo temporal tras PINs fallidos
- **Reportes:** `exceljs` (.xlsx) y `pdfmake` (.pdf)
- **Swagger** en `/api/docs`

### Compartido — `packages/shared`
- Esquemas **Zod** y tipos TS usados por web y api (un solo contrato).
- Helper `formatBs(monto)` (ver §6).

### Infraestructura (VPS)
- **pnpm workspaces** (monorepo)
- **Docker Compose:** `postgres`, `api`, `web` (build estático servido por **Nginx**), Nginx como reverse proxy + HTTPS (Let's Encrypt)
- **GitHub Actions:** lint + typecheck + tests en cada PR

---

## 4. Estructura del repositorio

```
contikids/
├── apps/
│   ├── web/                 # React + Vite (PWA)
│   │   └── src/
│   │       ├── app/         # router, providers, layout
│   │       ├── features/
│   │       │   ├── auth/            # elegir rol, login docente, código de sección, perfil + PIN
│   │       │   ├── student-map/     # mapa de islas + zoom a submódulos
│   │       │   ├── lesson/          # lección paso a paso con Waddles
│   │       │   ├── quiz/            # quiz con feedback inmediato
│   │       │   ├── exam/            # prueba final del módulo
│   │       │   ├── ledger/          # Libro Diario, Mayor (cuentas T), Balance (por escenario)
│   │       │   ├── rewards/         # medallas y monedas
│   │       │   ├── profile/
│   │       │   ├── settings/
│   │       │   └── teacher/         # dashboard, alumnos, progreso, tiempos, reportes
│   │       ├── components/ui/       # Button, Card, Pill, ProgressBar, Toast, Waddles
│   │       ├── hooks/  lib/  styles/
│   │       └── assets/              # logo, Waddles (estados), islas, íconos
│   └── api/                 # NestJS
│       ├── src/modules/ (auth, students, sections, modules, lessons, quizzes,
│       │                 attempts, scenarios, journal, progress, rewards, sessions,
│       │                 reports, settings)
│       └── prisma/ (schema.prisma, migrations/, seed.ts)
├── packages/shared/         # zod schemas + tipos + formatBs
├── docs/
│   ├── CONTIKIDS_CONTEXTO_LLM.md   # este archivo
│   └── design-refs/                # HTML y diagramas del equipo (SOLO referencia)
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## 5. Sistema de diseño (unificado)

Existen dos estilos en las referencias. **Se adopta el estilo del prototipo `contikids (5).html` y el login**, porque coincide con el logo oficial y el PDF. Las pantallas tipo Stitch (mapa de islas, lección, quiz, evaluación, perfil, recompensas, configuración) aportan **estructura y layout**, pero se re-estilizan con estos tokens.

### Colores
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#061859` | Texto principal, wordmark "CONTI" |
| `muted` | `#4b5877` | Texto secundario |
| `sky` | `#6fcfd4` → `#e3f6f7` | Degradado de fondo (estudiante) |
| `teal` | `#2e9ca3` (sombra `#1f6e73`) | Docente, botones primarios, éxito suave |
| `blue` | `#3e6aa8` (sombra `#2a4c7e`) | Botones de acción |
| `red` | `#ff5757` (sombra `#c93a3a`) | Módulo 1, gasto, error amable |
| `green` | `#7ed957` (sombra `#5dae3c`) | Módulo 2, ingreso, correcto |
| `yellow` | `#ecc911` (sombra `#b39a0b`) | Módulo 4, monedas, foco (`outline`) |
| `purple` | `#812ea3` (sombra `#5e2078`) | Módulo 5 |
| `gold` | `#d58a24` | Subtítulo "Aventura financiera", premios |

Modo oscuro: `--a:#14307a; --b:#0a1238; --card:#1b2a63; --ink:#f2f6ff`.

### Estilo de componentes
- Tarjetas `border-radius: 24–28px`, **sombra sólida inferior** (`0 6px 0 rgba(6,24,89,.18)`) — look "botón de juego".
- Botones: `min-height: 56px`, radio 28px, sombra sólida del color oscuro; al presionar, `translateY(3px)` y sombra menor.
- Íconos de módulo en **rombos** (como el logo ✕ ÷ + −).
- Tipografía base 18px; títulos con `clamp()`.

### Reglas de responsividad (OBLIGATORIAS)
- **Mobile-first.** Probar en **360×740** (Android gama baja), 390×844, 412×915, 768 (tablet) y 1366.
- **Cero scroll horizontal** en 360px.
- Áreas táctiles **≥ 48×48 px**; separación mínima 8px.
- Estudiante en móvil: **barra de navegación inferior** (Mapa, Recompensas, Perfil, Ajustes). En ≥1024px: sidebar.
- Docente en móvil: tablas se convierten en **tarjetas apiladas**; en ≥1024px, tabla completa.
- Respetar `env(safe-area-inset-*)`.
- Nunca `min-h-[1024px]`, anchos fijos en px para contenedores ni sidebars fijos en móvil.
- Imágenes en WebP con `width/height`, lazy-load. Presupuesto: **JS inicial < 200 KB gzip**.
- Animaciones con `prefers-reduced-motion` respetado.

---

## 6. Currículo (5 módulos) — propuesta unificada

Cada módulo tiene 3 submódulos: **1. Lección → 2. Quiz → 3. Prueba**. Se desbloquean en orden; el módulo siguiente se abre al aprobar la prueba.

| # | Nombre en el mapa | Contenido contable | Actividades clave |
|---|---|---|---|
| 1 | **Mi alcancía** (El mundo del dinero) | Dinero, trueque, ingreso, gasto, ahorro, necesidad vs deseo | Clasificar ingreso/gasto/ahorro |
| 2 | **La balanza mágica** | Activo, pasivo, patrimonio. `Activo = Pasivo + Patrimonio` | Balanza interactiva, "lo que tengo / lo que debo" |
| 3 | **Las cajas del tesoro** (La cuenta y su naturaleza) | Cuenta, debe y haber, naturaleza deudora/acreedora | Arrastrar movimientos a la cuenta correcta |
| 4 | **Mis libros contables** | **Libro Diario** (asientos con fecha, cuentas, debe/haber) y **Libro Mayor** (cuentas T) | Armar asientos de un escenario corto; pasarlos al Mayor |
| 5 | **Mi negocio** (Desafío final) | **Balance de Comprobación**, ventas − gastos = ganancia | Puesto de limonada: registrar **6 operaciones**, mayorizar y cuadrar el balance |

### Moneda (decisión)
- **Dinero de los ejercicios: bolívares (Bs.)** — es una app venezolana. Formato venezolano: `Bs. 1.250,00` (punto de miles, coma decimal). Crear un helper `formatBs(monto)` en `packages/shared` y usarlo en todas partes; nunca escribir "$".
- Montos **redondos y pequeños** para que el niño calcule de cabeza: Bs. 20, Bs. 50, Bs. 120, Bs. 500.
- **Monedas Waddles** = solo la **recompensa del juego** (como puntos). No se mezclan con los Bs. de los ejercicios: ningún enunciado de ejercicio usa la palabra "monedas". Ícono distinto (moneda dorada con cerdito).
- Al reutilizar el contenido del prototipo, convertir "monedas" de los ejercicios a Bs. (ej. "Tu abuela te regala Bs. 50").
- El contenido de lecciones/quiz del prototipo `contikids (5).html` (constante `C`) se reutiliza como **seed** de la base de datos.

---

## 7. Gamificación (reglas)

- **XP** por actividad completada: Lección +20, Quiz +30, Prueba +50 (configurable). Asiento correcto en el simulador: +30.
- **Monedas Waddles**: +1 por respuesta correcta en quiz; bonus al aprobar la prueba.
- **Medallas**: una por módulo (ej. "Maestra del Dinero", "Guardián de la Balanza", "Contador Estrella" al completar los 5).
- **NO hay corazones ni vidas** (Pere Marquès: sin penalizaciones frustrantes). Se eliminan del quiz.
- En su lugar, **Estrellas de esfuerzo (0–3)** al terminar quiz o prueba: 3 ⭐ si acertó todo al primer intento, 2 ⭐ con pocas pistas, 1 ⭐ al completarlo. Siempre gana algo; las estrellas solo suman.
- Al fallar una pregunta: Waddles da una **pista**, el niño reintenta esa misma pregunta (sin perder nada). Si falla 2 veces, Waddles explica la respuesta y sigue.
- La prueba se puede repetir siempre; la nota mínima la define `SystemSettings.minPassingScore`. Si no aprueba: mensaje motivador + botón "Repasar la lección".
- Retroalimentación inmediata: correcto → animación + sonido corto; incorrecto → pista amable, nunca "¡Mal!".
- Sonido activable/desactivable en Ajustes.

---

## 8. Modelo de datos (Prisma) — versión corregida del diagrama ER

> Cambios frente al ER del equipo: se agregaron a `Student` los campos que piden CU-09/CU-10 (usuario, edad, monedas, XP, tiempo, última conexión); `Section.code` para que el aula liste sus perfiles; `PlaySession` para CU-07/CU-12 (con relación a `LearningModule`); medallas en tabla puente `StudentBadge`; progreso por submódulo para el "Ver detalles" del docente; `Scenario` para agrupar las operaciones de una historia; `JournalAttempt` para guardar cada intento del Libro Diario.

```prisma
enum SubmoduleType {
  LESSON
  QUIZ
  EXAM
}

enum ProgressStatus {
  LOCKED
  IN_PROGRESS
  COMPLETED
}

enum AccountNature {
  DEBIT   // deudora
  CREDIT  // acreedora
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model Teacher {
  id           Int       @id @default(autoincrement())
  fullName     String
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  sections     Section[]
}

model Section {
  id         Int       @id @default(autoincrement())
  teacherId  Int
  code       String    @unique   // código corto que se escribe en el aula, ej. "5A-2026"
  grade      String              // "4to", "5to", "6to"
  schoolTerm String              // "2026-2027"
  teacher    Teacher   @relation(fields: [teacherId], references: [id])
  students   Student[]
}

model Student {
  id              Int       @id @default(autoincrement())
  sectionId       Int
  fullName        String
  username        String    @unique      // generado: sofia_m
  age             Int
  pinHash         String
  avatarColor     String
  coins           Int       @default(0)  // monedas Waddles (premio), NO bolívares
  xp              Int       @default(0)
  failedPinCount  Int       @default(0)
  lockedUntil     DateTime?
  lastLoginAt     DateTime?
  totalPlaySecs   Int       @default(0)
  createdAt       DateTime  @default(now())
  section         Section   @relation(fields: [sectionId], references: [id])
  moduleProgress  ModuleProgress[]
  submoduleProg   SubmoduleProgress[]
  attempts        Attempt[]
  journalAttempts JournalAttempt[]
  journalEntries  JournalEntry[]
  badges          StudentBadge[]
  sessions        PlaySession[]
  rewards         RewardGrant[]
}

model LearningModule {
  id          Int     @id @default(autoincrement())
  order       Int     @unique       // 1..5 (orden de desbloqueo)
  code        String  @unique       // "M1"
  title       String
  color       String
  lessons     Lesson[]
  quizzes     Quiz[]
  scenarios   Scenario[]
  badge       Badge?
  progress    ModuleProgress[]
  subProgress SubmoduleProgress[]
  sessions    PlaySession[]
}

model Lesson {
  id        Int            @id @default(autoincrement())
  moduleId  Int
  order     Int
  title     String
  blocks    ContentBlock[]
  module    LearningModule @relation(fields: [moduleId], references: [id])
  @@unique([moduleId, order])
}

model ContentBlock {
  id        Int     @id @default(autoincrement())
  lessonId  Int
  order     Int
  kind      String  // "text" | "image" | "diagram" | "waddles_tip"
  text      String?
  assetPath String?
  lesson    Lesson  @relation(fields: [lessonId], references: [id])
  @@unique([lessonId, order])
}

model Quiz {
  id        Int            @id @default(autoincrement())
  moduleId  Int
  type      SubmoduleType  // QUIZ o EXAM
  title     String
  questions Question[]
  module    LearningModule @relation(fields: [moduleId], references: [id])
  attempts  Attempt[]
  @@unique([moduleId, type])
}

model Question {
  id          Int      @id @default(autoincrement())
  quizId      Int
  order       Int
  kind        String   // "single_choice" | "classify" | "balance" | "numeric"
  prompt      String
  hint        String   // pista de Waddles
  explanation String   // feedback al responder
  payload     Json?    // datos extra para "classify"/"balance"
  quiz        Quiz     @relation(fields: [quizId], references: [id])
  options     AnswerOption[]
  answers     AttemptAnswer[]
  @@unique([quizId, order])
}

model AnswerOption {
  id         Int      @id @default(autoincrement())
  questionId Int
  order      Int      // v1.3: posición dentro de la pregunta (clave del upsert del seed)
  text       String
  isCorrect  Boolean
  question   Question @relation(fields: [questionId], references: [id])
  @@unique([questionId, order])
}

model Attempt {
  id         Int       @id @default(autoincrement())
  studentId  Int
  quizId     Int
  startedAt  DateTime  @default(now())
  finishedAt DateTime?
  score      Int?
  passed     Boolean?
  stars      Int?      // v1.3: 0–3, estrellas de esfuerzo
  student    Student   @relation(fields: [studentId], references: [id])
  quiz       Quiz      @relation(fields: [quizId], references: [id])
  answers    AttemptAnswer[]
}

model AttemptAnswer {
  id               Int      @id @default(autoincrement())
  attemptId        Int
  questionId       Int
  tryNumber        Int      @default(1)   // v1.3: 1 o 2 (reintento tras la pista)
  selectedOptionId Int?
  freeAnswer       Json?
  isCorrect        Boolean
  timeSeconds      Int
  attempt          Attempt  @relation(fields: [attemptId], references: [id])
  question         Question @relation(fields: [questionId], references: [id])
  @@unique([attemptId, questionId, tryNumber])
}

// ---- Simulador contable (Libro Diario / Mayor / Balance) ----
model LedgerAccount {
  id     Int           @id @default(autoincrement())
  code   String        @unique   // formato corto: "1.1", "4.1"
  name   String                  // "Caja (mi alcancía)"
  type   AccountType
  nature AccountNature
  lines  JournalLine[]
}

// Una historia con varias operaciones en orden (ej. "La semana de la limonada").
// El Libro Mayor y el Balance de Comprobación se arman POR ESCENARIO.
model Scenario {
  id          Int                @id @default(autoincrement())
  moduleId    Int
  code        String             @unique   // "M5_LEMONADE_WEEK"
  title       String                       // "Mi puesto de limonada"
  description String?
  module      LearningModule     @relation(fields: [moduleId], references: [id])
  exercises   PracticeExercise[]
}

// Una operación del escenario = un asiento que el niño debe registrar.
model PracticeExercise {
  id         Int              @id @default(autoincrement())
  scenarioId Int
  order      Int                         // 1..N dentro del escenario
  dayLabel   String                      // "Día 2"
  statement  String                      // "Vendes 4 vasos de limonada y te pagan Bs. 80 en efectivo."
  hint       String                      // pregunta guía de Waddles
  solution   Json                        // asiento esperado: [{ accountCode: "1.1", debit: 80 }, { accountCode: "4.1", credit: 80 }]
  scenario   Scenario         @relation(fields: [scenarioId], references: [id])
  attempts   JournalAttempt[]
  entries    JournalEntry[]
  @@unique([scenarioId, order])
}

// Cada vez que el niño toca "Revisar asiento" (correcto o no). NO alimenta el Mayor.
model JournalAttempt {
  id         Int              @id @default(autoincrement())
  studentId  Int
  exerciseId Int
  submitted  Json                        // líneas enviadas: [{ accountCode, debit, credit }]
  isCorrect  Boolean
  errorCode  String?                     // primer error: "MISSING_SIDE" | "WRONG_SIDE" | "WRONG_ACCOUNT" | "UNBALANCED" | "WRONG_AMOUNT" | "MISSING_ACCOUNT"
  createdAt  DateTime         @default(now())
  student    Student          @relation(fields: [studentId], references: [id])
  exercise   PracticeExercise @relation(fields: [exerciseId], references: [id])
}

// Asiento del Libro Diario: SOLO se crea cuando el intento es correcto.
model JournalEntry {
  id         Int              @id @default(autoincrement())
  studentId  Int
  exerciseId Int
  entryDate  DateTime         @default(now())
  student    Student          @relation(fields: [studentId], references: [id])
  exercise   PracticeExercise @relation(fields: [exerciseId], references: [id])
  lines      JournalLine[]
  @@unique([studentId, exerciseId])   // un asiento correcto por operación y alumno
}

model JournalLine {
  id        Int           @id @default(autoincrement())
  entryId   Int
  accountId Int
  debit     Decimal       @default(0) @db.Decimal(10,2)
  credit    Decimal       @default(0) @db.Decimal(10,2)
  entry     JournalEntry  @relation(fields: [entryId], references: [id])
  account   LedgerAccount @relation(fields: [accountId], references: [id])
}
// Libro Mayor y Balance de Comprobación se CALCULAN (no se guardan) desde las JournalLine
// de los JournalEntry del alumno cuyo exercise.scenarioId = escenario pedido.
// Como JournalEntry solo existe para asientos correctos, los intentos fallidos nunca entran.

// ---- Progreso y gamificación ----
model ModuleProgress {
  id           Int            @id @default(autoincrement())
  studentId    Int
  moduleId     Int
  status       ProgressStatus @default(LOCKED)
  percent      Int            @default(0)
  bestScore    Int?
  updatedAt    DateTime       @updatedAt
  student      Student        @relation(fields: [studentId], references: [id])
  module       LearningModule @relation(fields: [moduleId], references: [id])
  @@unique([studentId, moduleId])
}

model SubmoduleProgress {
  id         Int            @id @default(autoincrement())
  studentId  Int
  moduleId   Int
  type       SubmoduleType
  status     ProgressStatus @default(LOCKED)
  attempts   Int            @default(0)
  bestScore  Int?
  bestStars  Int?           // v1.3
  timeSecs   Int            @default(0)
  student    Student        @relation(fields: [studentId], references: [id])
  module     LearningModule @relation(fields: [moduleId], references: [id])
  @@unique([studentId, moduleId, type])
}

model Badge {
  id        Int            @id @default(autoincrement())
  moduleId  Int?           @unique
  name      String
  imagePath String
  module    LearningModule? @relation(fields: [moduleId], references: [id])
  owners    StudentBadge[]
}

model StudentBadge {
  studentId Int
  badgeId   Int
  earnedAt  DateTime @default(now())
  student   Student  @relation(fields: [studentId], references: [id])
  badge     Badge    @relation(fields: [badgeId], references: [id])
  @@id([studentId, badgeId])
}

// v1.3: cada premio se paga UNA sola vez (idempotencia) y queda como historial.
// key: "LESSON:M1", "QUIZ:M1", "EXAM:M1"… Student.coins/xp siguen siendo el total.
model RewardGrant {
  id        Int      @id @default(autoincrement())
  studentId Int
  key       String
  xp        Int      @default(0)
  coins     Int      @default(0)
  createdAt DateTime @default(now())
  student   Student  @relation(fields: [studentId], references: [id])
  @@unique([studentId, key])
}

model PlaySession {             // CU-07 / CU-12
  id         Int             @id @default(autoincrement())
  studentId  Int
  moduleId   Int?
  startedAt  DateTime        @default(now())
  endedAt    DateTime?
  activeSecs Int             @default(0)   // por heartbeat cada 30 s
  student    Student         @relation(fields: [studentId], references: [id])
  module     LearningModule? @relation(fields: [moduleId], references: [id])
}

model SystemSettings {
  id                    Int @id @default(1)
  minPassingScore       Int @default(70)   // %
  highTimeThresholdMins Int @default(60)   // alerta "¡Tiempo alto!"
  maxPinAttempts        Int @default(5)
  pinLockMinutes        Int @default(5)
}
```

---

## 9. API REST (prefijo `/api/v1`)

| Método y ruta | Rol | Caso de uso |
|---|---|---|
| `POST /auth/teacher/login` | público | CU-01.2 |
| `GET /auth/students?sectionCode=` | público | lista de avatares de **una** sección (`Section.code`) |
| `POST /auth/student/login` `{studentId, pin}` | público | CU-01.1 |
| `POST /auth/refresh`, `POST /auth/logout` | auth | |
| `GET /me/map` | estudiante | CU-02 (módulos + estado + monedas/XP) |
| `GET /modules/:id` | estudiante | CU-03 (3 submódulos y su estado). `:id` = id o código (`M1`); módulo cerrado → 403 `CONTENT_LOCKED` |
| `GET /lessons/:id` · `POST /lessons/:id/complete` | estudiante | CU-04 |
| `GET /quizzes/:id` · `POST /quizzes/:id/attempts` · `POST /attempts/:id/answers` · `POST /attempts/:id/finish` | estudiante | CU-05, CU-06, CU-06.1 |
| `GET /scenarios/:id` | estudiante | operaciones del escenario + cuáles ya registró |
| `POST /exercises/:id/journal-attempts` | estudiante | Libro Diario: guarda el intento; si es correcto crea el `JournalEntry` y devuelve +XP; si no, devuelve el **primer** `errorCode` |
| `GET /me/scenarios/:id/journal` · `GET /me/scenarios/:id/ledger` · `GET /me/scenarios/:id/trial-balance` | estudiante | Diario, Mayor y Balance del escenario (solo asientos correctos) |
| `GET /me/rewards` · `GET /me/profile` · `PATCH /me/settings` | estudiante | |
| `POST /sessions/heartbeat` | estudiante | CU-07 |
| `GET /teacher/dashboard?sectionId=` | docente | CU-08 (4 KPIs) |
| `GET/POST/PATCH/DELETE /teacher/students` · `POST /teacher/students/:id/reset-pin` | docente | CU-09, CU-10 |
| `GET /teacher/students/:id/progress` | docente | CU-11 |
| `GET /teacher/time-control?sectionId=` | docente | CU-12 |
| `GET /teacher/reports?scope=group|student&format=xlsx|pdf` | docente | CU-13 |

Reglas de negocio en el backend (nunca confiar en el cliente): cálculo de nota, otorgamiento de monedas/XP/medallas, desbloqueo de módulos, validación del asiento (`Σdebe = Σhaber`, cuentas y montos iguales a `PracticeExercise.solution`).

---

## 10. Pantallas y su referencia

| Pantalla | Referencia en `docs/design-refs/` | Notas |
|---|---|---|
| Bienvenida: ¿Docente o Estudiante? | `ContiKids · Pantallas de inicio de sesión.html` (lienzo 2) | Panel teal con logo a la izquierda en desktop; en móvil logo arriba |
| Login docente | mismo archivo (lienzos 1 y 3) | |
| Código de sección → elegir perfil + PIN + PIN incorrecto | `contikids (5).html` + lienzos 4–6 | Teclado numérico grande; mensaje amable al fallar |
| Mapa de islas + zoom | `mapa_de_progresi_n_contikids.html` (layout) + `contikids (5).html` (estilo) | En móvil: camino vertical con scroll; los 5 nodos deben verse sin solaparse |
| Lección | `lecci_n_interactiva_el_mundo_del_dinero.html` | Paso X de N, Waddles en lugar del sol |
| Quiz | `quiz_interactivo_el_mundo_del_dinero.html` | Opciones en 1 columna en móvil |
| Prueba / Reto final | `evaluaci_n_el_mundo_del_dinero.html` | Botones de clasificación debajo del enunciado en móvil |
| Libro Diario | `libro_diario_propuesta.html` | Mockup aprobado — ver §11 |
| Libro Mayor / Balance | **No existe referencia — diseñar** | Ver §11 |
| Recompensas | `recompensas_contikids.html` | Grid 1 col (móvil) / 3 col (desktop) |
| Perfil | `perfil_del_estudiante_contikids.html` | Agregar medallas y progreso por módulo |
| Configuración | `configuraci_n_contikids.html` | Sonido, recordatorios, tema claro/oscuro |
| Panel docente | `WhatsApp Image ...21.57.42.jpeg` (mockup) | **No mostrar PINs**; tabla → tarjetas en móvil |

Las imágenes con URL `lh3.googleusercontent.com` en los HTML son temporales y **no cargan**: reemplazarlas por assets locales en `apps/web/src/assets`.

---

## 11. Simulador contable (pieza central de la nota)

Referencia visual: `docs/design-refs/libro_diario_propuesta.html` (mockup aprobado para construir).
Al pasarlo a la app: Waddles va como asset (`apps/web/src/assets`), no como base64; fuentes self-hosted; la validación del asiento la hace el backend (el mockup valida en el navegador solo para la demo).

### 11.1 Plan de cuentas infantil (seed)
| Código | Cuenta (nombre para niños) | Tipo | Naturaleza |
|---|---|---|---|
| 1.1 | Caja (mi alcancía) | Activo | Deudora |
| 1.2 | Banco (mi cuenta de ahorro) | Activo | Deudora |
| 1.3 | Mercancía (limones, vasos, azúcar) | Activo | Deudora |
| 2.1 | Préstamos por pagar (lo que debo) | Pasivo | Acreedora |
| 3.1 | Capital (lo que es mío) | Patrimonio | Acreedora |
| 4.1 | Ventas (lo que vendí) | Ingreso | Acreedora |
| 5.1 | Gastos (lo que pagué) | Gasto | Deudora |

### 11.2 Libro Diario — pantalla "Registra la operación"
Cada pantalla es una operación (`PracticeExercise`) de un escenario (`Scenario`). Flujo (mobile-first):
1. **Tarjeta de la operación** arriba: día, dibujo y enunciado. Ej.: *"Día 2 — Vendes 4 vasos de limonada y te pagan Bs. 80 en efectivo."*
2. **Pregunta guía de Waddles** (andamiaje, se puede ocultar): "¿Qué cuenta **recibe** el dinero? ¿De dónde **sale**?"
3. **Banco de cuentas**: fichas de colores (una por cuenta del plan). Se **arrastran** (dnd-kit, táctil) o se **tocan** y luego se toca la columna destino (alternativa accesible obligatoria).
4. **Asiento** con dos zonas: **DEBE (entra / recibe)** en verde y **HABER (sale / entrega)** en azul. Cada ficha soltada pide el monto con un **teclado numérico grande** propio (no el teclado del sistema).
5. **Balanza en vivo** abajo: muestra Σ Debe vs Σ Haber y se inclina; al igualarse, se nivela con animación.
6. Botón **"Revisar asiento"** → `POST /exercises/:id/journal-attempts`. **Cada intento se guarda en `JournalAttempt`** (para el docente: cuántos intentos, qué error).
   - Correcto → se crea el `JournalEntry` + `JournalLine`, confeti, +XP, el asiento pasa a la tabla del **Libro Diario** (N.º, día, cuenta, debe, haber, glosa).
   - Incorrecto → **no** se crea `JournalEntry`. Waddles señala SOLO el primer error según `errorCode` ("La Caja recibió dinero, ¿va en el Debe o en el Haber?"). Sin perder nada.
- Responsive: en 360px todo en una columna (operación → banco de cuentas en scroll horizontal → Debe → Haber → balanza fija abajo). En ≥1024px: operación a la izquierda, asiento a la derecha, tabla del Diario debajo.

### 11.3 Libro Mayor — "Las cajas T"
- Se arma con los **asientos correctos del escenario** (nunca con intentos fallidos).
- Una **cuenta T** por cuenta usada (título arriba, Debe a la izquierda, Haber a la derecha).
- Ejercicio: el niño toca un renglón del Diario y lo **lleva** a la T correcta y al lado correcto.
- Al final de cada T se calcula el **saldo** (el niño elige "¿de qué lado queda el saldo?").
- En móvil: carrusel de cuentas T (deslizar), una por pantalla.

### 11.4 Balance de Comprobación — "¿Cuadra la balanza?"
- Se calcula con los **asientos correctos del escenario**.
- Tabla: Cuenta | Suma Debe | Suma Haber | Saldo deudor | Saldo acreedor.
- El niño completa 2–3 celdas vacías y verifica que **Total Debe = Total Haber**.
- Si cuadra: la balanza gigante de Waddles se equilibra + medalla. Si no: resalta la fila con error.
- En móvil: tabla con columnas fijas y scroll horizontal SOLO dentro de la tabla, o vista de tarjetas por cuenta.

### 11.5 Desafío final (Módulo 5 — escenario "Mi puesto de limonada")
Un `Scenario` con **exactamente 6 operaciones** (`PracticeExercise`, order 1–6) de una semana:
1. Aporto mis ahorros para empezar el puesto (Caja / Capital).
2. Compro limones (Mercancía / Caja).
3. Vendo limonada (Caja / Ventas).
4. Un familiar me presta dinero (Caja / Préstamos por pagar).
5. Pago el préstamo (Préstamos por pagar / Caja).
6. Compro vasos (Gastos / Caja).

→ registrar las 6 en el Diario → mayorizar → Balance de Comprobación → ver la ganancia de la semana (Ventas − Gastos). Todos los montos en Bs., redondos y pequeños; los define el equipo de Contenido.

---

## 12. Seguridad y privacidad (son menores de edad)

- No guardar apellidos completos ni datos sensibles más allá de lo necesario.
- **El PIN nunca se muestra ni se exporta** (se guarda como hash y no se puede leer). En el panel docente la columna PIN se elimina. Flujo correcto: botón **"Restablecer PIN"** → el sistema genera un PIN nuevo → se muestra **una sola vez** al docente en un modal ("Anótalo y entrégaselo a Sofía") → desde ahí solo existe el hash.
- PIN y contraseña con argon2; bloqueo temporal tras `maxPinAttempts` fallidos.
- El login de estudiante solo lista los perfiles de **una sección**, identificada por `Section.code` (código que se escribe en el dispositivo del aula).
- HTTPS obligatorio; CORS restringido al dominio; headers con `helmet`.
- Variables en `.env` (nunca commitear). Proveer `.env.example`.

---

## 13. Convenciones

- Commits: **Conventional Commits** (`feat:`, `fix:`, `docs:`…). Ramas `feat/<tema>`; `main` protegida.
- ESLint + Prettier; `strict: true` en tsconfig.
- Tests: Vitest (web), Jest (api) para reglas de negocio (nota, desbloqueo, validación de asiento, cálculo de Mayor/Balance por escenario).
- Accesibilidad: `aria-label` en botones de ícono, foco visible amarillo `#ecc911`, contraste AA.

---

## 14. Plan de trabajo por fases

1. **Fase 0 — Base:** monorepo pnpm, Docker Compose (Postgres), NestJS + Prisma + seed (módulos, contenido del prototipo, plan de cuentas, escenario de la limonada), Vite + Tailwind con tokens §5, CI.
2. **Fase 1 — Acceso:** bienvenida, login docente, código de sección + perfiles + PIN, guards por rol.
3. **Fase 2 — Estudiante:** mapa con desbloqueo, lección, quiz, prueba, monedas/XP/medallas, Módulo 1 completo de punta a punta.
4. **Fase 3 — Simulador contable:** Diario, Mayor, Balance por escenario (Módulos 4 y 5).
5. **Fase 4 — Docente:** dashboard KPIs, CRUD alumnos, progreso M1–M5, control de tiempos, reportes Excel/PDF.
6. **Fase 5 — Pulido:** PWA offline, sonidos, modo oscuro, pruebas en Android 360px, despliegue en VPS con HTTPS.

**Definición de terminado de cada pantalla:** funciona en 360px sin scroll horizontal, tiene estados de carga/vacío/error, y usa los tokens §5.

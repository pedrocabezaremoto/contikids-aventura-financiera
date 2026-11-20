# CONTIKIDS — Plan de la Fase 2 (Estudiante)

> Estado: **PLAN, sin código.** Esperando el OK de Pedro para empezar la 2.1.
> Fecha: 2026-11-20. Base: `docs/CONTIKIDS_CONTEXTO_LLM.md` v1.2 (§6, §7, §8, §9, §10) y el repo en `32fe911`.
> Alcance (§14): mapa con desbloqueo, lección, quiz, prueba, monedas/XP/medallas, **Módulo 1 completo de punta a punta**.
> Fuera de alcance: simulador contable (Fase 3), panel docente (Fase 4), PWA/sonidos/modo oscuro (Fase 5).

---

## 1. Qué ya existe y qué falta

### 1.1 Lo que ya hay
| Pieza | Estado |
|---|---|
| Schema Prisma | **Idéntico a §8 v1.2** (verificado con diff). Ya tiene `ModuleProgress`, `SubmoduleProgress`, `Attempt`, `AttemptAnswer`, `Badge`, `StudentBadge`, `PlaySession`, `Student.coins/xp/totalPlaySecs` y `SystemSettings.minPassingScore`. |
| Seed | 5 módulos con su medalla (`imagePath` = `/badges/mN.webp`, **el archivo no existe**). M1: 1 lección (7 bloques), quiz con **2 preguntas** `single_choice` y prueba con **1 pregunta** `classify` (4 ítems). M2–M5: una lección placeholder y **sin quiz ni prueba**. Plan de cuentas y escenario de la limonada (Fase 3). |
| API | Solo `auth`, `health` y las rutas provisionales `/student/home` y `/teacher/home`. `AuthGuard` + `@Roles` listos. JWT con `sub` = id del alumno. |
| Web | React Router 7 con `RequireRole`. `/mapa` es provisional (saludo + Salir). Componentes `Screen`, `Logo`, `Avatar`, `Waddles`, `PinPad`. **No hay** TanStack Query, Zustand, Framer Motion, confetti ni dnd-kit. |
| Bundle | JS inicial **88 KB gzip** (presupuesto §5: < 200 KB). Quedan ~110 KB. |
| Tests | Jest en la api (14). Vitest en `packages/shared` (7). La web no tiene tests. El CI **no tiene BD**. |

### 1.2 Lo que falta en el modelo de datos (propuesta §8 → v1.3)
Todo es **aditivo** (columnas nuevas con default o una tabla nueva). No se borra ni se renombra nada y los datos actuales se conservan. Va en **una sola migración al inicio de la 2.1**, para que las demás sub-fases no toquen el schema.

| Cambio | Por qué |
|---|---|
| `AttemptAnswer.tryNumber Int @default(1)` + `@@unique([attemptId, questionId, tryNumber])` | §7: si falla, hay pista y **reintento** de la misma pregunta (máx. 2). Hay que guardar cada intento para calcular la nota y las estrellas, y para que el docente lo vea. |
| `Attempt.stars Int?` (0–3) | §7: estrellas de esfuerzo al terminar el quiz o la prueba. |
| `SubmoduleProgress.bestStars Int?` | Recompensas y perfil muestran las mejores estrellas sin recalcular. |
| `AnswerOption.order Int` + `@@unique([questionId, order])` | Hoy el seed busca la opción por **(pregunta, texto)**. Si Contenido cambia el texto de una opción, queda una opción vieja huérfana que **se seguiría mostrando**. Con `order`, el seed hace `upsert` como en las demás tablas. La migración rellena `order` con `ROW_NUMBER()` por pregunta. |
| Tabla nueva **`RewardGrant`** `(id, studentId, key String, xp Int, coins Int, createdAt)` + `@@unique([studentId, key])` | Hace **idempotente** cada premio. `key` = `LESSON:M1`, `QUIZ:M1`, `EXAM:M1`, etc.: un doble toque, un reintento de red o repetir la actividad nunca pagan dos veces. Además queda el historial para "Recompensas" y los reportes de la Fase 4. `Student.coins/xp` siguen siendo el total y se actualizan **en la misma transacción**. |

Lo que **no** cambia: `ProgressStatus` se queda con 3 valores (`LOCKED` = cerrado, `IN_PROGRESS` = abierto/actual, `COMPLETED`); no hace falta un estado `AVAILABLE`. `AttemptAnswer.selectedOptionId` sigue sin FK (como en §8). Los ajustes del alumno (sonido, tema) se quedan para la Fase 5.

Proceso de la migración (igual que en la Fase 1): `prisma migrate diff` → archivo con el SQL de relleno de `order` agregado a mano → `migrate deploy` (lo corre el servicio `migrate` en cada deploy). Se actualizan §8 a **v1.3** y su historial en el mismo commit.

---

## 2. Reglas de negocio de la Fase 2 (todas en el backend)

Funciones **puras** en la api, con tests Jest (§13). Los servicios solo leen o escriben en Prisma alrededor de ellas.

| Regla | Propuesta (las marcadas con ❓ están en §5) |
|---|---|
| **Desbloqueo** | M1 → Lección abierta. Lección completada → abre Quiz. Quiz **terminado** (con cualquier nota) → abre Prueba ❓. Prueba aprobada → módulo `COMPLETED` y se abre la Lección del siguiente. Un módulo sin quiz o prueba en la BD se muestra como **"Próximamente"** aunque esté abierto. |
| **Estado del mapa** | `computeMap(modules, progressRows)` se calcula al leer. Las filas de progreso se escriben solo cuando pasa algo (lección completada, intento terminado). Si el alumno no tiene filas, tiene M1 abierto: no hace falta sembrar progreso en los alumnos actuales. |
| **Reintento** | Máx. **2 intentos por pregunta**. 1.er fallo → `hint`. 2.º fallo → `explanation` + respuesta correcta, y se sigue. Acierto → `explanation` + diagrama `result`. |
| **Nota (0–100)** | Acierto al 1.er intento = 1 punto; al 2.º = 0,5; nunca = 0 ❓. Nota = puntos / preguntas × 100, redondeada. |
| **Aprobar la prueba** | `score ≥ SystemSettings.minPassingScore` (70 %). Se puede repetir siempre. |
| **Estrellas** | 3 ⭐ = todo al 1.er intento · 2 ⭐ = necesitó pista en ≤ 1/3 de las preguntas · 1 ⭐ = lo terminó. Siempre ≥ 1. |
| **XP** | Lección +20, Quiz +30, Prueba +50 (§7). Constantes en `packages/shared/rewards.ts`; pasar a `SystemSettings` en la Fase 4 si el docente las quiere cambiar. |
| **Monedas Waddles** | Quiz: +1 por pregunta acertada (1.er o 2.º intento). Prueba: **+5 de bono** al aprobar ❓. |
| **Repetir** | XP y monedas **solo la primera vez** que se completa cada submódulo (`RewardGrant`) ❓. Repetir mejora la nota y las estrellas guardadas, pero no paga de nuevo. |
| **Medalla** | Al aprobar la prueba del módulo → `StudentBadge` (la PK compuesta ya la hace idempotente). |
| **Concurrencia** | `finish` usa `updateMany({ where: { id, finishedAt: null } })`: solo el primer request "gana" y paga, todo dentro de `prisma.$transaction`. |
| **No filtrar respuestas** | `GET /quizzes/:id` nunca envía `isCorrect` ni el `bucket` de los ítems `classify`. El serializador tiene su propio test. |
| **Propiedad** | Todo endpoint `/attempts/:id/*` comprueba `attempt.studentId === sub`; si no coincide, responde 404 (no revela que existe). |
| **Contenido cerrado** | Pedir una lección, quiz o prueba bloqueada → **403** `code: CONTENT_LOCKED` (el 423 ya es del PIN bloqueado). |

---

## 3. Sub-fases

Cada sub-fase cierra con un commit (Conventional Commits) y su push, que despliega solo. Se prueba en el dominio con un alumno demo, a 360 px, con estados de carga, vacío y error. Se cierra con resumen + cómo probarla, y **no se pasa a la siguiente sin el OK de Pedro**.

### 2.1 — Mapa de islas (y la base de progreso)
**Demo en el dominio:** el alumno entra y ve su mapa: M1 abierto, M2–M5 con candado, monedas y XP arriba y barra inferior. Al tocar M1 se acerca (zoom) a sus 3 submódulos: Lección abierta, Quiz y Prueba cerrados.

- **Schema:** migración v1.3 completa (§1.2) + §8 → v1.3 en el contexto + seed de `AnswerOption` por `order`.
- **API** (módulo Nest `progress` + `student-map`):
  - `GET /me/map` → 5 módulos `{id, code, order, title, color, status, percent, comingSoon}` + `{coins, xp}`.
  - `GET /modules/:id` → los 3 submódulos `{type, status, refId (lessonId/quizId), bestScore, bestStars}`.
  - Se quita `GET /student/home` (provisional).
- **Web:**
  - Agregar **TanStack Query** (~13 KB gzip).
  - Layout del estudiante: HUD (monedas, XP) + **barra inferior** Mapa · Recompensas · Perfil (las dos últimas como "próximamente" hasta la 2.5; Perfil ya trae **Salir**). En ≥ 1024 px, sidebar.
  - `/mapa`: camino vertical con scroll, 5 islas en rombo con su color, sin solaparse a 360 px.
  - `/mapa/:code` (ej. `/mapa/m1`): "zoom" a los 3 submódulos. Transición CSS (respetando `prefers-reduced-motion`); Framer Motion solo si la CSS no alcanza ❓.
  - El HUD toma monedas y XP de `/me/map` (no del `user` del login, que queda viejo).
- **Pruebas:**
  - Jest de `computeMap`: alumno sin filas → M1 abierto; lección hecha → quiz abierto; prueba aprobada → M2 abierto; módulo sin prueba → `comingSoon`.
  - Jest: el docente recibe 403 en `/me/map`.
  - Capturas con Chrome headless a 360/390/1366 px.
  - Bundle < 200 KB gzip.

### 2.2 — Lección paso a paso
**Demo:** M1 → Lección → "Paso 1 de N" con diagramas y Waddles → al final, celebración con "+20 XP" → el Quiz queda abierto en el mapa.

- **Shared:** `parseDiagram(text)` en `packages/shared` (notación del prototipo: `>` flecha, `COIN`, `PIG`, `N COIN`, `@g/@r/@b` etiqueta verde/roja/azul, `_` = espacio, emojis), con tests Vitest.
- **API** (módulo `lessons` + servicio `rewards`):
  - `GET /lessons/:id` → bloques en orden (403 si está cerrada).
  - `POST /lessons/:id/complete` `{timeSecs}` → LESSON `COMPLETED`, QUIZ `IN_PROGRESS`, `percent` = 33, +20 XP (`RewardGrant LESSON:M1`). Es idempotente: responde lo mismo la segunda vez, sin pagar.
- **Web:**
  - `/mapa/m1/leccion`: barra "Paso X de N", Waddles (en lugar del sol del mockup), Atrás/Siguiente de 56 px.
  - Un **paso** = un bloque `diagram`/`image` + los `text` que le siguen. `waddles_tip` va al final. No hace falta cambiar el schema.
  - Componente `<Diagram>` con íconos locales para `COIN` (moneda con cerdito, distinta de los Bs.) y `PIG`.
  - **Emojis:** subset local de SVG ❓ (en la Fase 1 ya se vieron como cuadros en algunos equipos).
  - Agregar **canvas-confetti** (~4 KB).
- **Pruebas:**
  - Vitest de `parseDiagram` con todos los bloques del seed.
  - Jest: `complete` dos veces → XP una sola vez; lección cerrada → 403.
  - Integración con una BD de pruebas para la transacción ❓.

### 2.3 — Quiz con pista y reintento
**Demo:** Quiz de M1 de una pregunta por pantalla. Si falla, Waddles da la pista y se reintenta; al 2.º fallo, explica y sigue. El resultado muestra las estrellas, las monedas ganadas y el +30 XP. La Prueba queda abierta.

- **API** (módulos `quizzes` + `attempts`):
  - `GET /quizzes/:id` → preguntas sin respuestas (las opciones van ordenadas por `order`; el cliente las baraja).
  - `POST /quizzes/:id/attempts` → crea el `Attempt`.
  - `POST /attempts/:id/answers` `{questionId, optionId?, items?: number[], timeSeconds}` → `{correct, tryNumber, questionDone, hint?, explanation?, correctOptionId?, result?}`. Rechaza una 3.ª respuesta o responder tras `finish` (409).
  - `POST /attempts/:id/finish` → valida que todas las preguntas estén cerradas, calcula nota y estrellas, paga (`QUIZ:M1`: +30 XP + monedas), abre la Prueba y suma `attempts`, `bestScore`, `bestStars` y `timeSecs` (tiempo por respuesta tope 600 s).
  - Calificadores puros: `gradeSingleChoice` y `gradeClassify`. `numeric` y `balance` se dejan para cuando M2/M3 tengan contenido.
- **Web:**
  - `/mapa/m1/quiz`: opciones en 1 columna en móvil, feedback inmediato (correcto: animación; incorrecto: pista amable, nunca "¡Mal!").
  - Pantalla de resultado con 0–3 ⭐, "+N monedas" y "+30 XP".
  - Sin corazones ni vidas (§7).
- **Pruebas** (Jest):
  - calificación y nota (1 / 0,5 / 0);
  - estrellas (los 3 casos);
  - el serializador no envía `isCorrect` ni `bucket`;
  - el intento de otro alumno → 404;
  - 3.ª respuesta → 409;
  - `finish` doble → paga una vez;
  - `finish` incompleto → 409.

### 2.4 — Prueba, desbloqueo y medalla
**Demo:** Prueba de M1 con clasificación por botones debajo del enunciado. Al aprobar: medalla "Maestro del Dinero" + confeti + XP y monedas, y en el mapa M1 queda completo y **M2 se abre** (con su lección placeholder; su quiz y su prueba salen "Próximamente"). Si no aprueba: Waddles anima y aparece "Repasar la lección".

- **API:** reutiliza el motor de intentos con `Quiz.type = EXAM`.
  - Abrir la prueba exige el QUIZ `COMPLETED`.
  - `finish` con `passed`: EXAM y módulo `COMPLETED` (100 %), `ModuleProgress.bestScore`, siguiente módulo `IN_PROGRESS` + su LESSON `IN_PROGRESS`, `StudentBadge`, `RewardGrant EXAM:M1` (+50 XP + 5 monedas).
- **Web:**
  - `/mapa/m1/prueba`: `classify` con un botón por categoría por ítem (la referencia ya usa botones; **dnd-kit queda para la Fase 3**).
  - Resultado: aprobado = medalla grande + confeti; no aprobado = mensaje motivador + "Repasar la lección" + "Intentar otra vez".
  - Medalla provisional en SVG (§4).
- **Pruebas** (Jest):
  - borde 69 / 70 %;
  - la cadena de desbloqueo M1 → M2;
  - la medalla y el pago no se repiten al volver a aprobar;
  - la prueba con el quiz sin terminar → 403.

### 2.5 — Recompensas y perfil
**Demo:** pestañas Recompensas (monedas, XP, medallas ganadas y por ganar, estrellas por módulo, últimos premios) y Perfil (avatar, nombre, sección, progreso M1–M5 y Salir).

- **API:**
  - `GET /me/rewards` → `{coins, xp, badges: [{name, imagePath, moduleCode, earnedAt?}], stars: [...], recent: RewardGrant[10]}`.
  - `GET /me/profile`.
- **Web:**
  - `/recompensas`: grid de 1 columna en móvil y 3 en desktop (`recompensas_contikids.html`).
  - `/perfil` (`perfil_del_estudiante_contikids.html` + medallas y progreso por módulo, §10).
  - "Ajustes" queda fuera de la barra hasta la Fase 5 ❓.
- **Pruebas:** Jest de los dos endpoints (alumno sin nada / con M1 completo), capturas a 360 px.

### 2.6 — Módulo 1 completo de punta a punta + demo
**Demo:** un alumno nuevo recorre todo M1 en el dominio (lección completa con trueque y necesidad vs deseo, quiz de 5, prueba de 6) y gana la medalla. Además, los 6 alumnos demo muestran **progreso variado** para la presentación.

- **Seed:**
  - Contenido provisional de M1 (§4.1), marcado `// PROVISIONAL — Contenido`.
  - El seed borra los `ContentBlock` sobrantes (order > N). Si una pregunta del seed desaparece y ya tiene respuestas, avisa en consola en vez de borrarla.
  - **Progreso demo** coherente con las monedas y el XP de cada alumno (ej. Camila: M1 completo + medalla; Luisa: lección hecha; Andrés: nada), con sus `RewardGrant`.
  - `SEED_RESET_DEMO_PROGRESS=1` borra el progreso, intentos y premios **solo de la sección `DEMO-5A`** y lo vuelve a sembrar (para limpiar después de probar en el dominio).
- **Verificación final:**
  - recorrido completo con Chrome headless a 360 px (capturas en el resumen, no en el repo);
  - JS inicial < 200 KB gzip;
  - estados de carga/vacío/error en cada pantalla;
  - las 4 páginas de Pedro siguen igual.
- **Docs:** progreso.md, §9 si cambió algún contrato, y la Fase 2 marcada como terminada.

### 2.7 — Tiempo de juego (opcional ❓)
**Demo:** tras jugar unos minutos, el tiempo activo del alumno aparece en la BD, listo para "Control de tiempos" (Fase 4).

- **API:** `POST /sessions/heartbeat` `{moduleId?}` cada 30 s. Abre o continúa una `PlaySession` (nueva si pasaron > 2 min) y suma `activeSecs` y `Student.totalPlaySecs`, con tope de 30 s por latido.
- **Web:** hook `useHeartbeat` que solo late con la pestaña visible (Page Visibility API).
- **Pruebas:** Jest del tope por latido y del corte de sesión.

### Resumen
| Sub-fase | Pantallas | Endpoints | Schema |
|---|---|---|---|
| 2.1 | Mapa, zoom del módulo, layout + barra inferior | `GET /me/map`, `GET /modules/:id` | Migración v1.3 completa |
| 2.2 | Lección | `GET /lessons/:id`, `POST /lessons/:id/complete` | — |
| 2.3 | Quiz + resultado | `GET /quizzes/:id`, `POST /quizzes/:id/attempts`, `POST /attempts/:id/answers`, `POST /attempts/:id/finish` | — |
| 2.4 | Prueba + resultado/medalla | (mismos de 2.3) | — |
| 2.5 | Recompensas, Perfil | `GET /me/rewards`, `GET /me/profile` | — |
| 2.6 | Recorrido M1 completo | — | Solo seed (contenido + demo) |
| 2.7 | — | `POST /sessions/heartbeat` | — |

---

## 4. Dependencias del Equipo de Contenido y lo provisional para no bloquearnos

| Qué falta | ¿Bloquea la Fase 2? | Provisional |
|---|---|---|
| Lecciones de M1: qué es el dinero, trueque, necesidad vs deseo | Sí (M1 completo) | Texto de §4.1, en el estilo del prototipo y en Bs. |
| Más preguntas de quiz y prueba de M1 | **Sí**: con 1 sola pregunta la prueba da 0, 50 o 100 % | 5 preguntas de quiz y 6 de prueba (§4.1) |
| Arte de las medallas `m1..m5.webp` | No | Componente `<Medal>` en SVG: rombo del color del módulo + ícono + cinta con el nombre. Cuando llegue el arte (WebP 512×512 con fondo transparente, en `apps/web/public/badges/`), se usa `imagePath` con el SVG de respaldo si falla. |
| Estados de Waddles (feliz, pensando, celebrando) | No | El `waddles.png` actual + animación CSS (rebote o giro) |
| Logo con fondo transparente (pendiente de la Fase 1) | No | El actual |
| Montos de la limonada | **No** (es de la Fase 3) | Se quedan los del seed (100, 30, 80, 50, 50, 20). Cuadran: Debe 180 = Haber 180, Caja 130, ganancia Ventas − Gastos = 60. ⚠️ **Para Contenido:** los limones van a Mercancía (activo) y los vasos a Gastos, así que la "ganancia" no descuenta los limones. Decidir antes de la Fase 3 si los limones van a Gastos (ganancia 30) o se explica la diferencia. |
| Lecciones de M2–M5 | No | Se mantiene el placeholder; el mapa muestra "Próximamente". |

### 4.1 Contenido provisional de M1 (para revisión de Contenido)
Notación del prototipo; todo en Bs.; sin la palabra "monedas" en los enunciados (§6).

**Lección "El mundo del dinero"** (7 pasos; los pasos 3–5 y el consejo ya existen):
1. `🐔 ⇄ 🌽 @bTRUEQUE` — Hace mucho tiempo no existía el dinero. La gente **cambiaba** cosas: una gallina por un saco de maíz. Eso se llama **TRUEQUE**. Pero… ¿y si al del maíz no le hacía falta una gallina?
2. `🐔 > COIN > 🌽 @gDINERO` — Por eso se inventó el **DINERO**: todos lo aceptan y sirve para cambiarlo por lo que necesitas. En Venezuela usamos el **bolívar (Bs.)**.
3. Ingreso (existente). 4. Gasto (existente). 5. Ahorro (existente).
6. `🍞 📚 @gNECESIDAD 🎮 🍭 @bDESEO` — Una **NECESIDAD** es algo que te hace falta para vivir o estudiar: comida, útiles, ropa. Un **DESEO** es algo que te gustaría tener, pero puede esperar: un videojuego, una golosina. ¡Primero las necesidades y luego los deseos!
7. Consejo de Waddles (existente).

**Quiz (5, `single_choice`)**: las 2 existentes y además:
3. "Cambias tu trompo por las metras de tu amigo, sin usar dinero. ¿Cómo se llama eso?" → **Trueque** ✓ / Ahorro / Gasto. *Pista:* ¿usaron dinero o cambiaron una cosa por otra?
4. "Recibes Bs. 50 de mesada y gastas Bs. 20. ¿Cuánto ahorras?" → **Bs. 30** ✓ / Bs. 70 / Bs. 20. *Pista:* a lo que recibiste quítale lo que gastaste: 50 − 20.
5. "¿Cuál de estas cosas es una NECESIDAD?" → **Los útiles del colegio** ✓ / Un videojuego nuevo / Una golosina. *Pista:* ¿qué te hace falta para estudiar?

**Prueba (6)**:
1. `classify` Ingreso/Gasto (existente).
2. `classify` Necesidad 🍞 / Deseo 🎮: Comida del almuerzo (N), Un juguete de moda (D), Un cuaderno para clase (N), Una golosina (D).
3. "¿Por qué la gente dejó de usar solo el trueque?" → **Porque no siempre el otro quería lo que tú tenías** ✓ / Porque las gallinas eran muy caras / Porque estaba prohibido.
4. "Tu tío te paga Bs. 20 por ayudarlo a lavar el carro. ¿Qué es?" → **Ingreso** ✓ / Gasto / Deuda.
5. "Tienes Bs. 120 y compras un cuaderno de Bs. 50. ¿Cuánto te queda?" → **Bs. 70** ✓ / Bs. 170 / Bs. 60.
6. "Quieres una pelota de Bs. 100 y tienes Bs. 40. ¿Qué te aconseja Waddles?" → **Ahorrar un poquito cada semana hasta llegar** ✓ / Gastar los Bs. 40 en golosinas / Pedir prestado sin decirle a nadie.

Cada pregunta lleva `hint` y `explanation` en el tono del prototipo (se escriben en la 2.6).

---

## 5. Dudas y decisiones para Pedro
Cada una trae mi recomendación; con un "OK a todo" sigo con las recomendadas.

1. **Nota con reintento:** 1.er intento = 1 punto, 2.º = 0,5, fallo = 0. → *Recomiendo sí.* (Si el 2.º intento valiera completo, todos aprobarían la prueba.)
2. **El quiz no exige nota:** terminarlo, con cualquier resultado, abre la prueba (es práctica). → *Recomiendo sí* (Pere Marquès).
3. **Premios al repetir:** XP y monedas solo la primera vez que se completa cada submódulo; repetir solo mejora la nota y las estrellas. Bono de la prueba = **+5 monedas**. → *Recomiendo sí.* (La alternativa es pagar la diferencia si mejora, pero es más compleja.)
4. **Una lección por módulo con más pasos** (en vez de varias lecciones y una tabla `LessonProgress`). → *Recomiendo una.*
5. **Emojis:** usar un subset local de SVG (~20 archivos de Twemoji, licencia CC-BY 4.0, con crédito en el README) para que no salgan cuadros en Android viejos y siga sin CDN. → *Recomiendo sí.* La alternativa es reemplazarlos por íconos propios (más trabajo).
6. **Rate limit en el aula** ⚠️: hoy los límites van **por IP** (logins 10/min, global 120/min). En una escuela, todos los dispositivos suelen salir por **la misma IP pública**, así que 30 niños entrando a la vez se bloquean. → *Recomiendo* en la 2.1: límite global por **alumno o docente (JWT `sub`)** en las rutas autenticadas y login de estudiante por **IP + `studentId`** (el bloqueo por PIN ya protege cada perfil). Sería tocar código de la Fase 1, por eso pido OK.
7. **BD de pruebas:** crear la base `contikids_test` dentro del mismo contenedor Postgres (sin contenedor nuevo) + un servicio Postgres en el CI, para probar de verdad las transacciones de premios. → *Recomiendo sí* (desde la 2.2).
8. **Probar en el dominio cambia el progreso de los alumnos demo**, porque desarrollo y producción comparten la BD. Lo resuelvo con `SEED_RESET_DEMO_PROGRESS=1` (2.6). ¿Te basta o prefieres ya separar dev y prod?
9. **Tiempo de juego (2.7):** ¿se hace en la Fase 2 para que la Fase 4 ya tenga datos reales, o se deja para la Fase 4? → *Recomiendo hacerlo en la Fase 2.*
10. **Ajustes:** en la Fase 2 la barra inferior lleva Mapa · Recompensas · Perfil (Salir va en Perfil). Ajustes (sonido, tema) entra en la Fase 5. → *Recomiendo sí.*
11. **Dependencias nuevas:** TanStack Query y canvas-confetti; Framer Motion **solo si** el zoom del mapa lo necesita (cargado por ruta). Zustand y dnd-kit esperan a la Fase 3. → *Recomiendo sí.*
12. **Nombres de las medallas:** el seed dice "Maestro del Dinero" y §7 "Maestra del Dinero". Además, §7 sugiere que "Contador Estrella" es por **completar los 5** (medalla global), pero el seed la puso en M5. → No bloquea la Fase 2: ¿lo decide Contenido para la Fase 3?
13. **Contenido provisional de M1 (§4.1):** ¿lo cargo marcado como provisional mientras Contenido entrega el final? → *Recomiendo sí.*

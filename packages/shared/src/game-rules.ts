/**
 * REGLAS DEL JUEGO — el ÚNICO lugar con los números de CONTIKIDS.
 *
 * Puntos, XP, monedas, bono, intentos, estrellas y topes viven aquí y en ningún otro archivo.
 * La api y la web lo importan. Si la profesora pide un ajuste, se cambia solo este archivo
 * (la nota mínima para aprobar NO está aquí: es `SystemSettings.minPassingScore` en la BD).
 *
 * Decisiones de Pedro (docs/FASE2_PLAN.md §5): nota 1 / 0,5 / 0; premios solo la primera vez
 * que se completa cada submódulo + bono de 5 monedas al aprobar la prueba.
 */
export const GAME_RULES = {
  /** Intentos por pregunta: 1.er fallo → pista y reintento; 2.º fallo → explicación y se sigue. */
  maxTriesPerQuestion: 2,

  /** Puntos por pregunta según el intento en que se acierta (nota = puntos / preguntas × 100). */
  points: { firstTry: 1, secondTry: 0.5, fail: 0 },

  /** XP al completar por PRIMERA vez cada submódulo. */
  xp: { lesson: 20, quiz: 30, exam: 50 },

  coins: {
    /** Quiz: monedas por cada pregunta acertada (en el 1.º o el 2.º intento). */
    quizPerCorrect: 1,
    /** Prueba: bono al aprobarla por primera vez. */
    examPassBonus: 5,
  },

  stars: {
    /** 3 ⭐ = todo al 1.er intento. */
    max: 3,
    /** 2 ⭐ = necesitó pista en, como máximo, esta fracción de las preguntas (1/3). */
    twoStarsMaxHintRatio: 1 / 3,
    /** 1 ⭐ = lo terminó (siempre hay al menos 1). */
    min: 1,
  },

  /** Avance del módulo (%) que se muestra en el mapa al completar cada submódulo. */
  modulePercent: { start: 0, lesson: 33, quiz: 66, exam: 100 },

  /** Tope de segundos que cuenta una sola respuesta al sumar el tiempo del submódulo. */
  maxSecondsPerAnswer: 600,
} as const;

export type GameRules = typeof GAME_RULES;

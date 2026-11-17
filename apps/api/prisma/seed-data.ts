/**
 * Datos del seed de CONTIKIDS.
 *
 * - M1 sale del prototipo docs/design-refs/contikids (5).html (constante C[0], "Mi alcancía"),
 *   con los montos de los ejercicios convertidos de "monedas" a bolívares (Bs.).
 *   Los bloques "diagram" conservan la notación visual del prototipo
 *   (COIN = ícono de dinero, PIG = alcancía, @g/@r/@b = etiqueta verde/roja/azul).
 * - M2–M5: solo título + 1 lección placeholder (el contenido lo escribe el equipo).
 * - Todos los datos de personas son FICTICIOS.
 */
import { AccountNature, AccountType, SubmoduleType } from '@prisma/client';

// ---------- Módulos (§6) ----------
export const MODULES = [
  { order: 1, code: 'M1', title: 'Mi alcancía', color: '#ff5757', badge: 'Maestro del Dinero' },
  {
    order: 2,
    code: 'M2',
    title: 'La balanza mágica',
    color: '#7ed957',
    badge: 'Guardián de la Balanza',
  },
  {
    order: 3,
    code: 'M3',
    title: 'Las cajas del tesoro',
    color: '#3e6aa8',
    badge: 'Cazador de Tesoros',
  },
  {
    order: 4,
    code: 'M4',
    title: 'Mis libros contables',
    color: '#ecc911',
    badge: 'Guardián de los Libros',
  },
  { order: 5, code: 'M5', title: 'Mi negocio', color: '#812ea3', badge: 'Contador Estrella' },
] as const;

export type ModuleCode = (typeof MODULES)[number]['code'];

// ---------- Lecciones ----------
export interface BlockSeed {
  kind: 'text' | 'image' | 'diagram' | 'waddles_tip';
  text: string;
}
export interface LessonSeed {
  module: ModuleCode;
  order: number;
  title: string;
  blocks: BlockSeed[];
}

export const LESSONS: LessonSeed[] = [
  {
    module: 'M1',
    order: 1,
    title: 'Ingreso, gasto y ahorro',
    // TODO contenido (equipo de Contenido): agregar trueque, qué es el dinero y necesidad vs deseo (§6).
    blocks: [
      { kind: 'diagram', text: '🎁 > COIN COIN COIN > PIG @gINGRESO' },
      {
        kind: 'text',
        text: 'Tu alcancía es como una caja mágica. El dinero que ENTRA se llama INGRESO: la mesada, un regalo, un premio. Ejemplo: tu tía te regala Bs. 30 y los guardas.',
      },
      { kind: 'diagram', text: 'PIG > COIN COIN > 🍦 @rGASTO' },
      {
        kind: 'text',
        text: 'El dinero que SALE se llama GASTO: el helado, un juguete, los útiles del colegio. Ejemplo: sacas Bs. 20 para comprar un helado.',
      },
      { kind: 'diagram', text: 'COIN COIN COIN > PIG > 🌱 @gAHORRO' },
      {
        kind: 'text',
        text: 'Lo que no gastas es tu AHORRO. Es como una semillita: con paciencia, ¡crece! Ejemplo: de Bs. 50 gastas Bs. 20 y ahorras Bs. 30.',
      },
      {
        kind: 'waddles_tip',
        text: 'Guardar un poquito cada semana te acerca a tus sueños. ¿Qué te gustaría lograr con tu ahorro?',
      },
    ],
  },
  // TODO contenido (equipo de Contenido): lección real de M2.
  {
    module: 'M2',
    order: 1,
    title: 'Lo que tengo, lo que debo y lo que es mío',
    blocks: [{ kind: 'text', text: 'Contenido en preparación. ¡Muy pronto Waddles te lo enseña!' }],
  },
  // TODO contenido (equipo de Contenido): lección real de M3.
  {
    module: 'M3',
    order: 1,
    title: 'La cuenta y su naturaleza',
    blocks: [{ kind: 'text', text: 'Contenido en preparación. ¡Muy pronto Waddles te lo enseña!' }],
  },
  // TODO contenido (equipo de Contenido): lección real de M4.
  {
    module: 'M4',
    order: 1,
    title: 'El Libro Diario y el Libro Mayor',
    blocks: [{ kind: 'text', text: 'Contenido en preparación. ¡Muy pronto Waddles te lo enseña!' }],
  },
  // TODO contenido (equipo de Contenido): lección real de M5.
  {
    module: 'M5',
    order: 1,
    title: 'Mi puesto de limonada',
    blocks: [{ kind: 'text', text: 'Contenido en preparación. ¡Muy pronto Waddles te lo enseña!' }],
  },
];

// ---------- Quiz y prueba ----------
export interface QuestionSeed {
  order: number;
  kind: 'single_choice' | 'classify' | 'balance' | 'numeric';
  prompt: string;
  hint: string;
  explanation: string;
  payload?: Record<string, unknown>;
  options?: { text: string; isCorrect: boolean }[];
}
export interface QuizSeed {
  module: ModuleCode;
  type: Extract<SubmoduleType, 'QUIZ' | 'EXAM'>;
  title: string;
  questions: QuestionSeed[];
}

export const QUIZZES: QuizSeed[] = [
  {
    module: 'M1',
    type: SubmoduleType.QUIZ,
    title: 'Quiz: Mi alcancía',
    questions: [
      {
        order: 1,
        kind: 'single_choice',
        prompt: 'Tu abuela te regala Bs. 50. ¿Qué es eso?',
        hint: 'Mira las flechas: el dinero va hacia tu alcancía. ¿Entra o sale?',
        explanation:
          'El dinero ENTRÓ a tu alcancía, así que es un ingreso. Un ingreso es cualquier dinero que recibes: mesada, regalos o pagos por ayudar en casa.',
        payload: {
          visual: '👵 > 🎁 > COIN COIN COIN COIN COIN > PIG',
          result: '👵 > COIN COIN COIN COIN COIN > PIG @gINGRESO',
        },
        options: [
          { text: 'Un ingreso', isCorrect: true },
          { text: 'Un gasto', isCorrect: false },
          { text: 'Una deuda', isCorrect: false },
        ],
      },
      {
        order: 2,
        kind: 'single_choice',
        prompt: 'Compras un helado de Bs. 20. ¿Qué es?',
        hint: 'El dinero sale de la alcancía hacia el heladero. ¿Entra o sale?',
        explanation:
          'El dinero SALIÓ de tu alcancía para pagar algo, así que es un gasto. Un gasto es dinero que das a cambio de algo que necesitas o quieres.',
        payload: { visual: 'PIG > COIN COIN > 🍦', result: 'PIG > COIN COIN > 🍦 @rGASTO' },
        options: [
          { text: 'Ingreso', isCorrect: false },
          { text: 'Gasto', isCorrect: true },
          { text: 'Ahorro', isCorrect: false },
        ],
      },
    ],
  },
  {
    module: 'M1',
    type: SubmoduleType.EXAM,
    title: 'Prueba: Mi alcancía',
    questions: [
      {
        order: 1,
        kind: 'classify',
        prompt: 'Clasifica cada movimiento: ¿es un ingreso o un gasto?',
        hint: '¿El dinero llega a ti o se va de ti?',
        explanation:
          'Ingreso es el dinero que llega a ti (mesada, regalos). Gasto es el dinero que se va de ti (un helado, un cuaderno).',
        payload: {
          example: '🎁 > PIG @gINGRESO',
          buckets: ['Ingreso 📥', 'Gasto 📤'],
          items: [
            { text: 'Mesada semanal', bucket: 0 },
            { text: 'Comprar un helado', bucket: 1 },
            { text: 'Regalo de cumpleaños', bucket: 0 },
            { text: 'Comprar un cuaderno', bucket: 1 },
          ],
        },
      },
    ],
  },
];

// ---------- Plan de cuentas infantil (§11.1) ----------
export const ACCOUNTS = [
  { code: '1.1', name: 'Caja (mi alcancía)', type: AccountType.ASSET, nature: AccountNature.DEBIT },
  {
    code: '1.2',
    name: 'Banco (mi cuenta de ahorro)',
    type: AccountType.ASSET,
    nature: AccountNature.DEBIT,
  },
  {
    code: '1.3',
    name: 'Mercancía (limones, vasos, azúcar)',
    type: AccountType.ASSET,
    nature: AccountNature.DEBIT,
  },
  {
    code: '2.1',
    name: 'Préstamos por pagar (lo que debo)',
    type: AccountType.LIABILITY,
    nature: AccountNature.CREDIT,
  },
  {
    code: '3.1',
    name: 'Capital (lo que es mío)',
    type: AccountType.EQUITY,
    nature: AccountNature.CREDIT,
  },
  {
    code: '4.1',
    name: 'Ventas (lo que vendí)',
    type: AccountType.INCOME,
    nature: AccountNature.CREDIT,
  },
  {
    code: '5.1',
    name: 'Gastos (lo que pagué)',
    type: AccountType.EXPENSE,
    nature: AccountNature.DEBIT,
  },
] as const;

// ---------- Escenario del desafío final (§11.5) ----------
export interface SolutionLine {
  accountCode: string;
  debit?: number;
  credit?: number;
}

export const LEMONADE_SCENARIO = {
  module: 'M5' as ModuleCode,
  code: 'M5_LEMONADE_WEEK',
  title: 'Mi puesto de limonada',
  description:
    'Una semana con 6 operaciones: registrar en el Diario, pasar al Mayor, cuadrar el Balance de Comprobación y ver la ganancia.',
  // TODO equipo de Contenido: montos PROVISIONALES, confirmar enunciados y montos finales.
  exercises: [
    {
      order: 1,
      dayLabel: 'Día 1',
      statement: 'Pones Bs. 100 de tus ahorros para empezar tu puesto de limonada.',
      hint: '¿Qué cuenta recibe el dinero? ¿De quién es ese dinero?',
      solution: [
        { accountCode: '1.1', debit: 100 },
        { accountCode: '3.1', credit: 100 },
      ],
    },
    {
      order: 2,
      dayLabel: 'Día 2',
      statement: 'Compras limones por Bs. 30 y pagas en efectivo.',
      hint: 'Entran limones (mercancía) y sale dinero de tu alcancía.',
      solution: [
        { accountCode: '1.3', debit: 30 },
        { accountCode: '1.1', credit: 30 },
      ],
    },
    {
      order: 3,
      dayLabel: 'Día 3',
      statement: 'Vendes 4 vasos de limonada y te pagan Bs. 80 en efectivo.',
      hint: '¿Qué cuenta recibe el dinero? Esa va en el Debe. ¿Por qué entró? Esa va en el Haber.',
      solution: [
        { accountCode: '1.1', debit: 80 },
        { accountCode: '4.1', credit: 80 },
      ],
    },
    {
      order: 4,
      dayLabel: 'Día 4',
      statement: 'Un familiar te presta Bs. 50 para el puesto.',
      hint: 'Entra dinero a tu alcancía, pero hay que devolverlo.',
      solution: [
        { accountCode: '1.1', debit: 50 },
        { accountCode: '2.1', credit: 50 },
      ],
    },
    {
      order: 5,
      dayLabel: 'Día 5',
      statement: 'Le devuelves a tu familiar los Bs. 50 que te prestó.',
      hint: 'Sale dinero de tu alcancía y ya no debes nada.',
      solution: [
        { accountCode: '2.1', debit: 50 },
        { accountCode: '1.1', credit: 50 },
      ],
    },
    {
      order: 6,
      dayLabel: 'Día 6',
      statement: 'Compras vasos por Bs. 20.',
      hint: 'Pagaste algo para tu puesto. ¿De dónde sale el dinero?',
      solution: [
        { accountCode: '5.1', debit: 20 },
        { accountCode: '1.1', credit: 20 },
      ],
    },
  ] satisfies {
    order: number;
    dayLabel: string;
    statement: string;
    hint: string;
    solution: SolutionLine[];
  }[],
};

// ---------- Demo FICTICIA (sin apellidos completos, §12) ----------
export const DEMO_SECTION = { code: 'DEMO-5A', grade: '5to', schoolTerm: '2026-2027' };

export const DEMO_STUDENTS = [
  { fullName: 'Luisa P.', username: 'luisa_p', age: 9, avatarColor: '#2e9ca3', coins: 12, xp: 120 },
  { fullName: 'Diego R.', username: 'diego_r', age: 10, avatarColor: '#ff5757', coins: 4, xp: 50 },
  {
    fullName: 'Camila S.',
    username: 'camila_s',
    age: 11,
    avatarColor: '#812ea3',
    coins: 25,
    xp: 300,
  },
  { fullName: 'Andrés M.', username: 'andres_m', age: 10, avatarColor: '#3e6aa8', coins: 0, xp: 0 },
  { fullName: 'Paola V.', username: 'paola_v', age: 9, avatarColor: '#7ed957', coins: 8, xp: 80 },
  {
    fullName: 'Gabriel L.',
    username: 'gabriel_l',
    age: 11,
    avatarColor: '#d58a24',
    coins: 18,
    xp: 200,
  },
];

import {
  feedback,
  gradeClassify,
  gradeSingleChoice,
  serializeQuestion,
  type StoredQuestion,
} from './quiz-content';

const q: StoredQuestion = {
  id: 1,
  quizId: 2,
  order: 1,
  kind: 'single_choice',
  prompt: '¿Qué es?',
  hint: 'Mira el diagrama',
  explanation: 'Es un ingreso',
  payload: { visual: 'PIG', result: '@gINGRESO' },
  options: [
    { id: 4, questionId: 1, order: 1, text: 'Ingreso', isCorrect: true },
    { id: 5, questionId: 1, order: 2, text: 'Gasto', isCorrect: false },
  ],
};
it('solo publica enunciado, diagrama y opciones visibles', () => {
  expect(serializeQuestion(q)).toEqual({
    id: 1,
    kind: 'single_choice',
    prompt: q.prompt,
    visual: 'PIG',
    options: [
      { id: 4, text: 'Ingreso' },
      { id: 5, text: 'Gasto' },
    ],
  });
});
it('publica categorías y textos sin el bucket de cada ítem', () => {
  const classify = {
    ...q,
    kind: 'classify',
    options: [],
    payload: { buckets: ['Entrada', 'Salida'], items: [{ text: 'Mesada', bucket: 0 }] },
  };
  expect(serializeQuestion(classify)).toEqual({
    id: 1,
    prompt: q.prompt,
    kind: 'classify',
    options: [],
    buckets: ['Entrada', 'Salida'],
    items: [{ text: 'Mesada' }],
  });
});
it('califica únicamente opciones de la pregunta', () => {
  expect(gradeSingleChoice(q.options, 4)).toBe(true);
  expect(gradeSingleChoice(q.options, 5)).toBe(false);
  expect(() => gradeSingleChoice(q.options, 6)).toThrow();
});
it('califica la clasificación completa y rechaza categorías inexistentes', () => {
  expect(gradeClassify([1, 0], [1, 0], 2)).toBe(true);
  expect(gradeClassify([1, 0], [0, 1], 2)).toBe(false);
  for (const items of [undefined, [1], [1, 0, 0], [2, 0]])
    expect(() => gradeClassify([1, 0], items, 2)).toThrow();
});
it('reserva la explicación y el resultado para la pregunta cerrada', () => {
  expect(feedback(q, false, 1)).toEqual({
    correct: false,
    questionDone: false,
    tryNumber: 1,
    hint: q.hint,
  });
  for (const correct of [true, false])
    expect(feedback(q, correct, 2)).toEqual({
      correct,
      tryNumber: 2,
      questionDone: true,
      explanation: q.explanation,
      correctOptionId: 4,
      result: '@gINGRESO',
    });
});

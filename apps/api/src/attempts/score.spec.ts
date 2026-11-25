import { summarizeQuiz } from './score';

const answer = (tryNumber: number, isCorrect: boolean, timeSeconds = 10) => ({
  tryNumber,
  isCorrect,
  timeSeconds,
});
const first = [answer(1, true)];
const second = [answer(1, false), answer(2, true)];
const missed = [answer(1, false), answer(2, false)];

it.each([
  { groups: [first, first], score: 100, stars: 3, correctCount: 2 },
  { groups: [first, second, first], score: 83, stars: 2, correctCount: 3 },
  { groups: [first, missed, second], score: 50, stars: 1, correctCount: 2 },
  { groups: [missed], score: 0, stars: 1, correctCount: 0 },
])('calcula $score % y $stars estrellas', ({ groups, ...expected }) => {
  expect(summarizeQuiz(groups)).toMatchObject(expected);
});
it('rechaza el quiz vacío, la pregunta sin responder y el reintento pendiente', () => {
  for (const groups of [[], [[]], [[answer(1, false)]]])
    expect(() => summarizeQuiz(groups)).toThrow();
});
it('limita el tiempo por respuesta', () => {
  expect(summarizeQuiz([[answer(1, false, 800), answer(2, true, 13)]])).toMatchObject({
    timeSecs: 613,
  });
});

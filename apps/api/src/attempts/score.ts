import { ConflictException } from '@nestjs/common';
import { GAME_RULES } from '@contikids/shared';

type Answer = { isCorrect: boolean; tryNumber: number; timeSeconds: number };

/** Cada grupo corresponde a una pregunta del quiz, incluso si aún no tiene respuestas. */
export function summarizeQuiz(groups: Answer[][]) {
  const { points, stars, maxTriesPerQuestion, maxSecondsPerAnswer } = GAME_RULES;
  let total = 0,
    correctCount = 0,
    hints = 0,
    timeSecs = 0;
  if (!groups.length) throw new ConflictException('El quiz todavía no tiene preguntas');
  for (const answers of groups) {
    const hit = answers.find((a) => a.isCorrect);
    if (!hit && answers.length < maxTriesPerQuestion)
      throw new ConflictException('Todavía quedan preguntas por completar');
    total += hit ? (hit.tryNumber === 1 ? points.firstTry : points.secondTry) : points.fail;
    if (hit) correctCount++;
    if (hit?.tryNumber !== 1) hints++;
    for (const answer of answers) timeSecs += Math.min(answer.timeSeconds, maxSecondsPerAnswer);
  }
  return {
    score: Math.round((100 * total) / groups.length),
    stars:
      hints === 0
        ? stars.max
        : hints / groups.length <= stars.twoStarsMaxHintRatio
          ? stars.max - 1
          : stars.min,
    correctCount,
    timeSecs,
  };
}

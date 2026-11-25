import { BadRequestException } from '@nestjs/common';
import type { Question, AnswerOption, Prisma } from '@prisma/client';
import type { QuizQuestion, QuizFeedback } from '@contikids/shared';
import { GAME_RULES } from '@contikids/shared';

export type StoredQuestion = Question & { options: AnswerOption[] };

function isObject(value: Prisma.JsonValue | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function questionContent(question: StoredQuestion) {
  const data = isObject(question.payload) ? question.payload : {};
  const visual = data.visual ?? data.example;
  const buckets = Array.isArray(data.buckets)
    ? data.buckets.filter((label): label is string => typeof label === 'string')
    : [];
  const items = Array.isArray(data.items)
    ? data.items.map((item) => {
        if (
          !isObject(item) ||
          typeof item.text !== 'string' ||
          typeof item.bucket !== 'number' ||
          buckets[item.bucket] === undefined
        )
          throw new BadRequestException('Esta clasificación todavía está en preparación');
        return { text: item.text, bucket: item.bucket };
      })
    : [];
  return {
    visual: typeof visual === 'string' ? visual : undefined,
    result: typeof data.result === 'string' ? data.result : undefined,
    buckets,
    items,
  };
}

/** Lista explícita de campos públicos: las soluciones solo salen con la pregunta cerrada. */
export function serializeQuestion(question: StoredQuestion): QuizQuestion {
  const { visual, buckets, items } = questionContent(question);
  return {
    id: question.id,
    prompt: question.prompt,
    kind: question.kind,
    visual,
    options: question.options.map(({ id, text }) => ({ id, text })),
    ...(question.kind === 'classify' && { buckets, items: items.map(({ text }) => ({ text })) }),
  };
}

export function gradeSingleChoice(options: StoredQuestion['options'], optionId?: number) {
  const selected = options.find((o) => o.id === optionId);
  if (!selected) throw new BadRequestException('Elige una opción de esta pregunta');
  return selected.isCorrect;
}

export function gradeClassify(
  expected: number[],
  items: number[] | undefined,
  bucketCount: number,
) {
  if (
    !expected.length ||
    items?.length !== expected.length ||
    items.some((i) => !Number.isInteger(i) || i < 0 || i >= bucketCount)
  )
    throw new BadRequestException('Elige una categoría válida para cada elemento');
  return expected.every((bucket, i) => bucket === items[i]);
}

export function feedback(
  question: StoredQuestion,
  correct: boolean,
  tryNumber: number,
): QuizFeedback {
  const questionDone = correct || tryNumber >= GAME_RULES.maxTriesPerQuestion;
  return {
    correct,
    tryNumber,
    questionDone,
    ...(questionDone
      ? {
          explanation: question.explanation,
          correctOptionId: question.options.find((o) => o.isCorrect)?.id,
          result: questionContent(question).result,
        }
      : { hint: question.hint }),
  };
}

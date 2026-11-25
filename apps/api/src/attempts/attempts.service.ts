import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { GAME_RULES, type QuizResult } from '@contikids/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QuizzesService } from '../quizzes/quizzes.service';
import {
  feedback,
  gradeClassify,
  gradeSingleChoice,
  questionContent,
} from '../quizzes/quiz-content';
import { RewardsService } from '../rewards/rewards.service';
import { AnswerDto } from './answer.dto';
import { summarizeQuiz } from './score';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizzes: QuizzesService,
    private readonly rewards: RewardsService,
  ) {}

  private async ownedAttempt(tx: Prisma.TransactionClient, studentId: number, id: number) {
    // Una fila por alumno serializa respuestas, cierres y repasos simultáneos de ese alumno.
    const rows = await tx.$queryRaw<{ id: number }[]>`
      SELECT s.id FROM "Student" s JOIN "Attempt" a ON a."studentId" = s.id
      WHERE s.id = ${studentId} AND a.id = ${id} FOR UPDATE OF s`;
    if (!rows.length) throw new NotFoundException('Intento no encontrado');
    const attempt = await tx.attempt.findUniqueOrThrow({ where: { id } });
    const module = await this.quizzes.accessible(studentId, attempt.quizId, tx);
    return { attempt, module };
  }

  answer(studentId: number, id: number, body: AnswerDto) {
    return this.prisma.$transaction(async (tx) => {
      const { attempt } = await this.ownedAttempt(tx, studentId, id);
      if (attempt.finishedAt) throw new ConflictException('Este intento ya terminó');
      const question = await tx.question.findFirst({
        where: { id: body.questionId, quizId: attempt.quizId },
        include: {
          options: true,
          answers: { where: { attemptId: id }, orderBy: { tryNumber: 'asc' } },
        },
      });
      if (!question) throw new BadRequestException('Esta pregunta no pertenece al Quiz');
      const previous = question.answers.at(-1);
      const tryNumber = (previous?.tryNumber ?? 0) + 1;
      if (
        previous &&
        body.expectedTry === previous.tryNumber &&
        previous.selectedOptionId === (body.optionId ?? null) &&
        JSON.stringify(previous.freeAnswer) === JSON.stringify(body.items ?? null)
      ) {
        return feedback(question, previous.isCorrect, previous.tryNumber);
      }
      if (
        previous?.isCorrect ||
        tryNumber > GAME_RULES.maxTriesPerQuestion ||
        (body.expectedTry != null && body.expectedTry !== tryNumber)
      )
        throw new ConflictException('Esta respuesta ya fue registrada');

      let correct: boolean;
      if (question.kind === 'single_choice' && body.items == null) {
        correct = gradeSingleChoice(question.options, body.optionId);
      } else if (question.kind === 'classify' && body.optionId == null) {
        const { items, buckets } = questionContent(question);
        correct = gradeClassify(
          items.map((i) => i.bucket),
          body.items,
          buckets.length,
        );
      } else {
        throw new BadRequestException('Formato de respuesta no válido para esta pregunta');
      }
      await tx.attemptAnswer.create({
        data: {
          attemptId: id,
          questionId: question.id,
          tryNumber,
          selectedOptionId: body.optionId,
          freeAnswer: body.items,
          isCorrect: correct,
          timeSeconds: Math.min(body.timeSeconds, GAME_RULES.maxSecondsPerAnswer),
        },
      });
      return feedback(question, correct, tryNumber);
    });
  }

  finish(studentId: number, id: number): Promise<QuizResult> {
    return this.prisma.$transaction(async (tx) => {
      const { attempt, module } = await this.ownedAttempt(tx, studentId, id);
      const noAward = { xpAwarded: 0, coinsAwarded: 0 };
      if (attempt.finishedAt) return { score: attempt.score!, stars: attempt.stars!, ...noAward };

      const questions = await tx.question.findMany({
        where: { quizId: attempt.quizId },
        select: {
          answers: {
            where: { attemptId: id },
            select: { isCorrect: true, tryNumber: true, timeSeconds: true },
          },
        },
      });
      const { score, stars, correctCount, timeSecs } = summarizeQuiz(
        questions.map((q) => q.answers),
      );
      const closed = await tx.attempt.updateMany({
        where: { id, finishedAt: null },
        data: { finishedAt: new Date(), score, stars },
      });
      if (!closed.count) throw new ConflictException('Este intento ya terminó');

      const ids = { studentId, moduleId: module.id };
      const quizKey = { studentId_moduleId_type: { ...ids, type: 'QUIZ' as const } };
      const previous = await tx.submoduleProgress.findUnique({ where: quizKey });
      const award =
        previous?.status === 'COMPLETED'
          ? noAward
          : await this.rewards.grant(
              tx,
              studentId,
              `QUIZ:${module.code}`,
              GAME_RULES.xp.quiz,
              correctCount * GAME_RULES.coins.quizPerCorrect,
            );
      const best = {
        bestScore: Math.max(score, previous?.bestScore ?? 0),
        bestStars: Math.max(stars, previous?.bestStars ?? 0),
      };
      await tx.submoduleProgress.upsert({
        where: quizKey,
        create: { ...ids, type: 'QUIZ', status: 'COMPLETED', attempts: 1, timeSecs, ...best },
        update: {
          status: 'COMPLETED',
          attempts: { increment: 1 },
          timeSecs: { increment: timeSecs },
          ...best,
        },
      });
      const exam = { ...ids, type: 'EXAM' as const };
      await tx.submoduleProgress.upsert({
        where: { studentId_moduleId_type: exam },
        create: { ...exam, status: 'IN_PROGRESS' },
        update: {},
      });
      await tx.submoduleProgress.updateMany({
        where: { ...exam, status: 'LOCKED' },
        data: { status: 'IN_PROGRESS' },
      });
      const progress = { status: 'IN_PROGRESS' as const, percent: GAME_RULES.modulePercent.quiz };
      await tx.moduleProgress.upsert({
        where: { studentId_moduleId: ids },
        create: { ...ids, ...progress },
        update: {},
      });
      await tx.moduleProgress.updateMany({
        where: { ...ids, status: { not: 'COMPLETED' }, percent: { lt: progress.percent } },
        data: progress,
      });
      return { score, stars, ...award };
    });
  }
}

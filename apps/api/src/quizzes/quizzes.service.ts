import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { QuizDetail } from '@contikids/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { serializeQuestion } from './quiz-content';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async accessible(studentId: number, id: number, db: Prisma.TransactionClient = this.prisma) {
    const quiz = await db.quiz.findFirst({
      where: { id, type: 'QUIZ' },
      select: { moduleId: true },
    });
    if (!quiz) throw new NotFoundException('Quiz no encontrado');
    const detail = await this.progress.getModule(studentId, String(quiz.moduleId), db);
    if (detail.submodules.find((s) => s.type === 'QUIZ')?.status === 'LOCKED')
      throw new ForbiddenException({
        code: 'CONTENT_LOCKED',
        message: 'Completa la lección para abrir el Quiz',
      });
    return detail.module;
  }

  async get(studentId: number, id: number): Promise<QuizDetail> {
    await this.accessible(studentId, id);
    const quiz = await this.prisma.quiz.findUniqueOrThrow({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    return { id, title: quiz.title, questions: quiz.questions.map(serializeQuestion) };
  }

  async start(studentId: number, quizId: number) {
    await this.accessible(studentId, quizId);
    return this.prisma.attempt.create({ data: { studentId, quizId }, select: { id: true } });
  }
}

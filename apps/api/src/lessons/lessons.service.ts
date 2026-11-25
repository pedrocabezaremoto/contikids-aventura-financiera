import { Injectable, NotFoundException } from '@nestjs/common';
import { GAME_RULES, type LessonDetail, type LessonCompletion } from '@contikids/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly rewards: RewardsService,
  ) {}

  private async accessibleModule(studentId: number, id: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { moduleId: true },
    });
    if (!lesson) throw new NotFoundException('Lección no encontrada');
    return this.progress.getModule(studentId, String(lesson.moduleId));
  }

  async get(studentId: number, id: number): Promise<LessonDetail> {
    await this.accessibleModule(studentId, id);
    return this.prisma.lesson.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        title: true,
        blocks: {
          orderBy: { order: 'asc' },
          select: { id: true, order: true, kind: true, text: true, assetPath: true },
        },
      },
    });
  }

  async complete(studentId: number, id: number, timeSecs: number): Promise<LessonCompletion> {
    const { module, submodules } = await this.accessibleModule(studentId, id);
    if (submodules.some((sub) => sub.type === 'LESSON' && sub.status === 'COMPLETED')) {
      return { xpAwarded: 0 };
    }
    const ids = { studentId, moduleId: module.id };
    return this.prisma.$transaction(async (tx) => {
      const { xpAwarded } = await this.rewards.grant(
        tx,
        studentId,
        `LESSON:${module.code}`,
        GAME_RULES.xp.lesson,
      );
      if (!xpAwarded) return { xpAwarded };
      await tx.submoduleProgress.upsert({
        where: { studentId_moduleId_type: { ...ids, type: 'LESSON' } },
        create: { ...ids, type: 'LESSON', status: 'COMPLETED', timeSecs },
        update: { status: 'COMPLETED', timeSecs: { increment: timeSecs } },
      });
      await tx.submoduleProgress.upsert({
        where: { studentId_moduleId_type: { ...ids, type: 'QUIZ' } },
        create: { ...ids, type: 'QUIZ', status: 'IN_PROGRESS' },
        update: { status: 'IN_PROGRESS' },
      });
      const progress = { status: 'IN_PROGRESS' as const, percent: GAME_RULES.modulePercent.lesson };
      await tx.moduleProgress.upsert({
        where: { studentId_moduleId: ids },
        create: { ...ids, ...progress },
        update: progress,
      });
      return { xpAwarded };
    });
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeMap,
  type MapModuleInput,
  type ModuleState,
  type SubmoduleRow,
} from './compute-map';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos los módulos con el estado de este alumno (calculado al leer). */
  private async load(studentId: number): Promise<ModuleState[]> {
    const [modules, rows] = await Promise.all([
      this.prisma.learningModule.findMany({
        orderBy: { order: 'asc' },
        select: {
          id: true,
          code: true,
          order: true,
          title: true,
          color: true,
          lessons: { select: { id: true }, orderBy: { order: 'asc' }, take: 1 },
          quizzes: { select: { id: true, type: true } },
        },
      }),
      this.prisma.submoduleProgress.findMany({
        where: { studentId },
        select: { moduleId: true, type: true, status: true, bestScore: true, bestStars: true },
      }),
    ]);

    const inputs: MapModuleInput[] = modules.map((m) => ({
      id: m.id,
      code: m.code,
      order: m.order,
      title: m.title,
      color: m.color,
      lessonId: m.lessons[0]?.id ?? null,
      quizId: m.quizzes.find((q) => q.type === 'QUIZ')?.id ?? null,
      examId: m.quizzes.find((q) => q.type === 'EXAM')?.id ?? null,
    }));
    return computeMap(inputs, rows satisfies SubmoduleRow[]);
  }

  /** GET /me/map: los 5 módulos + monedas y XP actuales. */
  async getMap(studentId: number) {
    const [student, states] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
        select: { coins: true, xp: true },
      }),
      this.load(studentId),
    ]);
    if (!student) throw new NotFoundException('Alumno no encontrado');
    return { coins: student.coins, xp: student.xp, modules: states.map((s) => s.module) };
  }

  /** GET /modules/:ref — `ref` = id numérico o código ("M1"). Módulo cerrado → 403 CONTENT_LOCKED. */
  async getModule(studentId: number, ref: string) {
    const states = await this.load(studentId);
    const found = /^\d+$/.test(ref)
      ? states.find((s) => s.module.id === Number(ref))
      : states.find((s) => s.module.code === ref.toUpperCase());
    if (!found) throw new NotFoundException('No encontramos ese módulo');
    if (found.module.status === 'LOCKED') {
      throw new ForbiddenException({
        message: 'Este módulo todavía está cerrado. ¡Sigue avanzando para abrirlo!',
        code: 'CONTENT_LOCKED',
      });
    }
    return found;
  }
}

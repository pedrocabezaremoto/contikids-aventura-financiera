/**
 * Estado del mapa — funciones PURAS (sin Prisma). Se calcula al leer, a partir de lo que ya
 * está completado; las filas de progreso se escriben solo cuando pasa algo (lección completada,
 * intento terminado). Un alumno sin filas tiene M1 abierto.
 *
 * Desbloqueo (docs/FASE2_PLAN.md §2):
 *   M1 → Lección abierta · Lección completada → Quiz · Quiz terminado → Prueba ·
 *   Prueba aprobada → módulo COMPLETED y se abre la Lección del siguiente.
 */
import {
  GAME_RULES,
  type MapModule,
  type MapSubmodule,
  type ModuleDetail,
  type ProgressStatus,
  type SubmoduleType,
} from '@contikids/shared';

export type { ProgressStatus, SubmoduleType, MapModule, MapSubmodule };

/** Un módulo con el contenido que tiene en la BD (null = todavía no existe). */
export interface MapModuleInput {
  id: number;
  code: string;
  order: number;
  title: string;
  color: string;
  lessonId: number | null;
  quizId: number | null;
  examId: number | null;
}

export interface SubmoduleRow {
  moduleId: number;
  type: SubmoduleType;
  status: ProgressStatus;
  bestScore: number | null;
  bestStars: number | null;
}

export type ModuleState = ModuleDetail;

const TYPES: SubmoduleType[] = ['LESSON', 'QUIZ', 'EXAM'];

export function computeMap(
  modules: readonly MapModuleInput[],
  rows: readonly SubmoduleRow[],
): ModuleState[] {
  const sorted = [...modules].sort((a, b) => a.order - b.order);
  const rowOf = (moduleId: number, type: SubmoduleType) =>
    rows.find((r) => r.moduleId === moduleId && r.type === type);
  const done = (moduleId: number, type: SubmoduleType) =>
    rowOf(moduleId, type)?.status === 'COMPLETED';

  const result: ModuleState[] = [];
  let previousExamDone = true as boolean; // el módulo 1 siempre está abierto

  for (const m of sorted) {
    const unlocked: boolean = previousExamDone;
    const lessonDone: boolean = unlocked && done(m.id, 'LESSON');
    const quizDone: boolean = lessonDone && done(m.id, 'QUIZ');
    const examDone: boolean = quizDone && done(m.id, 'EXAM');

    const statusOf = (isDone: boolean, isOpen: boolean): ProgressStatus =>
      isDone ? 'COMPLETED' : isOpen ? 'IN_PROGRESS' : 'LOCKED';
    const subStatus: Record<SubmoduleType, ProgressStatus> = {
      LESSON: statusOf(lessonDone, unlocked),
      QUIZ: statusOf(quizDone, lessonDone),
      EXAM: statusOf(examDone, quizDone),
    };
    const refs: Record<SubmoduleType, number | null> = {
      LESSON: m.lessonId,
      QUIZ: m.quizId,
      EXAM: m.examId,
    };

    const { modulePercent } = GAME_RULES;
    const percent = examDone
      ? modulePercent.exam
      : quizDone
        ? modulePercent.quiz
        : lessonDone
          ? modulePercent.lesson
          : modulePercent.start;

    result.push({
      module: {
        id: m.id,
        code: m.code,
        order: m.order,
        title: m.title,
        color: m.color,
        status: statusOf(examDone, unlocked),
        percent,
        comingSoon: m.quizId === null || m.examId === null,
      },
      submodules: TYPES.map((type) => {
        const row = rowOf(m.id, type);
        return {
          type,
          status: subStatus[type],
          refId: refs[type],
          bestScore: row?.bestScore ?? null,
          bestStars: row?.bestStars ?? null,
        };
      }),
    });

    previousExamDone = examDone;
  }
  return result;
}

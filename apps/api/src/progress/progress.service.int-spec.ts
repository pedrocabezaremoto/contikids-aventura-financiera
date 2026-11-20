/** Integración contra contikids_test: el servicio del mapa con Prisma de verdad. */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { createTestPrisma, truncateAll } from '../testing/test-db';
import type { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';

let prisma: PrismaClient;
let service: ProgressService;
let studentId: number;
const moduleIds: Record<string, number> = {};

beforeAll(() => {
  prisma = createTestPrisma();
  service = new ProgressService(prisma as unknown as PrismaService);
});
afterAll(() => prisma.$disconnect());

beforeEach(async () => {
  await truncateAll(prisma);
  for (const n of [1, 2]) {
    const m = await prisma.learningModule.create({
      data: { order: n, code: `M${n}`, title: `Módulo ${n}`, color: '#2e9ca3' },
    });
    moduleIds[`M${n}`] = m.id;
    await prisma.lesson.create({ data: { moduleId: m.id, order: 1, title: 'Lección' } });
  }
  // Solo M1 tiene quiz y prueba.
  for (const type of ['QUIZ', 'EXAM'] as const) {
    await prisma.quiz.create({ data: { moduleId: moduleIds.M1!, type, title: type } });
  }
  const teacher = await prisma.teacher.create({
    data: { fullName: 'Docente', email: 'd@test.dev', passwordHash: 'x' },
  });
  const section = await prisma.section.create({
    data: { teacherId: teacher.id, code: 'T-1', grade: '5to', schoolTerm: '2026-2027' },
  });
  const student = await prisma.student.create({
    data: {
      sectionId: section.id,
      fullName: 'Ana P.',
      username: 'ana_p',
      age: 9,
      pinHash: 'x',
      avatarColor: '#2e9ca3',
      coins: 4,
      xp: 20,
    },
  });
  studentId = student.id;
});

const complete = (moduleId: number, type: 'LESSON' | 'QUIZ' | 'EXAM') =>
  prisma.submoduleProgress.create({
    data: { studentId, moduleId, type, status: 'COMPLETED', bestScore: 90, bestStars: 3 },
  });

describe('ProgressService (BD de pruebas)', () => {
  it('getMap sin filas de progreso: M1 abierto, M2 cerrado, monedas y XP del alumno', async () => {
    const map = await service.getMap(studentId);
    expect(map).toMatchObject({ coins: 4, xp: 20 });
    expect(map.modules.map((m) => [m.code, m.status, m.comingSoon])).toEqual([
      ['M1', 'IN_PROGRESS', false],
      ['M2', 'LOCKED', true],
    ]);
  });

  it('getModule M1 por código o por id: 3 submódulos con su refId', async () => {
    const byCode = await service.getModule(studentId, 'm1');
    const byId = await service.getModule(studentId, String(moduleIds.M1));
    expect(byId).toEqual(byCode);
    expect(byCode.submodules.map((s) => [s.type, s.status])).toEqual([
      ['LESSON', 'IN_PROGRESS'],
      ['QUIZ', 'LOCKED'],
      ['EXAM', 'LOCKED'],
    ]);
    expect(byCode.submodules.every((s) => typeof s.refId === 'number')).toBe(true);
  });

  it('getModule de un módulo cerrado → 403 CONTENT_LOCKED; inexistente → 404', async () => {
    const err = await service.getModule(studentId, 'M2').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toMatchObject({ code: 'CONTENT_LOCKED' });
    await expect(service.getModule(studentId, 'M9')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('con M1 completo (lección + quiz + prueba) se abre M2 y M1 queda al 100 %', async () => {
    for (const t of ['LESSON', 'QUIZ', 'EXAM'] as const) await complete(moduleIds.M1!, t);
    const map = await service.getMap(studentId);
    expect(map.modules[0]).toMatchObject({ code: 'M1', status: 'COMPLETED', percent: 100 });
    expect(map.modules[1]).toMatchObject({ code: 'M2', status: 'IN_PROGRESS', comingSoon: true });
    const m1 = await service.getModule(studentId, 'M1');
    expect(m1.submodules[2]).toMatchObject({ type: 'EXAM', bestScore: 90, bestStars: 3 });
  });

  it('el progreso de un alumno no afecta al de otro', async () => {
    await complete(moduleIds.M1!, 'LESSON');
    const section = await prisma.section.findFirstOrThrow();
    const other = await prisma.student.create({
      data: {
        sectionId: section.id,
        fullName: 'Beto L.',
        username: 'beto_l',
        age: 9,
        pinHash: 'x',
        avatarColor: '#d9a441',
      },
    });
    const map = await service.getModule(other.id, 'M1');
    expect(map.submodules[0]?.status).toBe('IN_PROGRESS');
    expect(map.module.percent).toBe(0);
  });
});

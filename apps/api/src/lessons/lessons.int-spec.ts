import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LESSONS } from '../../prisma/seed-data';
import { TokensService } from '../auth/tokens.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { createTestPrisma, truncateAll } from '../testing/test-db';
import { ProgressService } from '../progress/progress.service';
import { LessonsModule } from './lessons.module';

const db = createTestPrisma();
let app: INestApplication;
let base: string;
let studentId: number;
let moduleId: number;
let lessonId: number;
let lockedId: number;
let studentToken: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            JWT_ACCESS_SECRET: randomUUID(),
            JWT_REFRESH_SECRET: randomUUID(),
          }),
        ],
      }),
      PrismaModule,
      LessonsModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(db)
    .compile();
  app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  base = (await app.getUrl()) + '/api/v1/lessons';
});
afterAll(async () => {
  await app?.close();
  await db.$disconnect();
});
beforeEach(async () => {
  await truncateAll(db);
  const teacher = await db.teacher.create({
    data: { fullName: 'Docente', email: 'test@example.test', passwordHash: 'x' },
  });
  const section = await db.section.create({
    data: { teacherId: teacher.id, code: 'TEST', grade: '5', schoolTerm: '2026' },
  });
  const student = await db.student.create({
    data: {
      fullName: 'Estudiante',
      username: 'test',
      sectionId: section.id,
      age: 10,
      pinHash: 'x',
      avatarColor: '#fff',
      xp: 5,
      coins: 2,
    },
  });
  studentId = student.id;
  studentToken = await app.get(TokensService).signAccess({ sub: studentId, role: 'STUDENT' });
  const first = LESSONS[0]!;
  const m1 = await db.learningModule.create({
    data: {
      code: 'M1',
      order: 1,
      color: '#fff',
      title: 'M1',
      lessons: {
        create: {
          title: first.title,
          order: 1,
          blocks: { create: first.blocks.map((b, i) => ({ ...b, order: i + 1 })).reverse() },
        },
      },
      quizzes: { create: { type: 'QUIZ', title: 'Quiz' } },
    },
    include: { lessons: true },
  });
  moduleId = m1.id;
  lessonId = m1.lessons[0]!.id;
  const m2 = await db.learningModule.create({
    data: {
      code: 'M2',
      order: 2,
      color: '#fff',
      title: 'M2',
      lessons: { create: { title: 'Lección', order: 1 } },
    },
    include: { lessons: true },
  });
  lockedId = m2.lessons[0]!.id;
});

function request(id: number, complete = false, token = studentToken, timeSecs = 12) {
  return fetch(`${base}/${id}${complete ? '/complete' : ''}`, {
    method: complete ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: complete ? JSON.stringify({ timeSecs }) : undefined,
  });
}

it('devuelve los bloques del seed en orden y valida tiempo e id', async () => {
  const res = await request(lessonId);
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ title: LESSONS[0]!.title, blocks: LESSONS[0]!.blocks });
  expect((await request(lessonId, true, studentToken, -1)).status).toBe(400);
  expect((await request(9999)).status).toBe(404);
});
it.each([false, true])('protege la ruta (completar = %s)', async (complete) => {
  const teacher = await app.get(TokensService).signAccess({ sub: studentId, role: 'TEACHER' });
  expect((await request(lessonId, complete, teacher)).status).toBe(403);
  expect((await request(lessonId, complete, '')).status).toBe(401);
  const res = await request(lockedId, complete);
  expect(res.status).toBe(403);
  expect(await res.json()).toMatchObject({ code: 'CONTENT_LOCKED' });
  expect(await db.rewardGrant.count()).toBe(0);
});
it('dos finales simultáneos y un repaso pagan una sola vez y conservan el avance', async () => {
  const responses = await Promise.all([request(lessonId, true), request(lessonId, true)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const bodies = await Promise.all(responses.map((r) => r.json()));
  expect(bodies).toEqual(expect.arrayContaining([{ xpAwarded: 20 }, { xpAwarded: 0 }]));
  const ids = { studentId, moduleId };
  expect(await db.moduleProgress.findFirstOrThrow({ where: ids })).toMatchObject({
    percent: 33,
    status: 'IN_PROGRESS',
  });
  const states = await app.get(ProgressService).getModule(studentId, 'm1');
  expect(states.module.percent).toBe(33);
  expect(states.submodules.map((s) => s.status)).toEqual(['COMPLETED', 'IN_PROGRESS', 'LOCKED']);
  expect(
    await db.submoduleProgress.findFirstOrThrow({ where: { ...ids, type: 'QUIZ' } }),
  ).toMatchObject({ status: 'IN_PROGRESS' });
  await db.submoduleProgress.updateMany({
    where: { ...ids, type: 'QUIZ' },
    data: { status: 'COMPLETED' },
  });
  await db.moduleProgress.updateMany({ where: ids, data: { percent: 66 } });
  const review = await request(lessonId, true);
  expect(await review.json()).toEqual({ xpAwarded: 0 });
  expect(await db.moduleProgress.findFirstOrThrow({ where: ids })).toMatchObject({ percent: 66 });
  expect(
    await db.submoduleProgress.findFirstOrThrow({ where: { ...ids, type: 'QUIZ' } }),
  ).toMatchObject({ status: 'COMPLETED' });
  expect(
    await db.submoduleProgress.findFirstOrThrow({ where: { ...ids, type: 'LESSON' } }),
  ).toMatchObject({ timeSecs: 12 });
  expect(await db.rewardGrant.findMany()).toMatchObject([
    { studentId, key: 'LESSON:M1', xp: 20, coins: 0 },
  ]);
  expect(await db.student.findUniqueOrThrow({ where: { id: studentId } })).toMatchObject({
    xp: 25,
    coins: 2,
  });
});

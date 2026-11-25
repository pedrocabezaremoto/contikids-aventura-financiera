import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { QuizDetail, ModuleDetail } from '@contikids/shared';
import type { Prisma } from '@prisma/client';
import { QUIZZES } from '../../prisma/seed-data';
import { TokensService } from '../auth/tokens.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { createTestPrisma, truncateAll } from '../testing/test-db';
import { AttemptsModule } from './attempts.module';

const db = createTestPrisma();
let app: INestApplication;
let base: string, token: string;
let studentId: number, moduleId: number, quizId: number, examId: number;
let questions: { id: number; right: number; wrong: number }[];

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
      AttemptsModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(db)
    .compile();
  app = module.createNestApplication();
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  base = (await app.getUrl()) + '/v1';
});
afterAll(async () => {
  await app?.close();
  await db.$disconnect();
});
beforeEach(async () => {
  await truncateAll(db);
  const teacher = await db.teacher.create({
    data: { fullName: 'Docente', email: 'quiz@example.test', passwordHash: 'x' },
  });
  const section = await db.section.create({
    data: { teacherId: teacher.id, code: 'TEST', grade: '5', schoolTerm: '2026' },
  });
  const student = await db.student.create({
    data: {
      sectionId: section.id,
      username: 'test',
      fullName: 'Estudiante',
      pinHash: 'x',
      age: 10,
      avatarColor: '#fff',
      xp: 20,
    },
  });
  studentId = student.id;
  token = await app.get(TokensService).signAccess({ sub: studentId, role: 'STUDENT' });
  const module = await db.learningModule.create({
    data: { order: 1, code: 'M1', title: 'M1', color: '#fff' },
  });
  moduleId = module.id;
  const seed = QUIZZES[0]!;
  const quiz = await db.quiz.create({
    data: {
      moduleId,
      type: 'QUIZ',
      title: seed.title,
      questions: {
        create: seed.questions
          .map((q) => ({
            order: q.order,
            kind: q.kind,
            prompt: q.prompt,
            hint: q.hint,
            explanation: q.explanation,
            payload: q.payload as Prisma.InputJsonValue,
            options: { create: q.options!.map((o, i) => ({ ...o, order: i + 1 })).reverse() },
          }))
          .reverse(),
      },
    },
    include: { questions: { orderBy: { order: 'asc' }, include: { options: true } } },
  });
  quizId = quiz.id;
  questions = quiz.questions.map((q) => ({
    id: q.id,
    right: q.options.find((o) => o.isCorrect)!.id,
    wrong: q.options.find((o) => !o.isCorrect)!.id,
  }));
  examId = (await db.quiz.create({ data: { moduleId, type: 'EXAM', title: 'Prueba' } })).id;
  await db.submoduleProgress.createMany({
    data: [
      { moduleId, studentId, type: 'LESSON', status: 'COMPLETED' },
      { moduleId, studentId, type: 'QUIZ', status: 'IN_PROGRESS' },
    ],
  });
});

function request(path: string, method = 'GET', body?: unknown, auth = token) {
  return fetch(base + path, {
    method,
    headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function start() {
  const response = await request(`/quizzes/${quizId}/attempts`, 'POST');
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: number }).id;
}
function answer(id: number, index: number, right: boolean, expectedTry?: number) {
  const q = questions[index]!;
  return request(`/attempts/${id}/answers`, 'POST', {
    questionId: q.id,
    optionId: right ? q.right : q.wrong,
    timeSeconds: 700,
    expectedTry,
  });
}
function finish(id: number) {
  return request(`/attempts/${id}/finish`, 'POST');
}

it('ordena preguntas y opciones del seed y exige rol, propiedad y acceso en las cuatro rutas', async () => {
  const detail = (await (await request(`/quizzes/${quizId}`)).json()) as QuizDetail;
  expect(detail.questions.map((q) => q.prompt)).toEqual(QUIZZES[0]!.questions.map((q) => q.prompt));
  expect(detail.questions[0]!.options.map((o) => o.text)).toEqual(
    QUIZZES[0]!.questions[0]!.options!.map((o) => o.text),
  );
  const id = await start();
  const teacher = await app.get(TokensService).signAccess({ sub: studentId, role: 'TEACHER' });
  const other = await app.get(TokensService).signAccess({ sub: studentId + 1, role: 'STUDENT' });
  const body = { questionId: questions[0]!.id, optionId: questions[0]!.right, timeSeconds: 0 };
  await db.submoduleProgress.updateMany({
    where: { type: 'LESSON' },
    data: { status: 'IN_PROGRESS' },
  });
  for (const [path, method, data] of [
    [`/quizzes/${quizId}`, 'GET', undefined],
    [`/quizzes/${quizId}/attempts`, 'POST', undefined],
    [`/attempts/${id}/answers`, 'POST', body],
    [`/attempts/${id}/finish`, 'POST', undefined],
  ] as const) {
    expect((await request(path, method, data, '')).status).toBe(401);
    expect((await request(path, method, data, teacher)).status).toBe(403);
    if (path.startsWith('/attempts/'))
      expect((await request(path, method, data, other)).status).toBe(404);
    const locked = await request(path, method, data);
    expect(locked.status).toBe(403);
    expect(await locked.json()).toMatchObject({ code: 'CONTENT_LOCKED' });
  }
  expect((await request(`/quizzes/${examId}`)).status).toBe(404);
  expect((await request(`/quizzes/${examId}/attempts`, 'POST')).status).toBe(404);
});

it('rechaza módulo cerrado, opciones ajenas y respuestas incompletas sin consumir el intento', async () => {
  const locked = await db.learningModule.create({
    data: {
      code: 'M2',
      title: 'M2',
      order: 2,
      color: '#fff',
      quizzes: { create: { title: 'M2', type: 'QUIZ' } },
    },
    include: { quizzes: true },
  });
  expect((await request(`/quizzes/${locked.quizzes[0]!.id}`)).status).toBe(403);
  const id = await start();
  for (const fields of [
    {},
    { optionId: questions[1]!.right },
    { questionId: 999, optionId: 1 },
    { optionId: questions[0]!.right, timeSeconds: -1 },
  ]) {
    const res = await request(`/attempts/${id}/answers`, 'POST', {
      questionId: questions[0]!.id,
      timeSeconds: 5,
      ...fields,
    });
    expect(res.status).toBe(400);
  }
  expect(await db.attemptAnswer.count()).toBe(0);
  expect((await finish(id)).status).toBe(409);
});

it('devuelve pista, admite el reenvío de red, explica el segundo fallo y cierra solo una vez', async () => {
  const id = await start();
  const first = await Promise.all([answer(id, 0, false, 1), answer(id, 0, false, 1)]);
  for (const res of first)
    expect(await res.json()).toEqual({
      correct: false,
      tryNumber: 1,
      questionDone: false,
      hint: QUIZZES[0]!.questions[0]!.hint,
    });
  expect((await finish(id)).status).toBe(409);
  const retry = await answer(id, 0, true, 2);
  expect(await retry.json()).toMatchObject({
    correct: true,
    tryNumber: 2,
    questionDone: true,
    result: expect.any(String),
  });
  expect((await answer(id, 1, false)).status).toBe(200);
  expect((await finish(id)).status).toBe(409);
  expect(await (await answer(id, 1, false)).json()).toMatchObject({
    correct: false,
    questionDone: true,
    tryNumber: 2,
    correctOptionId: questions[1]!.right,
    explanation: QUIZZES[0]!.questions[1]!.explanation,
  });
  expect((await answer(id, 1, true)).status).toBe(409);
  const responses = await Promise.all([finish(id), finish(id)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(await Promise.all(responses.map((r) => r.json()))).toEqual(
    expect.arrayContaining([
      { score: 25, stars: 1, coinsAwarded: 1, xpAwarded: 30 },
      { score: 25, stars: 1, coinsAwarded: 0, xpAwarded: 0 },
    ]),
  );
  expect((await answer(id, 0, true, 2)).status).toBe(409);
  expect(await db.attemptAnswer.count()).toBe(4);
  expect(await db.attempt.findUniqueOrThrow({ where: { id } })).toMatchObject({
    finishedAt: expect.any(Date),
    score: 25,
    stars: 1,
  });
  expect(await db.submoduleProgress.findFirstOrThrow({ where: { type: 'QUIZ' } })).toMatchObject({
    status: 'COMPLETED',
    attempts: 1,
    bestScore: 25,
    bestStars: 1,
    timeSecs: 2400,
  });
  expect(await db.submoduleProgress.findFirstOrThrow({ where: { type: 'EXAM' } })).toMatchObject({
    status: 'IN_PROGRESS',
  });
  expect(await db.moduleProgress.findFirstOrThrow()).toMatchObject({ percent: 66 });
  expect(await db.student.findFirstOrThrow()).toMatchObject({ xp: 50, coins: 1 });
  expect(await db.rewardGrant.findMany()).toMatchObject([{ key: 'QUIZ:M1', xp: 30, coins: 1 }]);
});

it('abre la Prueba con cero aciertos y conserva las mejores marcas y el avance en repasos concurrentes', async () => {
  async function play(right: boolean) {
    const id = await start();
    for (const index of [0, 1]) {
      if (!right) await answer(id, index, false);
      expect((await answer(id, index, right)).status).toBe(200);
    }
    return id;
  }
  const first = await finish(await play(false));
  expect(await first.json()).toMatchObject({ score: 0, stars: 1, xpAwarded: 30, coinsAwarded: 0 });
  const map = (await (await request('/modules/m1')).json()) as ModuleDetail;
  expect(map.module.percent).toBe(66);
  expect(map.submodules[2]).toMatchObject({ type: 'EXAM', status: 'IN_PROGRESS' });
  await db.moduleProgress.updateMany({ data: { status: 'COMPLETED', percent: 100 } });
  await db.submoduleProgress.updateMany({ where: { type: 'EXAM' }, data: { status: 'COMPLETED' } });
  const reviews = await Promise.all([play(true), play(false)]);
  for (const r of await Promise.all(reviews.map(finish)))
    expect(await r.json()).toMatchObject({ xpAwarded: 0, coinsAwarded: 0 });
  expect(await db.rewardGrant.count()).toBe(1);
  expect(await db.student.findFirstOrThrow()).toMatchObject({ xp: 50, coins: 0 });
  expect(await db.submoduleProgress.findFirstOrThrow({ where: { type: 'QUIZ' } })).toMatchObject({
    attempts: 3,
    bestScore: 100,
    bestStars: 3,
  });
  expect(await db.moduleProgress.findFirstOrThrow()).toMatchObject({
    status: 'COMPLETED',
    percent: 100,
  });
  expect(await db.submoduleProgress.findFirstOrThrow({ where: { type: 'EXAM' } })).toMatchObject({
    status: 'COMPLETED',
  });
});

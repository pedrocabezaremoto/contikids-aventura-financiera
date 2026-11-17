/**
 * Seed idempotente de CONTIKIDS: correrlo varias veces NO duplica nada.
 *
 * - Modelos con clave única → upsert.
 * - Lesson / ContentBlock / Quiz / Question / AnswerOption no tienen clave única en el
 *   schema (§8), así que se buscan por su "clave natural" (módulo+orden, quiz+orden, etc.)
 *   y se actualizan o crean.
 * - Los PIN de demo se generan al crear cada alumno y se imprimen SOLO en consola.
 *   Con SEED_RESET_DEMO_PINS=1 se regeneran.
 */
import { randomInt } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ACCOUNTS,
  DEMO_SECTION,
  DEMO_STUDENTS,
  LEMONADE_SCENARIO,
  LESSONS,
  MODULES,
  QUIZZES,
  type ModuleCode,
} from './seed-data';

const prisma = new PrismaClient();

const newPin = () => randomInt(0, 10_000).toString().padStart(4, '0');

/** Busca por `where`; si existe lo actualiza, si no lo crea. Devuelve el id. */
async function findOrCreate<T extends { id: number }>(
  find: () => Promise<T | null>,
  update: (id: number) => Promise<T>,
  create: () => Promise<T>,
): Promise<T> {
  const found = await find();
  return found ? update(found.id) : create();
}

async function seedSettings() {
  // Solo crea los valores por defecto; no pisa lo que el docente cambie después.
  await prisma.systemSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

async function seedModules(): Promise<Record<ModuleCode, number>> {
  const ids = {} as Record<ModuleCode, number>;
  for (const m of MODULES) {
    const mod = await prisma.learningModule.upsert({
      where: { code: m.code },
      update: { title: m.title, color: m.color, order: m.order },
      create: { code: m.code, title: m.title, color: m.color, order: m.order },
    });
    ids[m.code] = mod.id;

    const badge = {
      name: m.badge,
      imagePath: `/badges/${m.code.toLowerCase()}.webp`, // TODO diseño: arte de cada medalla
    };
    await prisma.badge.upsert({
      where: { moduleId: mod.id },
      update: badge,
      create: { ...badge, moduleId: mod.id },
    });
  }
  return ids;
}

async function seedLessons(moduleIds: Record<ModuleCode, number>) {
  for (const l of LESSONS) {
    const moduleId = moduleIds[l.module];
    const lesson = await findOrCreate(
      () => prisma.lesson.findFirst({ where: { moduleId, order: l.order } }),
      (id) => prisma.lesson.update({ where: { id }, data: { title: l.title } }),
      () => prisma.lesson.create({ data: { moduleId, order: l.order, title: l.title } }),
    );

    for (const [i, b] of l.blocks.entries()) {
      const order = i + 1;
      await findOrCreate(
        () => prisma.contentBlock.findFirst({ where: { lessonId: lesson.id, order } }),
        (id) => prisma.contentBlock.update({ where: { id }, data: { kind: b.kind, text: b.text } }),
        () =>
          prisma.contentBlock.create({
            data: { lessonId: lesson.id, order, kind: b.kind, text: b.text },
          }),
      );
    }
  }
}

async function seedQuizzes(moduleIds: Record<ModuleCode, number>) {
  for (const q of QUIZZES) {
    const moduleId = moduleIds[q.module];
    const quiz = await findOrCreate(
      () => prisma.quiz.findFirst({ where: { moduleId, type: q.type } }),
      (id) => prisma.quiz.update({ where: { id }, data: { title: q.title } }),
      () => prisma.quiz.create({ data: { moduleId, type: q.type, title: q.title } }),
    );

    for (const qs of q.questions) {
      const data = {
        kind: qs.kind,
        prompt: qs.prompt,
        hint: qs.hint,
        explanation: qs.explanation,
        payload: qs.payload ? (qs.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
      };
      const question = await findOrCreate(
        () => prisma.question.findFirst({ where: { quizId: quiz.id, order: qs.order } }),
        (id) => prisma.question.update({ where: { id }, data }),
        () => prisma.question.create({ data: { ...data, quizId: quiz.id, order: qs.order } }),
      );

      for (const opt of qs.options ?? []) {
        await findOrCreate(
          () =>
            prisma.answerOption.findFirst({ where: { questionId: question.id, text: opt.text } }),
          (id) => prisma.answerOption.update({ where: { id }, data: { isCorrect: opt.isCorrect } }),
          () =>
            prisma.answerOption.create({
              data: { questionId: question.id, text: opt.text, isCorrect: opt.isCorrect },
            }),
        );
      }
    }
  }
}

async function seedAccounts() {
  for (const a of ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { code: a.code },
      update: { name: a.name, type: a.type, nature: a.nature },
      create: { ...a },
    });
  }
}

async function seedLemonadeScenario(moduleIds: Record<ModuleCode, number>) {
  const s = LEMONADE_SCENARIO;
  const scenario = await prisma.scenario.upsert({
    where: { code: s.code },
    update: { title: s.title, description: s.description, moduleId: moduleIds[s.module] },
    create: {
      code: s.code,
      title: s.title,
      description: s.description,
      moduleId: moduleIds[s.module],
    },
  });

  for (const ex of s.exercises) {
    const data = {
      dayLabel: ex.dayLabel,
      statement: ex.statement,
      hint: ex.hint,
      solution: ex.solution as unknown as Prisma.InputJsonValue,
    };
    await prisma.practiceExercise.upsert({
      where: { scenarioId_order: { scenarioId: scenario.id, order: ex.order } },
      update: data,
      create: { ...data, scenarioId: scenario.id, order: ex.order },
    });
  }
}

async function seedDemo() {
  const email = process.env.SEED_TEACHER_EMAIL ?? 'docente@contikids.test';
  const password = process.env.SEED_TEACHER_PASSWORD;
  if (!password) throw new Error('Falta SEED_TEACHER_PASSWORD en .env');
  const resetPins = process.env.SEED_RESET_DEMO_PINS === '1';

  const existingTeacher = await prisma.teacher.findUnique({ where: { email } });
  const teacher =
    existingTeacher ??
    (await prisma.teacher.create({
      data: { email, fullName: 'Docente Demo', passwordHash: await argon2.hash(password) },
    }));
  console.log(
    `  Docente: ${email} (${existingTeacher ? 'ya existía' : 'creado'}; contraseña = SEED_TEACHER_PASSWORD del .env)`,
  );

  const section = await prisma.section.upsert({
    where: { code: DEMO_SECTION.code },
    update: {
      grade: DEMO_SECTION.grade,
      schoolTerm: DEMO_SECTION.schoolTerm,
      teacherId: teacher.id,
    },
    create: { ...DEMO_SECTION, teacherId: teacher.id },
  });

  console.log(`  Sección ${section.code} — PIN de los alumnos demo (solo se muestran aquí):`);
  for (const s of DEMO_STUDENTS) {
    const existing = await prisma.student.findUnique({ where: { username: s.username } });
    const base = {
      fullName: s.fullName,
      age: s.age,
      avatarColor: s.avatarColor,
      sectionId: section.id,
    };

    if (!existing || resetPins) {
      const pin = newPin();
      const pinHash = await argon2.hash(pin);
      await prisma.student.upsert({
        where: { username: s.username },
        update: { ...base, pinHash, failedPinCount: 0, lockedUntil: null },
        create: { ...base, username: s.username, pinHash, coins: s.coins, xp: s.xp },
      });
      console.log(`    ${s.username.padEnd(10)} PIN ${pin}${existing ? ' (regenerado)' : ''}`);
    } else {
      await prisma.student.update({ where: { username: s.username }, data: base });
      console.log(`    ${s.username.padEnd(10)} ya existía (PIN sin cambios)`);
    }
  }
}

async function main() {
  console.log('Seed CONTIKIDS…');
  await seedSettings();
  const moduleIds = await seedModules();
  await seedLessons(moduleIds);
  await seedQuizzes(moduleIds);
  await seedAccounts();
  await seedLemonadeScenario(moduleIds);
  await seedDemo();

  const counts = {
    módulos: await prisma.learningModule.count(),
    medallas: await prisma.badge.count(),
    lecciones: await prisma.lesson.count(),
    bloques: await prisma.contentBlock.count(),
    quizzes: await prisma.quiz.count(),
    preguntas: await prisma.question.count(),
    opciones: await prisma.answerOption.count(),
    cuentas: await prisma.ledgerAccount.count(),
    escenarios: await prisma.scenario.count(),
    ejercicios: await prisma.practiceExercise.count(),
    docentes: await prisma.teacher.count(),
    secciones: await prisma.section.count(),
    alumnos: await prisma.student.count(),
  };
  console.log('Totales:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

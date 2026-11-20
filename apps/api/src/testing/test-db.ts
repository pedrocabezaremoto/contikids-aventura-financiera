import { PrismaClient } from '@prisma/client';
import { assertTestDatabase, TEST_DB_NAME, TestDbGuardError } from './test-db-guard';

/** Cliente de Prisma apuntado SOLO a la BD de pruebas. */
export function createTestPrisma(): PrismaClient {
  return new PrismaClient({ datasourceUrl: assertTestDatabase(process.env.TEST_DATABASE_URL) });
}

/**
 * Vacía todas las tablas de la BD de pruebas (menos _prisma_migrations).
 * Verifica con `current_database()` justo antes de cada TRUNCATE.
 */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  const db = rows[0]?.db;
  if (db !== TEST_DB_NAME) throw new TestDbGuardError(`TRUNCATE rechazado en la BD "${db}".`);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

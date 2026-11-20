/**
 * globalSetup del proyecto "integration" de Jest. Corre UNA vez, antes de cualquier prueba:
 *   1. aplica el candado (aborta si la BD no es `contikids_test`);
 *   2. confirma con la propia BD (`current_database()`), por si la URL engaña;
 *   3. aplica las migraciones SOLO a esa base.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertTestDatabase, TEST_DB_NAME, TestDbGuardError } from './test-db-guard';

export default async function globalSetup(): Promise<void> {
  const testUrl = assertTestDatabase(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);

  const prisma = new PrismaClient({ datasourceUrl: testUrl });
  try {
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    if (rows[0]?.db !== TEST_DB_NAME) {
      throw new TestDbGuardError(`la BD conectada es "${rows[0]?.db}", no "${TEST_DB_NAME}".`);
    }
  } finally {
    await prisma.$disconnect();
  }

  const apiDir = path.resolve(__dirname, '../..');
  execFileSync(
    process.execPath,
    [
      require.resolve('prisma/build/index.js'),
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { cwd: apiDir, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'inherit' },
  );
}

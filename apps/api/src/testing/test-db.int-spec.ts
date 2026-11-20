import type { PrismaClient } from '@prisma/client';
import { createTestPrisma, truncateAll } from './test-db';

describe('BD de pruebas (integración)', () => {
  let prisma: PrismaClient;
  beforeAll(() => {
    prisma = createTestPrisma();
  });
  afterAll(() => prisma.$disconnect());

  it('está conectada a contikids_test y DATABASE_URL también apunta ahí', async () => {
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(rows[0]?.db).toBe('contikids_test');
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });

  it('truncateAll deja las tablas vacías', async () => {
    await truncateAll(prisma);
    expect(await prisma.student.count()).toBe(0);
  });
});

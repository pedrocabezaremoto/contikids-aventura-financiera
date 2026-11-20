/**
 * Candado de seguridad de las pruebas de integración.
 *
 * Las pruebas SOLO pueden tocar la base `contikids_test`. Si la URL de pruebas no existe, no se
 * llama exactamente así o apunta a la misma base que DATABASE_URL (producción), se aborta.
 */
export const TEST_DB_NAME = 'contikids_test';

export class TestDbGuardError extends Error {
  constructor(message: string) {
    super(`🛑 Pruebas CANCELADAS: ${message}`);
    this.name = 'TestDbGuardError';
  }
}

interface DbTarget {
  host: string;
  port: string;
  db: string;
}

function parseTarget(url: string): DbTarget | null {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || '5432',
      db: decodeURIComponent(u.pathname.slice(1)),
    };
  } catch {
    return null;
  }
}

/** Valida las URLs y devuelve la URL de pruebas. Lanza TestDbGuardError si algo no cuadra. */
export function assertTestDatabase(
  testUrl: string | undefined,
  prodUrl?: string | undefined,
): string {
  if (!testUrl) throw new TestDbGuardError('falta TEST_DATABASE_URL.');
  const test = parseTarget(testUrl);
  if (!test) throw new TestDbGuardError('TEST_DATABASE_URL no es una URL válida.');
  if (test.db !== TEST_DB_NAME) {
    throw new TestDbGuardError(
      `la base de pruebas debe llamarse exactamente "${TEST_DB_NAME}" (la URL apunta a "${test.db}").`,
    );
  }
  if (prodUrl) {
    const prod = parseTarget(prodUrl);
    const same = prod && prod.host === test.host && prod.port === test.port && prod.db === test.db;
    if (testUrl === prodUrl || same) {
      throw new TestDbGuardError('TEST_DATABASE_URL coincide con DATABASE_URL (producción).');
    }
  }
  return testUrl;
}

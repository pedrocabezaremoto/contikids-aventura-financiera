import { assertTestDatabase, TestDbGuardError } from './test-db-guard';

const TEST = 'postgresql://u:p@127.0.0.1:5433/contikids_test?schema=public';
const PROD = 'postgresql://u:p@127.0.0.1:5433/contikids?schema=public';

describe('candado de la BD de pruebas', () => {
  it('acepta contikids_test aunque DATABASE_URL sea producción', () => {
    expect(assertTestDatabase(TEST, PROD)).toBe(TEST);
  });

  it('acepta contikids_test sin DATABASE_URL (CI)', () => {
    expect(assertTestDatabase(TEST)).toBe(TEST);
  });

  it('aborta si falta TEST_DATABASE_URL', () => {
    expect(() => assertTestDatabase(undefined, PROD)).toThrow(TestDbGuardError);
    expect(() => assertTestDatabase('', PROD)).toThrow(TestDbGuardError);
  });

  it('aborta si la BD no se llama exactamente contikids_test', () => {
    expect(() => assertTestDatabase(PROD, PROD)).toThrow(/exactamente/);
    expect(() =>
      assertTestDatabase('postgresql://u:p@127.0.0.1:5433/contikids_test2', PROD),
    ).toThrow(TestDbGuardError);
    expect(() =>
      assertTestDatabase('postgresql://u:p@127.0.0.1:5433/Contikids_Test', PROD),
    ).toThrow(TestDbGuardError);
    expect(() => assertTestDatabase('postgresql://u:p@127.0.0.1:5433/', PROD)).toThrow(
      TestDbGuardError,
    );
  });

  it('aborta si TEST_DATABASE_URL es igual a DATABASE_URL', () => {
    expect(() => assertTestDatabase(TEST, TEST)).toThrow(/coincide/);
  });

  it('aborta si la URL de pruebas no es una URL', () => {
    expect(() => assertTestDatabase('esto no es una url', PROD)).toThrow(TestDbGuardError);
  });
});

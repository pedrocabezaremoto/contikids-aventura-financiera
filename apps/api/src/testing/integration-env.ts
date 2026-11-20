/**
 * setupFiles del proyecto "integration": en cada worker, DATABASE_URL pasa a ser la BD de
 * pruebas. Así ni siquiera un `new PrismaClient()` sin argumentos puede llegar a producción.
 */
import { assertTestDatabase } from './test-db-guard';

process.env.DATABASE_URL = assertTestDatabase(process.env.TEST_DATABASE_URL);

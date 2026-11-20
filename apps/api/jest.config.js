/**
 * Dos proyectos:
 *  - unit:        *.spec.ts, sin base de datos (lo que corre `pnpm test`).
 *  - integration: *.int-spec.ts, SOLO contra `contikids_test` (`pnpm test:int`).
 *                 Su globalSetup aborta todo si la BD no es exactamente `contikids_test`.
 */
const common = {
  rootDir: 'src',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Los tests usan el código fuente de shared (sin build previo).
  moduleNameMapper: { '^@contikids/shared$': '<rootDir>/../../../packages/shared/src/index.ts' },
  transform: { '^.+\\.ts$': 'ts-jest' },
};

module.exports = {
  projects: [
    { ...common, displayName: 'unit', testRegex: '.*\\.spec\\.ts$' },
    {
      ...common,
      displayName: 'integration',
      testRegex: '.*\\.int-spec\\.ts$',
      globalSetup: '<rootDir>/testing/global-setup.ts',
      setupFiles: ['<rootDir>/testing/integration-env.ts'],
      testTimeout: 30000,
    },
  ],
};

// Configuración única de ESLint (flat config) para todo el monorepo.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/dist-seed/**',
      '**/node_modules/**',
      '**/coverage/**',
      'docs/**',
      'files-htmlsANDother/**',
      'apps/api/prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: [
      'apps/api/**/*.ts',
      'packages/**/*.ts',
      'infra/**/*.{js,mjs,cjs}',
      '*.{js,mjs,cjs}',
      'apps/*/*.{js,mjs,cjs,ts}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Archivos CommonJS (p. ej. ecosystem de PM2): require() es lo correcto aquí.
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);

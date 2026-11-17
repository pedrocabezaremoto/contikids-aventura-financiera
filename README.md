# CONTIKIDS · Aventura Financiera

Simulador de procesos contables básicos (Libro Diario, Mayor y Balance de Comprobación) en un entorno gamificado para niños de 9 a 11 años.
Proyecto de Sistemas de Información III · UNERG.

- Fuente de verdad técnica: [`docs/CONTIKIDS_CONTEXTO_LLM.md`](docs/CONTIKIDS_CONTEXTO_LLM.md)
- Estado del proyecto: [`progreso.md`](progreso.md)

## Stack

| Parte | Tecnología |
|---|---|
| `apps/web` | React 19 + Vite 7 + Tailwind CSS 4 (fuentes self-hosted) |
| `apps/api` | NestJS 11 + Prisma 6 + PostgreSQL 16 (Swagger en `/api/docs`) |
| `packages/shared` | Helpers compartidos (`formatBs`) |

Monorepo con **pnpm** (Node 22). TypeScript estricto, ESLint + Prettier, CI en GitHub Actions.

## Desarrollo local

```bash
cp .env.example .env          # y cambiar las claves
pnpm install
pnpm db:up                    # Postgres en 127.0.0.1:5433
pnpm db:migrate               # aplica las migraciones
pnpm db:seed                  # datos base + demo ficticia (imprime los PIN de demo)
pnpm dev:api                  # API en http://127.0.0.1:4410/api/v1  (docs: /api/docs)
pnpm dev:web                  # Web en http://127.0.0.1:5173
```

Todo escucha solo en `127.0.0.1`. Para verlo desde tu PC, usa el reenvío de puertos de VS Code (puertos 5173 y 4410).

## Calidad

```bash
pnpm lint       # ESLint
pnpm typecheck  # tsc en todos los paquetes
pnpm test       # Vitest (shared) + Jest (api)
```

## Privacidad

El repositorio es público: no se suben `.env`, llaves, cédulas ni datos reales de niños. Los datos del seed son ficticios.

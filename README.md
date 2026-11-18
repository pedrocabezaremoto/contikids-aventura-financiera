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

## Producción

- En vivo (pruebas): https://contikids.pedroservicios.xyz (`noindex`).
- `docker-compose.yml` levanta `postgres`, `api` (no publicada) y `web` (Nginx con el build de Vite + proxy `/api`).
  - VPS: `WEB_BIND=172.18.0.1`, `WEB_PORT=4400`, y Traefik enruta el dominio con `infra/traefik/contikids.yaml`.
  - Laptop sin internet: `WEB_BIND=127.0.0.1`, `WEB_PORT=80`, `PUBLIC_URL=http://localhost` → `./deploy.sh` (o `docker compose up -d`) y abrir http://localhost.
- `./deploy.sh`: pull → build api → build web → up → health → seed si la BD está vacía → limpieza. Log en `/root/logs/contikids-deploy.log`.
- Auto-deploy: cada push a `main` llega al webhook (`infra/webhook/`, proceso PM2 `contikids-webhook`), que verifica la firma de GitHub y corre `deploy.sh`.

## Calidad

```bash
pnpm lint       # ESLint
pnpm typecheck  # tsc en todos los paquetes
pnpm test       # Vitest (shared) + Jest (api)
```

## Privacidad

El repositorio es público: no se suben `.env`, llaves, cédulas ni datos reales de niños. Los datos del seed son ficticios.

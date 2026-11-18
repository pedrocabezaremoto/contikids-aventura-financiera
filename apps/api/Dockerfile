# syntax=docker/dockerfile:1
# Imagen de producción de la API (NestJS + Prisma). Contexto de build: raíz del monorepo.
#   docker build -f apps/api/Dockerfile -t contikids-api .

FROM node:22-alpine AS base
LABEL org.contikids.app="contikids"
RUN apk add --no-cache openssl
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
WORKDIR /app

# ---- Manifiestos del monorepo (para que pnpm resuelva el lockfile completo) ----
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# El postinstall de la api corre `prisma generate`: necesita el schema.
COPY apps/api/prisma apps/api/prisma

# ---- Build: todas las dependencias + compilación de la api y del seed ----
FROM manifests AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @contikids/api
COPY apps/api apps/api
RUN pnpm --filter @contikids/api build \
 && pnpm --filter @contikids/api exec tsc -p tsconfig.seed.json

# ---- Solo dependencias de producción (incluye prisma CLI para migrate deploy) ----
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @contikids/api

# ---- Runtime: usuario no-root ----
FROM node:22-alpine AS runtime
LABEL org.contikids.app="contikids"
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/dist-seed ./apps/api/dist-seed

WORKDIR /app/apps/api
USER node
EXPOSE 4410
# Al arrancar: aplica migraciones pendientes y luego levanta la API.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]

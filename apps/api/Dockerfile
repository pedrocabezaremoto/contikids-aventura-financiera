# syntax=docker/dockerfile:1
# Imágenes de producción de la API. Contexto de build: raíz del monorepo.
#   runtime  → contikids-api      (NestJS: solo dependencias de producción, sin CLI de Prisma)
#   migrate  → contikids-migrate  (runtime + CLI de Prisma; corre `prisma migrate deploy` y termina)

FROM node:22-alpine AS base
LABEL org.contikids.app="contikids"
RUN apk add --no-cache openssl
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
WORKDIR /app

# ---- Build: dependencias completas, compilación y despliegue aislado de producción ----
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# El postinstall de la api corre `prisma generate`: necesita el schema.
COPY apps/api/prisma apps/api/prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @contikids/api
# La api importa @contikids/shared (game-rules): se compila primero (dist) y luego la api.
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @contikids/shared build \
 && pnpm --filter @contikids/api build \
 && pnpm --filter @contikids/api exec tsc -p tsconfig.seed.json
# /out = solo dependencias de producción de la api (sin devDependencies ni CLI de Prisma).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @contikids/api deploy --prod --legacy --ignore-scripts /out \
 && ./apps/api/node_modules/.bin/prisma generate --schema /out/prisma/schema.prisma \
 && node -p "require('./apps/api/node_modules/prisma/package.json').version" > /out/.prisma-version
# Poda de lo que una API en Node + PostgreSQL no usa:
#  - runtimes WASM/edge de @prisma/client (otras BD y entornos edge): se usa el motor nativo .so.node
#  - typescript y el CLI de Prisma con su árbol (prisma, effect, @prisma/engines…): pnpm los mete
#    porque son peers opcionales de @prisma/client, pero el cliente no los usa en ejecución.
#    El CLI vive solo en la imagen "migrate".
#  - source maps, archivos de tipos (.d.ts) y documentación: no se usan en ejecución
#  - rxjs trae sus fuentes TS y builds ESM: la API es CommonJS y solo carga dist/cjs
RUN cd /out/node_modules/.pnpm \
 && find . -path '*/@prisma/client/runtime/*' \( -name '*.wasm*' -o -name '*wasm-base64*' -o -name 'query_compiler*' \
      -o -name 'edge*' -o -name 'react-native*' -o -name 'wasm-*' \) -delete \
 && find . -path '*/.prisma/client/*' \( -name '*.wasm' -o -name 'wasm*.js' -o -name 'edge*.js' -o -name 'react-native*' \) -delete \
 && rm -rf typescript@* prisma@* effect@* fast-check@* pure-rand@* jiti@* c12@* deepmerge-ts@* empathic@* \
      @prisma+config@* @prisma+engines@* @prisma+engines-version@* @prisma+fetch-engine@* @prisma+get-platform@* @prisma+debug@* \
 && find /out/node_modules -type f \( -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' \
      -o -iname '*.md' -o -iname '*.markdown' \) -delete \
 && rm -rf rxjs@*/node_modules/rxjs/src rxjs@*/node_modules/rxjs/dist/esm rxjs@*/node_modules/rxjs/dist/esm5 \
      rxjs@*/node_modules/rxjs/dist/bundles

# ---- CLI de Prisma aislado (misma versión que el cliente) para el servicio migrate ----
FROM base AS prisma-cli
COPY --from=build /out/.prisma-version /tmp/prisma-version
WORKDIR /opt/prisma-cli
RUN npm init -y >/dev/null \
 && npm install --omit=dev --no-audit --no-fund "prisma@$(cat /tmp/prisma-version)" \
 && npm cache clean --force \
 # migrate deploy solo usa el schema engine: fuera el motor de consultas y la UI de Studio
 && rm -f node_modules/@prisma/engines/libquery_engine-* node_modules/prisma/libquery_engine-* \
 && rm -rf node_modules/prisma/build/public

# ---- Runtime de la API: usuario no-root ----
# Alpine (misma versión que node:22-alpine) + solo el binario de Node 22 de la imagen oficial:
# se ahorran npm, yarn, corepack y los headers de C (~30 MB) que la API no usa en ejecución.
FROM node:22-alpine AS node-bin

FROM alpine:3.24 AS runtime
LABEL org.contikids.app="contikids"
RUN apk add --no-cache libstdc++ openssl \
 && addgroup -g 1000 node && adduser -u 1000 -G node -s /bin/sh -D node
COPY --from=node-bin /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --chown=node:node apps/api/prisma ./prisma
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
COPY --from=build --chown=node:node /app/apps/api/dist-seed ./dist-seed
USER node
EXPOSE 4410
CMD ["node", "dist/main.js"]

# ---- Migrate: runtime + CLI de Prisma (comparte todas las capas del runtime) ----
FROM runtime AS migrate
COPY --from=prisma-cli --chown=node:node /opt/prisma-cli/node_modules /opt/prisma-cli/node_modules
CMD ["node", "/opt/prisma-cli/node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", "prisma/schema.prisma"]

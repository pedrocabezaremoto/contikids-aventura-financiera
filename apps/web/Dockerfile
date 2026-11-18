# syntax=docker/dockerfile:1
# Imagen de producción de la web: build de Vite → Nginx. Contexto de build: raíz del monorepo.
#   docker build -f apps/web/Dockerfile -t contikids-web .

FROM node:22-alpine AS build
LABEL org.contikids.app="contikids"
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @contikids/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @contikids/web build

FROM nginx:alpine AS runtime
LABEL org.contikids.app="contikids"
COPY infra/nginx/contikids.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

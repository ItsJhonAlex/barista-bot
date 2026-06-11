# syntax=docker/dockerfile:1
# Dashboard: build estático con Vite y servido por Caddy. Contexto de build = raíz del repo
# (para resolver el workspace). La URL de la api se hornea en build (VITE_API_URL).

FROM oven/bun:1.3.6-alpine AS build
WORKDIR /app
# `--parents` recoge todos los manifiestos del workspace preservando su estructura.
COPY --parents package.json bun.lock apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile
COPY . .
# URL pública de la api (la consume el navegador). Configurable por build-arg.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN bun --filter @barista/dashboard build

FROM caddy:2-alpine
COPY apps/dashboard/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/dashboard/dist /usr/share/caddy
EXPOSE 5173

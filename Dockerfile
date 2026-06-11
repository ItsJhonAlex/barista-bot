# syntax=docker/dockerfile:1
# Imagen base del monorepo para los servicios que corren con Bun (api, bot, migrate).
# Bun ejecuta el TypeScript directamente, así que no hay paso de build para estos servicios;
# el `command` de cada servicio (en docker-compose.yml) elige el punto de entrada.

FROM oven/bun:1.3.6-alpine AS base
WORKDIR /app

# --- Capa de dependencias (cacheable): solo los manifiestos primero ---
# `--parents` preserva la estructura de carpetas, así que recoge TODOS los workspaces
# (incluidos módulos nuevos) sin listarlos uno a uno.
COPY --parents package.json bun.lock apps/*/package.json packages/*/package.json ./
RUN bun install --frozen-lockfile

# --- Código fuente ---
COPY . .

# El entrypoint por defecto es la api; bot y migrate lo sobreescriben con su `command`.
CMD ["bun", "run", "apps/api/src/index.ts"]

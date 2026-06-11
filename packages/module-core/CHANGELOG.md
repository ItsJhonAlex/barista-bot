# @barista/module-core

## 1.0.0

- Módulo `core` inicial (siempre activo, no desactivable).
- Comandos transversales registrados de forma global (ADR-005):
  - `/ping` — pong + latencia del WebSocket (migrado desde la pieza Sapphire suelta).
  - `/about` — nombre de marca, versión del manifest y enlace al proyecto.
  - `/help` — lista los módulos activos del servidor y sus comandos vía `ctx.catalog` (ADR-015).
- `configSchema` vacío; no escucha eventos del Gateway.

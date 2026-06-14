import type { ModuleManifest } from "@barista/core";

/** Nombre de marca del bot, para textos de UI. Provisional (ver CLAUDE.md / docs/13 §10). */
export const BOT_NAME = "Barista";
export const PROJECT_URL = "https://github.com/barista-bot/barista";

/**
 * Manifest del `core`. Se declara aparte para que `/about` pueda leer su propia versión sin
 * referenciar el módulo antes de construirlo.
 *
 * El módulo `core` está siempre activo (no desactivable; el resolver de estado efectivo del bot
 * lo cortocircuita). Aporta los comandos transversales `/ping`, `/about` y `/help`, registrados
 * de forma GLOBAL (ADR-005). No escucha eventos ni persiste config.
 */
export const manifest: ModuleManifest = {
  id: "core",
  name: "Núcleo",
  description: "Comandos transversales del bot: estado, información y ayuda.",
  details:
    "El núcleo es la base del bot: aporta los comandos que siempre están disponibles en " +
    "todos los servidores, pase lo que pase con el resto de módulos. Por eso no se puede " +
    "desactivar. Sus comandos se registran de forma global en Discord.",
  features: [
    "Disponible siempre en todos los servidores; no se puede desactivar.",
    "Comprueba el estado y la latencia del bot.",
    "Muestra información del bot y la lista de módulos activos del servidor.",
  ],
  version: "1.0.0",
  category: "núcleo",
  requiredBotPermissions: [],
};

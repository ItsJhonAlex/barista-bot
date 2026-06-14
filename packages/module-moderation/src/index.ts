// @barista/module-moderation — sanciona a los miembros del servidor (avisos, timeouts, kicks,
// bans, purge). Este index.ts SOLO ensambla: la lógica vive en commands/, shared/ y utils/.

import { defineModule } from "@barista/core";
import { slashCommands } from "./commands/index.ts";
import { configSchema } from "./config.ts";
import { manifest } from "./manifest.ts";
import { ModeratorOnly } from "./shared/preconditions.ts";

export default defineModule({
  manifest,
  configSchema,
  preconditions: { ModeratorOnly },
  commands: slashCommands,
});

// Gemelos prefix (SCAFFOLD, ADR-018): se exportan para el runtime futuro, nadie los despacha aún.
export { prefixCommands } from "./commands/index.ts";

// Reexport para tests y consumidores que quieran el límite o el parser sin acoplarse al índice.
export { MAX_TIMEOUT_MS, parseDuration } from "./utils/duration.ts";

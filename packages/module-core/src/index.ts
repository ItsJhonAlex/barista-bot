// @barista/module-core — el núcleo: comandos transversales (/ping, /about, /help) registrados de
// forma GLOBAL (ADR-005). Siempre activo, no desactivable. Este index.ts SOLO ensambla.

import { defineModule } from "@barista/core";
import { z } from "zod";
import { slashCommands } from "./commands/index.ts";
import { manifest } from "./manifest.ts";

// Config trivial: el núcleo no persiste ajustes. Inline (sin config.ts) por su simplicidad.
const configSchema = z.object({});

export default defineModule({
  manifest,
  configSchema,
  commands: slashCommands,
});

// Gemelos prefix (SCAFFOLD, ADR-018): se exportan para el runtime futuro, nadie los despacha aún.
export { prefixCommands } from "./commands/index.ts";

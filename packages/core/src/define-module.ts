import type { z } from "zod";
import type { BaristaModule } from "./contract.ts";

/**
 * Helper identidad: no transforma nada en runtime, solo aporta inferencia de tipos para que
 * `ctx.config` dentro de los handlers tenga el tipo de `configSchema`.
 */
export function defineModule<Schema extends z.ZodTypeAny>(
  mod: BaristaModule<Schema>,
): BaristaModule<Schema> {
  return mod;
}

import { z } from "zod";

/**
 * Config del módulo echo. El dashboard autogenera el formulario desde este schema; los
 * `.default()` rellenan lo no especificado y `.describe()` da la etiqueta de UI.
 */
export const configSchema = z.object({
  prefix: z.string().default("🔊").describe("Prefijo que se antepone al eco"),
  uppercase: z.boolean().default(false).describe("Responder en mayúsculas"),
  maxLength: z
    .number()
    .int()
    .min(1)
    .max(2000)
    .default(500)
    .describe("Longitud máxima del mensaje repetido"),
});

export type Config = z.infer<typeof configSchema>;

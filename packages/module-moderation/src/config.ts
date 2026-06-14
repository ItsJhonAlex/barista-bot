import { z } from "zod";

/**
 * Config del módulo de moderación. El dashboard autogenera el formulario desde este schema.
 * `logChannelId` opcional → si está, cada sanción se anuncia ahí; los roles configurables son
 * una mejora sobre el permiso nativo (la precondition `ModeratorOnly` valida el permiso nativo).
 */
export const configSchema = z.object({
  logChannelId: z.string().optional().describe("Canal de registro de sanciones"),
  defaultBanDeleteDays: z
    .number()
    .int()
    .min(0)
    .max(7)
    .default(0)
    .describe("Días de mensajes a borrar al banear"),
  moderatorRoleIds: z.array(z.string()).default([]).describe("Roles con permiso de moderación"),
});

export type Config = z.infer<typeof configSchema>;

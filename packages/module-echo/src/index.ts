import { defineModule } from "@barista/core";
import { z } from "zod";

/**
 * Config del módulo echo. El dashboard autogenera el formulario desde este schema; los
 * `.default()` rellenan lo no especificado y `.describe()` da la etiqueta de UI.
 */
const configSchema = z.object({
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

/**
 * Módulo de prueba `echo`: repite los mensajes del canal. Existe para ver el toggle por
 * servidor en acción (S0.4): con el módulo activo el bot responde; al desactivarlo, deja de
 * hacerlo sin reiniciar. Sirve además de banco de pruebas de la página de ajustes (RF-26):
 * sus tres opciones cubren string, boolean y number con min/max.
 */
export default defineModule({
  manifest: {
    id: "echo",
    name: "Echo",
    description: "Repite los mensajes del canal. Útil para probar el toggle por servidor.",
    details:
      "El módulo Echo repite cada mensaje de texto del canal anteponiéndole un prefijo. " +
      "Está pensado para comprobar de un vistazo que el toggle por servidor y la página de " +
      "ajustes funcionan: cambia el prefijo, fuerza mayúsculas o limita la longitud y verás " +
      "el efecto en el siguiente mensaje, sin reiniciar el bot.",
    version: "1.1.0",
    category: "prueba",
  },
  configSchema,
  events: {
    messageCreate: async (ctx, message) => {
      if (message.author.bot) return; // nunca respondas a bots (evita bucles)
      const content = message.content.trim();
      if (content.length === 0) return; // sin contenido (p. ej. solo adjuntos): nada que repetir
      const trimmed = content.slice(0, ctx.config.maxLength);
      const body = ctx.config.uppercase ? trimmed.toUpperCase() : trimmed;
      await ctx.discord.sendMessage(message.channelId, `${ctx.config.prefix} ${body}`);
    },
  },
});

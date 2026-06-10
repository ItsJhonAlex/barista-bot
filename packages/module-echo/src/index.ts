import { defineModule } from "@barista/core";
import { z } from "zod";

/**
 * Config del módulo echo. El dashboard autogenera el formulario desde este schema; los
 * `.default()` rellenan lo no especificado y `.describe()` da la etiqueta de UI.
 */
const configSchema = z.object({
  prefix: z.string().default("🔊").describe("Prefijo que se antepone al eco"),
});

/**
 * Módulo de prueba `echo`: repite los mensajes del canal. Existe para ver el toggle por
 * servidor en acción (S0.4): con el módulo activo el bot responde; al desactivarlo, deja de
 * hacerlo sin reiniciar.
 */
export default defineModule({
  manifest: {
    id: "echo",
    name: "Echo",
    description: "Repite los mensajes del canal. Útil para probar el toggle por servidor.",
    version: "1.0.0",
    category: "prueba",
  },
  configSchema,
  events: {
    messageCreate: async (ctx, message) => {
      if (message.author.bot) return; // nunca respondas a bots (evita bucles)
      const content = message.content.trim();
      if (content.length === 0) return; // sin contenido (p. ej. solo adjuntos): nada que repetir
      await ctx.discord.sendMessage(message.channelId, `${ctx.config.prefix} ${content}`);
    },
  },
});

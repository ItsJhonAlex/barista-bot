import type { EventHandler } from "@barista/core";
import type { Config } from "../../config.ts";

/**
 * Handler de `messageCreate`: repite cada mensaje de texto del canal anteponiendo el prefijo
 * configurado. Nunca responde a otros bots (evita bucles) ni a mensajes sin contenido textual.
 */
export const handler: EventHandler<"messageCreate", Config> = async (ctx, message) => {
  if (message.author.bot) return; // nunca respondas a bots (evita bucles)
  const content = message.content.trim();
  if (content.length === 0) return; // sin contenido (p. ej. solo adjuntos): nada que repetir
  const trimmed = content.slice(0, ctx.config.maxLength);
  const body = ctx.config.uppercase ? trimmed.toUpperCase() : trimmed;
  await ctx.discord.sendMessage(message.channelId, `${ctx.config.prefix} ${body}`);
};

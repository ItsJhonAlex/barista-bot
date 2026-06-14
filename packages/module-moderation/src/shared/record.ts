import type { ModuleContext } from "@barista/core";
import { type ModActionInsert, modActions } from "@barista/db/schema";
import type { Config } from "../config.ts";

/** Inserta una fila en `mod_actions` con los campos comunes de una sanción. */
export async function recordAction(
  ctx: ModuleContext<Config>,
  values: Omit<ModActionInsert, "guildId" | "moderatorId"> & { moderatorId: string },
): Promise<void> {
  await ctx.db.insert(modActions).values({ ...values, guildId: ctx.guildId });
}

/** Anuncia la sanción en el canal de registro si está configurado (best-effort, no bloquea). */
export async function announce(ctx: ModuleContext<Config>, message: string): Promise<void> {
  const channelId = ctx.config.logChannelId;
  if (!channelId) return;
  await ctx.discord.sendMessage(channelId, message).catch((error) => {
    ctx.log.warn(`No se pudo anunciar en el canal de registro ${channelId}`, error);
  });
}

/** Etiqueta legible del objetivo para los mensajes de registro. */
export function mention(userId: string): string {
  return `<@${userId}>`;
}

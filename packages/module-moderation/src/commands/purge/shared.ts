import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { recordAction } from "../../shared/record.ts";
import { replyEphemeral, reportDiscordError } from "../../shared/reply.ts";

/** Parámetros normalizados de `/purge`, comunes a slash y prefix. */
export interface PurgeParams {
  readonly channelId: string;
  readonly moderatorId: string;
  readonly count: number;
}

/** Acción de `/purge`: borra en bloque mensajes recientes del canal. Sin jerarquía de miembro. */
export async function purge(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: PurgeParams,
): Promise<void> {
  let deleted: number;
  try {
    deleted = await ctx.discord.purgeMessages(params.channelId, params.count);
  } catch (error) {
    await reportDiscordError(interaction, error);
    return;
  }
  await recordAction(ctx, {
    type: "purge",
    targetUserId: params.channelId, // en purge, el "objetivo" es el canal
    moderatorId: params.moderatorId,
    reason: `Borrados ${deleted} mensajes`,
  });
  await replyEphemeral(interaction, `Borré ${deleted} mensaje(s) del canal.`);
}

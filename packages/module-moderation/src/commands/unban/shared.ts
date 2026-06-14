import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { announce, mention, recordAction } from "../../shared/record.ts";
import { replyEphemeral, reportDiscordError } from "../../shared/reply.ts";

/** Parámetros normalizados de `/unban`, comunes a slash y prefix. */
export interface UnbanParams {
  readonly targetUserId: string;
  readonly moderatorId: string;
  readonly reason?: string;
}

/** Acción de `/unban`: retira el ban. No valida jerarquía (el usuario ya no está en el guild). */
export async function unban(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: UnbanParams,
): Promise<void> {
  try {
    await ctx.discord.unbanMember(ctx.guildId, params.targetUserId, params.reason);
  } catch (error) {
    await reportDiscordError(interaction, error);
    return;
  }
  await recordAction(ctx, {
    type: "unban",
    targetUserId: params.targetUserId,
    moderatorId: params.moderatorId,
    reason: params.reason,
  });
  await announce(ctx, `Se retiró el ban de ${mention(params.targetUserId)}.`);
  await replyEphemeral(interaction, `Retiraste el ban de ${mention(params.targetUserId)}.`);
}

import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { ensureCanManage } from "../../shared/hierarchy.ts";
import { announce, mention, recordAction } from "../../shared/record.ts";
import { replyEphemeral, reportDiscordError } from "../../shared/reply.ts";

/** Parámetros normalizados de `/kick`, comunes a slash y prefix. */
export interface KickParams {
  readonly targetUserId: string;
  readonly moderatorId: string;
  readonly reason?: string;
}

/** Acción de `/kick`: expulsa a un miembro del servidor. */
export async function kick(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: KickParams,
): Promise<void> {
  if (!(await ensureCanManage(interaction, params.targetUserId))) return;

  try {
    await ctx.discord.kickMember(ctx.guildId, params.targetUserId, params.reason);
  } catch (error) {
    await reportDiscordError(interaction, error);
    return;
  }
  await recordAction(ctx, {
    type: "kick",
    targetUserId: params.targetUserId,
    moderatorId: params.moderatorId,
    reason: params.reason,
  });
  await announce(
    ctx,
    `Expulsión de ${mention(params.targetUserId)}${params.reason ? `: ${params.reason}` : ""}.`,
  );
  await replyEphemeral(interaction, `Expulsaste a ${mention(params.targetUserId)}.`);
}

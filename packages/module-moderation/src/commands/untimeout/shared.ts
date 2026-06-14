import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { ensureCanManage } from "../../shared/hierarchy.ts";
import { announce, mention, recordAction } from "../../shared/record.ts";
import { replyEphemeral, reportDiscordError } from "../../shared/reply.ts";

/** Parámetros normalizados de `/untimeout`, comunes a slash y prefix. */
export interface UntimeoutParams {
  readonly targetUserId: string;
  readonly moderatorId: string;
}

/** Acción de `/untimeout`: retira el timeout de un miembro. */
export async function untimeout(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: UntimeoutParams,
): Promise<void> {
  if (!(await ensureCanManage(interaction, params.targetUserId))) return;

  try {
    await ctx.discord.timeoutMember(ctx.guildId, params.targetUserId, null);
  } catch (error) {
    await reportDiscordError(interaction, error);
    return;
  }
  await recordAction(ctx, {
    type: "untimeout",
    targetUserId: params.targetUserId,
    moderatorId: params.moderatorId,
  });
  await announce(ctx, `Se retiró el timeout de ${mention(params.targetUserId)}.`);
  await replyEphemeral(interaction, `Retiraste el timeout de ${mention(params.targetUserId)}.`);
}

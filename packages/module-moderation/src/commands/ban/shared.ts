import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { ensureCanManage } from "../../shared/hierarchy.ts";
import { announce, mention, recordAction } from "../../shared/record.ts";
import { replyEphemeral, reportDiscordError } from "../../shared/reply.ts";

/** Parámetros normalizados de `/ban`, comunes a slash y prefix. */
export interface BanParams {
  readonly targetUserId: string;
  readonly moderatorId: string;
  readonly reason?: string;
  /** Días de mensajes a borrar (0-7). */
  readonly deleteDays: number;
}

/** Acción de `/ban`: banea a un usuario, con borrado opcional de mensajes. */
export async function ban(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: BanParams,
): Promise<void> {
  if (!(await ensureCanManage(interaction, params.targetUserId))) return;

  try {
    await ctx.discord.banMember(ctx.guildId, params.targetUserId, {
      reason: params.reason,
      deleteMessageSeconds: params.deleteDays * 86_400,
    });
  } catch (error) {
    await reportDiscordError(interaction, error);
    return;
  }
  await recordAction(ctx, {
    type: "ban",
    targetUserId: params.targetUserId,
    moderatorId: params.moderatorId,
    reason: params.reason,
  });
  await announce(
    ctx,
    `Baneo de ${mention(params.targetUserId)}${params.reason ? `: ${params.reason}` : ""}.`,
  );
  await replyEphemeral(interaction, `Baneaste a ${mention(params.targetUserId)}.`);
}

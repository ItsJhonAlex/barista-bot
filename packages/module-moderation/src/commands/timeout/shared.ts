import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { ensureCanManage } from "../../shared/hierarchy.ts";
import { announce, mention, recordAction } from "../../shared/record.ts";
import { replyEphemeral, reportDiscordError } from "../../shared/reply.ts";
import { parseDuration } from "../../utils/duration.ts";

/** Parámetros normalizados de `/timeout`, comunes a slash y prefix. */
export interface TimeoutParams {
  readonly targetUserId: string;
  readonly moderatorId: string;
  readonly rawDuration: string;
  readonly reason?: string;
}

/**
 * Acción de `/timeout`: silencia temporalmente al miembro. Parsea la duración, valida la
 * jerarquía, aplica el timeout vía @barista/discord, registra y anuncia. Cualquier paso que
 * falle responde efímero y corta.
 */
export async function timeout(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: TimeoutParams,
): Promise<void> {
  const durationMs = parseDuration(params.rawDuration);
  if (durationMs === null) {
    await replyEphemeral(
      interaction,
      "Duración no válida. Usa algo como 30s, 5m, 1h o 1d (máximo 28 días).",
    );
    return;
  }
  if (!(await ensureCanManage(interaction, params.targetUserId))) return;

  const untilMs = Date.now() + durationMs;
  try {
    await ctx.discord.timeoutMember(ctx.guildId, params.targetUserId, untilMs, params.reason);
  } catch (error) {
    await reportDiscordError(interaction, error);
    return;
  }
  await recordAction(ctx, {
    type: "timeout",
    targetUserId: params.targetUserId,
    moderatorId: params.moderatorId,
    reason: params.reason,
    expiresAt: new Date(untilMs),
  });
  await announce(
    ctx,
    `Timeout a ${mention(params.targetUserId)} hasta <t:${Math.floor(untilMs / 1000)}:R>${
      params.reason ? `: ${params.reason}` : ""
    }.`,
  );
  await replyEphemeral(interaction, `Silenciaste a ${mention(params.targetUserId)}.`);
}

import type { PrefixCommand } from "@barista/core";
import type { Config } from "../../../config.ts";
import { announce, mention, recordAction } from "../../../shared/record.ts";
import { parseDuration } from "../../../utils/duration.ts";

/**
 * SCAFFOLD de `/timeout` como prefix command (ADR-018). Aún no se despacha. Parsea
 * `args` (objetivo, duración, motivo) y reusa `parseDuration` (utils/) y los helpers de
 * `shared/record.ts`. La validación de jerarquía y la respuesta efímera son hoy
 * slash-específicas; el runtime de prefix las cableará cuando exista.
 */
export const command: PrefixCommand<Config> = {
  name: "timeout",
  run: async (ctx, message, args) => {
    const targetUserId = args[0]?.replace(/[<@!>]/g, "");
    const rawDuration = args[1];
    if (!targetUserId || !rawDuration) return;
    const reason = args.slice(2).join(" ") || undefined;

    const durationMs = parseDuration(rawDuration);
    if (durationMs === null) return;

    const untilMs = Date.now() + durationMs;
    await ctx.discord.timeoutMember(ctx.guildId, targetUserId, untilMs, reason);
    await recordAction(ctx, {
      type: "timeout",
      targetUserId,
      moderatorId: message.author.id,
      reason,
      expiresAt: new Date(untilMs),
    });
    await announce(
      ctx,
      `Timeout a ${mention(targetUserId)} hasta <t:${Math.floor(untilMs / 1000)}:R>${
        reason ? `: ${reason}` : ""
      }.`,
    );
  },
};

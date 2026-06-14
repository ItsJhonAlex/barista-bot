import type { PrefixCommand } from "@barista/core";
import type { Config } from "../../../config.ts";
import { announce, mention, recordAction } from "../../../shared/record.ts";

/**
 * SCAFFOLD de `/unban` como prefix command (ADR-018). Aún no se despacha. Parsea `args`
 * (id de usuario, motivo) y reusa los helpers de `shared/record.ts`. La respuesta efímera es hoy
 * slash-específica; el runtime de prefix la cableará cuando exista.
 */
export const command: PrefixCommand<Config> = {
  name: "unban",
  run: async (ctx, message, args) => {
    const targetUserId = args[0];
    if (!targetUserId) return;
    const reason = args.slice(1).join(" ") || undefined;

    await ctx.discord.unbanMember(ctx.guildId, targetUserId, reason);
    await recordAction(ctx, {
      type: "unban",
      targetUserId,
      moderatorId: message.author.id,
      reason,
    });
    await announce(ctx, `Se retiró el ban de ${mention(targetUserId)}.`);
  },
};

import type { PrefixCommand } from "@barista/core";
import type { Config } from "../../../config.ts";
import { announce, mention, recordAction } from "../../../shared/record.ts";

/**
 * SCAFFOLD de `/untimeout` como prefix command (ADR-018). Aún no se despacha. Parsea el primer
 * `arg` como objetivo y reusa los helpers de `shared/record.ts`. Jerarquía y respuesta efímera
 * son hoy slash-específicas; el runtime de prefix las cableará cuando exista.
 */
export const command: PrefixCommand<Config> = {
  name: "untimeout",
  run: async (ctx, message, args) => {
    const targetUserId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetUserId) return;

    await ctx.discord.timeoutMember(ctx.guildId, targetUserId, null);
    await recordAction(ctx, {
      type: "untimeout",
      targetUserId,
      moderatorId: message.author.id,
    });
    await announce(ctx, `Se retiró el timeout de ${mention(targetUserId)}.`);
  },
};

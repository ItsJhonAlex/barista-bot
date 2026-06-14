import type { PrefixCommand } from "@barista/core";
import type { Config } from "../../../config.ts";
import { recordAction } from "../../../shared/record.ts";

/**
 * SCAFFOLD de `/purge` como prefix command (ADR-018). Aún no se despacha. Parsea el primer `arg`
 * como cantidad y reusa `recordAction` de `shared/record.ts`. La respuesta efímera es hoy
 * slash-específica; el runtime de prefix la cableará cuando exista.
 */
export const command: PrefixCommand<Config> = {
  name: "purge",
  run: async (ctx, message, args) => {
    const count = Number(args[0]);
    if (!Number.isInteger(count) || count < 1 || count > 100) return;

    const deleted = await ctx.discord.purgeMessages(message.channelId, count);
    await recordAction(ctx, {
      type: "purge",
      targetUserId: message.channelId, // en purge, el "objetivo" es el canal
      moderatorId: message.author.id,
      reason: `Borrados ${deleted} mensajes`,
    });
  },
};

import type { PrefixCommand } from "@barista/core";
import type { Config } from "../../../config.ts";
import { announce, mention, recordAction } from "../../../shared/record.ts";

/**
 * SCAFFOLD de `/ban` como prefix command (ADR-018). Aún no se despacha. Parsea `args`
 * (objetivo, motivo) y reusa los helpers de `shared/record.ts`; los días a borrar salen de la
 * config. Jerarquía y respuesta efímera son hoy slash-específicas; el runtime de prefix las
 * cableará cuando exista.
 */
export const command: PrefixCommand<Config> = {
  name: "ban",
  run: async (ctx, message, args) => {
    const targetUserId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetUserId) return;
    const reason = args.slice(1).join(" ") || undefined;

    await ctx.discord.banMember(ctx.guildId, targetUserId, {
      reason,
      deleteMessageSeconds: ctx.config.defaultBanDeleteDays * 86_400,
    });
    await recordAction(ctx, {
      type: "ban",
      targetUserId,
      moderatorId: message.author.id,
      reason,
    });
    await announce(ctx, `Baneo de ${mention(targetUserId)}${reason ? `: ${reason}` : ""}.`);
  },
};

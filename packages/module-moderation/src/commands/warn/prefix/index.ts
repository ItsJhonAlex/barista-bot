import type { PrefixCommand } from "@barista/core";
import type { Config } from "../../../config.ts";
import { announce, mention, recordAction } from "../../../shared/record.ts";

/**
 * SCAFFOLD de `/warn` como prefix command (ADR-018). Aún no se despacha: existe para fijar la
 * forma del runtime futuro (messageCreate → parser → dispatch) y typechequear que comparte la
 * lógica con el slash. Parsea `args` (primer token = id del objetivo, resto = motivo) y reusa
 * los mismos helpers de `shared/record.ts`. La validación de jerarquía (hoy slash-específica,
 * responde efímero sobre la interaction) la cableará el runtime de prefix cuando exista.
 */
export const command: PrefixCommand<Config> = {
  name: "warn",
  run: async (ctx, message, args) => {
    const targetUserId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetUserId) return;
    const reason = args.slice(1).join(" ") || undefined;

    await recordAction(ctx, {
      type: "warn",
      targetUserId,
      moderatorId: message.author.id,
      reason,
    });
    await announce(ctx, `Aviso a ${mention(targetUserId)}${reason ? `: ${reason}` : ""}.`);
  },
};

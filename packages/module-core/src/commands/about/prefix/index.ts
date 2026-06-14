import type { PrefixCommand } from "@barista/core";
import { BOT_NAME, PROJECT_URL, manifest } from "../../../manifest.ts";

/**
 * SCAFFOLD de `/about` como prefix command (ADR-018). Aún no se despacha. Lógica trivial idéntica
 * al slash (sin `shared.ts`): lee la versión del manifest y responde en el canal del mensaje.
 */
export const command: PrefixCommand = {
  name: "about",
  run: async (ctx, message) => {
    const lines = [
      `**${BOT_NAME}** · versión ${manifest.version}`,
      "Bot de Discord modular, administrable desde el dashboard.",
      PROJECT_URL,
    ];
    await ctx.discord.sendMessage(message.channelId, lines.join("\n"));
  },
};

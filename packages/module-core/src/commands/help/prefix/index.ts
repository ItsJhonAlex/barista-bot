import type { PrefixCommand } from "@barista/core";
import { buildHelp } from "../shared.ts";

/**
 * SCAFFOLD de `/help` como prefix command (ADR-018). Aún no se despacha. Reusa `buildHelp` de
 * `shared.ts` sobre `ctx.catalog` y responde en el canal del mensaje.
 */
export const command: PrefixCommand = {
  name: "help",
  run: async (ctx, message) => {
    const modules = await ctx.catalog.enabledModules();
    await ctx.discord.sendMessage(message.channelId, buildHelp(modules));
  },
};

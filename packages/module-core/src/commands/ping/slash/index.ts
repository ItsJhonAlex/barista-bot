import type { ModuleCommand } from "@barista/core";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

/** `/ping` — confirma que el bot está vivo y muestra la latencia del WebSocket. */
export const command: ModuleCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Responde pong y muestra la latencia del bot."),
  preconditions: [],
  run: async (ctx, interaction) => {
    const websocket = Math.round(ctx.client.ws.ping);
    await interaction.reply({
      content: `Pong! 🏓  WebSocket ${websocket}ms`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

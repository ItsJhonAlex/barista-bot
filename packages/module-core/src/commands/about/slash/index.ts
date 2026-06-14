import type { ModuleCommand } from "@barista/core";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { BOT_NAME, PROJECT_URL, manifest } from "../../../manifest.ts";

/** `/about` — información del bot: nombre de marca, versión y enlace al proyecto. */
export const command: ModuleCommand = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Muestra información sobre el bot."),
  preconditions: [],
  run: async (_ctx, interaction) => {
    const lines = [
      `**${BOT_NAME}** · versión ${manifest.version}`,
      "Bot de Discord modular, administrable desde el dashboard.",
      PROJECT_URL,
    ];
    await interaction.reply({
      content: lines.join("\n"),
      flags: MessageFlags.Ephemeral,
    });
  },
};

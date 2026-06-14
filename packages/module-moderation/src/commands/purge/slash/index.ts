import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { purge } from "../shared.ts";

/** `/purge` — borra en bloque los mensajes recientes del canal. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Borra en bloque los mensajes recientes del canal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o
        .setName("cantidad")
        .setDescription("Cuántos mensajes borrar (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const count = interaction.options.getInteger("cantidad", true);
    await purge(ctx, interaction, {
      channelId: interaction.channelId,
      moderatorId: interaction.user.id,
      count,
    });
  },
};

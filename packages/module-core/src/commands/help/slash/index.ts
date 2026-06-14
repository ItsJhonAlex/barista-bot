import type { ModuleCommand } from "@barista/core";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { buildHelp } from "../shared.ts";

/** `/help` — lista los módulos activos en este servidor y sus comandos (ADR-015, vía ctx.catalog). */
export const command: ModuleCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lista los módulos activos en este servidor y sus comandos."),
  preconditions: [],
  run: async (ctx, interaction) => {
    const modules = await ctx.catalog.enabledModules();
    await interaction.reply({
      content: buildHelp(modules),
      flags: MessageFlags.Ephemeral,
    });
  },
};

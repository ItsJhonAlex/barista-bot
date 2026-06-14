import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { warn } from "../shared.ts";

/** `/warn` — avisa a un miembro y registra el motivo. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avisa a un miembro y registra el motivo.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Miembro a avisar").setRequired(true))
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo del aviso")),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const target = interaction.options.getUser("usuario", true);
    const reason = interaction.options.getString("motivo") ?? undefined;
    await warn(ctx, interaction, {
      targetUserId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });
  },
};

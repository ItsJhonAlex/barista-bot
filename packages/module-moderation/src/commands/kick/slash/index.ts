import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { kick } from "../shared.ts";

/** `/kick` — expulsa a un miembro del servidor. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa a un miembro del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) =>
      o.setName("usuario").setDescription("Miembro a expulsar").setRequired(true),
    )
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo de la expulsión")),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const target = interaction.options.getUser("usuario", true);
    const reason = interaction.options.getString("motivo") ?? undefined;
    await kick(ctx, interaction, {
      targetUserId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });
  },
};

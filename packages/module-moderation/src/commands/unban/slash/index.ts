import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { unban } from "../shared.ts";

/** `/unban` — retira el ban de un usuario por su id. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Retira el ban de un usuario.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) =>
      o.setName("usuario-id").setDescription("ID del usuario a desbanear").setRequired(true),
    )
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo del desbaneo")),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const targetUserId = interaction.options.getString("usuario-id", true);
    const reason = interaction.options.getString("motivo") ?? undefined;
    await unban(ctx, interaction, {
      targetUserId,
      moderatorId: interaction.user.id,
      reason,
    });
  },
};

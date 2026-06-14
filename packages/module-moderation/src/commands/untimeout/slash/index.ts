import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { untimeout } from "../shared.ts";

/** `/untimeout` — retira el timeout de un miembro. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Retira el timeout de un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("usuario").setDescription("Miembro a liberar").setRequired(true),
    ),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const target = interaction.options.getUser("usuario", true);
    await untimeout(ctx, interaction, {
      targetUserId: target.id,
      moderatorId: interaction.user.id,
    });
  },
};

import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { ban } from "../shared.ts";

/** `/ban` — banea a un usuario del servidor, con borrado opcional de mensajes. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Usuario a banear").setRequired(true))
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo del baneo"))
    .addIntegerOption((o) =>
      o
        .setName("borrar-mensajes-días")
        .setDescription("Días de mensajes a borrar (0-7)")
        .setMinValue(0)
        .setMaxValue(7),
    ),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const target = interaction.options.getUser("usuario", true);
    const reason = interaction.options.getString("motivo") ?? undefined;
    const deleteDays =
      interaction.options.getInteger("borrar-mensajes-días") ?? ctx.config.defaultBanDeleteDays;
    await ban(ctx, interaction, {
      targetUserId: target.id,
      moderatorId: interaction.user.id,
      reason,
      deleteDays,
    });
  },
};

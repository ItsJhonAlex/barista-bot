import type { ModuleCommand } from "@barista/core";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Config } from "../../../config.ts";
import { timeout } from "../shared.ts";

/** `/timeout` — silencia temporalmente a un miembro. */
export const command: ModuleCommand<Config> = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Silencia temporalmente a un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("usuario").setDescription("Miembro a silenciar").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("duración").setDescription("Duración: 30s, 5m, 1h, 1d (máx 28d)").setRequired(true),
    )
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo del timeout")),
  preconditions: ["ModeratorOnly"],
  run: async (ctx, interaction) => {
    const target = interaction.options.getUser("usuario", true);
    const rawDuration = interaction.options.getString("duración", true);
    const reason = interaction.options.getString("motivo") ?? undefined;
    await timeout(ctx, interaction, {
      targetUserId: target.id,
      moderatorId: interaction.user.id,
      rawDuration,
      reason,
    });
  },
};

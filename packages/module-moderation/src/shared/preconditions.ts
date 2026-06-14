import type { Precondition } from "@barista/core";
import { PermissionFlagsBits } from "discord.js";

/**
 * Solo modera quien tenga un permiso nativo de moderación (Moderar miembros, Expulsar o
 * Banear). Determinista: lee `interaction.memberPermissions`, no toca red. El rol
 * configurable (`config.moderatorRoleIds`) queda como mejora futura.
 */
export const ModeratorOnly: Precondition = (interaction) => {
  const perms = interaction.memberPermissions;
  const isModerator =
    perms?.has(PermissionFlagsBits.ModerateMembers) ||
    perms?.has(PermissionFlagsBits.KickMembers) ||
    perms?.has(PermissionFlagsBits.BanMembers);
  return isModerator
    ? { ok: true }
    : { ok: false, message: "No tienes permisos de moderación en este servidor." };
};

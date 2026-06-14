import { botCanManageMember, isGuildOwner } from "@barista/discord";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { replyEphemeral } from "./reply.ts";

/**
 * Carga el miembro del bot y el del objetivo para validar la jerarquía. Devuelve `null` si el
 * objetivo no es un miembro del servidor (p. ej. ya no está) o el bot no está cargado.
 */
export async function loadMembers(
  interaction: ChatInputCommandInteraction,
  targetUserId: string,
): Promise<{ botMember: GuildMember; targetMember: GuildMember } | null> {
  const guild = interaction.guild;
  if (!guild) return null;
  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
  if (!targetMember) return null;
  return { botMember, targetMember };
}

/**
 * Valida que el bot puede actuar sobre el objetivo según la jerarquía de roles (docs/10 §3). Si
 * no puede, responde efímero y devuelve `false`. El objetivo owner o por encima del bot se
 * rechaza ANTES de tocar Discord.
 */
export async function ensureCanManage(
  interaction: ChatInputCommandInteraction,
  targetUserId: string,
): Promise<boolean> {
  const members = await loadMembers(interaction, targetUserId);
  if (!members) {
    await replyEphemeral(interaction, "No encuentro a ese usuario en el servidor.");
    return false;
  }
  const { botMember, targetMember } = members;
  if (isGuildOwner(targetMember.guild, targetMember.id)) {
    await replyEphemeral(interaction, "No puedo actuar sobre el dueño del servidor.");
    return false;
  }
  if (!botCanManageMember(botMember, targetMember)) {
    await replyEphemeral(
      interaction,
      "No puedo actuar sobre ese usuario: su rol está por encima del mío. Sube mi rol e inténtalo de nuevo.",
    );
    return false;
  }
  return true;
}

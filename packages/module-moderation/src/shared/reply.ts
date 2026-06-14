import { DiscordError } from "@barista/discord";
import type { ChatInputCommandInteraction } from "discord.js";

/** Flags de respuesta efímera (MessageFlags.Ephemeral = 64); por valor, sin acoplar imports. */
export const EPHEMERAL = 64;

/** Responde a la interacción de forma efímera (solo la ve quien ejecutó el comando). */
export async function replyEphemeral(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  await interaction.reply({ content, flags: EPHEMERAL });
}

/** Traduce un error de Discord a un mensaje efímero en español; reenlanza lo que no reconozca. */
export async function reportDiscordError(
  interaction: ChatInputCommandInteraction,
  error: unknown,
): Promise<void> {
  if (error instanceof DiscordError) {
    await replyEphemeral(interaction, error.message);
    return;
  }
  throw error;
}

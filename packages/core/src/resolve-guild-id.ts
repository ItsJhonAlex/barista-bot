import type { ClientEvents } from "discord.js";

/**
 * Extrae el guildId de los argumentos de un evento del Gateway. La mayoría de eventos llevan
 * el guild en el primer argumento, ya sea como `.guildId` (p. ej. Message) o `.guild.id`
 * (p. ej. GuildMember). Devuelve null para eventos sin guild (DMs, eventos globales), en cuyo
 * caso el gate por-guild no aplica.
 */
export function resolveGuildId<E extends keyof ClientEvents>(
  _event: E,
  args: ClientEvents[E],
): string | null {
  const first: unknown = args[0];
  if (first !== null && typeof first === "object") {
    const candidate = first as { guildId?: unknown; guild?: { id?: unknown } | null };
    if (typeof candidate.guildId === "string") return candidate.guildId;
    if (candidate.guild && typeof candidate.guild.id === "string") return candidate.guild.id;
  }
  return null;
}

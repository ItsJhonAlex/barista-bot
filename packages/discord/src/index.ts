import type { Client } from "discord.js";

/**
 * @barista/discord — fachada de acceso a Discord (REST, permisos, jerarquía). Es la única vía
 * que los módulos usan para actuar sobre Discord; en tests se mockea (nada de red real). El
 * manejo de rate limits y jerarquía se endurece en M1; en el Sprint 0 cubre lo mínimo.
 */
export interface DiscordService {
  /** Envía un mensaje de texto a un canal por su id. */
  sendMessage(channelId: string, content: string): Promise<void>;
}

/** Implementación real sobre un cliente de discord.js. */
export function createDiscordService(client: Client): DiscordService {
  return {
    async sendMessage(channelId, content) {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased() && "send" in channel) {
        await channel.send(content);
      }
    },
  };
}

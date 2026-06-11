import type { Client, GuildTextBasedChannel } from "discord.js";
import { normalizeDiscordError } from "./errors.ts";
import { RequestQueue } from "./queue.ts";

export {
  DiscordError,
  type DiscordErrorOptions,
  normalizeDiscordError,
} from "./errors.ts";
export {
  botCanManageMember,
  botCanManageRole,
  botHasPermission,
  highestRolePosition,
  isGuildOwner,
} from "./hierarchy.ts";
export { RequestQueue } from "./queue.ts";

/** Opciones del ban de un miembro. */
export interface BanMemberOptions {
  /** Motivo registrado en el audit log de Discord. */
  reason?: string;
  /** Segundos de historial de mensajes del usuario a borrar (0–604800). */
  deleteMessageSeconds?: number;
}

/**
 * @barista/discord — fachada de acceso a Discord (REST, permisos, jerarquía). Es la única vía que
 * los módulos usan para actuar sobre Discord; en tests se mockea (nada de red real). Endurecida en
 * S1.G: toda llamada pasa por una cola con control de concurrencia y devuelve errores normalizados
 * (`DiscordError`). El rate-limit por-ruta y el backoff 429 los gestiona discord.js por debajo.
 */
export interface DiscordService {
  /**
   * Primitiva genérica: ejecuta cualquier operación contra la REST de discord.js a través del
   * camino endurecido (cola + normalización de errores). Cualquier módulo puede usarla.
   */
  run<T>(operation: () => Promise<T>): Promise<T>;

  /** Envía un mensaje de texto a un canal por su id. */
  sendMessage(channelId: string, content: string): Promise<void>;

  /**
   * Aplica (o quita) un timeout a un miembro. `untilMs` es el timestamp epoch en ms hasta el que
   * dura; `null` lo retira.
   */
  timeoutMember(
    guildId: string,
    userId: string,
    untilMs: number | null,
    reason?: string,
  ): Promise<void>;

  /** Expulsa a un miembro del guild. */
  kickMember(guildId: string, userId: string, reason?: string): Promise<void>;

  /** Banea a un usuario del guild. */
  banMember(guildId: string, userId: string, opts?: BanMemberOptions): Promise<void>;

  /** Retira el ban de un usuario. */
  unbanMember(guildId: string, userId: string, reason?: string): Promise<void>;

  /** Borra hasta `count` mensajes recientes de un canal (bulkDelete). Devuelve cuántos borró. */
  purgeMessages(channelId: string, count: number): Promise<number>;
}

/** Implementación real sobre un cliente de discord.js. */
export function createDiscordService(
  client: Client,
  opts: { concurrency?: number } = {},
): DiscordService {
  const queue = new RequestQueue(opts.concurrency ?? 1);

  /** Encola la operación y normaliza cualquier error de la REST a un `DiscordError`. */
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    return queue.enqueue(async () => {
      try {
        return await operation();
      } catch (error) {
        throw normalizeDiscordError(error);
      }
    });
  }

  return {
    run,

    async sendMessage(channelId, content) {
      await run(async () => {
        const channel = await client.channels.fetch(channelId);
        if (channel?.isTextBased() && "send" in channel) {
          await channel.send(content);
        }
      });
    },

    async timeoutMember(guildId, userId, untilMs, reason) {
      await run(async () => {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.timeout(untilMs, reason);
      });
    },

    async kickMember(guildId, userId, reason) {
      await run(async () => {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.kick(reason);
      });
    },

    async banMember(guildId, userId, banOpts) {
      await run(async () => {
        const guild = await client.guilds.fetch(guildId);
        await guild.members.ban(userId, {
          reason: banOpts?.reason,
          deleteMessageSeconds: banOpts?.deleteMessageSeconds,
        });
      });
    },

    async unbanMember(guildId, userId, reason) {
      await run(async () => {
        const guild = await client.guilds.fetch(guildId);
        await guild.members.unban(userId, reason);
      });
    },

    async purgeMessages(channelId, count) {
      return run(async () => {
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased() || channel.isDMBased() || !("bulkDelete" in channel)) {
          return 0;
        }
        // bulkDelete con `true` filtra mensajes de más de 14 días (Discord no los borra en bulk).
        const deleted = await (channel as GuildTextBasedChannel).bulkDelete(count, true);
        return deleted.size;
      });
    },
  };
}

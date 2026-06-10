import type { Logger } from "@barista/core";
import type { Database } from "@barista/db/client";
import { guilds } from "@barista/db/schema";
import type { Client, Guild } from "discord.js";
import { eq } from "drizzle-orm";

/**
 * Mantiene la tabla `guilds` en sintonía con los servidores donde está el bot. Es necesaria
 * para la FK de `guild_modules` (toggles por servidor) y para que la `api` intersecte los
 * servidores administrables del operador (`/me/guilds`).
 */

/** Inserta o actualiza la fila del guild (y limpia `leftAt` si el bot ha vuelto a entrar). */
export async function upsertGuild(db: Database, guild: Guild): Promise<void> {
  const values = {
    id: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL(),
    ownerId: guild.ownerId,
  };
  await db
    .insert(guilds)
    .values(values)
    .onConflictDoUpdate({
      target: guilds.id,
      set: { name: values.name, iconUrl: values.iconUrl, ownerId: values.ownerId, leftAt: null },
    });
}

/** Sincroniza de golpe todos los guilds en caché (se llama al arrancar, en `ready`). */
export async function syncAllGuilds(db: Database, client: Client): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await upsertGuild(db, guild);
  }
}

/** Registra los listeners para mantener `guilds` al día cuando el bot entra/sale. */
export function registerGuildSync(client: Client, db: Database, log: Logger): void {
  client.on("guildCreate", (guild) => {
    upsertGuild(db, guild).catch((error) =>
      log.error(`Fallo al upsert de guild ${guild.id}`, error),
    );
  });
  client.on("guildDelete", (guild) => {
    db.update(guilds)
      .set({ leftAt: new Date() })
      .where(eq(guilds.id, guild.id))
      .catch((error) => log.error(`Fallo al marcar leftAt de guild ${guild.id}`, error));
  });
}

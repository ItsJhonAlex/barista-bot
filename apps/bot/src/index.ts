import { fileURLToPath } from "node:url";
import { loadEnv } from "@barista/config";
import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from "@sapphire/framework";
import { Events, GatewayIntentBits } from "discord.js";

// Validación del entorno al arrancar (fail fast): si falta o es inválida una variable, el
// proceso muere aquí con un mensaje claro, nunca a mitad de un evento.
const env = loadEnv();

// En desarrollo, registrar los comandos en un servidor concreto los hace aparecer al
// instante; el registro global puede tardar ~1 h en propagarse. Sin la variable, global.
if (env.DISCORD_DEV_GUILD_ID) {
  ApplicationCommandRegistries.setDefaultGuildIds([env.DISCORD_DEV_GUILD_ID]);
}
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);

// Intents mínimos: para slash commands basta `Guilds`. Los intents privilegiados
// (MessageContent, GuildMembers, Presence) se añadirán cuando un módulo los necesite (S0.4).
const client = new SapphireClient({
  // Fijamos el directorio base explícitamente: en ESM/Bun, Sapphire lo deduciría de
  // `process.cwd()` (la raíz del monorepo) y no encontraría `commands/`. Apuntamos a este
  // mismo directorio (`apps/bot/src`), donde viven las piezas (commands, listeners, …).
  baseUserDirectory: fileURLToPath(new URL(".", import.meta.url)),
  intents: [GatewayIntentBits.Guilds],
  logger: { level: env.NODE_ENV === "development" ? LogLevel.Debug : LogLevel.Info },
});

client.once(Events.ClientReady, (ready) => {
  client.logger.info(`Conectado como ${ready.user.tag} (id ${ready.user.id})`);
});

await client.login(env.DISCORD_BOT_TOKEN);

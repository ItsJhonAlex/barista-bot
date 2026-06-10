import { fileURLToPath } from "node:url";
import { loadEnv } from "@barista/config";
import { EventDispatcher, type Logger, ModuleGate, createMemoryStore } from "@barista/core";
import { createDb } from "@barista/db/client";
import { createDiscordService } from "@barista/discord";
import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from "@sapphire/framework";
import { Events, GatewayIntentBits } from "discord.js";
import { createEffectiveStateResolver, seedModuleCatalog } from "./effective-state.ts";
import { buildRegistry } from "./registry.ts";

// Validación del entorno al arrancar (fail fast).
const env = loadEnv();

// En desarrollo, registro instantáneo de slash commands en el servidor de pruebas.
if (env.DISCORD_DEV_GUILD_ID) {
  ApplicationCommandRegistries.setDefaultGuildIds([env.DISCORD_DEV_GUILD_ID]);
}
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);

const client = new SapphireClient({
  baseUserDirectory: fileURLToPath(new URL(".", import.meta.url)),
  // `echo` escucha `messageCreate` con contenido: hacen falta los intents de mensajes y el
  // privilegiado MessageContent (habilitado en el portal de Discord).
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  logger: { level: env.NODE_ENV === "development" ? LogLevel.Debug : LogLevel.Info },
});

// Adapta el logger de Sapphire al contrato `Logger` del core.
const log: Logger = {
  debug: (message, ...meta) => client.logger.debug(message, ...meta),
  info: (message, ...meta) => client.logger.info(message, ...meta),
  warn: (message, ...meta) => client.logger.warn(message, ...meta),
  error: (message, ...meta) => client.logger.error(message, ...meta),
};

// --- Sistema de módulos (el corazón) ---
const registry = await buildRegistry();
const { db } = createDb(env.DATABASE_URL);
await seedModuleCatalog(db, registry);

const gate = new ModuleGate(createEffectiveStateResolver(db));
const dispatcher = new EventDispatcher({
  registry,
  gate,
  client,
  discord: createDiscordService(client),
  log,
  createStore: createMemoryStore(),
});

// Regla de oro: UN listener por tipo de evento que delega en el router del core, que aplica
// el gate por-guild. Activar/desactivar un módulo es cambiar el resultado del gate; cero
// re-registro de listeners.
for (const event of registry.subscribedEvents()) {
  client.on(event, (...args) => {
    dispatcher.dispatch(event, args as never).catch((error) => {
      log.error(`Fallo al despachar el evento "${String(event)}"`, error);
    });
  });
}

client.once(Events.ClientReady, (ready) => {
  log.info(`Conectado como ${ready.user.tag} (id ${ready.user.id})`);
});

await client.login(env.DISCORD_BOT_TOKEN);

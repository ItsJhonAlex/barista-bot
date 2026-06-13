import { fileURLToPath } from "node:url";
import { createSubscriber } from "@barista/bus";
import { loadEnv } from "@barista/config";
import {
  CommandDispatcher,
  EventDispatcher,
  type Logger,
  ModuleGate,
  createDefaultPreconditions,
  createMemoryStore,
} from "@barista/core";
import { createDb } from "@barista/db/client";
import { createDiscordService } from "@barista/discord";
import { LogLevel, SapphireClient } from "@sapphire/framework";
import { Events, GatewayIntentBits } from "discord.js";
import { registerGlobalCommands, syncGuildCommands } from "./command-registrar.ts";
import { createEffectiveStateResolver, seedModuleCatalog } from "./effective-state.ts";
import { registerGuildSync, syncAllGuilds } from "./guild-sync.ts";
import { buildRegistry } from "./registry.ts";

// Validación del entorno al arrancar (fail fast).
const env = loadEnv();

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

const discord = createDiscordService(client);
const createStore = createMemoryStore();

// La `api` publica en Redis al togglear/reconfigurar un módulo; aquí invalidamos solo la
// entrada de caché afectada para que la siguiente lectura repueble desde BD. Así el toggle
// surte efecto en < 2 s sin tocar BD en el hot path ni reiniciar (O3 / RNF-12).
const subscriber = createSubscriber(env.REDIS_URL);
await subscriber.onModuleToggled(({ guildId, moduleId, enabled }) => {
  // Orden: 1) invalidar el gate para que `syncGuildCommands` lea el estado efectivo nuevo;
  // 2) recomponer el set de comandos por-guild (ADR-005). La red de seguridad `ModuleEnabled`
  // del CommandDispatcher cubre el lag entre el toggle y que Discord propague el set.
  gate.invalidate(guildId, moduleId);
  log.info(`Caché invalidada (module.toggled): ${moduleId}@${guildId} enabled=${enabled}`);
  if (client.isReady()) {
    syncGuildCommands(client, registry, gate, guildId, discord, env.DISCORD_DEV_GUILD_ID).catch(
      (error) => log.error(`Fallo al sincronizar comandos de ${guildId}`, error),
    );
  }
});
await subscriber.onModuleConfigUpdated(({ guildId, moduleId }) => {
  gate.invalidate(guildId, moduleId);
  log.info(`Caché invalidada (module.config.updated): ${moduleId}@${guildId}`);
});

const dispatcher = new EventDispatcher({
  registry,
  gate,
  client,
  discord,
  log,
  createStore,
  db,
});

// Preconditions: las built-in del core más las que aporta cada módulo (ADR-017). Registrar las
// de módulo aquí, al arrancar; una colisión de nombre con una ya registrada aborta el arranque.
const preconditions = createDefaultPreconditions();
for (const mod of registry.all()) {
  for (const [name, fn] of Object.entries(mod.preconditions ?? {})) {
    if (preconditions.has(name)) {
      throw new Error(
        `Colisión de precondition "${name}" al registrar el módulo "${mod.manifest.id}"`,
      );
    }
    preconditions.register(name, fn);
  }
}

// Router de comandos (ADR-014): espejo del event dispatcher. Sapphire es el host (login, REST),
// pero el routing y las preconditions de módulo viven en el core.
const commandDispatcher = new CommandDispatcher({
  registry,
  gate,
  client,
  discord,
  log,
  createStore,
  db,
  preconditions,
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

// Bridge con Sapphire (ADR-014): UN listener de interactionCreate que delega en el
// CommandDispatcher del core. No usamos piezas Command de Sapphire para los módulos.
client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  commandDispatcher.dispatch(interaction).catch((error) => {
    log.error(`Fallo al despachar el comando "${interaction.commandName}"`, error);
  });
});

// Mantiene la tabla `guilds` al día (alta/baja del bot en servidores).
registerGuildSync(client, db, log);

client.once(Events.ClientReady, (ready) => {
  log.info(`Conectado como ${ready.user.tag} (id ${ready.user.id})`);
  // Registro GLOBAL de los comandos del módulo `core` (ADR-005), y a continuación sincronización
  // POR-GUILD del set de los módulos opcionales activos en cada guild. El orden importa en el
  // dev-guild: `registerGlobalCommands` registra `core` guild-scoped y `syncGuildCommands` lo
  // recompone con los opcionales (sin él, los machacaría).
  registerGlobalCommands(ready, registry, log, env.DISCORD_DEV_GUILD_ID)
    .then(async () => {
      for (const guildId of ready.guilds.cache.keys()) {
        await syncGuildCommands(
          ready,
          registry,
          gate,
          guildId,
          discord,
          env.DISCORD_DEV_GUILD_ID,
        ).catch((error) => log.error(`Fallo al sincronizar comandos de ${guildId}`, error));
      }
    })
    .catch((error) => log.error("Fallo al registrar los comandos globales", error));
  syncAllGuilds(db, client).catch((error) => log.error("Fallo al sincronizar guilds", error));
});

await client.login(env.DISCORD_BOT_TOKEN);

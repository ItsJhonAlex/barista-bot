import type { Logger, ModuleGate, ModuleRegistry } from "@barista/core";
import type { DiscordService } from "@barista/discord";
import type { Client, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

/** id del módulo `core`: sus comandos van GLOBAL, nunca en el set por-guild (salvo dev). */
const CORE_MODULE_ID = "core";

/**
 * Registro de slash commands en Discord (ADR-005, estrategia híbrida).
 *
 * El módulo `core` (siempre activo) registra GLOBAL. Toma sus comandos del registry, los
 * serializa con `data.toJSON()` y los publica con `application.commands.set`. En desarrollo,
 * si hay `DISCORD_DEV_GUILD_ID`, registra el set de `core` a nivel de guild para propagación
 * instantánea.
 *
 * Los módulos opcionales NO registran aquí: sus comandos se sincronizan POR-GUILD al togglear
 * (`syncGuildCommands`).
 */
export async function registerGlobalCommands(
  client: Client<true>,
  registry: ModuleRegistry,
  log: Logger,
  devGuildId?: string,
): Promise<void> {
  const commands = registry.commandsOf(CORE_MODULE_ID).map((command) => command.data.toJSON());

  if (devGuildId) {
    // Dev: registro guild-scoped para que los comandos aparezcan al instante. Aquí solo el set
    // de `core`; `syncGuildCommands` lo recompone con los opcionales activos cuando se toggle.
    const guild = await client.guilds.fetch(devGuildId);
    await guild.commands.set(commands);
    log.info(`Comandos de "core" registrados en el guild de desarrollo ${devGuildId}`);
    return;
  }

  await client.application.commands.set(commands);
  log.info(`Comandos globales de "core" registrados (${commands.length})`);
}

/**
 * Sincroniza POR-GUILD el set de comandos de los módulos opcionales ACTIVOS en `guildId`
 * (ADR-005). Es declarativo: construye el set efectivo (todos los comandos de los módulos
 * opcionales que el gate da por activos en este guild) y lo publica de golpe con
 * `guild.commands.set`, que da de alta los nuevos y de baja los que ya no estén. La llamada REST
 * se encola en `@barista/discord` (rate-limit, RNF-10/11) y solo ocurre al togglear, nunca en el
 * hot path por cada comando.
 *
 * `core` va GLOBAL y NO entra en el set por-guild — EXCEPTO en el guild de desarrollo
 * (`devGuildId`), donde `registerGlobalCommands` registró `core` a nivel de guild para
 * propagación instantánea: allí el set debe ser `core + opcionales activos`, o sobrescribiríamos
 * los comandos de `core`.
 */
export async function syncGuildCommands(
  client: Client<true>,
  registry: ModuleRegistry,
  gate: ModuleGate,
  guildId: string,
  discord: DiscordService,
  devGuildId?: string,
): Promise<void> {
  const set: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  // En el dev-guild, `core` se registró guild-scoped: lo reincluimos para no machacarlo.
  if (devGuildId !== undefined && guildId === devGuildId) {
    for (const command of registry.commandsOf(CORE_MODULE_ID)) {
      set.push(command.data.toJSON());
    }
  }

  for (const mod of registry.all()) {
    if (mod.manifest.id === CORE_MODULE_ID) continue; // core no entra en el set por-guild
    if (!(await gate.isEnabled(guildId, mod.manifest.id))) continue; // solo opcionales activos
    for (const command of registry.commandsOf(mod.manifest.id)) {
      set.push(command.data.toJSON());
    }
  }

  const guild = await client.guilds.fetch(guildId);
  await discord.run(() => guild.commands.set(set));
}

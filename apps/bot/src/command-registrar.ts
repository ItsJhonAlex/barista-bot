import type { Logger, ModuleRegistry } from "@barista/core";
import type { Client } from "discord.js";

/**
 * Registro de slash commands en Discord (ADR-005, estrategia híbrida).
 *
 * M1: solo el módulo `core` (siempre activo) registra GLOBAL. Toma sus comandos del registry,
 * los serializa con `data.toJSON()` y los publica con `application.commands.set`. En desarrollo,
 * si hay `DISCORD_DEV_GUILD_ID`, registra el set completo a nivel de guild para propagación
 * instantánea (mismo patrón que tenía `/ping`).
 *
 * Los módulos opcionales NO registran aquí: sus comandos se sincronizan POR-GUILD al togglear
 * (ver el TODO de `syncGuildCommands`).
 */
export async function registerGlobalCommands(
  client: Client<true>,
  registry: ModuleRegistry,
  log: Logger,
  devGuildId?: string,
): Promise<void> {
  const commands = registry.commandsOf("core").map((command) => command.data.toJSON());

  if (devGuildId) {
    // Dev: registro guild-scoped para que los comandos aparezcan al instante.
    const guild = await client.guilds.fetch(devGuildId);
    await guild.commands.set(commands);
    log.info(`Comandos de "core" registrados en el guild de desarrollo ${devGuildId}`);
    return;
  }

  await client.application.commands.set(commands);
  log.info(`Comandos globales de "core" registrados (${commands.length})`);
}

// TODO(M1-moderation): syncGuildCommands(guildId, moduleId, enabled) — al recibir el evento
// Redis `module.toggled`, dar de alta/baja los comandos de ESE módulo en ESE guild. Las
// llamadas REST van en cola y con rate-limit en @barista/discord, y solo se ejecutan en el
// momento del toggle (RNF-10/11), nunca en el hot path por cada comando.
// Firma prevista:
//   export async function syncGuildCommands(
//     client: Client<true>,
//     registry: ModuleRegistry,
//     guildId: string,
//     moduleId: string,
//     enabled: boolean,
//   ): Promise<void>;

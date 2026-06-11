import type { ChatInputCommandInteraction } from "discord.js";
import { type ContextDeps, buildModuleContext } from "./build-context.ts";
import {
  BotHasPermissions,
  GuildOnly,
  type Precondition,
  type PreconditionRegistry,
  RequirePermissions,
} from "./preconditions.ts";
import type { CommandEntry } from "./registry.ts";

/** Dependencias del router de comandos (espejo de `DispatcherDeps` más el registro de preconditions). */
export interface CommandDispatcherDeps extends ContextDeps {
  readonly preconditions: PreconditionRegistry;
}

/**
 * Las preconditions implícitas que el core aplica SIEMPRE, en orden, antes de las que declara
 * el comando. GuildOnly corta los comandos fuera de servidor; las de permisos son stubs M1
 * (pasan salvo que el comando/módulo declare requisitos) y Cooldown lo aporta el módulo cuando
 * lo necesite. El gate (`ModuleEnabled`) se comprueba aparte, antes que esta cadena.
 */
const IMPLICIT_PRECONDITIONS: readonly Precondition[] = [
  GuildOnly,
  RequirePermissions,
  BotHasPermissions,
];

/**
 * El router de comandos: espejo del `EventDispatcher`. El bot registra UN listener de
 * `interactionCreate` que delega aquí (ADR-014). Resuelve el comando, aplica el gate por-guild
 * como red de seguridad, encadena las preconditions y ejecuta `run` aislando errores. Sapphire
 * sigue siendo el host (login, REST), pero el routing y las preconditions de módulo viven aquí.
 */
export class CommandDispatcher {
  readonly #deps: CommandDispatcherDeps;

  constructor(deps: CommandDispatcherDeps) {
    this.#deps = deps;
  }

  async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
    const entry = this.#deps.registry.findCommand(interaction.commandName);
    if (!entry) {
      this.#deps.log.warn(`Comando desconocido: "${interaction.commandName}"`);
      return;
    }

    // GuildOnly implícito: sin guild, no hay gate por-guild ni contexto posible.
    const guildId = interaction.guildId;
    if (guildId === null) {
      await this.#replyEphemeral(interaction, "Este comando solo puede usarse en un servidor.");
      return;
    }

    // GATE — red de seguridad `ModuleEnabled`: aunque el comando esté registrado en Discord, si
    // el módulo está desactivado en este guild (p. ej. lag de sincronización), no se ejecuta.
    if (!(await this.#deps.gate.isEnabled(guildId, entry.mod.manifest.id))) {
      await this.#replyEphemeral(interaction, "Este módulo está desactivado.");
      return;
    }

    // Cadena de preconditions: implícitas primero, luego las que declara el comando.
    const failure = await this.#runPreconditions(interaction, entry);
    if (failure !== null) {
      await this.#replyEphemeral(interaction, failure);
      return;
    }

    const ctx = await buildModuleContext(this.#deps, entry.mod, guildId);
    try {
      await entry.command.run(ctx, interaction);
    } catch (error) {
      this.#deps.log.error(
        `Comando "${interaction.commandName}" del módulo "${entry.mod.manifest.id}" falló`,
        error,
      );
      if (!interaction.replied && !interaction.deferred) {
        await this.#replyEphemeral(interaction, "Algo salió mal al ejecutar el comando.");
      }
    }
  }

  /** Ejecuta la cadena de preconditions en orden; devuelve el mensaje del primer fallo o null. */
  async #runPreconditions(
    interaction: ChatInputCommandInteraction,
    entry: CommandEntry,
  ): Promise<string | null> {
    const declared = this.#deps.preconditions.resolve(entry.command.preconditions ?? []);
    const chain = [...IMPLICIT_PRECONDITIONS, ...declared];
    for (const precondition of chain) {
      const result = await precondition(interaction, entry.command);
      if (!result.ok) return result.message;
    }
    return null;
  }

  async #replyEphemeral(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
    // MessageFlags.Ephemeral = 64; lo usamos por valor para no acoplar el dispatcher a un import
    // de runtime de discord.js y mantener los tests con interacciones falsas livianas.
    await interaction.reply({ content, flags: 64 });
  }
}

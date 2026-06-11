import type { ClientEvents } from "discord.js";
import type { z } from "zod";
import type { BaristaModule, ModuleCommand } from "./contract.ts";

const MODULE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+].*)?$/;

/** Entrada del índice de comandos: el comando y el módulo que lo aporta. */
export interface CommandEntry {
  readonly mod: BaristaModule;
  readonly command: ModuleCommand;
}

/**
 * Registry de módulos: valida manifests, indexa qué módulos escuchan cada evento y resuelve
 * el orden de carga según `dependsOn` (orden topológico). Es puro y en memoria; la
 * persistencia de metadata en `module_registry` la hace el llamador (el bot/api).
 */
export class ModuleRegistry {
  readonly #modules = new Map<string, BaristaModule>();
  readonly #byEvent = new Map<keyof ClientEvents, BaristaModule[]>();
  readonly #byCommandName = new Map<string, CommandEntry>();

  /**
   * Registra un módulo validando su manifest. Es genérico en el schema para aceptar cualquier
   * módulo concreto; internamente se almacena con el schema "borrado" porque el registry trata
   * los módulos de forma opaca (solo lee manifest/events) y la invariancia del genérico no
   * aportaría seguridad aquí. Lanza si el manifest es inválido o el id está duplicado.
   */
  register<S extends z.ZodTypeAny>(mod: BaristaModule<S>): void {
    const { id, version } = mod.manifest;
    if (!MODULE_ID.test(id)) {
      throw new Error(`Id de módulo inválido (debe ser kebab-case): "${id}"`);
    }
    if (!SEMVER.test(version)) {
      throw new Error(`Versión semver inválida en el módulo "${id}": "${version}"`);
    }
    if (this.#modules.has(id)) {
      throw new Error(`Id de módulo duplicado: "${id}"`);
    }

    const stored = mod as unknown as BaristaModule;

    // Indexa los comandos por nombre antes de mutar el estado: una colisión debe abortar el
    // registro completo del módulo sin dejarlo a medias.
    const indexed: CommandEntry[] = [];
    for (const command of stored.commands ?? []) {
      const name = command.data.name;
      if (this.#byCommandName.has(name)) {
        const owner = this.#byCommandName.get(name)?.mod.manifest.id;
        throw new Error(
          `Colisión de comando "${name}": ya lo aporta el módulo "${owner}" (al registrar "${id}")`,
        );
      }
      indexed.push({ mod: stored, command });
    }

    this.#modules.set(id, stored);
    for (const entry of indexed) {
      this.#byCommandName.set(entry.command.data.name, entry);
    }
    for (const event of Object.keys(stored.events ?? {}) as (keyof ClientEvents)[]) {
      const listeners = this.#byEvent.get(event) ?? [];
      listeners.push(stored);
      this.#byEvent.set(event, listeners);
    }
  }

  get(id: string): BaristaModule | undefined {
    return this.#modules.get(id);
  }

  all(): readonly BaristaModule[] {
    return [...this.#modules.values()];
  }

  /** Eventos del Gateway que algún módulo escucha (para registrar UN listener por evento). */
  subscribedEvents(): readonly (keyof ClientEvents)[] {
    return [...this.#byEvent.keys()];
  }

  /** Módulos que escuchan un evento concreto. */
  modulesListeningTo(event: keyof ClientEvents): readonly BaristaModule[] {
    return this.#byEvent.get(event) ?? [];
  }

  /** Resuelve un comando por su nombre (clave única global) al módulo que lo aporta. */
  findCommand(name: string): CommandEntry | undefined {
    return this.#byCommandName.get(name);
  }

  /** Comandos que aporta un módulo concreto (en orden de declaración). */
  commandsOf(moduleId: string): readonly ModuleCommand[] {
    return this.#modules.get(moduleId)?.commands ?? [];
  }

  /**
   * Orden de carga resolviendo `dependsOn` por orden topológico. Lanza si falta una
   * dependencia o si hay un ciclo.
   */
  loadOrder(): readonly BaristaModule[] {
    const ordered: BaristaModule[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const visit = (id: string, trail: readonly string[]): void => {
      if (visited.has(id)) return;
      if (inStack.has(id)) {
        throw new Error(`Ciclo de dependencias entre módulos: ${[...trail, id].join(" → ")}`);
      }
      const mod = this.#modules.get(id);
      if (!mod) {
        const from = trail.at(-1);
        throw new Error(`Dependencia ausente: "${id}"${from ? ` (requerida por "${from}")` : ""}`);
      }
      inStack.add(id);
      for (const dep of mod.manifest.dependsOn ?? []) {
        visit(dep, [...trail, id]);
      }
      inStack.delete(id);
      visited.add(id);
      ordered.push(mod);
    };

    for (const id of this.#modules.keys()) {
      visit(id, []);
    }
    return ordered;
  }
}

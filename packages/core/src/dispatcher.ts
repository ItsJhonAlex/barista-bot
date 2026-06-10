import type { DiscordService } from "@barista/discord";
import type { Client, ClientEvents } from "discord.js";
import type { z } from "zod";
import type { BaristaModule, Logger, ModuleContext, ModuleStore } from "./contract.ts";
import type { ModuleGate } from "./gate.ts";
import type { ModuleRegistry } from "./registry.ts";
import { resolveGuildId } from "./resolve-guild-id.ts";
import { safeRun } from "./safe-run.ts";

/** Dependencias que el bot inyecta al dispatcher (todo lo necesario para construir el ctx). */
export interface DispatcherDeps {
  readonly registry: ModuleRegistry;
  readonly gate: ModuleGate;
  readonly client: Client;
  readonly discord: DiscordService;
  readonly log: Logger;
  readonly createStore: (moduleId: string, guildId: string) => ModuleStore;
}

/**
 * El event router. El bot registra UN listener por evento que delega aquí. Para cada módulo
 * que escucha el evento aplica el gate por-guild y ejecuta su handler aislando errores. Es lo
 * que hace que activar/desactivar sea cambiar el resultado del gate, sin re-registrar nada.
 */
export class EventDispatcher {
  readonly #deps: DispatcherDeps;

  constructor(deps: DispatcherDeps) {
    this.#deps = deps;
  }

  async dispatch<E extends keyof ClientEvents>(event: E, args: ClientEvents[E]): Promise<void> {
    const guildId = resolveGuildId(event, args);
    // S0.4: el gate por-guild solo aplica a eventos con guild; los globales (DM) se omiten
    // hasta definir una política para módulos sin guild.
    if (guildId === null) return;

    for (const mod of this.#deps.registry.modulesListeningTo(event)) {
      // El tipo mapeado de `events` no es indexable por una clave genérica; lo tratamos como
      // un record opaco para recuperar el handler de este evento.
      const events = mod.events as
        | Partial<
            Record<keyof ClientEvents, (ctx: ModuleContext, ...args: ClientEvents[E]) => unknown>
          >
        | undefined;
      const handler = events?.[event];
      if (!handler) continue;
      if (!(await this.#deps.gate.isEnabled(guildId, mod.manifest.id))) continue; // GATE

      const ctx = await this.#buildContext(mod, guildId);
      await safeRun(() => handler(ctx, ...args), {
        log: this.#deps.log,
        moduleId: mod.manifest.id,
        event: String(event),
      });
    }
  }

  async #buildContext(mod: BaristaModule, guildId: string): Promise<ModuleContext> {
    const raw = await this.#deps.gate.getConfig(guildId, mod.manifest.id);
    const schema = mod.configSchema as z.ZodTypeAny;

    const parsed = schema.safeParse(raw);
    let config: unknown;
    if (parsed.success) {
      config = parsed.data;
    } else {
      // Config inválida: caemos a los defaults del schema; nunca rompemos el hot path.
      const defaults = schema.safeParse({});
      config = defaults.success ? defaults.data : raw;
      this.#deps.log.warn(
        `Config inválida de "${mod.manifest.id}" en guild ${guildId}; usando defaults`,
      );
    }

    return {
      guildId,
      config,
      client: this.#deps.client,
      discord: this.#deps.discord,
      log: this.#deps.log,
      store: this.#deps.createStore(mod.manifest.id, guildId),
    };
  }
}

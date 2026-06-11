import type { ClientEvents } from "discord.js";
import { type ContextDeps, buildModuleContext } from "./build-context.ts";
import type { ModuleContext } from "./contract.ts";
import { resolveGuildId } from "./resolve-guild-id.ts";
import { safeRun } from "./safe-run.ts";

/** Dependencias que el bot inyecta al dispatcher (todo lo necesario para construir el ctx). */
export type DispatcherDeps = ContextDeps;

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

      const ctx = await buildModuleContext(this.#deps, mod, guildId);
      await safeRun(() => handler(ctx, ...args), {
        log: this.#deps.log,
        moduleId: mod.manifest.id,
        event: String(event),
      });
    }
  }
}

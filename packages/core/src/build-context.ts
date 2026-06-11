import type { DiscordService } from "@barista/discord";
import type { Client } from "discord.js";
import type { z } from "zod";
import { createCatalog } from "./catalog.ts";
import type { BaristaModule, Logger, ModuleContext, ModuleStore } from "./contract.ts";
import type { ModuleGate } from "./gate.ts";
import type { ModuleRegistry } from "./registry.ts";

/**
 * Dependencias compartidas para construir el `ModuleContext`. Las inyectan tanto el
 * `EventDispatcher` como el `CommandDispatcher`; este helper centraliza la resolución de
 * config (con defaults) y la construcción del catálogo para que ambos routers produzcan
 * exactamente el mismo contexto.
 */
export interface ContextDeps {
  readonly registry: ModuleRegistry;
  readonly gate: ModuleGate;
  readonly client: Client;
  readonly discord: DiscordService;
  readonly log: Logger;
  readonly createStore: (moduleId: string, guildId: string) => ModuleStore;
}

/**
 * Construye el contexto de UN módulo en UN guild: resuelve la config validándola contra el
 * schema (cayendo a defaults si la persistida es inválida, sin romper el hot path) e inyecta
 * el catálogo read-only (lazy: solo recorre el registry si el módulo llama a `enabledModules`).
 */
export async function buildModuleContext(
  deps: ContextDeps,
  mod: BaristaModule,
  guildId: string,
): Promise<ModuleContext> {
  const raw = await deps.gate.getConfig(guildId, mod.manifest.id);
  const schema = mod.configSchema as z.ZodTypeAny;

  const parsed = schema.safeParse(raw);
  let config: unknown;
  if (parsed.success) {
    config = parsed.data;
  } else {
    // Config inválida: caemos a los defaults del schema; nunca rompemos el hot path.
    const defaults = schema.safeParse({});
    config = defaults.success ? defaults.data : raw;
    deps.log.warn(`Config inválida de "${mod.manifest.id}" en guild ${guildId}; usando defaults`);
  }

  return {
    guildId,
    config,
    client: deps.client,
    discord: deps.discord,
    log: deps.log,
    store: deps.createStore(mod.manifest.id, guildId),
    catalog: createCatalog(deps.registry, deps.gate, guildId),
  };
}

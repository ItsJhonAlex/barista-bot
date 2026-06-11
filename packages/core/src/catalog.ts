import type { CatalogEntry, ModuleCatalog } from "./contract.ts";
import type { ModuleGate } from "./gate.ts";
import type { ModuleRegistry } from "./registry.ts";

/**
 * Crea la vista read-only del catálogo para un guild concreto (ADR-015). `enabledModules`
 * recorre el registry, filtra por el gate (que cachea, sin tocar BD en el hot path) y proyecta
 * manifest + comandos. Se construye lazy dentro del `ModuleContext`: el recorrido solo ocurre
 * si un comando como `/help` lo invoca.
 */
export function createCatalog(
  registry: ModuleRegistry,
  gate: ModuleGate,
  guildId: string,
): ModuleCatalog {
  return {
    async enabledModules(): Promise<readonly CatalogEntry[]> {
      const entries: CatalogEntry[] = [];
      for (const mod of registry.all()) {
        if (!(await gate.isEnabled(guildId, mod.manifest.id))) continue;
        entries.push({
          id: mod.manifest.id,
          name: mod.manifest.name,
          description: mod.manifest.description,
          commands: (mod.commands ?? []).map((c) => ({
            name: c.data.name,
            description: c.data.description,
          })),
        });
      }
      return entries;
    },
  };
}

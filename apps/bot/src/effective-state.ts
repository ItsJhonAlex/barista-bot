import type { EffectiveState, EffectiveStateResolver, ModuleRegistry } from "@barista/core";
import type { Database } from "@barista/db/client";
import { globalModules, guildModules, moduleRegistry } from "@barista/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Resolver del estado efectivo respaldado por BD. Aplica la regla de override: si hay fila en
 * `guild_modules` para (guild, mod) manda esa; si no, el `enabled_default` de `global_modules`;
 * si tampoco existe, desactivado. El gate del core cachea el resultado para no tocar BD en el
 * hot path.
 */
/** El módulo `core` no es desactivable: vive siempre activo en todos los guilds. */
const ALWAYS_ON_MODULE_ID = "core";

export function createEffectiveStateResolver(db: Database): EffectiveStateResolver {
  return async (guildId, moduleId): Promise<EffectiveState> => {
    // core no desactivable: cortocircuita el gate antes de tocar BD, ignorando guild_modules.
    if (moduleId === ALWAYS_ON_MODULE_ID) return { enabled: true, config: {} };

    const [perGuild] = await db
      .select()
      .from(guildModules)
      .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)))
      .limit(1);
    if (perGuild) return { enabled: perGuild.enabled, config: perGuild.config };

    const [global] = await db
      .select()
      .from(globalModules)
      .where(eq(globalModules.moduleId, moduleId))
      .limit(1);
    if (global) return { enabled: global.enabledDefault, config: {} };

    return { enabled: false, config: {} };
  };
}

/**
 * Sincroniza el catálogo de módulos cargados en `module_registry` y, en desarrollo, los deja
 * activos por defecto (`global_modules`) para poder ver el toggle en acción sin tocar BD a
 * mano. `onConflictDoNothing` en el default global respeta cualquier valor ya configurado.
 */
export async function seedModuleCatalog(db: Database, registry: ModuleRegistry): Promise<void> {
  for (const mod of registry.all()) {
    const { id, name, description, version, category } = mod.manifest;
    await db
      .insert(moduleRegistry)
      .values({
        id,
        name,
        description,
        version,
        category: category ?? null,
        manifest: { ...mod.manifest },
      })
      .onConflictDoUpdate({
        target: moduleRegistry.id,
        set: {
          name,
          description,
          version,
          category: category ?? null,
          manifest: { ...mod.manifest },
        },
      });

    await db
      .insert(globalModules)
      .values({ moduleId: id, enabledDefault: true })
      .onConflictDoNothing();
  }
}

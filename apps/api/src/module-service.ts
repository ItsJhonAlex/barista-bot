import type { Publisher } from "@barista/bus";
import type { Database } from "@barista/db/client";
import { auditLog, globalModules, guildModules, moduleRegistry } from "@barista/db/schema";
import { and, eq, sql } from "drizzle-orm";

/** Vista de un módulo en un servidor: metadatos del catálogo + estado efectivo. */
export interface GuildModuleView {
  id: string;
  name: string;
  description: string;
  category: string | null;
  enabled: boolean;
}

/**
 * Lista el estado efectivo de cada módulo del catálogo en un servidor: `guild_modules.enabled`
 * si hay fila, si no `global_modules.enabled_default`, si no `false` (la misma regla de
 * override que aplica el bot).
 */
export async function listGuildModules(db: Database, guildId: string): Promise<GuildModuleView[]> {
  return db
    .select({
      id: moduleRegistry.id,
      name: moduleRegistry.name,
      description: moduleRegistry.description,
      category: moduleRegistry.category,
      enabled: sql<boolean>`coalesce(${guildModules.enabled}, ${globalModules.enabledDefault}, false)`,
    })
    .from(moduleRegistry)
    .leftJoin(globalModules, eq(globalModules.moduleId, moduleRegistry.id))
    .leftJoin(
      guildModules,
      and(eq(guildModules.moduleId, moduleRegistry.id), eq(guildModules.guildId, guildId)),
    );
}

export interface ToggleResult {
  guildId: string;
  moduleId: string;
  enabled: boolean;
}

/**
 * Activa o desactiva un módulo en un servidor. Persiste en `guild_modules`, registra en
 * `audit_log` (append-only) y **publica `module.toggled`** para que el bot invalide caché
 * (toggle < 2 s sin reiniciar). El `schemaVersion` se toma del catálogo cargado.
 */
export async function setModuleEnabled(
  deps: { db: Database; publisher: Publisher },
  params: { guildId: string; moduleId: string; enabled: boolean; actorId: string },
): Promise<ToggleResult> {
  const { db, publisher } = deps;
  const { guildId, moduleId, enabled, actorId } = params;

  const [mod] = await db
    .select({ version: moduleRegistry.version })
    .from(moduleRegistry)
    .where(eq(moduleRegistry.id, moduleId))
    .limit(1);
  const schemaVersion = mod?.version ?? "1.0.0";

  await db
    .insert(guildModules)
    .values({ guildId, moduleId, enabled, schemaVersion })
    .onConflictDoUpdate({
      target: [guildModules.guildId, guildModules.moduleId],
      set: { enabled, updatedAt: new Date() },
    });

  await db.insert(auditLog).values({
    guildId,
    actor: "operator",
    actorId,
    action: enabled ? "module.enable" : "module.disable",
    target: moduleId,
  });

  await publisher.publishModuleToggled({ guildId, moduleId, enabled });

  return { guildId, moduleId, enabled };
}

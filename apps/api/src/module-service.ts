import type { Publisher } from "@barista/bus";
import type { Database } from "@barista/db/client";
import { auditLog, globalModules, guildModules, moduleRegistry } from "@barista/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Módulos que no se pueden desactivar (siempre activos en todos los servidores). `core` provee
 * los comandos transversales; el bot lo cortocircuita a activo y la api rechaza su toggle.
 */
export const LOCKED_MODULE_IDS: ReadonlySet<string> = new Set(["core"]);

export function isLockedModule(moduleId: string): boolean {
  return LOCKED_MODULE_IDS.has(moduleId);
}

/** Error de dominio: se intentó togglear un módulo bloqueado. La api lo mapea a 409. */
export class ModuleLockedError extends Error {
  constructor(readonly moduleId: string) {
    super(`El módulo "${moduleId}" no se puede desactivar.`);
    this.name = "ModuleLockedError";
  }
}

/** Vista de un módulo en un servidor: metadatos del catálogo + estado efectivo. */
export interface GuildModuleView {
  id: string;
  name: string;
  description: string;
  category: string | null;
  enabled: boolean;
  /** Si está bloqueado, el dashboard lo muestra como "siempre activo", sin interruptor. */
  locked: boolean;
}

/**
 * Lista el estado efectivo de cada módulo del catálogo en un servidor: `guild_modules.enabled`
 * si hay fila, si no `global_modules.enabled_default`, si no `false` (la misma regla de
 * override que aplica el bot).
 */
export async function listGuildModules(db: Database, guildId: string): Promise<GuildModuleView[]> {
  const rows = await db
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

  // Los módulos bloqueados (p. ej. `core`) se muestran siempre activos, coherente con el bot.
  return rows.map((row) => {
    const locked = isLockedModule(row.id);
    return { ...row, locked, enabled: locked ? true : row.enabled };
  });
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

  // Defensa en profundidad: `core` y demás bloqueados nunca se persisten como desactivados.
  if (isLockedModule(moduleId)) {
    throw new ModuleLockedError(moduleId);
  }

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

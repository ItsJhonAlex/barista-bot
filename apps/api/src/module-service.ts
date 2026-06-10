import type { Publisher } from "@barista/bus";
import type { Database } from "@barista/db/client";
import { auditLog, guildModules, moduleRegistry } from "@barista/db/schema";
import { eq } from "drizzle-orm";

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

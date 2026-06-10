import type { Publisher } from "@barista/bus";
import { type DbHandle, createDb } from "@barista/db/client";
import { auditLog, guildModules, guilds, moduleRegistry } from "@barista/db/schema";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setModuleEnabled } from "./module-service.ts";

// Integración: requiere Postgres con la migración aplicada. Se salta sin DATABASE_URL.
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("setModuleEnabled (integración)", () => {
  let handle: DbHandle;
  const guildId = "test-guild-svc";
  const moduleId = "test-mod-svc";

  beforeAll(async () => {
    handle = createDb(url as string);
    // FK: guild_modules referencia guilds y module_registry.
    await handle.db
      .insert(guilds)
      .values({ id: guildId, name: "svc", ownerId: "owner" })
      .onConflictDoNothing();
    await handle.db
      .insert(moduleRegistry)
      .values({ id: moduleId, name: "svc", description: "d", version: "2.3.4", manifest: {} })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await handle.db.delete(auditLog).where(eq(auditLog.guildId, guildId));
    await handle.db
      .delete(guildModules)
      .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)));
    await handle.db.delete(moduleRegistry).where(eq(moduleRegistry.id, moduleId));
    await handle.db.delete(guilds).where(eq(guilds.id, guildId));
    await handle.close();
  });

  it("persiste en guild_modules, audita y publica module.toggled", async () => {
    const publishModuleToggled = vi.fn();
    const publisher = {
      publishModuleToggled,
      publishModuleConfigUpdated: vi.fn(),
      close: vi.fn(),
    } as unknown as Publisher;

    const result = await setModuleEnabled(
      { db: handle.db, publisher },
      { guildId, moduleId, enabled: false, actorId: "operator-1" },
    );
    expect(result).toEqual({ guildId, moduleId, enabled: false });

    const [row] = await handle.db
      .select()
      .from(guildModules)
      .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)));
    expect(row?.enabled).toBe(false);
    expect(row?.schemaVersion).toBe("2.3.4"); // tomado del catálogo

    const audits = await handle.db.select().from(auditLog).where(eq(auditLog.guildId, guildId));
    expect(audits.some((a) => a.action === "module.disable" && a.target === moduleId)).toBe(true);

    expect(publishModuleToggled).toHaveBeenCalledWith({ guildId, moduleId, enabled: false });
  });
});

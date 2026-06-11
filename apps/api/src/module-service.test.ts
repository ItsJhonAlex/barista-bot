import type { Publisher } from "@barista/bus";
import { type DbHandle, createDb } from "@barista/db/client";
import { auditLog, globalModules, guildModules, guilds, moduleRegistry } from "@barista/db/schema";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getModuleDetail, setModuleConfig, setModuleEnabled } from "./module-service.ts";

// Integración: requiere Postgres con la migración aplicada. Se salta sin DATABASE_URL.
const url = process.env.DATABASE_URL;

// `echo` es un módulo real del catálogo en memoria (versión 1.1.0). Lo usamos para que la
// metadata (version, schema, etc.) provenga del registry y no de filas sembradas a mano.
const moduleId = "echo";

describe.skipIf(!url)("module-service (integración)", () => {
  let handle: DbHandle;
  const guildId = "test-guild-svc";

  beforeAll(async () => {
    handle = createDb(url as string);
    await handle.db
      .insert(guilds)
      .values({ id: guildId, name: "svc", ownerId: "owner" })
      .onConflictDoNothing();
    // FK: guild_modules referencia module_registry; sembramos la fila del catálogo de `echo`.
    await handle.db
      .insert(moduleRegistry)
      .values({ id: moduleId, name: "Echo", description: "d", version: "1.1.0", manifest: {} })
      .onConflictDoNothing();
    await handle.db
      .insert(globalModules)
      .values({ moduleId, enabledDefault: true })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await handle.db.delete(auditLog).where(eq(auditLog.guildId, guildId));
    await handle.db
      .delete(guildModules)
      .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)));
    await handle.db.delete(guilds).where(eq(guilds.id, guildId));
    await handle.close();
  });

  it("setModuleEnabled persiste en guild_modules, audita y publica module.toggled", async () => {
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
    expect(row?.schemaVersion).toBe("1.1.0"); // tomado del catálogo en memoria

    const audits = await handle.db.select().from(auditLog).where(eq(auditLog.guildId, guildId));
    expect(audits.some((a) => a.action === "module.disable" && a.target === moduleId)).toBe(true);

    expect(publishModuleToggled).toHaveBeenCalledWith({ guildId, moduleId, enabled: false });
  });

  it("setModuleConfig persiste config, fija schema_version, audita y publica module.config.updated", async () => {
    const publishModuleConfigUpdated = vi.fn();
    const publisher = {
      publishModuleToggled: vi.fn(),
      publishModuleConfigUpdated,
      close: vi.fn(),
    } as unknown as Publisher;

    const result = await setModuleConfig(
      { db: handle.db, publisher },
      {
        guildId,
        moduleId,
        config: { prefix: "📣", uppercase: true, maxLength: 100 },
        actorId: "operator-1",
      },
    );

    // El resultado contiene la config parseada (con defaults aplicados donde falten).
    expect(result).toEqual({
      guildId,
      moduleId,
      config: { prefix: "📣", uppercase: true, maxLength: 100 },
    });

    const [row] = await handle.db
      .select()
      .from(guildModules)
      .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)));
    expect(row?.config).toEqual({ prefix: "📣", uppercase: true, maxLength: 100 });
    expect(row?.schemaVersion).toBe("1.1.0");

    const audits = await handle.db.select().from(auditLog).where(eq(auditLog.guildId, guildId));
    expect(audits.some((a) => a.action === "module.config.update" && a.target === moduleId)).toBe(
      true,
    );

    expect(publishModuleConfigUpdated).toHaveBeenCalledWith({ guildId, moduleId });
  });

  it("getModuleDetail devuelve metadata, schema y la config resuelta", async () => {
    const detail = await getModuleDetail(handle.db, guildId, moduleId);
    expect(detail.module.id).toBe(moduleId);
    expect(detail.module.version).toBe("1.1.0");
    expect(detail.module.locked).toBe(false);
    // El test anterior dejó persistida una config con prefix "📣".
    expect(detail.config.prefix).toBe("📣");
    // Defaults presentes en la config resuelta.
    expect(detail.config.maxLength).toBe(100);
  });

  it("setModuleConfig rechaza config inválida con InvalidConfigError (issues)", async () => {
    const publisher = {
      publishModuleToggled: vi.fn(),
      publishModuleConfigUpdated: vi.fn(),
      close: vi.fn(),
    } as unknown as Publisher;

    await expect(
      setModuleConfig(
        { db: handle.db, publisher },
        { guildId, moduleId, config: { maxLength: 99999 }, actorId: "operator-1" },
      ),
    ).rejects.toMatchObject({ name: "InvalidConfigError" });
  });
});

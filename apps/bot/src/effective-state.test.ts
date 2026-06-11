import { ModuleGate, ModuleRegistry, createCatalog } from "@barista/core";
import { type DbHandle, createDb } from "@barista/db/client";
import { globalModules, guildModules, guilds, moduleRegistry } from "@barista/db/schema";
import core from "@barista/module-core";
import echo from "@barista/module-echo";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEffectiveStateResolver } from "./effective-state.ts";

// Integración: requiere Postgres con la migración aplicada. Se salta sin DATABASE_URL.
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("estado efectivo y catálogo (integración)", () => {
  let handle: DbHandle;
  const guildId = "test-guild-eff";

  function buildRegistry(): ModuleRegistry {
    const registry = new ModuleRegistry();
    registry.register(core);
    registry.register(echo);
    return registry;
  }

  beforeAll(async () => {
    handle = createDb(url as string);
    await handle.db
      .insert(guilds)
      .values({ id: guildId, name: "eff", ownerId: "owner" })
      .onConflictDoNothing();
    for (const mod of [core, echo]) {
      await handle.db
        .insert(moduleRegistry)
        .values({
          id: mod.manifest.id,
          name: mod.manifest.name,
          description: mod.manifest.description,
          version: mod.manifest.version,
          manifest: {},
        })
        .onConflictDoNothing();
      await handle.db
        .insert(globalModules)
        .values({ moduleId: mod.manifest.id, enabledDefault: true })
        .onConflictDoNothing();
    }
  });

  afterAll(async () => {
    await handle.db.delete(guildModules).where(eq(guildModules.guildId, guildId));
    await handle.db.delete(guilds).where(eq(guilds.id, guildId));
    await handle.close();
  });

  it("core sigue activo aunque exista una fila guild_modules con enabled:false", async () => {
    // Fuerza un override explícito que desactivaría a cualquier módulo opcional...
    await handle.db
      .insert(guildModules)
      .values({ guildId, moduleId: "core", enabled: false, schemaVersion: "1.0.0" })
      .onConflictDoUpdate({
        target: [guildModules.guildId, guildModules.moduleId],
        set: { enabled: false },
      });

    const gate = new ModuleGate(createEffectiveStateResolver(handle.db));
    // ...pero el cortocircuito de core lo mantiene activo, ignorando guild_modules.
    expect(await gate.isEnabled(guildId, "core")).toBe(true);
  });

  it("togglear un módulo opcional invalida la caché y el catálogo lo refleja", async () => {
    const registry = buildRegistry();
    const gate = new ModuleGate(createEffectiveStateResolver(handle.db));
    const catalog = createCatalog(registry, gate, guildId);

    // Estado inicial: echo activo por el default global.
    await handle.db
      .delete(guildModules)
      .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, "echo")));
    gate.invalidate(guildId, "echo");
    let ids = (await catalog.enabledModules()).map((e) => e.id);
    expect(ids).toContain("echo");
    expect(ids).toContain("core");

    // Toggle off: la api persistiría esto y publicaría module.toggled; aquí simulamos la
    // invalidación de caché que dispara el subscriber Redis en el bot.
    await handle.db
      .insert(guildModules)
      .values({ guildId, moduleId: "echo", enabled: false, schemaVersion: "1.0.0" })
      .onConflictDoUpdate({
        target: [guildModules.guildId, guildModules.moduleId],
        set: { enabled: false },
      });
    gate.invalidate(guildId, "echo");

    ids = (await catalog.enabledModules()).map((e) => e.id);
    expect(ids).not.toContain("echo");
    expect(ids).toContain("core"); // core sigue ahí
  });
});

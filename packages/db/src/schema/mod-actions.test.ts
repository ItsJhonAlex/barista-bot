import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type DbHandle, createDb } from "../client/index.ts";
import { guilds, modActions } from "./index.ts";

// Integración: requiere Postgres real con la migración 0002 aplicada. Se salta sin DATABASE_URL.
//   DATABASE_URL=postgres://barista:barista@localhost:5432/barista bun run test
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("mod_actions (integración)", () => {
  let handle: DbHandle;
  const guildId = "test-guild-modactions";

  beforeAll(async () => {
    handle = createDb(url as string);
    // La FK exige una fila en `guilds`.
    await handle.db
      .insert(guilds)
      .values({ id: guildId, name: "Mod Test", ownerId: "owner-1" })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await handle.db.delete(guilds).where(eq(guilds.id, guildId)); // cascade limpia mod_actions
    await handle.close();
  });

  it("inserta y lee una sanción aplicando defaults", async () => {
    await handle.db.delete(modActions).where(eq(modActions.guildId, guildId));

    const [inserted] = await handle.db
      .insert(modActions)
      .values({
        guildId,
        type: "ban",
        targetUserId: "victim-1",
        moderatorId: "mod-1",
        reason: "spam",
      })
      .returning();

    expect(inserted?.id).toBeGreaterThan(0);
    expect(inserted?.type).toBe("ban");
    expect(inserted?.active).toBe(true); // default
    expect(inserted?.createdAt).toBeInstanceOf(Date); // defaultNow
    expect(inserted?.revokedAt).toBeNull();

    const rows = await handle.db
      .select()
      .from(modActions)
      .where(and(eq(modActions.guildId, guildId), eq(modActions.targetUserId, "victim-1")));
    expect(rows).toHaveLength(1);

    await handle.db.delete(modActions).where(eq(modActions.guildId, guildId));
  });

  it("borra en cascada las sanciones al borrar el guild", async () => {
    const tmpGuild = "test-guild-cascade";
    await handle.db
      .insert(guilds)
      .values({ id: tmpGuild, name: "Cascade", ownerId: "o" })
      .onConflictDoNothing();
    await handle.db.insert(modActions).values({
      guildId: tmpGuild,
      type: "warn",
      targetUserId: "v",
      moderatorId: "m",
    });

    await handle.db.delete(guilds).where(eq(guilds.id, tmpGuild));

    const rows = await handle.db
      .select()
      .from(modActions)
      .where(eq(modActions.guildId, tmpGuild));
    expect(rows).toHaveLength(0); // la cascade de la FK borró la sanción
  });
});

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guilds } from "../schema/index.ts";
import { type DbHandle, createDb } from "./index.ts";

// Test de integración: requiere un Postgres real con la migración 0001 aplicada. Se salta si
// no hay DATABASE_URL (p. ej. en una máquina sin la base levantada). Para ejecutarlo:
//   docker compose up -d postgres
//   bun --filter @barista/db db:migrate
//   DATABASE_URL=postgres://barista:barista@localhost:5432/barista bun run test
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("@barista/db/client (integración)", () => {
  let handle: DbHandle;

  beforeAll(() => {
    handle = createDb(url as string);
  });

  afterAll(async () => {
    await handle.close();
  });

  it("inserta y lee una fila de guilds (aplica defaults)", async () => {
    const id = "test-guild-0001";

    // Idempotente: limpia cualquier resto previo antes de insertar.
    await handle.db.delete(guilds).where(eq(guilds.id, id));

    await handle.db.insert(guilds).values({
      id,
      name: "Servidor de Prueba",
      ownerId: "owner-1",
    });

    const rows = await handle.db.select().from(guilds).where(eq(guilds.id, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Servidor de Prueba");
    expect(rows[0]?.locale).toBe("es"); // default del schema
    expect(rows[0]?.settings).toEqual({}); // default JSONB

    await handle.db.delete(guilds).where(eq(guilds.id, id));
  });
});

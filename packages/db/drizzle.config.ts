import { defineConfig } from "drizzle-kit";

/**
 * Configuración de drizzle-kit para @barista/db. Las migraciones se versionan en
 * `./migrations` y se generan desde el schema. Solo `bot` y `api` (o herramientas de
 * desarrollo) deben usar credenciales reales — ver la frontera schema/client.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://barista:barista@localhost:5432/barista",
  },
});

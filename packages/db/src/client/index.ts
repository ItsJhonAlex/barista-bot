// @barista/db/client — cliente de base de datos CON credenciales. Mitad **sensible** de la
// frontera: SOLO debe importarse desde `apps/bot` y `apps/api`. El dashboard nunca lo importa
// (lo blinda un hook de desarrollo y la revisión).

import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema/index.ts";

/** Instancia de Drizzle tipada con el schema completo de Barista. */
export type Database = PostgresJsDatabase<typeof schema>;

/** Handle del cliente: la base de datos y un cierre explícito del pool. */
export interface DbHandle {
  readonly db: Database;
  close(): Promise<void>;
}

/**
 * Crea un cliente de base de datos a partir de una cadena de conexión. El llamador es
 * responsable de cerrar el pool con `close()` (en tests, en `afterAll`; en producción, al
 * apagar el proceso).
 */
export function createDb(connectionString: string): DbHandle {
  const sql = postgres(connectionString, { max: 10 });
  const db = drizzle(sql, { schema });
  return {
    db,
    close: () => sql.end({ timeout: 5 }),
  };
}

export { schema };

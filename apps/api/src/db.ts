import { createDb } from "@barista/db/client";
import { env } from "./env.ts";

/** Cliente de base de datos de la api (solo servidor; tras la frontera @barista/db/client). */
export const { db } = createDb(env.DATABASE_URL);

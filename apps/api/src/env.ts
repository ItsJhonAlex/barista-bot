import { loadEnv } from "@barista/config";

/** Entorno validado una sola vez para toda la api (fail fast al arrancar). */
export const env = loadEnv();

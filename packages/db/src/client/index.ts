/**
 * @barista/db/client — cliente de base de datos con credenciales. Es la mitad **sensible** de
 * la frontera: SOLO puede importarse desde `apps/bot` y `apps/api`. El `dashboard` nunca lo
 * importa (lo blinda un hook de desarrollo y la revisión). El cliente real (Drizzle + pool de
 * Postgres) llega en S0.2.
 */
export const DB_CLIENT_PACKAGE = "@barista/db/client" as const;

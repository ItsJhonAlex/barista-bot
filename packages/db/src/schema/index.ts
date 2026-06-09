/**
 * @barista/db/schema — definiciones de tablas y tipos derivados (Drizzle). Es la mitad
 * **segura** de la frontera: se puede importar desde cualquier sitio, incluido el dashboard,
 * porque no contiene credenciales. Las tablas reales (migración 0001) llegan en S0.2.
 */
export const DB_SCHEMA_PACKAGE = "@barista/db/schema" as const;

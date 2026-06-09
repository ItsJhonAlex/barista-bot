// El dashboard solo puede tocar la mitad SEGURA de la frontera de datos: `@barista/db/schema`
// (tipos), nunca `@barista/db/client` (credenciales). Importar el cliente desde aquí está
// prohibido y un hook de desarrollo lo bloquea.
import { DB_SCHEMA_PACKAGE } from "@barista/db/schema";

/**
 * Punto de entrada del dashboard (React + Vite). Skeleton del Sprint 0 (S0.1). La SPA real
 * —login con Discord, selector de servidor y rejilla de módulos— llega en S0.6.
 */
export const DASHBOARD_USES = DB_SCHEMA_PACKAGE;

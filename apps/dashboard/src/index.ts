// El dashboard solo puede tocar la mitad SEGURA de la frontera de datos: `@barista/db/schema`
// (solo tipos, sin credenciales), nunca `@barista/db/client`. Importar el cliente desde aquí
// está prohibido y un hook de desarrollo lo bloquea.
import type { GuildRow } from "@barista/db/schema";

/**
 * Punto de entrada del dashboard (React + Vite). Skeleton del Sprint 0 (S0.1). La SPA real
 * —login con Discord, selector de servidor y rejilla de módulos— llega en S0.6.
 *
 * Forma del servidor tal como la consume la UI; deriva del tipo de fila del schema, sin
 * arrastrar nada del cliente con credenciales.
 */
export type DashboardGuild = Pick<GuildRow, "id" | "name" | "iconUrl" | "locale">;

import { loadEnv } from "@barista/config";
import type { Env } from "@barista/config";

/**
 * Punto de entrada de la API del dashboard. Skeleton del Sprint 0 (S0.1): valida el entorno y
 * lo devuelve resuelto. El servidor Hono, OAuth con Better Auth y el toggle de módulos llegan
 * en S0.5.
 */
export function loadApiConfig(): Env {
  return loadEnv();
}

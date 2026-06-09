import { loadEnv } from "@barista/config";

/**
 * Punto de entrada del bot. Skeleton del Sprint 0 (S0.1): solo valida el entorno (fail fast).
 * La conexión al Gateway de Discord (discord.js + Sapphire) y el comando `/ping` llegan en
 * S0.3, y el registry + event router en S0.4.
 */
export function bootstrap(): void {
  const env = loadEnv();
  // Marcador de uso hasta que el arranque real exista; evita efectos secundarios en S0.1.
  if (env.NODE_ENV === "production") {
    // El arranque del Gateway se implementa en S0.3.
  }
}

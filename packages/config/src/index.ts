import { z } from "zod";

/**
 * Esquema de variables de entorno de Barista. La validación es la frontera: si falta o es
 * inválida una variable, el proceso falla rápido al arrancar (RNF-42), nunca a mitad de una
 * petición. Identificadores en inglés; mensajes de cara al desarrollador en español.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Aplicación de Discord
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN es obligatorio"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID es obligatorio"),
  DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET es obligatorio"),

  // Servicios de datos
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL válida"),
  REDIS_URL: z.string().url("REDIS_URL debe ser una URL válida"),

  // Autenticación
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET debe tener al menos 16 caracteres"),

  // URL pública del dashboard
  DASHBOARD_URL: z.string().url().default("http://localhost:5173"),
});

/** Entorno validado y resuelto (con defaults aplicados). */
export type Env = z.infer<typeof envSchema>;

/**
 * Lee y valida el entorno. Lanza un error legible que enumera cada variable inválida si la
 * validación falla.
 *
 * @param source Fuente de variables (por defecto `process.env`). Inyectable para tests.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  return result.data;
}

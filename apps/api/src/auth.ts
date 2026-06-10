import { account, session, user, verification } from "@barista/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.ts";
import { env } from "./env.ts";

/**
 * Instancia de Better Auth con el provider de Discord. Scopes: `identify` y `guilds` (para
 * conocer los servidores y permisos del usuario) más `email` (lo requiere el modelo de
 * usuario). El token OAuth resultante se guarda en `account` y la api lo usa para revalidar
 * permisos por acción. Secretos solo en servidor.
 */
export const auth = betterAuth({
  baseURL: env.API_URL,
  basePath: "/api/v1/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.DASHBOARD_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      // Scope adicional: Better Auth ya pide `identify`+`email`; añadimos `guilds` para
      // conocer los servidores y permisos del usuario (auth por acción).
      scope: ["guilds"],
    },
  },
});

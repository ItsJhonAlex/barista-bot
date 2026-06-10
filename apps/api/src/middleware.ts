import type { MiddlewareHandler } from "hono";
import { getDiscordToken } from "./accounts.ts";
import { auth } from "./auth.ts";
import { fetchAdminGuilds } from "./discord-guilds.ts";

/** Variables que los middlewares de auth dejan en el contexto de Hono. */
export interface AuthVars {
  userId: string;
}

const unauthenticated = { error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } } as const;

/** Exige una sesión válida. */
export const requireSession: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) return c.json(unauthenticated, 401);
  c.set("userId", result.user.id);
  await next();
};

/**
 * Autorización **por acción** (RF-04, núcleo del modelo de seguridad). En CADA petición sobre
 * `/guilds/:guildId/...`: exige sesión, y verifica que el usuario tiene ADMIN o MANAGE_GUILD
 * en **ese** guild según el permiso **real** de Discord en ese momento (nunca un valor del
 * login). La verificación se cachea segundos en `fetchAdminGuilds`.
 */
export const requireGuildAdmin: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) return c.json(unauthenticated, 401);

  const guildId = c.req.param("guildId");
  if (!guildId) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Falta guildId." } }, 400);
  }

  const token = await getDiscordToken(result.user.id);
  if (!token) {
    return c.json(
      { error: { code: "NO_DISCORD_LINK", message: "Cuenta de Discord no vinculada." } },
      403,
    );
  }

  let manageable: Set<string>;
  try {
    manageable = new Set((await fetchAdminGuilds(token)).map((g) => g.id));
  } catch {
    return c.json(
      { error: { code: "DISCORD_UNAVAILABLE", message: "No se pudo verificar permisos." } },
      502,
    );
  }

  if (!manageable.has(guildId)) {
    return c.json(
      { error: { code: "FORBIDDEN_GUILD", message: "No administras este servidor." } },
      403,
    );
  }

  c.set("userId", result.user.id);
  await next();
};

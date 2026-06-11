import { guilds } from "@barista/db/schema";
import { inArray } from "drizzle-orm";
import { type Handler, Hono } from "hono";
import { cors } from "hono/cors";
import { getDiscordToken } from "./accounts.ts";
import { auth } from "./auth.ts";
import { publisher } from "./bus.ts";
import { db } from "./db.ts";
import { fetchAdminGuilds } from "./discord-guilds.ts";
import { env } from "./env.ts";
import { type AuthVars, requireGuildAdmin, requireSession } from "./middleware.ts";
import {
  InvalidConfigError,
  ModuleNotFoundError,
  getModuleDetail,
  isLockedModule,
  listGuildModules,
  setModuleConfig,
  setModuleEnabled,
} from "./module-service.ts";

export const app = new Hono<{ Variables: AuthVars }>();

// CORS: el dashboard (otro origen) llama con cookies de sesión, así que hay que permitir su
// origen explícitamente y `credentials`.
app.use(
  "/api/v1/*",
  cors({
    origin: env.DASHBOARD_URL,
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.get("/api/v1/health", (c) => c.json({ ok: true }));

// Atajo de desarrollo para iniciar OAuth con Discord desde el navegador (la versión "real"
// la lanza el dashboard). Debe ir ANTES del catch-all de Better Auth.
//
// Importante: Better Auth fija una cookie de estado/PKCE al iniciar el flujo; hay que
// **reenviarla** al navegador o el callback fallará con `state_mismatch`. Por eso pedimos la
// Response completa (`asResponse`) y construimos un 302 que conserva sus `Set-Cookie`.
app.get("/api/v1/auth/discord", async (c) => {
  const res = await auth.api.signInSocial({
    body: { provider: "discord", callbackURL: env.DASHBOARD_URL },
    asResponse: true,
  });

  const { url } = (await res.clone().json()) as { url?: string };
  if (!url) {
    return c.json({ error: { code: "OAUTH_INIT", message: "No se pudo iniciar OAuth." } }, 500);
  }

  const headers = new Headers({ location: url });
  for (const cookie of res.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  return new Response(null, { status: 302, headers });
});

// Better Auth: callback OAuth, sesión, logout, etc.
app.on(["GET", "POST"], "/api/v1/auth/*", (c) => auth.handler(c.req.raw));

// Operador actual.
app.get("/api/v1/me", requireSession, async (c) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  return c.json({ user: result?.user ?? null });
});

// Servidores administrables: guilds del usuario (con permiso) ∩ guilds donde está el bot.
app.get("/api/v1/me/guilds", requireSession, async (c) => {
  const token = await getDiscordToken(c.get("userId"));
  if (!token) {
    return c.json({ error: { code: "NO_DISCORD_LINK", message: "Cuenta no vinculada." } }, 403);
  }
  const adminGuilds = await fetchAdminGuilds(token);
  const ids = adminGuilds.map((g) => g.id);
  const present = ids.length
    ? await db.select({ id: guilds.id }).from(guilds).where(inArray(guilds.id, ids))
    : [];
  const presentIds = new Set(present.map((row) => row.id));
  return c.json({ guilds: adminGuilds.filter((g) => presentIds.has(g.id)) });
});

// Estado efectivo de cada módulo en el servidor (para la rejilla del dashboard).
app.get("/api/v1/guilds/:guildId/modules", requireGuildAdmin, async (c) => {
  const guildId = c.req.param("guildId");
  if (!guildId) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Falta guildId." } }, 400);
  }
  return c.json({ modules: await listGuildModules(db, guildId) });
});

// Toggle de módulo por servidor (auth por acción). Persiste, publica en Redis y audita.
const toggle =
  (enabled: boolean): Handler<{ Variables: AuthVars }> =>
  async (c) => {
    const guildId = c.req.param("guildId");
    const moduleId = c.req.param("moduleId");
    if (!guildId || !moduleId) {
      return c.json({ error: { code: "BAD_REQUEST", message: "Faltan parámetros." } }, 400);
    }
    if (isLockedModule(moduleId)) {
      return c.json(
        { error: { code: "MODULE_LOCKED", message: "Este módulo no se puede desactivar." } },
        409,
      );
    }
    const result = await setModuleEnabled(
      { db, publisher },
      { guildId, moduleId, enabled, actorId: c.get("userId") },
    );
    return c.json(result);
  };

app.post("/api/v1/guilds/:guildId/modules/:moduleId/enable", requireGuildAdmin, toggle(true));
app.post("/api/v1/guilds/:guildId/modules/:moduleId/disable", requireGuildAdmin, toggle(false));

// Detalle de un módulo para la página de ajustes: metadata + JSON Schema + config resuelta.
app.get("/api/v1/guilds/:guildId/modules/:moduleId/config", requireGuildAdmin, async (c) => {
  const guildId = c.req.param("guildId");
  const moduleId = c.req.param("moduleId");
  if (!guildId || !moduleId) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Faltan parámetros." } }, 400);
  }
  try {
    return c.json(await getModuleDetail(db, guildId, moduleId));
  } catch (err) {
    if (err instanceof ModuleNotFoundError) {
      return c.json({ error: { code: "MODULE_NOT_FOUND", message: "No existe ese módulo." } }, 404);
    }
    throw err;
  }
});

// Guardar la config de un módulo en un servidor (RF-26). Valida con Zod, persiste, audita y
// publica `module.config.updated` para que el bot invalide caché.
app.patch("/api/v1/guilds/:guildId/modules/:moduleId/config", requireGuildAdmin, async (c) => {
  const guildId = c.req.param("guildId");
  const moduleId = c.req.param("moduleId");
  if (!guildId || !moduleId) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Faltan parámetros." } }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "BAD_REQUEST", message: "JSON inválido." } }, 400);
  }

  try {
    const result = await setModuleConfig(
      { db, publisher },
      { guildId, moduleId, config: body, actorId: c.get("userId") },
    );
    return c.json(result);
  } catch (err) {
    if (err instanceof ModuleNotFoundError) {
      return c.json({ error: { code: "MODULE_NOT_FOUND", message: "No existe ese módulo." } }, 404);
    }
    if (err instanceof InvalidConfigError) {
      return c.json(
        {
          error: {
            code: "INVALID_CONFIG",
            message: "La configuración no es válida.",
            details: err.issues,
          },
        },
        422,
      );
    }
    throw err;
  }
});

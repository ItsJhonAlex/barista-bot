const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

/** Forma mínima de un guild devuelto por Discord. */
export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string; // bitfield como string decimal
}

/** Guild administrable, tal como lo consume el dashboard. */
export interface AdminGuild {
  id: string;
  name: string;
  icon: string | null;
}

function isAdmin(permissions: string): boolean {
  let perms: bigint;
  try {
    perms = BigInt(permissions);
  } catch {
    return false;
  }
  return (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n;
}

/** Filtra (función pura, testeable) los guilds donde el usuario tiene ADMIN o MANAGE_GUILD. */
export function adminGuilds(guilds: readonly DiscordGuild[]): AdminGuild[] {
  return guilds
    .filter((g) => isAdmin(g.permissions))
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));
}

interface CacheEntry {
  guilds: AdminGuild[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 15_000; // caché de muy corta vida: nunca se asume el permiso del login (RF-04)

/**
 * Obtiene los guilds administrables del usuario desde Discord usando su token OAuth, con una
 * caché de segundos para no golpear la API de Discord en cada click. Lanza si Discord falla.
 */
export async function fetchAdminGuilds(accessToken: string): Promise<AdminGuild[]> {
  const cached = cache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) return cached.guilds;

  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord /users/@me/guilds devolvió ${res.status}`);
  }
  const data = (await res.json()) as DiscordGuild[];
  const result = adminGuilds(data);
  cache.set(accessToken, { guilds: result, expiresAt: Date.now() + TTL_MS });
  return result;
}

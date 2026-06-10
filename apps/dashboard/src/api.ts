// Cliente de la api del dashboard. Siempre con `credentials: "include"` para enviar la cookie
// de sesión (mismo sitio, distinto puerto → CORS con credenciales en la api).

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export interface SessionUser {
  id: string;
  name: string;
  image: string | null;
}

export interface AdminGuild {
  id: string;
  name: string;
  icon: string | null;
}

export interface ModuleView {
  id: string;
  name: string;
  description: string;
  category: string | null;
  enabled: boolean;
}

export interface ToggleResult {
  guildId: string;
  moduleId: string;
  enabled: boolean;
}

export const api = {
  loginUrl: `${API_URL}/api/v1/auth/discord`,
  me: () => request<{ user: SessionUser | null }>("/api/v1/me"),
  myGuilds: () => request<{ guilds: AdminGuild[] }>("/api/v1/me/guilds"),
  guildModules: (guildId: string) =>
    request<{ modules: ModuleView[] }>(`/api/v1/guilds/${guildId}/modules`),
  setModule: (guildId: string, moduleId: string, enabled: boolean) =>
    request<ToggleResult>(
      `/api/v1/guilds/${guildId}/modules/${moduleId}/${enabled ? "enable" : "disable"}`,
      { method: "POST" },
    ),
  logout: () => request<unknown>("/api/v1/auth/sign-out", { method: "POST" }),
};

// Cliente de la api del dashboard. Siempre con `credentials: "include"` para enviar la cookie
// de sesión (mismo sitio, distinto puerto → CORS con credenciales en la api).

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** Un issue de validación devuelto por la api (422), apunta al campo que falló. */
export interface ConfigIssue {
  path: (string | number)[];
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Presente en 422 (INVALID_CONFIG): errores por campo para pintarlos junto al control. */
    readonly details?: ConfigIssue[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    let message = res.statusText;
    let details: ConfigIssue[] | undefined;
    try {
      const body = (await res.json()) as {
        error?: { message?: string; details?: ConfigIssue[] };
      };
      if (body.error?.message) message = body.error.message;
      details = body.error?.details;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(res.status, message, details);
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
  /** Módulo siempre activo (p. ej. `core`): se muestra sin interruptor. */
  locked: boolean;
}

export interface ToggleResult {
  guildId: string;
  moduleId: string;
  enabled: boolean;
}

/** Subconjunto de JSON Schema (Draft 7) que el formulario sabe interpretar. */
export interface JsonSchemaProperty {
  type?: "string" | "number" | "integer" | "boolean" | "object" | "array";
  description?: string;
  default?: unknown;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/** Opción/subcomando documentado de un slash command. */
export interface OptionDoc {
  name: string;
  description: string;
  type: string;
  required: boolean;
  options?: OptionDoc[];
}

export interface CommandDoc {
  name: string;
  description: string;
  options: OptionDoc[];
}

export interface ModuleDetailView {
  module: {
    id: string;
    name: string;
    description: string;
    details: string | null;
    category: string | null;
    version: string;
    requiredBotPermissions: string[];
    enabled: boolean;
    locked: boolean;
    features: string[];
    commands: CommandDoc[];
    events: string[];
  };
  schema: JsonSchema;
  config: Record<string, unknown>;
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
  moduleDetail: (guildId: string, moduleId: string) =>
    request<ModuleDetailView>(`/api/v1/guilds/${guildId}/modules/${moduleId}/config`),
  saveModuleConfig: (guildId: string, moduleId: string, config: Record<string, unknown>) =>
    request<{ guildId: string; moduleId: string; config: Record<string, unknown> }>(
      `/api/v1/guilds/${guildId}/modules/${moduleId}/config`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      },
    ),
  logout: () => request<unknown>("/api/v1/auth/sign-out", { method: "POST" }),
};

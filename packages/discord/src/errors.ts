/**
 * Errores normalizados de la capa Discord. Toda llamada a la REST pasa por aquí (RNF-10/11):
 * traducimos los errores de discord.js a un `DiscordError` con un `code` string estable, para
 * que la `api` y los módulos los mapeen sin acoplarse a las clases internas de discord.js.
 */

/** Opciones de construcción de un `DiscordError`. */
export interface DiscordErrorOptions {
  /** Código HTTP original, si lo hubo. */
  status?: number;
  /** Error o valor original que provocó este, para diagnóstico. */
  cause?: unknown;
}

/**
 * Error normalizado de la capa Discord. `code` es un identificador string estable (no el código
 * numérico de Discord) pensado para que el resto del sistema ramifique sobre él de forma segura.
 */
export class DiscordError extends Error {
  /** Identificador estable del error (p. ej. "MISSING_PERMISSIONS"). */
  readonly code: string;
  /** Código HTTP original de la respuesta de Discord, si aplica. */
  readonly status?: number;
  /** Error/valor original conservado para diagnóstico. */
  override readonly cause?: unknown;

  constructor(code: string, message: string, options: DiscordErrorOptions = {}) {
    super(message);
    this.name = "DiscordError";
    this.code = code;
    this.status = options.status;
    this.cause = options.cause;
  }
}

/**
 * Mapa de códigos numéricos comunes de Discord (JSON error codes) → code string + mensaje en
 * español. No pretende ser exhaustivo; el resto cae al mapa por status o al fallback.
 */
const DISCORD_CODE_MAP: Record<number, { code: string; message: string }> = {
  10003: { code: "UNKNOWN_CHANNEL", message: "Canal desconocido." },
  10007: { code: "UNKNOWN_MEMBER", message: "Miembro desconocido." },
  10008: { code: "UNKNOWN_MESSAGE", message: "Mensaje desconocido." },
  10011: { code: "UNKNOWN_ROLE", message: "Rol desconocido." },
  10013: { code: "UNKNOWN_USER", message: "Usuario desconocido." },
  10026: { code: "UNKNOWN_BAN", message: "El usuario no está baneado." },
  50001: { code: "MISSING_ACCESS", message: "El bot no tiene acceso al recurso." },
  50013: { code: "MISSING_PERMISSIONS", message: "El bot no tiene permisos suficientes." },
  50035: { code: "INVALID_FORM_BODY", message: "Datos de la petición inválidos." },
};

/** Mapa por código HTTP cuando el código numérico de Discord no se reconoce. */
const STATUS_MAP: Record<number, { code: string; message: string }> = {
  400: { code: "BAD_REQUEST", message: "Petición inválida a Discord." },
  401: { code: "UNAUTHORIZED", message: "Credenciales de Discord inválidas." },
  403: { code: "FORBIDDEN", message: "Discord rechazó la acción (prohibida)." },
  404: { code: "NOT_FOUND", message: "Recurso de Discord no encontrado." },
  429: { code: "RATE_LIMITED", message: "Límite de peticiones de Discord alcanzado." },
  500: { code: "DISCORD_SERVER_ERROR", message: "Error interno de Discord." },
  502: { code: "DISCORD_SERVER_ERROR", message: "Discord no disponible (gateway)." },
  503: { code: "DISCORD_SERVER_ERROR", message: "Discord no disponible." },
};

const FALLBACK = { code: "DISCORD_ERROR", message: "Error inesperado al hablar con Discord." };

/** Lee una propiedad numérica por detección estructural; `undefined` si no es un número. */
function readNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  return typeof value === "number" ? value : undefined;
}

/**
 * Traduce cualquier error a un `DiscordError`. Detecta de forma **estructural** (sin importar las
 * clases internas de discord.js) las dos formas de error REST:
 *  - `DiscordAPIError`: `code` numérico + `status` + `rawError`.
 *  - `HTTPError`: `status` numérico sin `code` numérico.
 * Conserva el `status` y el error original en `cause`. Idempotente sobre `DiscordError`.
 */
export function normalizeDiscordError(err: unknown): DiscordError {
  if (err instanceof DiscordError) return err;

  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const status = readNumber(obj, "status");
    const discordCode = readNumber(obj, "code");

    // Forma DiscordAPIError: prioriza el código numérico de Discord si lo reconocemos.
    if (discordCode !== undefined) {
      const mapped = DISCORD_CODE_MAP[discordCode];
      if (mapped) {
        return new DiscordError(mapped.code, mapped.message, { status, cause: err });
      }
    }

    // Forma HTTPError (o DiscordAPIError con código no reconocido): mapea por status.
    if (status !== undefined) {
      const byStatus = STATUS_MAP[status] ?? FALLBACK;
      return new DiscordError(byStatus.code, byStatus.message, { status, cause: err });
    }
  }

  return new DiscordError(FALLBACK.code, FALLBACK.message, { cause: err });
}

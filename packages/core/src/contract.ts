import type { DiscordService } from "@barista/discord";
import type {
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  PermissionsString,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { z } from "zod";

/** Metadatos identificativos del módulo. */
export interface ModuleManifest {
  /** id estable y único, en kebab-case. Ej: "moderation". Es clave en BD. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string; // semver
  /** Permisos del bot que el módulo necesita en el servidor. */
  readonly requiredBotPermissions?: PermissionsString[];
  /** ids de otros módulos que deben estar activos. */
  readonly dependsOn?: string[];
  /** Categoría para agrupar en el dashboard. */
  readonly category?: string;
}

/** Logger estructurado mínimo que el núcleo inyecta a los módulos. */
export interface Logger {
  debug(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
}

/** Store clave-valor namespaced por (moduleId, guildId). Implementado sobre @barista/db. */
export interface ModuleStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/** Proyección read-only de un módulo activo y sus comandos, para /help (ADR-015). */
export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly commands: readonly { readonly name: string; readonly description: string }[];
}

/**
 * Vista read-only del catálogo de módulos activos en un guild. La consume `/help` desde el
 * contexto para listar qué módulos y comandos están disponibles aquí y ahora. Respeta el gate
 * (caché), no toca BD en el hot path.
 */
export interface ModuleCatalog {
  enabledModules(): Promise<readonly CatalogEntry[]>;
}

/** Contexto que el núcleo inyecta a handlers y comandos de UN módulo en UN guild. */
export interface ModuleContext<Config = unknown> {
  readonly guildId: string;
  /** Config validada y resuelta (con defaults) de este módulo en este guild. */
  readonly config: Config;
  readonly client: Client;
  readonly discord: DiscordService;
  readonly log: Logger;
  readonly store: ModuleStore;
  /** Catálogo read-only de módulos activos en este guild (lo usa /help). ADR-015. */
  readonly catalog: ModuleCatalog;
}

/** Manejador de un evento del Gateway. */
export type EventHandler<E extends keyof ClientEvents, Config> = (
  ctx: ModuleContext<Config>,
  ...args: ClientEvents[E]
) => unknown | Promise<unknown>;

/** Builders de slash command aceptados por un módulo. */
export type SlashBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

/** Definición de un slash command que aporta el módulo. */
export interface ModuleCommand<Config = unknown> {
  readonly data: SlashBuilder;
  /** Preconditions extra además de "módulo activo". Ej: ["GuildOnly", "ModeratorOnly"]. */
  readonly preconditions?: string[];
  readonly run: (
    ctx: ModuleContext<Config>,
    interaction: ChatInputCommandInteraction,
  ) => unknown | Promise<unknown>;
}

/** El módulo completo. `Schema` es el Zod schema de su config. */
export interface BaristaModule<Schema extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly manifest: ModuleManifest;
  /** Schema Zod de la config; el dashboard genera el formulario a partir de él. */
  readonly configSchema: Schema;
  /**
   * Eventos del Gateway que el módulo escucha, tipados por evento.
   *
   * El remapeo `as string extends E ? never : E` elimina la **firma de índice de string** que
   * Sapphire inyecta al augmentar `discord.js.ClientEvents` (sus claves computadas de enum
   * contaminan `keyof ClientEvents` en todo el programa). Sin esto, el tipo mapeado obligaría
   * a cada handler a aceptar `...args: unknown[]` y ningún handler tipado compilaría.
   */
  readonly events?: {
    [E in keyof ClientEvents as string extends E ? never : E]?: (
      ctx: ModuleContext<z.infer<Schema>>,
      ...args: ClientEvents[E]
    ) => unknown | Promise<unknown>;
  };
  /** Comandos slash que aporta. */
  readonly commands?: ModuleCommand<z.infer<Schema>>[];

  // ---- Ciclo de vida (todos opcionales) ----
  /** Una vez, al cargar el módulo en el proceso (no por guild). */
  onLoad?(): void | Promise<void>;
  /** Cuando el módulo se ACTIVA en un guild concreto. */
  onEnable?(ctx: ModuleContext<z.infer<Schema>>): void | Promise<void>;
  /** Cuando se DESACTIVA en un guild concreto. */
  onDisable?(ctx: ModuleContext<z.infer<Schema>>): void | Promise<void>;
  /** Una vez, al descargar el módulo del proceso. */
  onUnload?(): void | Promise<void>;
}

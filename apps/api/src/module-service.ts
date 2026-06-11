import type { Publisher } from "@barista/bus";
import type { BaristaModule } from "@barista/core";
import type { Database } from "@barista/db/client";
import { auditLog, globalModules, guildModules } from "@barista/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { type CommandDoc, commandDocs, eventNames } from "./module-docs.ts";
import { allModules, getModule } from "./registry.ts";

/**
 * Módulos que no se pueden desactivar (siempre activos en todos los servidores). `core` provee
 * los comandos transversales; el bot lo cortocircuita a activo y la api rechaza su toggle.
 */
export const LOCKED_MODULE_IDS: ReadonlySet<string> = new Set(["core"]);

export function isLockedModule(moduleId: string): boolean {
  return LOCKED_MODULE_IDS.has(moduleId);
}

/** Error de dominio: se intentó togglear un módulo bloqueado. La api lo mapea a 409. */
export class ModuleLockedError extends Error {
  constructor(readonly moduleId: string) {
    super(`El módulo "${moduleId}" no se puede desactivar.`);
    this.name = "ModuleLockedError";
  }
}

/** Error de dominio: el id de módulo no existe en el catálogo. La api lo mapea a 404. */
export class ModuleNotFoundError extends Error {
  constructor(readonly moduleId: string) {
    super(`No existe el módulo "${moduleId}".`);
    this.name = "ModuleNotFoundError";
  }
}

/** Un issue de validación de config, derivado de un `z.ZodIssue`. */
export interface ConfigIssue {
  /** Ruta al campo dentro de la config (p. ej. `["maxLength"]`). */
  path: (string | number)[];
  message: string;
}

/** Error de dominio: la config enviada no valida contra el schema. La api lo mapea a 422. */
export class InvalidConfigError extends Error {
  constructor(
    readonly moduleId: string,
    readonly issues: ConfigIssue[],
  ) {
    super(`Config inválida para el módulo "${moduleId}".`);
    this.name = "InvalidConfigError";
  }
}

/** Vista de un módulo en un servidor: metadatos del catálogo + estado efectivo. */
export interface GuildModuleView {
  id: string;
  name: string;
  description: string;
  category: string | null;
  enabled: boolean;
  /** Si está bloqueado, el dashboard lo muestra como "siempre activo", sin interruptor. */
  locked: boolean;
}

/**
 * Estado efectivo (enabled) de un módulo en un servidor: `guild_modules.enabled` si hay fila,
 * si no `global_modules.enabled_default`, si no `false`. Misma regla de override que aplica el
 * bot. Los módulos bloqueados (`core`) son siempre `true`.
 */
async function effectiveEnabled(db: Database, guildId: string, moduleId: string): Promise<boolean> {
  if (isLockedModule(moduleId)) return true;

  const [row] = await db
    .select({
      enabled: sql<boolean>`coalesce(${guildModules.enabled}, ${globalModules.enabledDefault}, false)`,
    })
    .from(globalModules)
    .leftJoin(
      guildModules,
      and(eq(guildModules.moduleId, moduleId), eq(guildModules.guildId, guildId)),
    )
    .where(eq(globalModules.moduleId, moduleId))
    .limit(1);

  if (row) return row.enabled;

  // Sin fila en global_modules: puede aún existir un override por-guild.
  const [perGuild] = await db
    .select({ enabled: guildModules.enabled })
    .from(guildModules)
    .where(and(eq(guildModules.moduleId, moduleId), eq(guildModules.guildId, guildId)))
    .limit(1);

  return perGuild?.enabled ?? false;
}

/**
 * Lista el estado efectivo de cada módulo del catálogo (en memoria, ADR-016) en un servidor. La
 * metadata (id/name/description/category) sale del registry de la api; la BD solo aporta el
 * estado efectivo (override por-guild ⟂ default global). Los módulos bloqueados se muestran
 * siempre activos, coherente con el bot.
 */
export async function listGuildModules(db: Database, guildId: string): Promise<GuildModuleView[]> {
  // Una sola consulta a guild_modules para no hacer N+1 sobre el catálogo.
  const guildRows = await db
    .select({ moduleId: guildModules.moduleId, enabled: guildModules.enabled })
    .from(guildModules)
    .where(eq(guildModules.guildId, guildId));
  const perGuild = new Map(guildRows.map((r) => [r.moduleId, r.enabled]));

  const globalRows = await db
    .select({ moduleId: globalModules.moduleId, enabledDefault: globalModules.enabledDefault })
    .from(globalModules);
  const globalDefault = new Map(globalRows.map((r) => [r.moduleId, r.enabledDefault]));

  return allModules().map((mod) => {
    const { id, name, description, category } = mod.manifest;
    const locked = isLockedModule(id);
    const effective = perGuild.get(id) ?? globalDefault.get(id) ?? false;
    return {
      id,
      name,
      description,
      category: category ?? null,
      locked,
      enabled: locked ? true : effective,
    };
  });
}

/** El JSON Schema (Draft 7, sin `$ref`) que el dashboard usa para autogenerar el formulario. */
export type ConfigJsonSchema = ReturnType<typeof zodToJsonSchema>;

/** Caché de JSON Schema por módulo: el schema es estático por proceso. */
const schemaCache = new Map<string, ConfigJsonSchema>();

/**
 * Genera (y cachea) el JSON Schema Draft 7 del `configSchema` de un módulo. `$refStrategy: none`
 * inlina todo para que el dashboard no tenga que resolver `$ref`.
 */
export function buildConfigJsonSchema(mod: BaristaModule): ConfigJsonSchema {
  const cached = schemaCache.get(mod.manifest.id);
  if (cached) return cached;
  const schema = zodToJsonSchema(mod.configSchema as z.ZodTypeAny, {
    target: "jsonSchema7",
    $refStrategy: "none",
  });
  schemaCache.set(mod.manifest.id, schema);
  return schema;
}

/**
 * Resuelve la config de un módulo en un guild aplicando defaults: valida la config persistida
 * contra el schema; si no valida (o no hay), cae a los defaults del schema. Mismo patrón que
 * `buildModuleContext` del core, para que api y bot resuelvan idéntico.
 */
export function resolveModuleConfig(mod: BaristaModule, raw: unknown): Record<string, unknown> {
  const schema = mod.configSchema as z.ZodTypeAny;
  const parsed = schema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data as Record<string, unknown>;
  const defaults = schema.safeParse({});
  return (defaults.success ? defaults.data : {}) as Record<string, unknown>;
}

/** Detalle de un módulo para la página de ajustes: metadata + JSON Schema + config resuelta. */
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
    /** "Qué hace" en lenguaje del usuario. */
    features: string[];
    /** Comandos documentados (nombre, descripción, opciones/subcomandos). */
    commands: CommandDoc[];
    /** Eventos del Gateway a los que reacciona (técnico). */
    events: string[];
  };
  schema: ConfigJsonSchema;
  config: Record<string, unknown>;
}

/**
 * Detalle de un módulo en un servidor para la página de ajustes: metadata del manifest, JSON
 * Schema generado desde Zod y config resuelta (con defaults). Lanza `ModuleNotFoundError` si el
 * id no está en el catálogo.
 */
export async function getModuleDetail(
  db: Database,
  guildId: string,
  moduleId: string,
): Promise<ModuleDetailView> {
  const mod = getModule(moduleId);
  if (!mod) throw new ModuleNotFoundError(moduleId);

  const [row] = await db
    .select({ config: guildModules.config })
    .from(guildModules)
    .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)))
    .limit(1);

  const enabled = await effectiveEnabled(db, guildId, moduleId);
  const { id, name, description, details, features, category, version, requiredBotPermissions } =
    mod.manifest;

  return {
    module: {
      id,
      name,
      description,
      details: details ?? null,
      category: category ?? null,
      version,
      requiredBotPermissions: requiredBotPermissions ?? [],
      enabled,
      locked: isLockedModule(id),
      features: features ? [...features] : [],
      commands: commandDocs(mod),
      events: eventNames(mod),
    },
    schema: buildConfigJsonSchema(mod),
    config: resolveModuleConfig(mod, row?.config),
  };
}

export interface SetConfigResult {
  guildId: string;
  moduleId: string;
  config: Record<string, unknown>;
}

/**
 * Persiste la config de un módulo en un servidor (RF-26). Valida el body con el propio `Zod`
 * del módulo; si falla, lanza `InvalidConfigError` (422). Si valida, persiste `parsed.data` en
 * `guild_modules.config` con `schema_version = manifest.version`, registra en `audit_log`
 * (`module.config.update`) y **publica `module.config.updated`** para que el bot invalide caché
 * (sin tocar BD en el hot path). Si no había fila, fija `enabled` al estado efectivo actual.
 */
export async function setModuleConfig(
  deps: { db: Database; publisher: Publisher },
  params: { guildId: string; moduleId: string; config: unknown; actorId: string },
): Promise<SetConfigResult> {
  const { db, publisher } = deps;
  const { guildId, moduleId, config, actorId } = params;

  const mod = getModule(moduleId);
  if (!mod) throw new ModuleNotFoundError(moduleId);

  const parsed = (mod.configSchema as z.ZodTypeAny).safeParse(config);
  if (!parsed.success) {
    const issues: ConfigIssue[] = parsed.error.issues.map((issue) => ({
      path: [...issue.path],
      message: issue.message,
    }));
    throw new InvalidConfigError(moduleId, issues);
  }
  const data = parsed.data as Record<string, unknown>;
  const schemaVersion = mod.manifest.version;

  // Si no hay fila, hay que materializar `enabled` con el estado efectivo (la columna es NOT
  // NULL y un INSERT no puede dejarla indefinida).
  const effective = await effectiveEnabled(db, guildId, moduleId);

  await db
    .insert(guildModules)
    .values({ guildId, moduleId, enabled: effective, config: data, schemaVersion })
    .onConflictDoUpdate({
      target: [guildModules.guildId, guildModules.moduleId],
      set: { config: data, schemaVersion, updatedAt: new Date() },
    });

  await db.insert(auditLog).values({
    guildId,
    actor: "operator",
    actorId,
    action: "module.config.update",
    target: moduleId,
  });

  await publisher.publishModuleConfigUpdated({ guildId, moduleId });

  return { guildId, moduleId, config: data };
}

export interface ToggleResult {
  guildId: string;
  moduleId: string;
  enabled: boolean;
}

/**
 * Activa o desactiva un módulo en un servidor. Persiste en `guild_modules`, registra en
 * `audit_log` (append-only) y **publica `module.toggled`** para que el bot invalide caché
 * (toggle < 2 s sin reiniciar). El `schemaVersion` se toma del catálogo en memoria.
 */
export async function setModuleEnabled(
  deps: { db: Database; publisher: Publisher },
  params: { guildId: string; moduleId: string; enabled: boolean; actorId: string },
): Promise<ToggleResult> {
  const { db, publisher } = deps;
  const { guildId, moduleId, enabled, actorId } = params;

  // Defensa en profundidad: `core` y demás bloqueados nunca se persisten como desactivados.
  if (isLockedModule(moduleId)) {
    throw new ModuleLockedError(moduleId);
  }

  const schemaVersion = getModule(moduleId)?.manifest.version ?? "1.0.0";

  await db
    .insert(guildModules)
    .values({ guildId, moduleId, enabled, schemaVersion })
    .onConflictDoUpdate({
      target: [guildModules.guildId, guildModules.moduleId],
      set: { enabled, updatedAt: new Date() },
    });

  await db.insert(auditLog).values({
    guildId,
    actor: "operator",
    actorId,
    action: enabled ? "module.enable" : "module.disable",
    target: moduleId,
  });

  await publisher.publishModuleToggled({ guildId, moduleId, enabled });

  return { guildId, moduleId, enabled };
}

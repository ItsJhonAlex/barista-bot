import {
  bigserial,
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { auditActor } from "./enums.ts";
import type { GuildSettings, StoredManifest } from "./types.ts";

// Los IDs de Discord son snowflakes de 64 bits → se guardan como `text` en toda la pila.

/** Un registro por servidor donde está (o estuvo) el bot. */
export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(), // snowflake del guild
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  ownerId: text("owner_id").notNull(),
  locale: text("locale").default("es").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"), // null si el bot sigue dentro
  settings: jsonb("settings").$type<GuildSettings>().default({}).notNull(),
});

/** Metadatos de cada módulo conocido por la instalación. */
export const moduleRegistry = pgTable("module_registry", {
  id: text("id").primaryKey(), // moduleId (kebab-case)
  name: text("name").notNull(),
  description: text("description").notNull(),
  version: text("version").notNull(), // semver del paquete cargado
  category: text("category"),
  manifest: jsonb("manifest").$type<StoredManifest>().notNull(),
  loadedAt: timestamp("loaded_at").defaultNow().notNull(),
});

/** Default global de activación por módulo. */
export const globalModules = pgTable("global_modules", {
  moduleId: text("module_id")
    .primaryKey()
    .references(() => moduleRegistry.id, { onDelete: "cascade" }),
  enabledDefault: boolean("enabled_default").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Estado y config de un módulo EN un servidor (override del default global). */
export const guildModules = pgTable(
  "guild_modules",
  {
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    moduleId: text("module_id")
      .notNull()
      .references(() => moduleRegistry.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
    schemaVersion: text("schema_version").notNull(), // versión del schema con que se guardó
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.moduleId] })],
);

/** Vínculo entre la cuenta autenticada y privilegios globales del bot. */
export const operators = pgTable("operators", {
  discordId: text("discord_id").primaryKey(),
  isOwner: boolean("is_owner").default(false).notNull(), // acceso a ajustes globales
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Toda acción ejecutada desde el dashboard. Append-only a nivel de aplicación (RNF-03). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    guildId: text("guild_id"), // null para acciones globales
    actor: auditActor("actor").notNull(),
    actorId: text("actor_id"), // discordId del operador, si aplica
    action: text("action").notNull(), // p.ej. "channel.create", "module.enable"
    target: text("target"), // id del recurso afectado
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_by_guild").on(t.guildId, t.createdAt)],
);

/** Store clave-valor namespaced por (moduleId, guildId). Lo usa `ctx.store` de los módulos. */
export const moduleStore = pgTable(
  "module_store",
  {
    moduleId: text("module_id").notNull(),
    guildId: text("guild_id").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.moduleId, t.guildId, t.key] })],
);

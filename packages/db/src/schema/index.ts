// @barista/db/schema — definiciones de tablas, enums y tipos. Es la mitad **segura** de la
// frontera: se puede importar desde cualquier sitio (incluido el dashboard) porque no
// contiene credenciales. El cliente con credenciales vive en @barista/db/client.

export * from "./auth.ts";
export * from "./enums.ts";
export * from "./tables.ts";
export * from "./types.ts";

import type { auditLog, guildModules, guilds, modActions, moduleRegistry } from "./tables.ts";

/** Tipos de fila derivados (preferidos a tipos escritos a mano — docs/13 §2). */
export type GuildRow = typeof guilds.$inferSelect;
export type GuildInsert = typeof guilds.$inferInsert;
export type ModuleRegistryRow = typeof moduleRegistry.$inferSelect;
export type GuildModuleRow = typeof guildModules.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type AuditLogInsert = typeof auditLog.$inferInsert;
export type ModActionRow = typeof modActions.$inferSelect;
export type ModActionInsert = typeof modActions.$inferInsert;

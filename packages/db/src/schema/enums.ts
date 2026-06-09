import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums de la migración 0001. Solo se incluye lo que usan las tablas de este hito: el resto
 * de enums del dominio (`module_scope`, `mod_action_type`, `channel_kind`,
 * `scheduled_status`) se añaden junto a las tablas dedicadas de cada módulo, en la migración
 * del hito donde entra (ver docs/06 §5).
 */
export const auditActor = pgEnum("audit_actor", ["operator", "system", "module"]);

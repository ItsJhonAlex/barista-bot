import type { Guild, GuildMember, PermissionsString, Role } from "discord.js";

/**
 * Utilidades puras de jerarquía y permisos del bot (RNF de seguridad, `docs/10` §3). No tocan
 * red: leen propiedades ya cargadas de los objetos de discord.js, así son triviales de testear
 * con fakes mínimos. El middleware de autorización de la `api` las reutiliza para garantizar que
 * el bot no actúa sobre el owner ni sobre roles por encima del suyo.
 */

/** ¿El usuario es el owner del guild? */
export function isGuildOwner(guild: Guild, userId: string): boolean {
  return guild.ownerId === userId;
}

/** Posición del rol más alto del miembro (cuanto mayor, más arriba en la jerarquía). */
export function highestRolePosition(member: GuildMember): number {
  return member.roles.highest.position;
}

/**
 * ¿Puede el bot gestionar (timeout/kick/ban/roles) a `target`? `true` solo si el target NO es el
 * owner del guild y el rol más alto del bot está **estrictamente por encima** del del target.
 * Discord no permite actuar sobre alguien igual o por encima en la jerarquía.
 */
export function botCanManageMember(botMember: GuildMember, target: GuildMember): boolean {
  if (isGuildOwner(target.guild, target.id)) return false;
  return highestRolePosition(botMember) > highestRolePosition(target);
}

/**
 * ¿Puede el bot gestionar el rol `role`? `true` solo si tiene `ManageRoles` y su rol más alto
 * está **estrictamente por encima** del rol objetivo.
 */
export function botCanManageRole(botMember: GuildMember, role: Role): boolean {
  if (!botHasPermission(botMember, "ManageRoles")) return false;
  return highestRolePosition(botMember) > role.position;
}

/** ¿Tiene el bot el permiso indicado? Delega en el cálculo de permisos de discord.js. */
export function botHasPermission(botMember: GuildMember, permission: PermissionsString): boolean {
  return botMember.permissions.has(permission);
}

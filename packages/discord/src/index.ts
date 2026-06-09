/**
 * @barista/discord — capa de acceso a Discord (REST, permisos, jerarquía) con manejo de rate
 * limits. Es la única fachada que los módulos usan para actuar sobre Discord; en tests se
 * mockea. Skeleton del Sprint 0 (S0.1); se endurece en M1.
 */
export const DISCORD_PACKAGE = "@barista/discord" as const;

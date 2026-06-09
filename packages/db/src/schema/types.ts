/**
 * Tipos compartidos del schema. Son **seguros para el frontend**: no contienen credenciales
 * y se pueden importar desde `@barista/db/schema` en cualquier sitio. No importan tablas
 * (para evitar ciclos); los tipos de fila derivados viven en el barrel `index.ts`.
 */

/** Ajustes generales de un servidor, persistidos como JSONB en `guilds.settings`. */
export interface GuildSettings {
  prefix?: string;
  timezone?: string;
}

/**
 * Manifest de un módulo persistido como JSONB en `module_registry.manifest`. Se tipa de forma
 * laxa aquí; se estrechará a `ModuleManifest` de `@barista/core` cuando el contrato exista
 * (S0.4), sin migración de datos.
 */
export type StoredManifest = Record<string, unknown>;

import type { BaristaModule } from "@barista/core";
import { modules } from "@barista/modules";

/**
 * Registry de módulos EN MEMORIA de la api (ADR-016). La api importa la misma lista que el bot
 * (`@barista/modules`) pero solo inspecciona `manifest` + `configSchema`: nunca arranca el
 * Gateway ni ejecuta el ciclo de vida (`onLoad`/`onEnable`). Sirve para generar JSON Schema y
 * validar los saves con el propio Zod, evitando serializar el schema a BD (se desincronizaría).
 */
const byId = new Map<string, BaristaModule>(modules.map((mod) => [mod.manifest.id, mod]));

/** Devuelve el módulo del catálogo en memoria, o `undefined` si el id no existe. */
export function getModule(id: string): BaristaModule | undefined {
  return byId.get(id);
}

/** Todos los módulos del catálogo en memoria (orden de `@barista/modules`). */
export function allModules(): readonly BaristaModule[] {
  return modules;
}

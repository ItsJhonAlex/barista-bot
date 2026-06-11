import { ModuleRegistry } from "@barista/core";
import { modules } from "@barista/modules";

/**
 * Construye el registry con los módulos del bot (lista compartida `@barista/modules`, también
 * consumida por la api) y ejecuta su ciclo de vida `onLoad`. El orden de la lista coloca `core`
 * primero (siempre activo, comandos globales) y luego los módulos opcionales como `echo`.
 * `loadOrder()` valida dependencias antes de cargar.
 */
export async function buildRegistry(): Promise<ModuleRegistry> {
  const registry = new ModuleRegistry();
  for (const mod of modules) {
    registry.register(mod);
  }

  for (const mod of registry.loadOrder()) {
    await mod.onLoad?.();
  }
  return registry;
}

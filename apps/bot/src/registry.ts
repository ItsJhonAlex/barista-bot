import { ModuleRegistry } from "@barista/core";
import echo from "@barista/module-echo";

/**
 * Construye el registry con los módulos del bot y ejecuta su ciclo de vida `onLoad`. Por
 * ahora solo `echo` (S0.4); la carga por descubrimiento de `@barista/module-*` llega más
 * adelante. `loadOrder()` valida dependencias antes de cargar.
 */
export async function buildRegistry(): Promise<ModuleRegistry> {
  const registry = new ModuleRegistry();
  registry.register(echo);

  for (const mod of registry.loadOrder()) {
    await mod.onLoad?.();
  }
  return registry;
}

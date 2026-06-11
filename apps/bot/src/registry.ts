import { ModuleRegistry } from "@barista/core";
import core from "@barista/module-core";
import echo from "@barista/module-echo";

/**
 * Construye el registry con los módulos del bot y ejecuta su ciclo de vida `onLoad`. `core`
 * (siempre activo, comandos globales) se registra primero; luego los módulos opcionales como
 * `echo`. La carga por descubrimiento de `@barista/module-*` llega más adelante. `loadOrder()`
 * valida dependencias antes de cargar.
 */
export async function buildRegistry(): Promise<ModuleRegistry> {
  const registry = new ModuleRegistry();
  registry.register(core);
  registry.register(echo);

  for (const mod of registry.loadOrder()) {
    await mod.onLoad?.();
  }
  return registry;
}

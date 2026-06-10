// @barista/core — el corazón: contrato de módulo, registry, gate por-guild y event router.
// Lo usan tanto el `bot` (para ejecutar) como la `api` (para listar/configurar).

export type {
  BaristaModule,
  EventHandler,
  Logger,
  ModuleCommand,
  ModuleContext,
  ModuleManifest,
  ModuleStore,
  SlashBuilder,
} from "./contract.ts";
export { defineModule } from "./define-module.ts";
export {
  type DispatcherDeps,
  EventDispatcher,
} from "./dispatcher.ts";
export {
  type EffectiveState,
  type EffectiveStateResolver,
  ModuleGate,
} from "./gate.ts";
export { createMemoryStore, type StoreFactory } from "./memory-store.ts";
export { ModuleRegistry } from "./registry.ts";
export { resolveGuildId } from "./resolve-guild-id.ts";
export { safeRun, type SafeRunContext } from "./safe-run.ts";

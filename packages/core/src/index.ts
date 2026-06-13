// @barista/core — el corazón: contrato de módulo, registry, gate por-guild y event router.
// Lo usan tanto el `bot` (para ejecutar) como la `api` (para listar/configurar).

export type {
  BaristaModule,
  CatalogEntry,
  EventHandler,
  Logger,
  ModuleCatalog,
  ModuleCommand,
  ModuleContext,
  ModuleManifest,
  ModuleStore,
  SlashBuilder,
} from "./contract.ts";
export { buildModuleContext, type ContextDeps } from "./build-context.ts";
export { createCatalog } from "./catalog.ts";
export {
  CommandDispatcher,
  type CommandDispatcherDeps,
} from "./command-dispatcher.ts";
export { defineModule } from "./define-module.ts";
export {
  type DispatcherDeps,
  EventDispatcher,
} from "./dispatcher.ts";
export {
  Cooldown,
  createDefaultPreconditions,
  GuildOnly,
  type Precondition,
  PreconditionRegistry,
  type PreconditionResult,
  RequirePermissions,
} from "./preconditions.ts";
export {
  type EffectiveState,
  type EffectiveStateResolver,
  ModuleGate,
} from "./gate.ts";
export { createMemoryStore, type StoreFactory } from "./memory-store.ts";
export { type CommandEntry, ModuleRegistry } from "./registry.ts";
export { resolveGuildId } from "./resolve-guild-id.ts";
export { safeRun, type SafeRunContext } from "./safe-run.ts";

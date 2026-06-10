import type { Logger } from "./contract.ts";

/** Contexto para el aislamiento de errores de un handler de módulo. */
export interface SafeRunContext {
  readonly log: Logger;
  readonly moduleId: string;
  readonly event: string;
}

/**
 * Ejecuta el handler de un módulo aislando sus errores: si lanza, se registra y se contiene,
 * de modo que un módulo que falla no tumba al resto ni al proceso del bot.
 */
export async function safeRun(
  fn: () => unknown | Promise<unknown>,
  ctx: SafeRunContext,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    ctx.log.error(`Módulo "${ctx.moduleId}" falló en el evento "${ctx.event}"`, error);
  }
}

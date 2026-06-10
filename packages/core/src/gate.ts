/** Estado efectivo de un módulo en un guild (resultado de la regla de override). */
export interface EffectiveState {
  readonly enabled: boolean;
  readonly config: Record<string, unknown>;
}

/**
 * Resuelve el estado efectivo de `(guildId, moduleId)` desde la fuente de verdad. Lo inyecta
 * el llamador: el `bot` lo respalda con `@barista/db` aplicando la regla
 * `guild_modules.enabled` si hay fila, si no `global_modules.enabled_default`; los tests usan
 * uno en memoria. Así el núcleo no acopla credenciales y es determinista en pruebas.
 */
export type EffectiveStateResolver = (guildId: string, moduleId: string) => Promise<EffectiveState>;

const key = (guildId: string, moduleId: string): string => `${guildId}:${moduleId}`;

/**
 * Gate con caché en memoria: mantiene `(guild, mod) → {enabled, config}` para que el hot path
 * de eventos no toque BD (RNF-12). Se invalida explícitamente (en S0.5 lo dispararán eventos
 * Redis); tras invalidar, la siguiente lectura repuebla desde el resolver.
 */
export class ModuleGate {
  readonly #cache = new Map<string, EffectiveState>();
  readonly #resolver: EffectiveStateResolver;

  constructor(resolver: EffectiveStateResolver) {
    this.#resolver = resolver;
  }

  async #load(guildId: string, moduleId: string): Promise<EffectiveState> {
    const cacheKey = key(guildId, moduleId);
    const cached = this.#cache.get(cacheKey);
    if (cached !== undefined) return cached;
    const state = await this.#resolver(guildId, moduleId);
    this.#cache.set(cacheKey, state);
    return state;
  }

  async isEnabled(guildId: string, moduleId: string): Promise<boolean> {
    return (await this.#load(guildId, moduleId)).enabled;
  }

  async getConfig(guildId: string, moduleId: string): Promise<Record<string, unknown>> {
    return (await this.#load(guildId, moduleId)).config;
  }

  /** Invalida una entrada concreta, o todas las de un guild si se omite `moduleId`. */
  invalidate(guildId: string, moduleId?: string): void {
    if (moduleId !== undefined) {
      this.#cache.delete(key(guildId, moduleId));
      return;
    }
    const prefix = `${guildId}:`;
    for (const cacheKey of this.#cache.keys()) {
      if (cacheKey.startsWith(prefix)) this.#cache.delete(cacheKey);
    }
  }

  /** Vacía toda la caché. */
  invalidateAll(): void {
    this.#cache.clear();
  }
}

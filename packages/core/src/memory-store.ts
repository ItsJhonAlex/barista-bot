import type { ModuleStore } from "./contract.ts";

/** Fábrica de stores namespaced por (moduleId, guildId). */
export type StoreFactory = (moduleId: string, guildId: string) => ModuleStore;

/**
 * Store en memoria para tests y desarrollo. El store real respaldado por la tabla
 * `module_store` de @barista/db llega cuando un módulo lo necesite.
 */
export function createMemoryStore(): StoreFactory {
  const data = new Map<string, unknown>();

  return (moduleId, guildId) => {
    const prefix = `${moduleId}:${guildId}:`;
    return {
      async get<T = unknown>(storeKey: string): Promise<T | null> {
        const value = data.get(prefix + storeKey);
        return value === undefined ? null : (value as T);
      },
      async set<T = unknown>(storeKey: string, value: T): Promise<void> {
        data.set(prefix + storeKey, value);
      },
      async delete(storeKey: string): Promise<void> {
        data.delete(prefix + storeKey);
      },
      async list(keyPrefix?: string): Promise<string[]> {
        const full = prefix + (keyPrefix ?? "");
        const keys: string[] = [];
        for (const stored of data.keys()) {
          if (stored.startsWith(full)) keys.push(stored.slice(prefix.length));
        }
        return keys;
      },
    };
  };
}

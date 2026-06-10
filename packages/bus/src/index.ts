import Redis from "ioredis";
import { z } from "zod";

// @barista/bus — mensajería interna (Redis pub/sub) entre la `api` (publica) y el `bot`
// (se suscribe e invalida caché). Define el contrato de eventos `dominio.acción` y sus
// payloads validados con Zod, compartidos por ambos lados.

/** Canales Redis. Naming `dominio.acción` (docs/13 §7). */
export const Channels = {
  moduleToggled: "module.toggled",
  moduleConfigUpdated: "module.config.updated",
} as const;

export const moduleToggledSchema = z.object({
  guildId: z.string(),
  moduleId: z.string(),
  enabled: z.boolean(),
});
export type ModuleToggled = z.infer<typeof moduleToggledSchema>;

export const moduleConfigUpdatedSchema = z.object({
  guildId: z.string(),
  moduleId: z.string(),
});
export type ModuleConfigUpdated = z.infer<typeof moduleConfigUpdatedSchema>;

/** Publica eventos hacia el bot. Lo usa la `api`. */
export interface Publisher {
  publishModuleToggled(payload: ModuleToggled): Promise<void>;
  publishModuleConfigUpdated(payload: ModuleConfigUpdated): Promise<void>;
  close(): Promise<void>;
}

export function createPublisher(url: string): Publisher {
  const redis = new Redis(url);
  return {
    async publishModuleToggled(payload) {
      await redis.publish(Channels.moduleToggled, JSON.stringify(payload));
    },
    async publishModuleConfigUpdated(payload) {
      await redis.publish(Channels.moduleConfigUpdated, JSON.stringify(payload));
    },
    async close() {
      await redis.quit();
    },
  };
}

/** Se suscribe a los eventos para invalidar caché. Lo usa el `bot`. */
export interface Subscriber {
  onModuleToggled(handler: (payload: ModuleToggled) => void): Promise<void>;
  onModuleConfigUpdated(handler: (payload: ModuleConfigUpdated) => void): Promise<void>;
  close(): Promise<void>;
}

export function createSubscriber(url: string): Subscriber {
  // Una conexión de ioredis en modo suscriptor no puede ejecutar comandos normales: por eso
  // el publisher usa su propia conexión.
  const redis = new Redis(url);
  const handlers = new Map<string, (raw: string) => void>();

  redis.on("message", (channel, message) => {
    handlers.get(channel)?.(message);
  });

  const subscribe = async <T>(
    channel: string,
    schema: z.ZodType<T>,
    handler: (payload: T) => void,
  ): Promise<void> => {
    handlers.set(channel, (raw) => {
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return; // payload ilegible: ignorar
      }
      const parsed = schema.safeParse(data);
      if (parsed.success) handler(parsed.data);
    });
    await redis.subscribe(channel);
  };

  return {
    onModuleToggled: (handler) => subscribe(Channels.moduleToggled, moduleToggledSchema, handler),
    onModuleConfigUpdated: (handler) =>
      subscribe(Channels.moduleConfigUpdated, moduleConfigUpdatedSchema, handler),
    async close() {
      await redis.quit();
    },
  };
}

import type { ChatInputCommandInteraction } from "discord.js";
import type { ModuleCommand } from "./contract.ts";

/** Resultado de una precondition: ok, o fallo con el mensaje (efímero) para el usuario. */
export type PreconditionResult = { ok: true } | { ok: false; message: string };

/**
 * Una precondition decide si un comando puede ejecutarse en esta interacción. Recibe también
 * el `ModuleCommand` para derivar requisitos declarativos (permisos por defecto, permisos del
 * bot del manifest). Deterministas: no tocan la red de Discord (RNF de tests).
 */
export type Precondition = (
  interaction: ChatInputCommandInteraction,
  command: ModuleCommand,
) => PreconditionResult | Promise<PreconditionResult>;

const OK: PreconditionResult = { ok: true };

/** El comando solo tiene sentido dentro de un servidor. */
export const GuildOnly: Precondition = (interaction) =>
  interaction.guildId
    ? OK
    : { ok: false, message: "Este comando solo puede usarse en un servidor." };

/**
 * El **usuario** tiene los permisos que el comando declara en `default_member_permissions`.
 * Si el comando no declara permisos, pasa. M1 paso 1: definido y funcional, pero el core
 * todavía no lo encadena (lo hará el subsistema de moderación).
 */
export const RequirePermissions: Precondition = (interaction, command) => {
  const required = command.data.default_member_permissions;
  if (required === undefined || required === null) return OK;
  const bits = BigInt(required);
  if (bits === 0n) return OK;
  if (interaction.memberPermissions?.has(bits)) return OK;
  return { ok: false, message: "No tienes permisos para usar este comando." };
};

/**
 * Cooldown anti-spam en memoria por `(guildId, userId, commandName)`. `windowMs` es la ventana
 * mínima entre dos invocaciones. La marca se guarda en la primera llamada permitida; dentro de
 * la ventana, las siguientes fallan. Es una fábrica para que cada uso tenga su propio estado.
 */
export function Cooldown(windowMs: number): Precondition {
  const last = new Map<string, number>();
  return (interaction) => {
    const key = `${interaction.guildId ?? "dm"}:${interaction.user.id}:${interaction.commandName}`;
    const now = Date.now();
    const previous = last.get(key);
    if (previous !== undefined && now - previous < windowMs) {
      return {
        ok: false,
        message: "Vas demasiado rápido; espera un momento e inténtalo de nuevo.",
      };
    }
    last.set(key, now);
    return OK;
  };
}

/**
 * Registro de preconditions con nombre, para que los módulos las referencien por string en
 * `command.preconditions`. `resolve` mantiene el orden de la lista y lanza si falta alguna.
 */
export class PreconditionRegistry {
  readonly #byName = new Map<string, Precondition>();

  register(name: string, fn: Precondition): void {
    this.#byName.set(name, fn);
  }

  /** ¿Hay ya una precondition registrada con este nombre? Para detectar colisiones al arrancar. */
  has(name: string): boolean {
    return this.#byName.has(name);
  }

  resolve(names: readonly string[]): Precondition[] {
    return names.map((name) => {
      const fn = this.#byName.get(name);
      if (!fn) throw new Error(`Precondition desconocida: "${name}"`);
      return fn;
    });
  }
}

/** Registro por defecto con las built-ins deterministas. Cooldown se registra con su ventana. */
export function createDefaultPreconditions(cooldownMs = 3_000): PreconditionRegistry {
  const reg = new PreconditionRegistry();
  reg.register("GuildOnly", GuildOnly);
  reg.register("RequirePermissions", RequirePermissions);
  reg.register("Cooldown", Cooldown(cooldownMs));
  return reg;
}

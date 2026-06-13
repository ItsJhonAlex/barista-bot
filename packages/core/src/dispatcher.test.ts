import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { BaristaModule, Logger } from "./contract.ts";
import { defineModule } from "./define-module.ts";
import { type DispatcherDeps, EventDispatcher } from "./dispatcher.ts";
import { ModuleGate } from "./gate.ts";
import { createMemoryStore } from "./memory-store.ts";
import { ModuleRegistry } from "./registry.ts";

type Handler = NonNullable<NonNullable<BaristaModule["events"]>["messageCreate"]>;

const log: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function moduleWith(id: string, handler: Handler, configSchema = z.object({})) {
  return defineModule({
    manifest: { id, name: id, description: "test", version: "1.0.0" },
    configSchema,
    events: { messageCreate: handler },
  });
}

function buildDeps(registry: ModuleRegistry, gate: ModuleGate): DispatcherDeps {
  return {
    registry,
    gate,
    client: {} as never,
    // Mock parcial: el dispatcher solo necesita `sendMessage` para estos tests.
    discord: { sendMessage: vi.fn() } as never,
    log,
    createStore: createMemoryStore(),
    // Estos tests no ejercen `ctx.db`; un stub vacío basta (ADR-017).
    db: {} as never,
  };
}

const alwaysEnabled = new ModuleGate(async () => ({ enabled: true, config: {} }));
const alwaysDisabled = new ModuleGate(async () => ({ enabled: false, config: {} }));

/** Argumentos de un `messageCreate` con guild `g1`. */
const messageArgs = (guildId = "g1") => [{ guildId }] as never;

describe("EventDispatcher", () => {
  it("ejecuta el handler de un módulo activo", async () => {
    const handler = vi.fn();
    const registry = new ModuleRegistry();
    registry.register(moduleWith("m", handler));

    await new EventDispatcher(buildDeps(registry, alwaysEnabled)).dispatch(
      "messageCreate",
      messageArgs(),
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("NO ejecuta el handler de un módulo desactivado (el gate corta)", async () => {
    const handler = vi.fn();
    const registry = new ModuleRegistry();
    registry.register(moduleWith("m", handler));

    await new EventDispatcher(buildDeps(registry, alwaysDisabled)).dispatch(
      "messageCreate",
      messageArgs(),
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it("aísla errores: un módulo que lanza no impide a otro", async () => {
    const ok = vi.fn();
    const registry = new ModuleRegistry();
    registry.register(
      moduleWith("bad", () => {
        throw new Error("boom");
      }),
    );
    registry.register(moduleWith("good", ok));

    await new EventDispatcher(buildDeps(registry, alwaysEnabled)).dispatch(
      "messageCreate",
      messageArgs(),
    );

    expect(ok).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalled();
  });

  it("inyecta en el ctx la config resuelta con defaults", async () => {
    let received: unknown;
    const registry = new ModuleRegistry();
    registry.register(
      moduleWith(
        "m",
        (ctx) => {
          received = ctx.config;
        },
        z.object({ prefix: z.string().default("p") }),
      ),
    );

    await new EventDispatcher(buildDeps(registry, alwaysEnabled)).dispatch(
      "messageCreate",
      messageArgs(),
    );

    expect(received).toEqual({ prefix: "p" });
  });

  it("omite los eventos sin guild", async () => {
    const handler = vi.fn();
    const registry = new ModuleRegistry();
    registry.register(moduleWith("m", handler));

    await new EventDispatcher(buildDeps(registry, alwaysEnabled)).dispatch("messageCreate", [
      {},
    ] as never);

    expect(handler).not.toHaveBeenCalled();
  });
});

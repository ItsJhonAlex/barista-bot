import { SlashCommandBuilder } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CommandDispatcher, type CommandDispatcherDeps } from "./command-dispatcher.ts";
import type { Logger, ModuleCommand } from "./contract.ts";
import { defineModule } from "./define-module.ts";
import { ModuleGate } from "./gate.ts";
import { createMemoryStore } from "./memory-store.ts";
import { type Precondition, PreconditionRegistry } from "./preconditions.ts";
import { ModuleRegistry } from "./registry.ts";

const log: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function command(name: string, run: ModuleCommand["run"], preconditions?: string[]): ModuleCommand {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription("d"),
    preconditions,
    run,
  };
}

function moduleWith(id: string, commands: ModuleCommand[]) {
  return defineModule({
    manifest: { id, name: id, description: "test", version: "1.0.0" },
    configSchema: z.object({}),
    commands,
  });
}

/** Interacción de chat-input falsa con replies espiables (nada de red de Discord). */
function fakeInteraction(commandName: string, over: Record<string, unknown> = {}) {
  const reply = vi.fn(async () => undefined);
  const interaction = {
    commandName,
    guildId: "g1",
    user: { id: "u1" },
    memberPermissions: { has: () => true },
    appPermissions: { has: () => true },
    replied: false,
    deferred: false,
    reply,
    ...over,
  };
  return interaction as unknown as import("discord.js").ChatInputCommandInteraction & {
    reply: typeof reply;
  };
}

function buildDeps(
  registry: ModuleRegistry,
  gate: ModuleGate,
  preconditions = new PreconditionRegistry(),
): CommandDispatcherDeps {
  return {
    registry,
    gate,
    client: {} as never,
    // Mock parcial: el dispatcher solo necesita `sendMessage` para estos tests.
    discord: { sendMessage: vi.fn() } as never,
    log,
    createStore: createMemoryStore(),
    preconditions,
  };
}

const enabled = new ModuleGate(async () => ({ enabled: true, config: {} }));
const disabled = new ModuleGate(async () => ({ enabled: false, config: {} }));

describe("CommandDispatcher", () => {
  it("ejecuta run con el ctx cuando el gate está activo y sin preconditions", async () => {
    let ctxGuild: string | undefined;
    const run = vi.fn((ctx) => {
      ctxGuild = ctx.guildId;
    });
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", [command("ping", run)]));

    await new CommandDispatcher(buildDeps(registry, enabled)).dispatch(fakeInteraction("ping"));

    expect(run).toHaveBeenCalledTimes(1);
    expect(ctxGuild).toBe("g1");
  });

  it("no ejecuta run si el gate está desactivado y responde efímero", async () => {
    const run = vi.fn();
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", [command("ping", run)]));
    const interaction = fakeInteraction("ping");

    await new CommandDispatcher(buildDeps(registry, disabled)).dispatch(interaction);

    expect(run).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledTimes(1);
  });

  it("no lanza ni ejecuta nada si el comando no existe", async () => {
    const registry = new ModuleRegistry();
    const interaction = fakeInteraction("nope");
    await expect(
      new CommandDispatcher(buildDeps(registry, enabled)).dispatch(interaction),
    ).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });

  it("responde efímero y no ejecuta run fuera de un servidor", async () => {
    const run = vi.fn();
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", [command("ping", run)]));
    const interaction = fakeInteraction("ping", { guildId: null });

    await new CommandDispatcher(buildDeps(registry, enabled)).dispatch(interaction);

    expect(run).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledTimes(1);
  });

  it("corta en la primera precondition que falla y respeta el orden", async () => {
    const run = vi.fn();
    const calls: string[] = [];
    const pass =
      (label: string): Precondition =>
      () => {
        calls.push(label);
        return { ok: true };
      };
    const fail =
      (label: string): Precondition =>
      () => {
        calls.push(label);
        return { ok: false, message: `falló ${label}` };
      };
    const preconditions = new PreconditionRegistry();
    preconditions.register("First", pass("First"));
    preconditions.register("Second", fail("Second"));
    preconditions.register("Third", pass("Third"));

    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", [command("ping", run, ["First", "Second", "Third"])]));
    const interaction = fakeInteraction("ping");

    await new CommandDispatcher(buildDeps(registry, enabled, preconditions)).dispatch(interaction);

    expect(calls).toEqual(["First", "Second"]); // se detiene en el primer fallo
    expect(run).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledTimes(1);
  });

  it("aísla errores de run: responde genérico si no se respondió", async () => {
    const registry = new ModuleRegistry();
    registry.register(
      moduleWith("core", [
        command("ping", () => {
          throw new Error("boom");
        }),
      ]),
    );
    const interaction = fakeInteraction("ping");

    await new CommandDispatcher(buildDeps(registry, enabled)).dispatch(interaction);

    expect(log.error).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledTimes(1); // efímero genérico
  });

  it("no intenta responder si run ya respondió antes de fallar", async () => {
    const registry = new ModuleRegistry();
    registry.register(
      moduleWith("core", [
        command("ping", (_ctx, interaction) => {
          (interaction as { replied: boolean }).replied = true;
          throw new Error("boom");
        }),
      ]),
    );
    const interaction = fakeInteraction("ping");

    await new CommandDispatcher(buildDeps(registry, enabled)).dispatch(interaction);

    expect(interaction.reply).not.toHaveBeenCalled();
  });
});

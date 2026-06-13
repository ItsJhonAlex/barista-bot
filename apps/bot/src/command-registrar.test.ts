import { ModuleGate, ModuleRegistry } from "@barista/core";
import type { DiscordService } from "@barista/discord";
import { SlashCommandBuilder } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { syncGuildCommands } from "./command-registrar.ts";

/**
 * Módulo de prueba con un comando del nombre dado. El registry solo lee `manifest`/`commands`,
 * así que un objeto mínimo casteado basta (evita acoplar el test del bot a `zod`).
 */
function moduleWith(id: string, commandName: string) {
  return {
    manifest: { id, name: id, description: "d", version: "1.0.0" },
    configSchema: undefined,
    commands: [
      {
        data: new SlashCommandBuilder().setName(commandName).setDescription("d"),
        run: () => undefined,
      },
    ],
  } as unknown as Parameters<ModuleRegistry["register"]>[0];
}

/** Cliente falso: captura el set publicado por `guild.commands.set`. */
function fakeClient() {
  const set = vi.fn(async () => undefined);
  const client = {
    guilds: { fetch: vi.fn(async () => ({ commands: { set } })) },
  };
  return { client: client as never, set };
}

/** DiscordService mínimo: `run` ejecuta la operación directamente (cola transparente en test). */
const discord = { run: <T>(op: () => Promise<T>) => op() } as DiscordService;

/** Nombres de los comandos del último set publicado por el mock de `guild.commands.set`. */
function publishedNames(set: ReturnType<typeof vi.fn>): string[] {
  const arg = set.mock.calls.at(0)?.at(0) as { name: string }[] | undefined;
  return (arg ?? []).map((c) => c.name);
}

/** Gate que activa los módulos cuyo id esté en `enabledIds`. */
function gateWith(enabledIds: string[]): ModuleGate {
  return new ModuleGate(async (_guildId, moduleId) => ({
    enabled: enabledIds.includes(moduleId),
    config: {},
  }));
}

describe("syncGuildCommands", () => {
  it("publica solo los comandos de los módulos opcionales ACTIVOS en el guild", async () => {
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", "help"));
    registry.register(moduleWith("moderation", "warn"));
    registry.register(moduleWith("echo", "echo"));
    const { client, set } = fakeClient();

    // moderation activo, echo desactivado.
    await syncGuildCommands(client, registry, gateWith(["moderation"]), "g1", discord);

    expect(set).toHaveBeenCalledTimes(1);
    expect(publishedNames(set)).toEqual(["warn"]); // ni core ni el desactivado echo
  });

  it("excluye `core` del set por-guild fuera del dev-guild", async () => {
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", "help"));
    registry.register(moduleWith("moderation", "warn"));
    const { client, set } = fakeClient();

    await syncGuildCommands(client, registry, gateWith(["moderation"]), "g1", discord);

    expect(publishedNames(set)).not.toContain("help");
  });

  it("en el dev-guild incluye `core` además de los opcionales activos (no lo machaca)", async () => {
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", "help"));
    registry.register(moduleWith("moderation", "warn"));
    const { client, set } = fakeClient();

    await syncGuildCommands(client, registry, gateWith(["moderation"]), "dev1", discord, "dev1");

    expect(publishedNames(set).sort()).toEqual(["help", "warn"]);
  });

  it("publica un set vacío si no hay módulos opcionales activos (los da de baja)", async () => {
    const registry = new ModuleRegistry();
    registry.register(moduleWith("core", "help"));
    registry.register(moduleWith("moderation", "warn"));
    const { client, set } = fakeClient();

    await syncGuildCommands(client, registry, gateWith([]), "g1", discord);

    expect(set).toHaveBeenCalledWith([]);
  });
});

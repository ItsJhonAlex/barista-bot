import { SlashCommandBuilder } from "discord.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createCatalog } from "./catalog.ts";
import type { ModuleCommand } from "./contract.ts";
import { defineModule } from "./define-module.ts";
import { ModuleGate } from "./gate.ts";
import { ModuleRegistry } from "./registry.ts";

function command(name: string, description: string): ModuleCommand {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(description),
    run: () => undefined,
  };
}

function make(id: string, commands: ModuleCommand[] = []) {
  return defineModule({
    manifest: { id, name: id.toUpperCase(), description: `desc ${id}`, version: "1.0.0" },
    configSchema: z.object({}),
    commands,
  });
}

describe("createCatalog", () => {
  it("lista solo los módulos activos según el gate y proyecta sus comandos", async () => {
    const registry = new ModuleRegistry();
    registry.register(make("core", [command("ping", "pong"), command("help", "ayuda")]));
    registry.register(make("echo", [command("echo-say", "repite")]));

    const gate = new ModuleGate(async (_g, moduleId) => ({
      enabled: moduleId === "core",
      config: {},
    }));

    const catalog = createCatalog(registry, gate, "g1");
    const entries = await catalog.enabledModules();

    expect(entries.map((e) => e.id)).toEqual(["core"]);
    expect(entries[0]).toEqual({
      id: "core",
      name: "CORE",
      description: "desc core",
      commands: [
        { name: "ping", description: "pong" },
        { name: "help", description: "ayuda" },
      ],
    });
  });

  it("devuelve vacío cuando ningún módulo está activo", async () => {
    const registry = new ModuleRegistry();
    registry.register(make("echo", [command("echo-say", "repite")]));
    const gate = new ModuleGate(async () => ({ enabled: false, config: {} }));

    const catalog = createCatalog(registry, gate, "g1");
    expect(await catalog.enabledModules()).toEqual([]);
  });
});

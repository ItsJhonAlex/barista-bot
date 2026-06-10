import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineModule } from "./define-module.ts";
import { ModuleRegistry } from "./registry.ts";

function make(
  id: string,
  extra: { version?: string; dependsOn?: string[]; withEvent?: boolean } = {},
) {
  return defineModule({
    manifest: {
      id,
      name: id,
      description: "test",
      version: extra.version ?? "1.0.0",
      dependsOn: extra.dependsOn,
    },
    configSchema: z.object({}),
    events: extra.withEvent ? { messageCreate: () => undefined } : undefined,
  });
}

describe("ModuleRegistry", () => {
  it("registra un módulo válido y lo devuelve", () => {
    const registry = new ModuleRegistry();
    registry.register(make("echo"));
    expect(registry.get("echo")?.manifest.id).toBe("echo");
    expect(registry.all()).toHaveLength(1);
  });

  it("rechaza un id que no sea kebab-case", () => {
    const registry = new ModuleRegistry();
    expect(() => registry.register(make("Echo_Bad"))).toThrow(/kebab-case/);
  });

  it("rechaza una versión semver inválida", () => {
    const registry = new ModuleRegistry();
    expect(() => registry.register(make("echo", { version: "1.0" }))).toThrow(/semver/);
  });

  it("rechaza un id duplicado", () => {
    const registry = new ModuleRegistry();
    registry.register(make("echo"));
    expect(() => registry.register(make("echo"))).toThrow(/duplicado/);
  });

  it("indexa qué módulos escuchan cada evento", () => {
    const registry = new ModuleRegistry();
    registry.register(make("echo", { withEvent: true }));
    registry.register(make("silent"));
    expect(registry.subscribedEvents()).toContain("messageCreate");
    expect(registry.modulesListeningTo("messageCreate").map((m) => m.manifest.id)).toEqual([
      "echo",
    ]);
  });

  it("ordena por dependencias (topológico)", () => {
    const registry = new ModuleRegistry();
    registry.register(make("a", { dependsOn: ["b"] }));
    registry.register(make("b"));
    const order = registry.loadOrder().map((m) => m.manifest.id);
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("a"));
  });

  it("lanza si falta una dependencia", () => {
    const registry = new ModuleRegistry();
    registry.register(make("a", { dependsOn: ["missing"] }));
    expect(() => registry.loadOrder()).toThrow(/ausente/i);
  });

  it("lanza ante un ciclo de dependencias", () => {
    const registry = new ModuleRegistry();
    registry.register(make("a", { dependsOn: ["b"] }));
    registry.register(make("b", { dependsOn: ["a"] }));
    expect(() => registry.loadOrder()).toThrow(/ciclo/i);
  });
});

import { describe, expect, it, vi } from "vitest";
import { type EffectiveState, ModuleGate } from "./gate.ts";

const state = (enabled: boolean): EffectiveState => ({ enabled, config: {} });

describe("ModuleGate", () => {
  it("cachea el resultado del resolver (no vuelve a llamarlo)", async () => {
    const resolver = vi.fn(async () => state(true));
    const gate = new ModuleGate(resolver);

    await gate.isEnabled("g", "m");
    await gate.isEnabled("g", "m");
    await gate.getConfig("g", "m");

    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it("refleja el `enabled` del resolver", async () => {
    const gate = new ModuleGate(async () => state(false));
    expect(await gate.isEnabled("g", "m")).toBe(false);
  });

  it("invalidate fuerza la re-resolución con el nuevo estado", async () => {
    let enabled = false;
    const gate = new ModuleGate(async () => state(enabled));

    expect(await gate.isEnabled("g", "m")).toBe(false);
    enabled = true;
    expect(await gate.isEnabled("g", "m")).toBe(false); // aún cacheado

    gate.invalidate("g", "m");
    expect(await gate.isEnabled("g", "m")).toBe(true); // repuebla
  });

  it("invalidate(guild) limpia todas las entradas de ese guild", async () => {
    const calls: string[] = [];
    const gate = new ModuleGate(async (g, m) => {
      calls.push(`${g}:${m}`);
      return state(true);
    });

    await gate.isEnabled("g", "a");
    await gate.isEnabled("g", "b");
    gate.invalidate("g");
    await gate.isEnabled("g", "a");

    expect(calls).toEqual(["g:a", "g:b", "g:a"]);
  });
});

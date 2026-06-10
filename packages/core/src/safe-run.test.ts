import { describe, expect, it, vi } from "vitest";
import type { Logger } from "./contract.ts";
import { safeRun } from "./safe-run.ts";

const makeLog = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe("safeRun", () => {
  it("ejecuta el handler", async () => {
    const fn = vi.fn();
    await safeRun(fn, { log: makeLog(), moduleId: "m", event: "e" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("captura el error y lo registra sin propagarlo", async () => {
    const log = makeLog();
    await expect(
      safeRun(
        () => {
          throw new Error("boom");
        },
        { log, moduleId: "m", event: "e" },
      ),
    ).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

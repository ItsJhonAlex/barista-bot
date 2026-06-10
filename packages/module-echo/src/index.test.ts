import type { ModuleContext } from "@barista/core";
import { describe, expect, it, vi } from "vitest";
import echo from "./index.ts";

const handler = echo.events?.messageCreate;

/** Tipo del argumento `message` derivado del propio handler (sin importar discord.js aquí). */
type MessageArg = Parameters<NonNullable<typeof handler>>[1];

/** ctx falso con un `discord.sendMessage` mockeado (nada de red real). */
function fakeCtx(sendMessage: ReturnType<typeof vi.fn>): ModuleContext<{ prefix: string }> {
  return {
    guildId: "g1",
    config: { prefix: "🔊" },
    client: {} as never,
    discord: { sendMessage },
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    store: {} as never,
  } as unknown as ModuleContext<{ prefix: string }>;
}

function fakeMessage(content: string, bot = false): MessageArg {
  return { author: { bot }, content, channelId: "c1" } as unknown as MessageArg;
}

describe("module-echo", () => {
  it("repite el mensaje con el prefijo configurado", async () => {
    const sendMessage = vi.fn();
    await handler?.(fakeCtx(sendMessage), fakeMessage("hola"));
    expect(sendMessage).toHaveBeenCalledWith("c1", "🔊 hola");
  });

  it("ignora los mensajes de bots (evita bucles)", async () => {
    const sendMessage = vi.fn();
    await handler?.(fakeCtx(sendMessage), fakeMessage("hola", true));
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("ignora los mensajes sin contenido", async () => {
    const sendMessage = vi.fn();
    await handler?.(fakeCtx(sendMessage), fakeMessage("   "));
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

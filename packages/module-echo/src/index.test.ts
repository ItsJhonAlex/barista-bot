import type { ModuleContext } from "@barista/core";
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import echo from "./index.ts";

const handler = echo.events?.messageCreate;

/** Tipo del argumento `message` derivado del propio handler (sin importar discord.js aquí). */
type MessageArg = Parameters<NonNullable<typeof handler>>[1];

/** Config resuelta del módulo, derivada de su propio schema. */
type EchoConfig = z.infer<typeof echo.configSchema>;

/** ctx falso con un `discord.sendMessage` mockeado (nada de red real). */
function fakeCtx(
  sendMessage: ReturnType<typeof vi.fn>,
  config: Partial<EchoConfig> = {},
): ModuleContext<EchoConfig> {
  return {
    guildId: "g1",
    config: { prefix: "🔊", uppercase: false, maxLength: 500, ...config },
    client: {} as never,
    discord: { sendMessage },
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    store: {} as never,
  } as unknown as ModuleContext<EchoConfig>;
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

  it("responde en mayúsculas cuando uppercase está activo", async () => {
    const sendMessage = vi.fn();
    await handler?.(fakeCtx(sendMessage, { uppercase: true }), fakeMessage("hola"));
    expect(sendMessage).toHaveBeenCalledWith("c1", "🔊 HOLA");
  });

  it("recorta el contenido a maxLength", async () => {
    const sendMessage = vi.fn();
    await handler?.(fakeCtx(sendMessage, { maxLength: 3 }), fakeMessage("holaaa"));
    expect(sendMessage).toHaveBeenCalledWith("c1", "🔊 hol");
  });

  it("aplica defaults del schema (prefix, uppercase, maxLength)", () => {
    const parsed = echo.configSchema.parse({});
    expect(parsed).toEqual({ prefix: "🔊", uppercase: false, maxLength: 500 });
  });

  it("expone details en el manifest", () => {
    expect(typeof echo.manifest.details).toBe("string");
    expect(echo.manifest.details?.length ?? 0).toBeGreaterThan(0);
  });

  it("declara versión 1.1.0", () => {
    expect(echo.manifest.version).toBe("1.1.0");
  });
});

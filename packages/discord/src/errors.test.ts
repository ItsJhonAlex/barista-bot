import { describe, expect, it } from "vitest";
import { DiscordError, normalizeDiscordError } from "./errors.ts";

describe("DiscordError", () => {
  it("conserva code, status y cause", () => {
    const original = new Error("boom");
    const err = new DiscordError("MISSING_PERMISSIONS", "sin permisos", {
      status: 403,
      cause: original,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("MISSING_PERMISSIONS");
    expect(err.status).toBe(403);
    expect(err.cause).toBe(original);
    expect(err.message).toBe("sin permisos");
    expect(err.name).toBe("DiscordError");
  });
});

describe("normalizeDiscordError", () => {
  it("devuelve el mismo DiscordError si ya lo es (idempotente)", () => {
    const err = new DiscordError("FORBIDDEN", "prohibido");
    expect(normalizeDiscordError(err)).toBe(err);
  });

  it("mapea el código numérico de Discord (forma DiscordAPIError) por encima del status", () => {
    // Forma estructural de DiscordAPIError: `code` numérico + `status` + `rawError`.
    const apiError = {
      code: 50013,
      status: 403,
      rawError: { message: "Missing Permissions" },
      message: "Missing Permissions",
    };
    const err = normalizeDiscordError(apiError);
    expect(err).toBeInstanceOf(DiscordError);
    expect(err.code).toBe("MISSING_PERMISSIONS");
    expect(err.status).toBe(403);
    expect(err.cause).toBe(apiError);
  });

  it("mapea UNKNOWN_MEMBER (10007) aunque el status sea genérico", () => {
    const apiError = { code: 10007, status: 404, rawError: {}, message: "Unknown Member" };
    expect(normalizeDiscordError(apiError).code).toBe("UNKNOWN_MEMBER");
  });

  it("cae al mapa por status cuando el código numérico no es conocido", () => {
    const apiError = { code: 99999, status: 403, rawError: {}, message: "x" };
    expect(normalizeDiscordError(apiError).code).toBe("FORBIDDEN");
  });

  it("mapea 404 a NOT_FOUND", () => {
    const apiError = { code: 99999, status: 404, rawError: {}, message: "x" };
    expect(normalizeDiscordError(apiError).code).toBe("NOT_FOUND");
  });

  it("mapea 429 a RATE_LIMITED", () => {
    const apiError = { code: 99999, status: 429, rawError: {}, message: "x" };
    expect(normalizeDiscordError(apiError).code).toBe("RATE_LIMITED");
  });

  it("reconoce la forma HTTPError (status sin code numérico)", () => {
    const httpError = { status: 403, message: "Forbidden", name: "HTTPError" };
    const err = normalizeDiscordError(httpError);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.status).toBe(403);
    expect(err.cause).toBe(httpError);
  });

  it("usa DISCORD_ERROR como fallback para status desconocido", () => {
    const apiError = { code: 99999, status: 418, rawError: {}, message: "tetera" };
    expect(normalizeDiscordError(apiError).code).toBe("DISCORD_ERROR");
  });

  it("normaliza un Error genérico a DISCORD_ERROR conservándolo en cause", () => {
    const plain = new Error("algo falló");
    const err = normalizeDiscordError(plain);
    expect(err.code).toBe("DISCORD_ERROR");
    expect(err.status).toBeUndefined();
    expect(err.cause).toBe(plain);
  });

  it("normaliza valores no-Error (string) a DISCORD_ERROR", () => {
    const err = normalizeDiscordError("texto suelto");
    expect(err.code).toBe("DISCORD_ERROR");
    expect(err.cause).toBe("texto suelto");
  });

  it("produce un mensaje legible en español", () => {
    const err = normalizeDiscordError({ code: 50013, status: 403, rawError: {}, message: "x" });
    expect(err.message).toMatch(/permis/i);
  });
});

import { describe, expect, it } from "vitest";
import { loadEnv } from "./index.ts";

/** Entorno válido mínimo reutilizable en los casos. */
const valid: Record<string, string> = {
  NODE_ENV: "test",
  DISCORD_BOT_TOKEN: "token",
  DISCORD_CLIENT_ID: "123456789",
  DISCORD_CLIENT_SECRET: "client-secret",
  DATABASE_URL: "postgres://barista:barista@localhost:5432/barista",
  REDIS_URL: "redis://localhost:6379",
  BETTER_AUTH_SECRET: "0123456789abcdef",
};

describe("loadEnv", () => {
  it("parsea un entorno válido y aplica los defaults", () => {
    const env = loadEnv(valid);
    expect(env.NODE_ENV).toBe("test");
    expect(env.DASHBOARD_URL).toBe("http://localhost:5173");
  });

  it("lanza si falta una variable obligatoria", () => {
    const incomplete = { ...valid, DISCORD_BOT_TOKEN: "" };
    expect(() => loadEnv(incomplete)).toThrow(/Configuración de entorno inválida/);
  });

  it("lanza si una URL es inválida", () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: "no-es-una-url" })).toThrow();
  });

  it("lanza si el secreto de auth es demasiado corto", () => {
    expect(() => loadEnv({ ...valid, BETTER_AUTH_SECRET: "corto" })).toThrow();
  });
});

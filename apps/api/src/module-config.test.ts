import type { Publisher } from "@barista/bus";
import type { Database } from "@barista/db/client";
import { describe, expect, it, vi } from "vitest";
import {
  InvalidConfigError,
  ModuleNotFoundError,
  buildConfigJsonSchema,
  resolveModuleConfig,
  setModuleConfig,
} from "./module-service.ts";
import { getModule } from "./registry.ts";

// Unit puro: solo manifest + configSchema del registry en memoria. Sin tocar Postgres ni Redis.
const echo = getModule("echo");
if (!echo) throw new Error("El módulo `echo` debería estar en el registry de la api.");

describe("buildConfigJsonSchema (Zod → JSON Schema)", () => {
  const schema = buildConfigJsonSchema(echo) as {
    properties?: Record<string, Record<string, unknown>>;
  };

  it("genera properties para prefix/uppercase/maxLength con tipos correctos", () => {
    const props = schema.properties ?? {};
    expect(props.prefix?.type).toBe("string");
    expect(props.uppercase?.type).toBe("boolean");
    expect(props.maxLength?.type).toMatch(/integer|number/);
  });

  it("conserva description, min/max y defaults", () => {
    const props = schema.properties ?? {};
    expect(props.prefix?.description).toBe("Prefijo que se antepone al eco");
    expect(props.prefix?.default).toBe("🔊");
    expect(props.uppercase?.default).toBe(false);
    expect(props.maxLength?.minimum).toBe(1);
    expect(props.maxLength?.maximum).toBe(2000);
    expect(props.maxLength?.default).toBe(500);
  });

  it("no genera $ref (todo inlineado)", () => {
    expect(JSON.stringify(schema)).not.toContain("$ref");
  });
});

describe("resolveModuleConfig (defaults)", () => {
  it("rellena los campos ausentes con los defaults del schema", () => {
    expect(resolveModuleConfig(echo, { prefix: "x" })).toEqual({
      prefix: "x",
      uppercase: false,
      maxLength: 500,
    });
  });

  it("cae a defaults cuando la config persistida es inválida", () => {
    expect(resolveModuleConfig(echo, { maxLength: 99999 })).toEqual({
      prefix: "🔊",
      uppercase: false,
      maxLength: 500,
    });
  });

  it("resuelve a defaults con config vacía o nula", () => {
    expect(resolveModuleConfig(echo, {})).toEqual({
      prefix: "🔊",
      uppercase: false,
      maxLength: 500,
    });
    expect(resolveModuleConfig(echo, null)).toEqual({
      prefix: "🔊",
      uppercase: false,
      maxLength: 500,
    });
  });
});

describe("setModuleConfig (validación, sin BD)", () => {
  const publisher = {
    publishModuleToggled: vi.fn(),
    publishModuleConfigUpdated: vi.fn(),
    close: vi.fn(),
  } as unknown as Publisher;
  // db nunca debería usarse en los casos de error (la validación corta antes).
  const db = {} as unknown as Database;

  it("lanza ModuleNotFoundError para un id desconocido", async () => {
    await expect(
      setModuleConfig(
        { db, publisher },
        { guildId: "g1", moduleId: "no-existe", config: {}, actorId: "op" },
      ),
    ).rejects.toBeInstanceOf(ModuleNotFoundError);
  });

  it("rechaza maxLength fuera de rango con InvalidConfigError + issues", async () => {
    try {
      await setModuleConfig(
        { db, publisher },
        { guildId: "g1", moduleId: "echo", config: { maxLength: 99999 }, actorId: "op" },
      );
      throw new Error("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidConfigError);
      const issues = (err as InvalidConfigError).issues;
      expect(issues.some((i) => i.path.includes("maxLength"))).toBe(true);
    }
  });

  it("rechaza prefix de tipo incorrecto con InvalidConfigError", async () => {
    await expect(
      setModuleConfig(
        { db, publisher },
        { guildId: "g1", moduleId: "echo", config: { prefix: 123 }, actorId: "op" },
      ),
    ).rejects.toBeInstanceOf(InvalidConfigError);
  });
});

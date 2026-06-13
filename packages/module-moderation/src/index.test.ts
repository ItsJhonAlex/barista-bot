import { PermissionFlagsBits } from "discord.js";
import { describe, expect, it } from "vitest";
import moderation from "./index.ts";

// El comportamiento extremo a extremo (jerarquía, inserción en mod_actions, ejecución vía
// @barista/discord) se valida en vivo y con la integración de `mod_actions`. Aquí cubrimos lo
// puro/estructural: el manifest, el set de comandos y la precondition `ModeratorOnly`.

describe("module-moderation", () => {
  it("tiene el manifest esperado", () => {
    expect(moderation.manifest.id).toBe("moderation");
    expect(moderation.manifest.requiredBotPermissions).toEqual(
      expect.arrayContaining(["ModerateMembers", "KickMembers", "BanMembers", "ManageMessages"]),
    );
  });

  it("expone los siete comandos de moderación", () => {
    const names = (moderation.commands ?? []).map((c) => c.data.name).sort();
    expect(names).toEqual(["ban", "kick", "purge", "timeout", "unban", "untimeout", "warn"]);
  });

  it("todos los comandos exigen la precondition ModeratorOnly", () => {
    for (const command of moderation.commands ?? []) {
      expect(command.preconditions).toContain("ModeratorOnly");
    }
  });

  describe("precondition ModeratorOnly", () => {
    const evaluate = (perms: bigint[]) => {
      const interaction = {
        memberPermissions: { has: (p: bigint) => perms.includes(p) },
      } as never;
      return moderation.preconditions?.ModeratorOnly?.(interaction, {} as never);
    };

    it("permite con Moderar miembros", () => {
      expect(evaluate([PermissionFlagsBits.ModerateMembers])).toEqual({ ok: true });
    });

    it("permite con Banear", () => {
      expect(evaluate([PermissionFlagsBits.BanMembers])).toEqual({ ok: true });
    });

    it("rechaza sin ningún permiso de moderación", () => {
      expect(evaluate([])).toMatchObject({ ok: false });
    });
  });
});

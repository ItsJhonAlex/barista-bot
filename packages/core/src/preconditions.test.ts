import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { describe, expect, it } from "vitest";
import type { ModuleCommand } from "./contract.ts";
import { Cooldown, GuildOnly, PreconditionRegistry, RequirePermissions } from "./preconditions.ts";

function command(
  name: string,
  opts: {
    defaultPerms?: bigint;
  } = {},
): ModuleCommand {
  const builder = new SlashCommandBuilder().setName(name).setDescription("d");
  if (opts.defaultPerms !== undefined) builder.setDefaultMemberPermissions(opts.defaultPerms);
  return { data: builder, run: () => undefined };
}

/** Interacción mínima falsa para las preconditions deterministas. */
function fakeInteraction(over: Record<string, unknown> = {}) {
  return {
    guildId: "g1",
    user: { id: "u1" },
    commandName: "cmd",
    memberPermissions: { has: () => true },
    appPermissions: { has: () => true },
    ...over,
  } as unknown as import("discord.js").ChatInputCommandInteraction;
}

describe("GuildOnly", () => {
  it("falla cuando no hay guild", async () => {
    const res = await GuildOnly(fakeInteraction({ guildId: null }), command("cmd"));
    expect(res.ok).toBe(false);
  });

  it("pasa cuando hay guild", async () => {
    const res = await GuildOnly(fakeInteraction(), command("cmd"));
    expect(res.ok).toBe(true);
  });
});

describe("RequirePermissions", () => {
  it("pasa si el comando no declara permisos", async () => {
    const res = await RequirePermissions(fakeInteraction(), command("cmd"));
    expect(res.ok).toBe(true);
  });

  it("falla si al usuario le faltan permisos declarados", async () => {
    const res = await RequirePermissions(
      fakeInteraction({ memberPermissions: { has: () => false } }),
      command("cmd", { defaultPerms: PermissionFlagsBits.BanMembers }),
    );
    expect(res.ok).toBe(false);
  });

  it("pasa si el usuario tiene los permisos declarados", async () => {
    const res = await RequirePermissions(
      fakeInteraction({ memberPermissions: { has: () => true } }),
      command("cmd", { defaultPerms: PermissionFlagsBits.BanMembers }),
    );
    expect(res.ok).toBe(true);
  });
});

describe("Cooldown", () => {
  it("permite la primera llamada y bloquea la segunda dentro de la ventana", async () => {
    const cd = Cooldown(10_000);
    const i = fakeInteraction({ commandName: "warn" });
    const first = await cd(i, command("warn"));
    const second = await cd(i, command("warn"));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it("aísla cooldowns por usuario", async () => {
    const cd = Cooldown(10_000);
    const a = await cd(
      fakeInteraction({ user: { id: "a" }, commandName: "warn" }),
      command("warn"),
    );
    const b = await cd(
      fakeInteraction({ user: { id: "b" }, commandName: "warn" }),
      command("warn"),
    );
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });
});

describe("PreconditionRegistry", () => {
  it("resuelve nombres registrados a sus funciones", () => {
    const reg = new PreconditionRegistry();
    reg.register("GuildOnly", GuildOnly);
    expect(reg.resolve(["GuildOnly"])).toHaveLength(1);
  });

  it("lanza si falta una precondition", () => {
    const reg = new PreconditionRegistry();
    expect(() => reg.resolve(["NoExiste"])).toThrow(/NoExiste/);
  });
});

import { describe, expect, it } from "vitest";
import { type DiscordGuild, adminGuilds } from "./discord-guilds.ts";

const guild = (id: string, permissions: string): DiscordGuild => ({
  id,
  name: id,
  icon: null,
  permissions,
});

describe("adminGuilds", () => {
  it("incluye guilds con ADMINISTRATOR (0x8)", () => {
    expect(adminGuilds([guild("1", String(0x8))]).map((g) => g.id)).toEqual(["1"]);
  });

  it("incluye guilds con MANAGE_GUILD (0x20)", () => {
    expect(adminGuilds([guild("2", String(0x20))]).map((g) => g.id)).toEqual(["2"]);
  });

  it("excluye guilds sin permiso suficiente", () => {
    expect(adminGuilds([guild("3", "0")])).toEqual([]);
  });

  it("ignora bitfields malformados", () => {
    expect(adminGuilds([guild("4", "no-es-numero")])).toEqual([]);
  });
});

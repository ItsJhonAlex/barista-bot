import type { Guild, GuildMember, PermissionsString, Role } from "discord.js";
import { describe, expect, it } from "vitest";
import {
  botCanManageMember,
  botCanManageRole,
  botHasPermission,
  highestRolePosition,
  isGuildOwner,
} from "./hierarchy.ts";

/** Fake mínimo de GuildMember: solo las props que leen los helpers. */
function fakeMember(opts: {
  id?: string;
  highest?: number;
  permissions?: PermissionsString[];
  ownerId?: string;
}): GuildMember {
  const perms = new Set(opts.permissions ?? []);
  return {
    id: opts.id ?? "member",
    guild: { ownerId: opts.ownerId ?? "guild-owner" },
    roles: { highest: { position: opts.highest ?? 0 } },
    permissions: { has: (p: PermissionsString) => perms.has(p) },
  } as unknown as GuildMember;
}

function fakeRole(position: number): Role {
  return { position } as unknown as Role;
}

describe("isGuildOwner", () => {
  it("true cuando el id coincide con ownerId", () => {
    const guild = { ownerId: "owner-1" } as unknown as Guild;
    expect(isGuildOwner(guild, "owner-1")).toBe(true);
  });
  it("false cuando no coincide", () => {
    const guild = { ownerId: "owner-1" } as unknown as Guild;
    expect(isGuildOwner(guild, "other")).toBe(false);
  });
});

describe("highestRolePosition", () => {
  it("devuelve la posición del rol más alto", () => {
    expect(highestRolePosition(fakeMember({ highest: 7 }))).toBe(7);
  });
});

describe("botCanManageMember", () => {
  it("true cuando el bot está por encima y el target no es owner", () => {
    const bot = fakeMember({ id: "bot", highest: 5 });
    const target = fakeMember({ id: "t", highest: 3 });
    expect(botCanManageMember(bot, target)).toBe(true);
  });

  it("false cuando el bot está en la misma posición (no puede gestionar a un igual)", () => {
    const bot = fakeMember({ id: "bot", highest: 5 });
    const target = fakeMember({ id: "t", highest: 5 });
    expect(botCanManageMember(bot, target)).toBe(false);
  });

  it("false cuando el target está por encima", () => {
    const bot = fakeMember({ id: "bot", highest: 2 });
    const target = fakeMember({ id: "t", highest: 9 });
    expect(botCanManageMember(bot, target)).toBe(false);
  });

  it("false cuando el target es el owner del guild, aunque el bot esté por encima", () => {
    const bot = fakeMember({ id: "bot", highest: 10 });
    // El owner se detecta vía GuildMember.guild.ownerId === GuildMember.id.
    const owner = fakeMember({ id: "owner", highest: 1, ownerId: "owner" });
    expect(botCanManageMember(bot, owner)).toBe(false);
  });
});

describe("botCanManageRole", () => {
  it("true con ManageRoles y rol del bot por encima del objetivo", () => {
    const bot = fakeMember({ highest: 5, permissions: ["ManageRoles"] });
    expect(botCanManageRole(bot, fakeRole(3))).toBe(true);
  });

  it("false sin ManageRoles aunque esté por encima", () => {
    const bot = fakeMember({ highest: 5, permissions: [] });
    expect(botCanManageRole(bot, fakeRole(3))).toBe(false);
  });

  it("false con ManageRoles pero en la misma posición que el objetivo", () => {
    const bot = fakeMember({ highest: 3, permissions: ["ManageRoles"] });
    expect(botCanManageRole(bot, fakeRole(3))).toBe(false);
  });
});

describe("botHasPermission", () => {
  it("delega en permissions.has", () => {
    const bot = fakeMember({ permissions: ["BanMembers"] });
    expect(botHasPermission(bot, "BanMembers")).toBe(true);
    expect(botHasPermission(bot, "KickMembers")).toBe(false);
  });
});

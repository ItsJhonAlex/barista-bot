import { describe, expect, it } from "vitest";
import { resolveGuildId } from "./resolve-guild-id.ts";

describe("resolveGuildId", () => {
  it("extrae el guildId del primer argumento (.guildId)", () => {
    expect(resolveGuildId("messageCreate", [{ guildId: "g1" }] as never)).toBe("g1");
  });

  it("extrae el guildId de .guild.id", () => {
    expect(resolveGuildId("guildMemberAdd", [{ guild: { id: "g2" } }] as never)).toBe("g2");
  });

  it("devuelve null cuando no hay guild (DM / evento global)", () => {
    expect(resolveGuildId("messageCreate", [{}] as never)).toBeNull();
  });
});

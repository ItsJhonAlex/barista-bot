import type { BaristaModule } from "@barista/core";
import { describe, expect, it } from "vitest";
import { commandDocs, eventNames } from "./module-docs.ts";

// Probamos contra el shape de `SlashCommandBuilder.toJSON()` directamente (sin discord.js):
// `commandDocs` solo consume esa salida. Tipos de opción de Discord: 1=subcomando, 3=texto,
// 6=usuario.
type RawCommand = { name: string; description: string; options?: unknown[] };

function fakeModule(commands: RawCommand[], events: Record<string, unknown> = {}): BaristaModule {
  return {
    commands: commands.map((json) => ({
      data: { toJSON: () => json },
      run: async () => undefined,
    })),
    events,
  } as unknown as BaristaModule;
}

describe("commandDocs", () => {
  it("documenta nombre, descripción y opciones con tipo humano y obligatoriedad", () => {
    const [cmd] = commandDocs(
      fakeModule([
        {
          name: "warn",
          description: "Avisa a un usuario",
          options: [
            { type: 6, name: "user", description: "A quién avisar", required: true },
            { type: 3, name: "reason", description: "Motivo del aviso" },
          ],
        },
      ]),
    );
    expect(cmd?.name).toBe("warn");
    expect(cmd?.options).toEqual([
      { name: "user", description: "A quién avisar", type: "usuario", required: true },
      { name: "reason", description: "Motivo del aviso", type: "texto", required: false },
    ]);
  });

  it("documenta subcomandos con sus opciones anidadas", () => {
    const [cmd] = commandDocs(
      fakeModule([
        {
          name: "schedule",
          description: "Programar mensajes",
          options: [
            {
              type: 1,
              name: "add",
              description: "Programa uno nuevo",
              options: [{ type: 3, name: "msg", description: "Mensaje", required: true }],
            },
          ],
        },
      ]),
    );
    expect(cmd?.options[0]).toEqual({
      name: "add",
      description: "Programa uno nuevo",
      type: "subcomando",
      required: false,
      options: [{ name: "msg", description: "Mensaje", type: "texto", required: true }],
    });
  });

  it("un comando sin opciones devuelve lista vacía", () => {
    const [cmd] = commandDocs(fakeModule([{ name: "ping", description: "pong" }]));
    expect(cmd?.options).toEqual([]);
  });
});

describe("eventNames", () => {
  it("lista los nombres de los eventos del módulo", () => {
    expect(
      eventNames(fakeModule([], { messageCreate: () => {}, guildMemberAdd: () => {} })),
    ).toEqual(["messageCreate", "guildMemberAdd"]);
  });
});

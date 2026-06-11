import type { CatalogEntry, ModuleCatalog, ModuleCommand, ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import core from "./index.ts";

function commandByName(name: string): ModuleCommand<unknown> {
  const command = core.commands?.find((c) => c.data.name === name);
  if (!command) throw new Error(`Comando "${name}" no encontrado en module-core`);
  return command as ModuleCommand<unknown>;
}

/** Respuesta capturada de la interacción falsa. */
type ReplyArg = { content?: string; flags?: number };

/** Interacción falsa que captura la respuesta (nada de red de Discord). */
function fakeInteraction() {
  const reply = vi.fn(async (_arg: ReplyArg): Promise<void> => undefined);
  const interaction = {
    reply,
    client: { ws: { ping: 42 } },
    createdTimestamp: Date.now(),
  };
  return interaction as unknown as ChatInputCommandInteraction & { reply: typeof reply };
}

/** ctx falso con un catálogo inyectable. */
function fakeCtx(catalog: ModuleCatalog): ModuleContext {
  return {
    guildId: "g1",
    config: {},
    client: { ws: { ping: 42 } },
    discord: { sendMessage: vi.fn() },
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    store: {} as never,
    catalog,
  } as unknown as ModuleContext;
}

/** Ejecuta el `run` de un comando con el ctx falso (el genérico del schema se borra aquí). */
function runCommand(
  command: ModuleCommand,
  ctx: ModuleContext,
  interaction: ChatInputCommandInteraction,
): unknown | Promise<unknown> {
  return (command.run as ModuleCommand<unknown>["run"])(ctx, interaction);
}

/** Primer argumento con que se invocó `reply`. */
function firstReply(interaction: ReturnType<typeof fakeInteraction>): ReplyArg {
  const arg = interaction.reply.mock.calls[0]?.[0];
  if (arg === undefined) throw new Error("reply no fue invocado");
  return arg;
}

function catalogOf(entries: CatalogEntry[]): ModuleCatalog {
  return { enabledModules: async () => entries };
}

describe("module-core manifest", () => {
  it("declara el id estable 'core' y semver", () => {
    expect(core.manifest.id).toBe("core");
    expect(core.manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("/about", () => {
  it("incluye la versión del manifest en la respuesta", async () => {
    const interaction = fakeInteraction();
    await runCommand(commandByName("about"), fakeCtx(catalogOf([])), interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(firstReply(interaction).content).toContain(core.manifest.version);
  });
});

describe("/help", () => {
  it("lista los módulos activos del catálogo con sus comandos", async () => {
    const interaction = fakeInteraction();
    const catalog = catalogOf([
      {
        id: "core",
        name: "Núcleo",
        description: "el núcleo",
        commands: [{ name: "ping", description: "pong" }],
      },
      {
        id: "echo",
        name: "Echo",
        description: "repite",
        commands: [{ name: "echo-say", description: "repite algo" }],
      },
    ]);

    await runCommand(commandByName("help"), fakeCtx(catalog), interaction);

    const text = firstReply(interaction).content ?? "";
    expect(text).toContain("Núcleo");
    expect(text).toContain("ping");
    expect(text).toContain("Echo");
    expect(text).toContain("echo-say");
  });

  it("muestra un estado vacío cuando no hay módulos activos", async () => {
    const interaction = fakeInteraction();
    await runCommand(commandByName("help"), fakeCtx(catalogOf([])), interaction);
    expect(interaction.reply).toHaveBeenCalledTimes(1);
  });
});

describe("/ping", () => {
  it("responde con pong", async () => {
    const interaction = fakeInteraction();
    await runCommand(commandByName("ping"), fakeCtx(catalogOf([])), interaction);
    expect((firstReply(interaction).content ?? "").toLowerCase()).toContain("pong");
  });
});

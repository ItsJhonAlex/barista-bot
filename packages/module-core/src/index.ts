import { type ModuleManifest, defineModule } from "@barista/core";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { z } from "zod";

/** Nombre de marca del bot, para textos de UI. Provisional (ver CLAUDE.md / docs/13 §10). */
const BOT_NAME = "Barista";
const PROJECT_URL = "https://github.com/barista-bot/barista";

/**
 * Manifest del `core`. Se declara aparte para que `/about` pueda leer su propia versión sin
 * referenciar el módulo antes de construirlo.
 */
const manifest: ModuleManifest = {
  id: "core",
  name: "Núcleo",
  description: "Comandos transversales del bot: estado, información y ayuda.",
  version: "1.0.0",
  category: "núcleo",
  requiredBotPermissions: [],
};

/**
 * El módulo `core`: siempre activo (no desactivable; el resolver de estado efectivo del bot lo
 * cortocircuita). Aporta los comandos transversales `/ping`, `/about` y `/help`, registrados
 * de forma GLOBAL (ADR-005). No escucha eventos ni persiste config.
 */
const configSchema = z.object({});

export default defineModule({
  manifest,
  configSchema,
  commands: [
    {
      // Confirma que el bot está vivo y muestra la latencia del WebSocket.
      data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Responde pong y muestra la latencia del bot."),
      preconditions: [],
      run: async (ctx, interaction) => {
        const websocket = Math.round(ctx.client.ws.ping);
        await interaction.reply({
          content: `Pong! 🏓  WebSocket ${websocket}ms`,
          flags: MessageFlags.Ephemeral,
        });
      },
    },
    {
      // Información del bot: nombre de marca, versión y enlace al proyecto.
      data: new SlashCommandBuilder()
        .setName("about")
        .setDescription("Muestra información sobre el bot."),
      preconditions: [],
      run: async (_ctx, interaction) => {
        const lines = [
          `**${BOT_NAME}** · versión ${manifest.version}`,
          "Bot de Discord modular, administrable desde el dashboard.",
          PROJECT_URL,
        ];
        await interaction.reply({
          content: lines.join("\n"),
          flags: MessageFlags.Ephemeral,
        });
      },
    },
    {
      // Lista los módulos activos en este servidor y sus comandos (ADR-015, vía ctx.catalog).
      data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Lista los módulos activos en este servidor y sus comandos."),
      preconditions: [],
      run: async (ctx, interaction) => {
        const modules = await ctx.catalog.enabledModules();
        if (modules.length === 0) {
          await interaction.reply({
            content: "No hay módulos activos en este servidor.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const sections = modules.map((mod) => {
          const header = `**${mod.name}** — ${mod.description}`;
          const commands =
            mod.commands.length === 0
              ? "  _(sin comandos)_"
              : mod.commands.map((c) => `  • \`/${c.name}\` — ${c.description}`).join("\n");
          return `${header}\n${commands}`;
        });

        await interaction.reply({
          content: ["**Módulos activos:**", ...sections].join("\n\n"),
          flags: MessageFlags.Ephemeral,
        });
      },
    },
  ],
});

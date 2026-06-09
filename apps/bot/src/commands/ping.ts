import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";

/**
 * Comando trivial `/ping` del Sprint 0 (S0.3): confirma que el bot está vivo y muestra la
 * latencia. En S0.4 los comandos pasan a vivir dentro del sistema de módulos (el `core`
 * registra global); por ahora es una pieza Sapphire directa.
 */
export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "ping",
      description: "Responde pong y muestra la latencia del bot.",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("ping").setDescription("Responde pong y muestra la latencia del bot."),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const start = Date.now();
    await interaction.reply({ content: "Pong… 🏓", flags: MessageFlags.Ephemeral });

    const roundTrip = Date.now() - start;
    const websocket = Math.round(this.container.client.ws.ping);
    await interaction.editReply(`Pong! 🏓  Round-trip ${roundTrip}ms · WebSocket ${websocket}ms`);
  }
}

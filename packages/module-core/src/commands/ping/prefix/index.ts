import type { PrefixCommand } from "@barista/core";

/**
 * SCAFFOLD de `/ping` como prefix command (ADR-018). Aún no se despacha. Lógica trivial idéntica
 * al slash (sin `shared.ts`): mide la latencia del WebSocket y responde en el canal del mensaje.
 */
export const command: PrefixCommand = {
  name: "ping",
  run: async (ctx, message) => {
    const websocket = Math.round(ctx.client.ws.ping);
    await ctx.discord.sendMessage(message.channelId, `Pong! 🏓  WebSocket ${websocket}ms`);
  },
};

// @barista/module-echo — módulo de prueba: repite los mensajes del canal. Existe para ver el
// toggle por servidor en acción (S0.4) y como banco de pruebas de la página de ajustes (RF-26).
// Este index.ts SOLO ensambla: la config vive en config.ts y el handler en events/.

import { defineModule } from "@barista/core";
import { configSchema } from "./config.ts";
import { handler as messageCreate } from "./events/messageCreate/index.ts";

export default defineModule({
  manifest: {
    id: "echo",
    name: "Echo",
    description: "Repite los mensajes del canal. Útil para probar el toggle por servidor.",
    details:
      "El módulo Echo repite cada mensaje de texto del canal anteponiéndole un prefijo. " +
      "Está pensado para comprobar de un vistazo que el toggle por servidor y la página de " +
      "ajustes funcionan: cambia el prefijo, fuerza mayúsculas o limita la longitud y verás " +
      "el efecto en el siguiente mensaje, sin reiniciar el bot.",
    features: [
      "Repite en el canal cada mensaje de texto que escribe un miembro.",
      "Antepone un prefijo configurable al eco.",
      "Puede responder en mayúsculas y recortar el mensaje a una longitud máxima.",
      "Nunca responde a otros bots (evita bucles).",
    ],
    version: "1.1.0",
    category: "prueba",
  },
  configSchema,
  events: { messageCreate },
});

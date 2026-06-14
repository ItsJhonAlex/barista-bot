import type { ModuleManifest } from "@barista/core";

/** Metadatos del módulo de moderación, extraídos para que `index.ts` solo ensamble. */
export const manifest: ModuleManifest = {
  id: "moderation",
  name: "Moderación",
  description: "Sanciona a los miembros del servidor: avisos, timeouts, expulsiones y baneos.",
  details:
    "El módulo de Moderación da a tu equipo los comandos básicos para mantener el orden: " +
    "avisar, silenciar temporalmente, expulsar, banear y limpiar mensajes. Cada sanción queda " +
    "registrada en el historial del servidor y, si configuras un canal de registro, se anuncia " +
    "ahí. Solo quien tenga permisos nativos de moderación puede usar estos comandos.",
  features: [
    "Avisa a un miembro y deja constancia del motivo.",
    "Silencia temporalmente (timeout) con duración configurable y lo retira cuando quieras.",
    "Expulsa o banea a un miembro, con opción de borrar sus mensajes recientes al banear.",
    "Limpia en bloque los mensajes recientes de un canal.",
    "Registra cada acción en el historial del servidor y la anuncia en el canal de registro.",
  ],
  version: "1.0.0",
  category: "moderación",
  requiredBotPermissions: ["ModerateMembers", "KickMembers", "BanMembers", "ManageMessages"],
};

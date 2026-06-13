import { defineModule } from "@barista/core";
import type { ModuleContext } from "@barista/core";
import { type ModActionInsert, modActions } from "@barista/db/schema";
import { DiscordError, botCanManageMember, isGuildOwner } from "@barista/discord";
import {
  type ChatInputCommandInteraction,
  type GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { z } from "zod";
import { parseDuration } from "./duration.ts";

/**
 * Config del módulo de moderación. El dashboard autogenera el formulario desde este schema.
 * `logChannelId` opcional → si está, cada sanción se anuncia ahí; los roles configurables son
 * una mejora sobre el permiso nativo (la precondition `ModeratorOnly` valida el permiso nativo).
 */
const configSchema = z.object({
  logChannelId: z.string().optional().describe("Canal de registro de sanciones"),
  defaultBanDeleteDays: z
    .number()
    .int()
    .min(0)
    .max(7)
    .default(0)
    .describe("Días de mensajes a borrar al banear"),
  moderatorRoleIds: z.array(z.string()).default([]).describe("Roles con permiso de moderación"),
});

type Config = z.infer<typeof configSchema>;

/** Flags de respuesta efímera (MessageFlags.Ephemeral = 64); por valor, sin acoplar imports. */
const EPHEMERAL = 64;

/** Responde a la interacción de forma efímera (solo la ve quien ejecutó el comando). */
async function replyEphemeral(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  await interaction.reply({ content, flags: EPHEMERAL });
}

/**
 * Carga el miembro del bot y el del objetivo para validar la jerarquía. Devuelve `null` si el
 * objetivo no es un miembro del servidor (p. ej. ya no está) o el bot no está cargado.
 */
async function loadMembers(
  interaction: ChatInputCommandInteraction,
  targetUserId: string,
): Promise<{ botMember: GuildMember; targetMember: GuildMember } | null> {
  const guild = interaction.guild;
  if (!guild) return null;
  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
  if (!targetMember) return null;
  return { botMember, targetMember };
}

/**
 * Valida que el bot puede actuar sobre el objetivo según la jerarquía de roles (docs/10 §3). Si
 * no puede, responde efímero y devuelve `false`. El objetivo owner o por encima del bot se
 * rechaza ANTES de tocar Discord.
 */
async function ensureCanManage(
  interaction: ChatInputCommandInteraction,
  targetUserId: string,
): Promise<boolean> {
  const members = await loadMembers(interaction, targetUserId);
  if (!members) {
    await replyEphemeral(interaction, "No encuentro a ese usuario en el servidor.");
    return false;
  }
  const { botMember, targetMember } = members;
  if (isGuildOwner(targetMember.guild, targetMember.id)) {
    await replyEphemeral(interaction, "No puedo actuar sobre el dueño del servidor.");
    return false;
  }
  if (!botCanManageMember(botMember, targetMember)) {
    await replyEphemeral(
      interaction,
      "No puedo actuar sobre ese usuario: su rol está por encima del mío. Sube mi rol e inténtalo de nuevo.",
    );
    return false;
  }
  return true;
}

/** Traduce un error de Discord a un mensaje efímero en español; reenlanza lo que no reconozca. */
async function reportDiscordError(
  interaction: ChatInputCommandInteraction,
  error: unknown,
): Promise<void> {
  if (error instanceof DiscordError) {
    await replyEphemeral(interaction, error.message);
    return;
  }
  throw error;
}

/** Inserta una fila en `mod_actions` con los campos comunes de una sanción. */
async function recordAction(
  ctx: ModuleContext<Config>,
  values: Omit<ModActionInsert, "guildId" | "moderatorId"> & { moderatorId: string },
): Promise<void> {
  await ctx.db.insert(modActions).values({ ...values, guildId: ctx.guildId });
}

/** Anuncia la sanción en el canal de registro si está configurado (best-effort, no bloquea). */
async function announce(ctx: ModuleContext<Config>, message: string): Promise<void> {
  const channelId = ctx.config.logChannelId;
  if (!channelId) return;
  await ctx.discord.sendMessage(channelId, message).catch((error) => {
    ctx.log.warn(`No se pudo anunciar en el canal de registro ${channelId}`, error);
  });
}

/** Etiqueta legible del objetivo para los mensajes de registro. */
function mention(userId: string): string {
  return `<@${userId}>`;
}

export default defineModule({
  manifest: {
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
  },
  configSchema,
  preconditions: {
    /**
     * Solo modera quien tenga un permiso nativo de moderación (Moderar miembros, Expulsar o
     * Banear). Determinista: lee `interaction.memberPermissions`, no toca red. El rol
     * configurable (`config.moderatorRoleIds`) queda como mejora futura.
     */
    ModeratorOnly: (interaction) => {
      const perms = interaction.memberPermissions;
      const isModerator =
        perms?.has(PermissionFlagsBits.ModerateMembers) ||
        perms?.has(PermissionFlagsBits.KickMembers) ||
        perms?.has(PermissionFlagsBits.BanMembers);
      return isModerator
        ? { ok: true }
        : { ok: false, message: "No tienes permisos de moderación en este servidor." };
    },
  },
  commands: [
    // /warn — solo registra y notifica, no ejecuta nada en Discord.
    {
      data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Avisa a un miembro y registra el motivo.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a avisar").setRequired(true),
        )
        .addStringOption((o) => o.setName("motivo").setDescription("Motivo del aviso")),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const target = interaction.options.getUser("usuario", true);
        const reason = interaction.options.getString("motivo") ?? undefined;
        if (!(await ensureCanManage(interaction, target.id))) return;

        await recordAction(ctx, {
          type: "warn",
          targetUserId: target.id,
          moderatorId: interaction.user.id,
          reason,
        });
        await announce(ctx, `Aviso a ${mention(target.id)}${reason ? `: ${reason}` : ""}.`);
        await replyEphemeral(interaction, `Avisaste a ${mention(target.id)}.`);
      },
    },
    // /timeout — silencia temporalmente al miembro.
    {
      data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Silencia temporalmente a un miembro.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a silenciar").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("duración")
            .setDescription("Duración: 30s, 5m, 1h, 1d (máx 28d)")
            .setRequired(true),
        )
        .addStringOption((o) => o.setName("motivo").setDescription("Motivo del timeout")),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const target = interaction.options.getUser("usuario", true);
        const rawDuration = interaction.options.getString("duración", true);
        const reason = interaction.options.getString("motivo") ?? undefined;

        const durationMs = parseDuration(rawDuration);
        if (durationMs === null) {
          await replyEphemeral(
            interaction,
            "Duración no válida. Usa algo como 30s, 5m, 1h o 1d (máximo 28 días).",
          );
          return;
        }
        if (!(await ensureCanManage(interaction, target.id))) return;

        const untilMs = Date.now() + durationMs;
        try {
          await ctx.discord.timeoutMember(ctx.guildId, target.id, untilMs, reason);
        } catch (error) {
          await reportDiscordError(interaction, error);
          return;
        }
        await recordAction(ctx, {
          type: "timeout",
          targetUserId: target.id,
          moderatorId: interaction.user.id,
          reason,
          expiresAt: new Date(untilMs),
        });
        await announce(
          ctx,
          `Timeout a ${mention(target.id)} hasta <t:${Math.floor(untilMs / 1000)}:R>${
            reason ? `: ${reason}` : ""
          }.`,
        );
        await replyEphemeral(interaction, `Silenciaste a ${mention(target.id)}.`);
      },
    },
    // /untimeout — retira el timeout.
    {
      data: new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Retira el timeout de un miembro.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a liberar").setRequired(true),
        ),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const target = interaction.options.getUser("usuario", true);
        if (!(await ensureCanManage(interaction, target.id))) return;

        try {
          await ctx.discord.timeoutMember(ctx.guildId, target.id, null);
        } catch (error) {
          await reportDiscordError(interaction, error);
          return;
        }
        await recordAction(ctx, {
          type: "untimeout",
          targetUserId: target.id,
          moderatorId: interaction.user.id,
        });
        await announce(ctx, `Se retiró el timeout de ${mention(target.id)}.`);
        await replyEphemeral(interaction, `Retiraste el timeout de ${mention(target.id)}.`);
      },
    },
    // /kick — expulsa al miembro.
    {
      data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Expulsa a un miembro del servidor.")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a expulsar").setRequired(true),
        )
        .addStringOption((o) => o.setName("motivo").setDescription("Motivo de la expulsión")),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const target = interaction.options.getUser("usuario", true);
        const reason = interaction.options.getString("motivo") ?? undefined;
        if (!(await ensureCanManage(interaction, target.id))) return;

        try {
          await ctx.discord.kickMember(ctx.guildId, target.id, reason);
        } catch (error) {
          await reportDiscordError(interaction, error);
          return;
        }
        await recordAction(ctx, {
          type: "kick",
          targetUserId: target.id,
          moderatorId: interaction.user.id,
          reason,
        });
        await announce(ctx, `Expulsión de ${mention(target.id)}${reason ? `: ${reason}` : ""}.`);
        await replyEphemeral(interaction, `Expulsaste a ${mention(target.id)}.`);
      },
    },
    // /ban — banea al usuario, con borrado opcional de mensajes.
    {
      data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Banea a un usuario del servidor.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Usuario a banear").setRequired(true),
        )
        .addStringOption((o) => o.setName("motivo").setDescription("Motivo del baneo"))
        .addIntegerOption((o) =>
          o
            .setName("borrar-mensajes-días")
            .setDescription("Días de mensajes a borrar (0-7)")
            .setMinValue(0)
            .setMaxValue(7),
        ),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const target = interaction.options.getUser("usuario", true);
        const reason = interaction.options.getString("motivo") ?? undefined;
        const deleteDays =
          interaction.options.getInteger("borrar-mensajes-días") ?? ctx.config.defaultBanDeleteDays;
        if (!(await ensureCanManage(interaction, target.id))) return;

        try {
          await ctx.discord.banMember(ctx.guildId, target.id, {
            reason,
            deleteMessageSeconds: deleteDays * 86_400,
          });
        } catch (error) {
          await reportDiscordError(interaction, error);
          return;
        }
        await recordAction(ctx, {
          type: "ban",
          targetUserId: target.id,
          moderatorId: interaction.user.id,
          reason,
        });
        await announce(ctx, `Baneo de ${mention(target.id)}${reason ? `: ${reason}` : ""}.`);
        await replyEphemeral(interaction, `Baneaste a ${mention(target.id)}.`);
      },
    },
    // /unban — retira el ban. No valida jerarquía de miembro (el usuario ya no está en el guild).
    {
      data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Retira el ban de un usuario.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((o) =>
          o.setName("usuario-id").setDescription("ID del usuario a desbanear").setRequired(true),
        )
        .addStringOption((o) => o.setName("motivo").setDescription("Motivo del desbaneo")),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const targetUserId = interaction.options.getString("usuario-id", true);
        const reason = interaction.options.getString("motivo") ?? undefined;

        try {
          await ctx.discord.unbanMember(ctx.guildId, targetUserId, reason);
        } catch (error) {
          await reportDiscordError(interaction, error);
          return;
        }
        await recordAction(ctx, {
          type: "unban",
          targetUserId,
          moderatorId: interaction.user.id,
          reason,
        });
        await announce(ctx, `Se retiró el ban de ${mention(targetUserId)}.`);
        await replyEphemeral(interaction, `Retiraste el ban de ${mention(targetUserId)}.`);
      },
    },
    // /purge — borra en bloque mensajes recientes del canal. Sin jerarquía de miembro.
    {
      data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Borra en bloque los mensajes recientes del canal.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption((o) =>
          o
            .setName("cantidad")
            .setDescription("Cuántos mensajes borrar (1-100)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100),
        ),
      preconditions: ["ModeratorOnly"],
      run: async (ctx, interaction) => {
        const count = interaction.options.getInteger("cantidad", true);

        let deleted: number;
        try {
          deleted = await ctx.discord.purgeMessages(interaction.channelId, count);
        } catch (error) {
          await reportDiscordError(interaction, error);
          return;
        }
        await recordAction(ctx, {
          type: "purge",
          targetUserId: interaction.channelId, // en purge, el "objetivo" es el canal
          moderatorId: interaction.user.id,
          reason: `Borrados ${deleted} mensajes`,
        });
        await replyEphemeral(interaction, `Borré ${deleted} mensaje(s) del canal.`);
      },
    },
  ],
});

// Reexport para tests y consumidores que quieran el límite o el parser sin acoplarse al índice.
export { MAX_TIMEOUT_MS, parseDuration } from "./duration.ts";

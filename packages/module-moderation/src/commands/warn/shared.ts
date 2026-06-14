import type { ModuleContext } from "@barista/core";
import type { ChatInputCommandInteraction } from "discord.js";
import type { Config } from "../../config.ts";
import { ensureCanManage } from "../../shared/hierarchy.ts";
import { announce, mention, recordAction } from "../../shared/record.ts";
import { replyEphemeral } from "../../shared/reply.ts";

/** Parámetros normalizados de `/warn`, comunes a slash y prefix. */
export interface WarnParams {
  readonly targetUserId: string;
  readonly moderatorId: string;
  readonly reason?: string;
}

/**
 * Acción de `/warn`: solo registra y notifica, no ejecuta nada en Discord. Valida la jerarquía
 * (responde efímero si no puede), inserta en `mod_actions` y anuncia en el canal de registro.
 */
export async function warn(
  ctx: ModuleContext<Config>,
  interaction: ChatInputCommandInteraction,
  params: WarnParams,
): Promise<void> {
  if (!(await ensureCanManage(interaction, params.targetUserId))) return;

  await recordAction(ctx, {
    type: "warn",
    targetUserId: params.targetUserId,
    moderatorId: params.moderatorId,
    reason: params.reason,
  });
  await announce(
    ctx,
    `Aviso a ${mention(params.targetUserId)}${params.reason ? `: ${params.reason}` : ""}.`,
  );
  await replyEphemeral(interaction, `Avisaste a ${mention(params.targetUserId)}.`);
}

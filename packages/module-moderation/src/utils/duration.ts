/**
 * Parseo de duraciones para el timeout de moderación. Puro y testeable: no toca Discord ni el
 * reloj. Acepta `"30s"`, `"5m"`, `"1h"`, `"1d"` o un número desnudo (interpretado como minutos),
 * y devuelve milisegundos. `null` si no es parseable, es <= 0 o supera el máximo de Discord.
 */

const DAY_MS = 24 * 60 * 60_000;

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: DAY_MS,
};

/** Máximo que Discord admite para un timeout de miembro: 28 días, en ms. */
export const MAX_TIMEOUT_MS = 28 * DAY_MS;

const PATTERN = /^(\d+)([smhd]?)$/;

/**
 * Convierte una entrada de duración a milisegundos. Un número sin unidad se trata como minutos
 * (lo más habitual al moderar). Devuelve `null` para entradas vacías, no numéricas, no positivas
 * o que excedan `MAX_TIMEOUT_MS` (límite de Discord).
 */
export function parseDuration(input: string): number | null {
  const normalized = input.trim().toLowerCase();
  const match = PATTERN.exec(normalized);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = match[2] || "m"; // vacío o ausente → minutos
  const ms = amount * (UNIT_MS[unit] ?? 0);
  if (ms <= 0 || ms > MAX_TIMEOUT_MS) return null;
  return ms;
}

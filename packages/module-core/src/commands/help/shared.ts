import type { CatalogEntry } from "@barista/core";

/** Texto cuando no hay ningún módulo activo en el servidor. */
export const EMPTY_HELP = "No hay módulos activos en este servidor.";

/**
 * Construye el texto de `/help` a partir del catálogo de módulos activos. Puro: no toca Discord ni
 * el ctx, solo formatea las secciones. Devuelve `EMPTY_HELP` si la lista viene vacía. Común a
 * slash y prefix.
 */
export function buildHelp(modules: readonly CatalogEntry[]): string {
  if (modules.length === 0) return EMPTY_HELP;

  const sections = modules.map((mod) => {
    const header = `**${mod.name}** — ${mod.description}`;
    const commands =
      mod.commands.length === 0
        ? "  _(sin comandos)_"
        : mod.commands.map((c) => `  • \`/${c.name}\` — ${c.description}`).join("\n");
    return `${header}\n${commands}`;
  });

  return ["**Módulos activos:**", ...sections].join("\n\n");
}

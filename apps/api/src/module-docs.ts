import type { BaristaModule } from "@barista/core";

// Serializa los comandos de un módulo a una forma documentable para el dashboard: nombre,
// descripción y opciones/subcomandos con su tipo en lenguaje humano. Se deriva de cada
// `SlashCommandBuilder` (`data.toJSON()`), así que la documentación nunca se desincroniza del
// comando real. Pensado para módulos complejos con subcomandos y argumentos.

/** Etiquetas humanas de los tipos de opción de slash command (ApplicationCommandOptionType). */
const OPTION_TYPE_LABELS: Record<number, string> = {
  1: "subcomando",
  2: "grupo",
  3: "texto",
  4: "entero",
  5: "sí/no",
  6: "usuario",
  7: "canal",
  8: "rol",
  9: "mención",
  10: "número",
  11: "adjunto",
};

export interface OptionDoc {
  name: string;
  description: string;
  /** Tipo en lenguaje humano (texto, número, canal, subcomando…). */
  type: string;
  required: boolean;
  /** Opciones anidadas (para subcomandos y grupos). */
  options?: OptionDoc[];
}

export interface CommandDoc {
  name: string;
  description: string;
  options: OptionDoc[];
}

interface RawOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  options?: RawOption[];
}

function mapOption(opt: RawOption): OptionDoc {
  const doc: OptionDoc = {
    name: opt.name,
    description: opt.description,
    type: OPTION_TYPE_LABELS[opt.type] ?? "opción",
    required: opt.required ?? false,
  };
  if (opt.options && opt.options.length > 0) {
    doc.options = opt.options.map(mapOption);
  }
  return doc;
}

/** Documenta los slash commands de un módulo a partir de sus builders. */
export function commandDocs(mod: BaristaModule): CommandDoc[] {
  return (mod.commands ?? []).map((cmd) => {
    const json = cmd.data.toJSON() as {
      name: string;
      description: string;
      options?: RawOption[];
    };
    return {
      name: json.name,
      description: json.description,
      options: (json.options ?? []).map(mapOption),
    };
  });
}

/** Nombres de los eventos del Gateway a los que reacciona el módulo (técnico). */
export function eventNames(mod: BaristaModule): string[] {
  return Object.keys(mod.events ?? {});
}

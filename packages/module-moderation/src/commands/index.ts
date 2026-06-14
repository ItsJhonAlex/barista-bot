import type { ModuleCommand, PrefixCommand } from "@barista/core";
import type { Config } from "../config.ts";
import { command as banPrefix } from "./ban/prefix/index.ts";
import { command as banSlash } from "./ban/slash/index.ts";
import { command as kickPrefix } from "./kick/prefix/index.ts";
import { command as kickSlash } from "./kick/slash/index.ts";
import { command as purgePrefix } from "./purge/prefix/index.ts";
import { command as purgeSlash } from "./purge/slash/index.ts";
import { command as timeoutPrefix } from "./timeout/prefix/index.ts";
import { command as timeoutSlash } from "./timeout/slash/index.ts";
import { command as unbanPrefix } from "./unban/prefix/index.ts";
import { command as unbanSlash } from "./unban/slash/index.ts";
import { command as untimeoutPrefix } from "./untimeout/prefix/index.ts";
import { command as untimeoutSlash } from "./untimeout/slash/index.ts";
import { command as warnPrefix } from "./warn/prefix/index.ts";
import { command as warnSlash } from "./warn/slash/index.ts";

/** Comandos slash del módulo de moderación, en orden estable. */
export const slashCommands: ModuleCommand<Config>[] = [
  warnSlash,
  timeoutSlash,
  untimeoutSlash,
  kickSlash,
  banSlash,
  unbanSlash,
  purgeSlash,
];

/**
 * Gemelos prefix (SCAFFOLD, ADR-018): typechequean y se exportan, pero ningún runtime los
 * despacha todavía. Comparten la lógica con sus slash vía `shared/` y `commands/<cmd>/shared.ts`.
 */
export const prefixCommands: PrefixCommand<Config>[] = [
  warnPrefix,
  timeoutPrefix,
  untimeoutPrefix,
  kickPrefix,
  banPrefix,
  unbanPrefix,
  purgePrefix,
];

import type { ModuleCommand, PrefixCommand } from "@barista/core";
import { command as aboutPrefix } from "./about/prefix/index.ts";
import { command as aboutSlash } from "./about/slash/index.ts";
import { command as helpPrefix } from "./help/prefix/index.ts";
import { command as helpSlash } from "./help/slash/index.ts";
import { command as pingPrefix } from "./ping/prefix/index.ts";
import { command as pingSlash } from "./ping/slash/index.ts";

/** Comandos slash del núcleo, registrados de forma GLOBAL (ADR-005). Orden estable. */
export const slashCommands: ModuleCommand[] = [pingSlash, aboutSlash, helpSlash];

/**
 * Gemelos prefix (SCAFFOLD, ADR-018): typechequean y se exportan, pero ningún runtime los
 * despacha todavía.
 */
export const prefixCommands: PrefixCommand[] = [pingPrefix, aboutPrefix, helpPrefix];

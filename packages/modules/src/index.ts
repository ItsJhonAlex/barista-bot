// @barista/modules — lista compartida de módulos que componen esta instalación de Barista.
// La consumen tanto el `bot` (los registra y ejecuta) como la `api` (lee `manifest` +
// `configSchema` para listar, generar JSON Schema y validar los saves). La api NO arranca el
// Gateway: solo inspecciona los módulos, nunca ejecuta su ciclo de vida (ADR-016).

import type { BaristaModule } from "@barista/core";
import core from "@barista/module-core";
import echo from "@barista/module-echo";

/**
 * Orden estable: `core` primero (siempre activo, comandos globales), luego los opcionales.
 *
 * Los `cast` borran el schema concreto de cada módulo: `BaristaModule` es invariante en su
 * genérico `Schema`, así que un `BaristaModule<ZodObject<…>>` no es asignable a
 * `BaristaModule<ZodTypeAny>`. Tanto el bot (registry) como la api solo leen `manifest` +
 * `configSchema` de forma opaca, por lo que borrar el schema no pierde seguridad útil. Es el
 * mismo patrón que `ModuleRegistry.register`.
 */
export const modules: readonly BaristaModule[] = [
  core as unknown as BaristaModule,
  echo as unknown as BaristaModule,
];

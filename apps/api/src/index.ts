import { app } from "./app.ts";
import { env } from "./env.ts";

// Bun sirve el export default `{ port, fetch }`. La validación del entorno ya ocurrió al
// importar `env` (fail fast).
// biome-ignore lint/suspicious/noConsole: banner de arranque del proceso
console.log(`api escuchando en ${env.API_URL} (puerto ${env.API_PORT})`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};

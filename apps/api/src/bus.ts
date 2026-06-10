import { createPublisher } from "@barista/bus";
import { env } from "./env.ts";

/** Publisher Redis: la api avisa al bot de toggles/cambios de config para invalidar caché. */
export const publisher = createPublisher(env.REDIS_URL);

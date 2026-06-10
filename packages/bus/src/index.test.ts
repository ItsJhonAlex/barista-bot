import { describe, expect, it } from "vitest";
import { type ModuleToggled, createPublisher, createSubscriber } from "./index.ts";

// Integración: requiere un Redis real. Se salta si no hay REDIS_URL. Para ejecutarlo:
//   docker compose up -d redis
//   REDIS_URL=redis://localhost:6379 bun run test
const url = process.env.REDIS_URL;

describe.skipIf(!url)("@barista/bus (integración)", () => {
  it("entrega module.toggled del publisher al subscriber", async () => {
    const pub = createPublisher(url as string);
    const sub = createSubscriber(url as string);

    try {
      let resolve!: (payload: ModuleToggled) => void;
      const received = new Promise<ModuleToggled>((r) => {
        resolve = r;
      });

      await sub.onModuleToggled(resolve);
      await pub.publishModuleToggled({ guildId: "g1", moduleId: "echo", enabled: false });

      expect(await received).toEqual({ guildId: "g1", moduleId: "echo", enabled: false });
    } finally {
      await sub.close();
      await pub.close();
    }
  });
});

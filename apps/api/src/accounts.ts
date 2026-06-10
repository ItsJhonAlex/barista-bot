import { account } from "@barista/db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "./db.ts";

/** Token OAuth de Discord del usuario (para revalidar permisos en cada acción). null si no hay. */
export async function getDiscordToken(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ token: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "discord")))
    .limit(1);
  return row?.token ?? null;
}

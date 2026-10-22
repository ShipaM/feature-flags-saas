import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { auth } from "./config";

export type SessionUser = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "role" | "organizationId"
>;

export type Session = { user: SessionUser };
export async function getSession(headers: Headers): Promise<Session | null> {
  const authSession = await auth.api.getSession({ headers });

  const userId = Number(authSession?.user.id);

  if (!Number.isInteger(userId)) return null; // no cookie / expired / revoked session

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      organizationId: users.organizationId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ? { user } : null;
}

export const getCurrentSession = cache(async () => getSession(await headers()));

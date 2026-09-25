import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { auth } from "./config";

// Session user shape is derived from the Drizzle schema, so it stays in sync with the DB.
export type SessionUser = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "role" | "organizationId"
>;
export type Session = { user: SessionUser };
/**
 * Returns the current user or null.
 * 1) Better Auth finds the session by the cookie (row in `sessions`) -> user id
 * 2) we load OUR fields (role, organizationId) from `users`
 */
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

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
 * 1) auth() reads and verifies the Auth.js cookie (JWT) -> gives us the user id
 * 2) we load the FRESH role and organizationId from the DB,
 * so a role change works immediately, without re-login
 */
export async function getSession(): Promise<Session | null> {
  const authSession = await auth();
  console.log("authSession:", authSession);

  const userId = Number(authSession?.user?.id);
  if (!Number.isInteger(userId)) return null; // no cookie or bad cookie

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

  return user ? { user } : null; // user deleted from DB -> treat as logged out
}

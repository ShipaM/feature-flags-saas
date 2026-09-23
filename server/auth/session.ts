import "server-only";
import type { users } from "@/server/db/schema";
// Session user shape is derived from the Drizzle schema, so it stays in sync with the DB.
export type SessionUser = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "role" | "organizationId"
>;
export type Session = { user: SessionUser };
/**
 * Temporary stub: authentication is not implemented yet.
 * Replace the body with a real auth call (Auth.js / Better Auth / Clerk) later.
 * The signature stays the same, so tRPC code will not need changes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- will be used by real auth
export async function getSession(headers: Headers): Promise<Session | null> {
  return null;
}

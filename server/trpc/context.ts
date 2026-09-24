import { db } from "@/server/db"; // index.ts already has `import "server-only"`
import { getSession } from "@/server/auth/session";
/**
 * Runs on EVERY request. Everything returned here is available in procedures as `ctx`.
 * Takes `headers` so it can be reused from the route handler and from Server Components.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();
  return {
    db,
    session, // null when the user is not logged in
    headers: opts.headers,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

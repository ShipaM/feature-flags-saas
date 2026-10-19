import { db } from "@/server/db"; // index.ts already has `import "server-only"`
import { getSession, type Session } from "@/server/auth/session";

// Runs on EVERY request. Everything returned here is available in procedures as `ctx`.
// Takes `headers` so it can be reused from the route handler and from Server Components.
// Server Components pass an already resolved `session` to avoid a second DB lookup.
export const createTRPCContext = async (opts: {
  headers: Headers;
  session?: Session | null;
}) => {
  const session =
    opts.session !== undefined ? opts.session : await getSession(opts.headers);
  return {
    db,
    session, // null when the user is not logged in
    headers: opts.headers,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

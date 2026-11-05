import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db"; // index.ts already has `import "server-only"`
import { isDbUnavailable } from "@/server/db/errors";
import { getSession, type Session } from "@/server/auth/session";

// One probe at a time: during an outage 100 requests share ONE `select 1`
let probe: Promise<boolean> | null = null;

// Quick "is the database alive?" probe: select 1 with a 2 second timeout
function isDatabaseDown(): Promise<boolean> {
  if (probe) return probe;
  let timer: ReturnType<typeof setTimeout> | undefined;
  probe = Promise.race([
    db.execute(sql`select 1`).then(() => false),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), 2_000);
    }),
  ])
    .catch((error) => {
      if (!isDbUnavailable(error)) {
        // e.g. wrong password (28P01): make the real reason visible in the log
        console.error("[db-probe] failed:", (error as Error).message);
      }
      return isDbUnavailable(error);
    })
    .finally(() => {
      clearTimeout(timer);
      probe = null;
    });
  return probe;
}

// Runs on EVERY request. Everything returned here is available in procedures as `ctx`.
// Takes `headers` so it can be reused from the route handler and from Server Components.
// Server Components pass an already resolved `session` to avoid a second DB lookup.
export const createTRPCContext = async (opts: {
  headers: Headers;
  session?: Session | null;
}) => {
  let session: Session | null;
  try {
    session =
      opts.session !== undefined ? opts.session : await getSession(opts.headers);
  } catch (error) {
    // better-auth hides the original DB error behind "Failed to get session" (no `cause`),
    // so we cannot tell the reason from the error itself. Ask the database directly.
    if (isDbUnavailable(error) || (await isDatabaseDown())) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE", // -> HTTP 503
        message: "Service temporarily unavailable. Please try again in a moment.",
      });
    }
    throw error; // the database is alive: this is a real bug, do not mask it
  }
  return {
    db,
    session, // null when the user is not logged in
    headers: opts.headers,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

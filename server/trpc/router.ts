import { sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "./trpc";
import { flagRouter } from "./routers/flag";

export const appRouter = createTRPCRouter({
  // Health check: proves the whole chain works (client -> route handler -> context -> DB)
  ping: publicProcedure.query(async ({ ctx }) => {
    let db: "ok" | "error" = "ok";
    try {
      await ctx.db.execute(sql`select 1`);
    } catch {
      db = "error";
    }
    return { message: "pong" as const, at: new Date(), db };
  }),
  // Returns 401 until auth is implemented. Useful to see protectedProcedure in action.
  me: protectedProcedure.query(({ ctx }) => ctx.session.user),
  flag: flagRouter,
});
// Export ONLY the type. The client infers the whole API from it.
export type AppRouter = typeof appRouter;

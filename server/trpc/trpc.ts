import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { hasRole, type Role } from "@/server/auth/roles";
import type { Context } from "./context";

// initTRPC is called ONCE per app. Export only the helpers, not the whole `t`.
const t = initTRPC.context<Context>().create({
  transformer: superjson, // must match the transformer on the client (lib/trpc/client.tsx)
});

export const createTRPCRouter = t.router;

export const createCallerFactory = t.createCallerFactory;

/** Open to everyone, including anonymous users */
export const publicProcedure = t.procedure;

/** Requires a session. After the middleware, ctx.session.user is non-null */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" }); // -> HTTP 401
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

//Requires a session AND a role not lower than `minRole`. Usage: requireRole("admin").input(...).mutation(...)
export const requireRole = (minRole: Role) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!hasRole(ctx.session.user.role, minRole)) {
      throw new TRPCError({
        code: "FORBIDDEN", // -> HTTP 403
        message: `Requires role "${minRole}" or higher`,
      });
    }
    return next();
  });

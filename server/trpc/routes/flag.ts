import { TRPCError } from "@trpc/server";
import { eq, not } from "drizzle-orm";
import { z } from "zod";
import { flags } from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure, requireRole } from "../trpc";

export const flagRouter = createTRPCRouter({
  // Any logged-in user. Read-only users get ONLY prod flags (filtered in SQL, not in the UI)
  list: protectedProcedure.query(({ ctx }) => {
    const isReadonly = ctx.session.user.role === "readonly";
    return ctx.db
      .select()
      .from(flags)
      .where(isReadonly ? eq(flags.environment, "prod") : undefined)
      .orderBy(flags.id);
  }),

  // Kill switch: developer and higher
  toggle: requireRole("developer")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(flags)
        .set({ enabled: not(flags.enabled), updatedAt: new Date() })
        .where(eq(flags.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Delete: admin and higher. Developer gets 403 FORBIDDEN
  delete: requireRole("admin")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(flags)
        .where(eq(flags.id, input.id))
        .returning({ id: flags.id });
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return deleted;
    }),
});

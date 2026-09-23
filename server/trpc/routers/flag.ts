import { TRPCError } from "@trpc/server";
import { eq, not } from "drizzle-orm";
import { z } from "zod";
import { flags } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const flagRouter = createTRPCRouter({
  // query: read data (HTTP GET, cached on the client)
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(flags).orderBy(flags.id),
  ),
  // mutation: change data (HTTP POST, not cached)
  toggle: publicProcedure
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
});

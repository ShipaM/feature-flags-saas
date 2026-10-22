import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { organizations } from "@/server/db/schema";
import { createTRPCRouter, tenantProcedure } from "../trpc";

export const organizationRouter = createTRPCRouter({
  // The organization comes from the SESSION, there is no input to forge
  current: tenantProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.tenant.orgId))
      .limit(1);

    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    return org;
  }),
});

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { projects } from "@/server/db/schema";
import { createTRPCRouter, requireRole, tenantProcedure } from "../trpc";

export const projectRouter = createTRPCRouter({
  // List all projects belonging to the current organization
  list: tenantProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(projects)
      .where(ctx.tenant.byOrg(projects.organizationId))
      .orderBy(projects.id),
  ),

  // Get a single project from the current organization
  byId: tenantProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          ctx.tenant.byOrg(projects.organizationId, eq(projects.id, input.id)),
        )
        .limit(1);

      // Hide missing and unauthorized projects as NOT_FOUND
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      return project;
    }),

  // Create a new project (admin only)
  create: requireRole("admin")
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(projects)
        .values({
          name: input.name,
          organizationId: ctx.tenant.orgId,
        })
        .returning();

      return created;
    }),
});

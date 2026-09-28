import { TRPCError } from "@trpc/server";
import { eq, not } from "drizzle-orm";
import { z } from "zod";
import { environmentEnum, flags } from "@/server/db/schema";
import { createTRPCRouter, requireRole, tenantProcedure } from "../trpc";

// Reusable ID validation
const id = z.number().int().positive();

// Allowed environments: dev, staging, prod
const environment = z.enum(environmentEnum.enumValues);

export const flagRouter = createTRPCRouter({
  // List flags visible to the current tenant
  list: tenantProcedure
    .input(
      z
        .object({
          projectId: id.optional(),
          environment: environment.optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const isReadonly = ctx.session.user.role === "readonly";

      // Readonly users can only see production flags
      const env = isReadonly ? "prod" : input?.environment;

      return ctx.db
        .select()
        .from(flags)
        .where(
          ctx.tenant.byProject(
            flags.projectId, // Restrict results to current tenant's projects
            input?.projectId ? eq(flags.projectId, input.projectId) : undefined,
            env ? eq(flags.environment, env) : undefined, // Filter by environment
          ),
        )
        .orderBy(flags.id);
    }),

  // Create a new feature flag
  create: requireRole("developer")
    .input(
      z.object({
        projectId: id,
        key: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(255),
        environment,
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent creating flags in another tenant's project
      await ctx.tenant.assertProject(input.projectId);

      const [created] = await ctx.db.insert(flags).values(input).returning();

      return created;
    }),

  // Toggle a flag on or off
  toggle: requireRole("developer")
    .input(z.object({ id }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(flags)
        .set({
          enabled: not(flags.enabled),
          updatedAt: new Date(),
        })
        // Check both flag ID and tenant ownership atomically
        .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, input.id)))
        .returning();

      // Hide both missing and unauthorized flags as NOT_FOUND
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      return updated;
    }),

  // Delete a flag (admin only)
  delete: requireRole("admin")
    .input(z.object({ id }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(flags)
        // Delete only flags belonging to the current tenant
        .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, input.id)))
        .returning({ id: flags.id });

      // Hide both missing and unauthorized flags as NOT_FOUND
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });

      return deleted;
    }),
});

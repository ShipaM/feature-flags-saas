import { TRPCError } from "@trpc/server";
import { eq, not, sql } from "drizzle-orm";
import { invalidateFlags } from "@/server/cache/flags";
import { isUniqueViolation } from "@/server/db/errors";
import { flags } from "@/server/db/schema";
import {
  createFlagInput,
  flagIdInput,
  listFlagsInput,
  updateFlagInput,
} from "../schemas/flag";
import { createTRPCRouter, requireRole, tenantProcedure } from "../trpc";

export const flagRouter = createTRPCRouter({
  // List flags visible to the current tenant
  list: tenantProcedure.input(listFlagsInput).query(({ ctx, input }) => {
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
  create: requireRole("admin")
    .input(createFlagInput)
    .mutation(async ({ ctx, input }) => {
      // Prevent creating flags in another tenant's project
      await ctx.tenant.assertProject(input.projectId);

      try {
        const [created] = await ctx.db.insert(flags).values(input).returning();
        await invalidateFlags(created.projectId, created.environment);
        return created;
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Flag "${input.key}" already exists in this project`,
          });
        }
        throw e;
      }
    }),

  // Update a feature flag
  update: requireRole("admin")
    .input(updateFlagInput)
    .mutation(async ({ ctx, input }) => {
      const { id: flagId, ...changes } = input;
      const [updated] = await ctx.db
        .update(flags)
        // Use the DB clock so updatedAt is comparable with DEFAULT now() values
        .set({ ...changes, updatedAt: sql`now()` })

        // Check both flag ID and tenant ownership atomically
        .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, flagId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      await invalidateFlags(updated.projectId, updated.environment);
      return updated;
    }),

  // Toggle a flag on or off
  toggle: requireRole("admin")
    .input(flagIdInput)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(flags)
        .set({
          enabled: not(flags.enabled),
          updatedAt: sql`now()`,
        })
        // Check both flag ID and tenant ownership atomically
        .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, input.id)))
        .returning();

      // Hide both missing and unauthorized flags as NOT_FOUND
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      await invalidateFlags(updated.projectId, updated.environment);
      return updated;
    }),

  // Delete a flag (admin only)
  delete: requireRole("admin")
    .input(flagIdInput)
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(flags)
        // Delete only flags belonging to the current tenant
        .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, input.id)))
        .returning({
          id: flags.id,
          projectId: flags.projectId,
          environment: flags.environment,
        });

      // Hide both missing and unauthorized flags as NOT_FOUND
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });

      await invalidateFlags(deleted.projectId, deleted.environment);
      return { id: deleted.id };
    }),
});

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
import { logAudit } from "@/server/audit/log";

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
        // Flag + audit row are written in ONE transaction: both or none
        const created = await ctx.db.transaction(async (tx) => {
          const [row] = await tx.insert(flags).values(input).returning();
          await logAudit({
            ctx,
            tx,
            action: "flag.create",
            entity: "flag",
            before: null, // nothing existed before
            after: row,
          });
          return row;
        });
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
      const updated = await ctx.db.transaction(async (tx) => {
        // 1) Read the "before" snapshot and lock the row (same tenant check as before)
        const [before] = await tx
          .select()
          .from(flags)
          .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, flagId)))
          .for("update");
        if (!before) throw new TRPCError({ code: "NOT_FOUND" });

        // 2) Apply the change. Use the DB clock so updatedAt is comparable with DEFAULT now()
        const [after] = await tx
          .update(flags)
          .set({ ...changes, updatedAt: sql`now()` })
          .where(eq(flags.id, flagId))
          .returning();

        // 3) Write the audit row in the same transaction
        await logAudit({
          ctx,
          tx,
          action: "flag.update",
          entity: "flag",
          before,
          after,
        });
        return after;
      });

      await invalidateFlags(updated.projectId, updated.environment);
      return updated;
    }),

  // Toggle a flag on or off
  toggle: requireRole("admin")
    .input(flagIdInput)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.transaction(async (tx) => {
        // Hide both missing and unauthorized flags as NOT_FOUND
        const [before] = await tx
          .select()
          .from(flags)
          .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, input.id)))
          .for("update");
        if (!before) throw new TRPCError({ code: "NOT_FOUND" });
        const [after] = await tx
          .update(flags)
          .set({ enabled: not(flags.enabled), updatedAt: sql`now()` })
          .where(eq(flags.id, input.id))
          .returning();

        await logAudit({
          ctx,
          tx,
          action: "flag.toggle",
          entity: "flag",
          before,
          after,
        });
        return after;
      });
      await invalidateFlags(updated.projectId, updated.environment);
      return updated;
    }),

  // Delete a flag (admin only)
  delete: requireRole("admin")
    .input(flagIdInput)
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .delete(flags)
          // Delete only flags belonging to the current tenant
          .where(ctx.tenant.byProject(flags.projectId, eq(flags.id, input.id)))
          .returning(); // the whole deleted row = our "before" snapshot

        // Hide both missing and unauthorized flags as NOT_FOUND
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });

        await logAudit({
          ctx,
          tx,
          action: "flag.delete",
          entity: "flag",
          before: row,
          after: null, // nothing exists after
        });
        return row;
      });
      await invalidateFlags(deleted.projectId, deleted.environment);
      return { id: deleted.id };
    }),
});

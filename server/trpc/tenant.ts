import { TRPCError } from "@trpc/server";
import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { projects } from "@/server/db/schema";
import type { Context } from "./context";

type TenantInput = {
  db: Context["db"];
  session: { user: { organizationId: number } };
};

// Single source of truth for organization-level data isolation. The organization ID always comes from the authenticated session.
export function withTenantScope(ctx: TenantInput) {
  const orgId = ctx.session.user.organizationId;

  // Subquery used to restrict records to projects owned by this organization.
  const orgProjectIds = ctx.db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.organizationId, orgId));

  return {
    orgId,

    // Filter tables that have a direct organization_id column.
    byOrg: (column: AnyPgColumn, ...extra: (SQL | undefined)[]) =>
      and(eq(column, orgId), ...extra),

    // Filter tables that belong to the organization through project_id.
    byProject: (column: AnyPgColumn, ...extra: (SQL | undefined)[]) =>
      and(inArray(column, orgProjectIds), ...extra),

    // Verify that the project exists and belongs to the current organization.
    async assertProject(projectId: number) {
      const [p] = await ctx.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(eq(projects.id, projectId), eq(projects.organizationId, orgId)),
        )
        .limit(1);

      // Return 404 instead of 403 to avoid revealing another organization's projects.
      if (!p)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });

      return p;
    },
  };
}

export type TenantScope = ReturnType<typeof withTenantScope>;

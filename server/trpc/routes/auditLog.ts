import { desc, eq, and, getColumns, lte, max } from "drizzle-orm";
import { AUDIT_LOG_DEFAULT_PER_PAGE } from "@/server/constants/pagination";
import { auditLogs, users } from "@/server/db/schema";
import { listAuditLogsInput } from "../schemas/auditLog";
import { createTRPCRouter, requireRole } from "../trpc";

export const auditLogRouter = createTRPCRouter({
  // Read-only on purpose: there is no create / update / delete here
  list: requireRole("admin") // admin and owner
    .input(listAuditLogsInput)
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const perPage = input?.perPage ?? AUDIT_LOG_DEFAULT_PER_PAGE;

      const filters = ctx.tenant.byOrg(
        auditLogs.organizationId, // only the current organization
        input?.entity ? eq(auditLogs.entity, input.entity) : undefined,
        input?.action ? eq(auditLogs.action, input.action) : undefined,
      );

      // No anchor yet (first page): pin the snapshot at the newest matching row.
      // Served by the (organization_id, id) index
      const anchor =
        input?.anchor ??
        (
          await ctx.db
            .select({ id: max(auditLogs.id) })
            .from(auditLogs)
            .where(filters)
        )[0].id;

      const where = and(
        filters,
        anchor !== null ? lte(auditLogs.id, anchor) : undefined,
      );

      const [items, total] = await Promise.all([
        ctx.db
          .select({
            ...getColumns(auditLogs), // every audit column, as before
            actorName: users.name, // null if the user row is gone
            actorEmail: users.email,
          })
          .from(auditLogs)
          .leftJoin(
            users,
            and(
              eq(users.id, auditLogs.actorId),
              eq(users.organizationId, auditLogs.organizationId),
            ),
          )
          .where(where)
          .orderBy(desc(auditLogs.id)) // newest first
          .limit(perPage)
          .offset((page - 1) * perPage),
        ctx.db.$count(auditLogs, where),
      ]);

      return { items, total, page, perPage, anchor };
    }),
});

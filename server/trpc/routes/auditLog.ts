import { desc, eq, lt } from "drizzle-orm";
import { AUDIT_LOG_DEFAULT_LIMIT } from "@/server/constants/pagination";
import { auditLogs } from "@/server/db/schema";
import { listAuditLogsInput } from "../schemas/auditLog";
import { createTRPCRouter, requireRole } from "../trpc";

export const auditLogRouter = createTRPCRouter({
  // Read-only on purpose: there is no create / update / delete here
  list: requireRole("admin") // admin and owner
    .input(listAuditLogsInput)
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? AUDIT_LOG_DEFAULT_LIMIT;

      const rows = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          ctx.tenant.byOrg(
            auditLogs.organizationId, // only the current organization
            input?.entity ? eq(auditLogs.entity, input.entity) : undefined,
            input?.action ? eq(auditLogs.action, input.action) : undefined,
            input?.cursor ? lt(auditLogs.id, input.cursor) : undefined,
          ),
        )
        .orderBy(desc(auditLogs.id)) // newest first
        .limit(limit + 1); // one extra row tells us if there is a next page

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      };
    }),
});

import { auditLogs } from "@/server/db/schema";
import type { Context } from "@/server/trpc/context";
import type { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/server/constants/audit";

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

// `db` and the `tx` object inside db.transaction(...) both have .insert()
type Db = Context["db"];

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

type LogAuditParams = {
  // Only what we really need from the tRPC ctx (any tenantProcedure ctx fits)
  ctx: {
    db: Db;
    session: { user: { id: number } };
    tenant: { orgId: number };
  };
  tx?: Db | Tx; // pass `tx` so the log is written in the SAME transaction
  action: AuditAction;
  entity: AuditEntity;
  before?: unknown; // snapshot BEFORE the change (null for create)
  after?: unknown; // snapshot AFTER the change (null for delete)
};

export async function logAudit({
  ctx,
  tx = ctx.db,
  action,
  entity,
  before = null,
  after = null,
}: LogAuditParams) {
  await tx.insert(auditLogs).values({
    organizationId: ctx.tenant.orgId, // from the session, NEVER from input
    actorId: ctx.session.user.id, // who did it
    action,
    entity,
    before,
    after,
    // `timestamp` is filled by the DB (defaultNow)
  });
}

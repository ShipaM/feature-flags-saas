import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/server/constants/audit";
import { id } from "./common";

// Note: there is NO organizationId here. The organization comes from the session.
export const listAuditLogsInput = z
  .object({
    entity: z.enum(AUDIT_ENTITIES).optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    limit: z.number().int().min(1).max(100).optional(), // page size, default 50
    cursor: id.optional(), // id of the last row of the previous page
  })
  .optional();

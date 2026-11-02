import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/server/constants/audit";
import { AUDIT_LOG_MAX_PER_PAGE } from "@/server/constants/pagination";
import { id } from "./common";

// Note: there is NO organizationId here. The organization comes from the session.
export const listAuditLogsInput = z
  .object({
    entity: z.enum(AUDIT_ENTITIES).optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    page: z.number().int().min(1).optional(), // 1-based, default 1
    perPage: z.number().int().min(1).max(AUDIT_LOG_MAX_PER_PAGE).optional(), // default 10
    // Newest id when the first page was loaded: later pages read only id <= anchor,
    // so rows written meanwhile do not shift them
    anchor: id.optional(),
  })
  .optional();

"use client";

import { useSearchParams } from "next/navigation";
import { AUDIT_LOG_PER_PAGE } from "../_constants";
import { parsePerPage } from "../_utils";
import { TablePlaceholder } from "./table-skeleton";

// Route loading state: loading.tsx gets no searchParams, so read perPage on the client
export const AuditLogsPlaceholder = () => {
  const searchParams = useSearchParams();
  return (
    <TablePlaceholder
      columns={5}
      rows={parsePerPage(searchParams.get("perPage"), AUDIT_LOG_PER_PAGE)}
    />
  );
};

"use client";

import { useSearchParams } from "next/navigation";
import { FLAGS_PER_PAGE } from "../_constants";
import { parsePerPage } from "../_utils";
import { TablePlaceholder } from "./table-skeleton";

// Route loading state: loading.tsx gets no searchParams, so read perPage on the client.
// canEdit comes from the server session: editors get the extra actions column
export const FlagTablePlaceholder = ({ canEdit }: { canEdit: boolean }) => {
  const searchParams = useSearchParams();
  return (
    <TablePlaceholder
      columns={canEdit ? 6 : 5}
      rows={parsePerPage(searchParams.get("perPage"), FLAGS_PER_PAGE)}
    />
  );
};

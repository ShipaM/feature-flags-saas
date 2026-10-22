"use client";
import type { Environment } from "@/shared/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FC } from "react";
import type { Flag } from "../_types";
import { FlagRow } from "./flag-row";
import { TableSkeleton } from "./table-skeleton";

type FlagTableProps = {
  flags: Flag[] | undefined; // undefined while the list is loading
  environment: Environment;
  canEdit: boolean;
};

export const FlagTable: FC<FlagTableProps> = ({
  flags,
  environment,
  canEdit,
}) => (
  <div className="overflow-hidden rounded-lg border">
    <Table aria-busy={!flags}>
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <TableHead>Key</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead>Rollout</TableHead>
          <TableHead>Environment</TableHead>
          {canEdit && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!flags && <TableSkeleton columns={canEdit ? 6 : 5} />}
        {flags?.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={canEdit ? 6 : 5}
              className="text-center text-muted-foreground"
            >
              No flags in {environment}
            </TableCell>
          </TableRow>
        )}
        {flags?.map((flag) => (
          <FlagRow key={flag.id} flag={flag} canEdit={canEdit} />
        ))}
      </TableBody>
    </Table>
  </div>
);

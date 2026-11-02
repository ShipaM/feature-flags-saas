"use client";
import { format } from "date-fns";
import { FC } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACTION_BADGE } from "../_constants";
import type { Action, AuditLog, Json } from "../_types";
import { changedFields, show } from "../_utils";
import { TableSkeleton } from "./table-skeleton";

type AuditLogsTableProps = {
  rows: AuditLog[] | undefined; // undefined while loading
  busy?: boolean; // previous page still shown while the next one loads
  skeletonRows: number; // matches perPage so the layout does not jump when data arrives
};

export const AuditLogsTable: FC<AuditLogsTableProps> = ({
  rows,
  busy = false,
  skeletonRows,
}) => (
  <div className="overflow-hidden rounded-lg border [&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
    <Table aria-busy={!rows || busy}>
      <TableCaption className="sr-only">Audit log</TableCaption>
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Time</TableHead>
          <TableHead scope="col">Actor</TableHead>
          <TableHead scope="col">Action</TableHead>
          <TableHead scope="col">Entity</TableHead>
          <TableHead scope="col">Changes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!rows && <TableSkeleton columns={5} rows={skeletonRows} />}
        {rows?.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center text-muted-foreground"
            >
              <span role="status" aria-live="polite">
                No entries yet
              </span>
            </TableCell>
          </TableRow>
        )}
        {rows?.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <time dateTime={new Date(r.timestamp).toISOString()}>
                {format(r.timestamp, "dd.MM.yyyy HH:mm:ss")}
              </time>
            </TableCell>
            <TableCell>
              {r.actorName ? (
                <>
                  <div>{r.actorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.actorEmail}
                  </div>
                </>
              ) : (
                `user #${r.actorId}` // fallback if the user no longer exists
              )}
            </TableCell>

            <TableCell>
              <Badge className={ACTION_BADGE[r.action as Action]}>
                {r.action}
              </Badge>
            </TableCell>
            <TableCell>{r.entity}</TableCell>
            <TableCell>
              <details>
                <summary className="cursor-pointer">Changes</summary>
                <ul>
                  {changedFields(r.before as Json, r.after as Json).map((c) => (
                    <li key={c.field}>
                      <code>{c.field}</code>: {show(c.from)} → {show(c.to)}
                    </li>
                  ))}
                </ul>
              </details>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

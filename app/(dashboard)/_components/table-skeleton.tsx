import { FC } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

type TableSkeletonProps = {
  columns: number;
  rows?: number;
};

// Placeholder rows; the table itself announces loading via aria-busy
export const TableSkeleton: FC<TableSkeletonProps> = ({ columns, rows = 5 }) =>
  Array.from({ length: rows }, (_, i) => (
    <TableRow key={i} aria-hidden="true" className="hover:bg-transparent">
      {Array.from({ length: columns }, (_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));

// Whole table for route loading states, before the real table component is rendered
export const TablePlaceholder: FC<TableSkeletonProps> = (props) => (
  <div className="overflow-hidden rounded-lg border [&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
    <Table aria-busy>
      <TableBody>
        <TableSkeleton {...props} />
      </TableBody>
    </Table>
  </div>
);

"use client";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

// Pages around the current one plus the first and the last, "…" for the gaps:
// the audit log only grows, so one button per page would not scale
const SIBLINGS = 1;
const pageItems = (page: number, pageCount: number) => {
  const items: (number | "gap")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    // A gap of a single page shows that page: "…" would take the same space
    const inWindow =
      Math.abs(p - page) <= SIBLINGS + (p === 2 || p === pageCount - 1 ? 1 : 0);
    if (p === 1 || p === pageCount || inWindow) items.push(p);
    else if (items.at(-1) !== "gap") items.push("gap");
  }
  return items;
};

type TablePaginationProps = {
  page: number; // 1-based
  pageCount: number;
  onChange: (page: number) => void;
};

// Buttons instead of PaginationLink: callers keep the page in the URL via the
// History API (no RSC round-trip), so they need onChange, not an href
export const TablePagination: FC<TablePaginationProps> = ({
  page,
  pageCount,
  onChange,
}) => {
  if (pageCount <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            aria-label="Go to previous page"
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
          </Button>
        </PaginationItem>
        {pageItems(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <PaginationItem key={`gap-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <Button
                variant={p === page ? "outline" : "ghost"}
                size="icon"
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onChange(p)}
              >
                {p}
              </Button>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <Button
            variant="ghost"
            aria-label="Go to next page"
            disabled={page === pageCount}
            onClick={() => onChange(page + 1)}
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

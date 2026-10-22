"use client";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

type TablePaginationProps = {
  page: number; // 1-based
  pageCount: number;
  onChange: (page: number) => void;
};

// Buttons instead of PaginationLink: pages live in state, not in the URL
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
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
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
        ))}
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

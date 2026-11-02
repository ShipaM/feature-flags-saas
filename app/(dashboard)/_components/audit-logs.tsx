"use client";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { FC, useEffect, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/server/constants/audit";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Action, Entity } from "../_types";
import { AUDIT_LOG_PER_PAGE } from "../_constants";
import { parsePerPage } from "../_utils";
import { AuditLogsTable } from "./audit-logs-table";
import { TablePagination } from "./table-pagination";

type Filters = { entity: Entity | ""; action: Action | "" };

export const AuditLogs: FC = () => {
  const trpc = useTRPC();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL is the source of truth (?entity=flag&action=flag.create&page=2&perPage=20);
  // bad values fall back to defaults
  const entityParam = searchParams.get("entity");
  const entity: Entity | "" = AUDIT_ENTITIES.includes(entityParam as Entity)
    ? (entityParam as Entity)
    : "";
  const actionParam = searchParams.get("action");
  const action: Action | "" = AUDIT_ACTIONS.includes(actionParam as Action)
    ? (actionParam as Action)
    : "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPage = parsePerPage(searchParams.get("perPage"), AUDIT_LOG_PER_PAGE);

  const buildUrl = (filters: Filters, nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
      else params.delete(key); // "All ..." = no param
    }
    params.set("page", String(nextPage));
    params.set("perPage", String(perPage));
    return `${pathname}?${params}`;
  };

  // Newest id seen on page 1: later pages read only rows up to it, so entries
  // written while the user pages through do not shift the pages
  const [anchor, setAnchor] = useState<number | null>(null);

  const query = useQuery({
    ...trpc.auditLog.list.queryOptions({
      entity: entity || undefined,
      action: action || undefined,
      page,
      perPage,
      anchor: page > 1 && anchor !== null ? anchor : undefined,
    }),
    // Keep the old page visible only while paging: after a filter change the
    // old rows would pass for the new filter's results, so show the skeleton
    placeholderData: (prev, prevQuery) => {
      const prevInput = prevQuery?.queryKey[1]?.input as
        { entity?: Entity; action?: Action } | undefined;
      return prevInput?.entity === (entity || undefined) &&
        prevInput?.action === (action || undefined)
        ? prev
        : undefined;
    },
  });

  // Page 1 always refreshes the snapshot; a deep link (?page=3) takes the
  // server's anchor once. Adjusting state during render, no extra effect pass
  const freshAnchor = query.isPlaceholderData
    ? null
    : (query.data?.anchor ?? null);
  if (
    freshAnchor !== null &&
    freshAnchor !== anchor &&
    (page === 1 || anchor === null)
  ) {
    setAnchor(freshAnchor);
  }

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  // Fix the URL in place (replace, not push, so Back does not return to a bad URL):
  // write resolved defaults (/audit-log -> ?page=1&perPage=10) and move an
  // out-of-range page (hand-edited URL) to the last one. Depends on both URLs,
  // so every bad URL is fixed, even one in a row after another
  const outOfRange =
    !!query.data && !query.isPlaceholderData && page > pageCount;
  const targetUrl = buildUrl({ entity, action }, outOfRange ? pageCount : page);
  const currentUrl = `${pathname}?${searchParams}`;
  useEffect(() => {
    if (targetUrl !== currentUrl)
      window.history.replaceState(null, "", targetUrl);
  }, [targetUrl, currentUrl]);

  // History API instead of router: Next syncs useSearchParams without an RSC
  // round-trip, and the server page does not depend on these params
  const goTo = (filters: Filters, nextPage: number) =>
    window.history.pushState(null, "", buildUrl(filters, nextPage));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <NativeSelect
          aria-label="Filter by entity"
          value={entity}
          onChange={(e) =>
            goTo({ entity: e.target.value as Entity | "", action }, 1)
          }
        >
          <NativeSelectOption value="">All entities</NativeSelectOption>
          {AUDIT_ENTITIES.map((x) => (
            <NativeSelectOption key={x} value={x}>
              {x}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by action"
          value={action}
          onChange={(e) =>
            goTo({ entity, action: e.target.value as Action | "" }, 1)
          }
        >
          <NativeSelectOption value="">All actions</NativeSelectOption>
          {AUDIT_ACTIONS.map((x) => (
            <NativeSelectOption key={x} value={x}>
              {x}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {query.isError && (
        <p className="text-destructive">Error: {query.error.message}</p>
      )}
      {!query.isError && (
        <>
          <AuditLogsTable
            rows={query.data?.items}
            busy={query.isPlaceholderData}
            skeletonRows={perPage}
          />
          <TablePagination
            page={page}
            pageCount={pageCount}
            onChange={(p) => goTo({ entity, action }, p)}
          />
        </>
      )}
    </div>
  );
};

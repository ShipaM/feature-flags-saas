"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FC, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/server/constants/audit";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Action, Entity } from "../_types";
import { AuditLogsTable } from "./audit-logs-table";

export const AuditLogs: FC = () => {
  const trpc = useTRPC();
  const [entity, setEntity] = useState<Entity | "">("");
  const [action, setAction] = useState<Action | "">("");

  const query = useInfiniteQuery(
    trpc.auditLog.list.infiniteQueryOptions(
      { entity: entity || undefined, action: action || undefined, limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }, // null = no more pages
    ),
  );

  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <NativeSelect
          aria-label="Filter by entity"
          value={entity}
          onChange={(e) => setEntity(e.target.value as Entity | "")}
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
          onChange={(e) => setAction(e.target.value as Action | "")}
        >
          <NativeSelectOption value="">All actions</NativeSelectOption>
          {AUDIT_ACTIONS.map((x) => (
            <NativeSelectOption key={x} value={x}>
              {x}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <AuditLogsTable
        rows={rows}
        loading={query.isPending}
        loadingMore={query.isFetchingNextPage}
      />

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </div>
  );
};

"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc/client";

export const FlagList = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const me = useQuery(trpc.me.queryOptions());
  const flagsQuery = useQuery(trpc.flag.list.queryOptions());
  // Mark the list as stale -> TanStack Query refetches it
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.flag.list.queryKey() });

  const toggle = useMutation(
    trpc.flag.toggle.mutationOptions({ onSuccess: refresh }),
  );

  const remove = useMutation(
    trpc.flag.delete.mutationOptions({ onSuccess: refresh }),
  );

  if (flagsQuery.isPending) return <p>Loading flags…</p>;
  if (flagsQuery.isError) return <p>Error: {flagsQuery.error.message}</p>;

  // UI hides buttons only for convenience. The real check is on the server (requireRole)
  const role = me.data?.role;
  const canToggle = role !== undefined && role !== "readonly";
  const canDelete = role === "admin" || role === "owner";
  const error = toggle.error ?? remove.error;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {flagsQuery.data.map((flag) => (
          <li key={flag.id} className="flex items-center gap-3">
            <code>{flag.key}</code>
            <span>{flag.environment}</span>
            <span>{flag.enabled ? "ON" : "OFF"}</span>
            <span className="text-muted-foreground">
              updated {flag.updatedAt.toLocaleTimeString()}
            </span>
            {canToggle && (
              <Button
                size="sm"
                variant="outline"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: flag.id })}
              >
                Toggle
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ id: flag.id })}
              >
                Delete
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-destructive">Error: {error.message}</p>}
    </div>
  );
};

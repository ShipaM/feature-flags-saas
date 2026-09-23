"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc/client";

export const FlagList = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const flagsQuery = useQuery(trpc.flag.list.queryOptions());
  const toggle = useMutation(
    trpc.flag.toggle.mutationOptions({
      onSuccess: () => {
        // Mark the list as stale -> TanStack Query refetches it
        queryClient.invalidateQueries({ queryKey: trpc.flag.list.queryKey() });
      },
    }),
  );
  if (flagsQuery.isPending) return <p>Loading flags…</p>;
  if (flagsQuery.isError) return <p>Error: {flagsQuery.error.message}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {flagsQuery.data.map((flag) => (
        <li key={flag.id} className="flex items-center gap-3">
          <code>{flag.key}</code>
          <span>{flag.environment}</span>
          <span>{flag.enabled ? "ON" : "OFF"}</span>
          <span className="text-muted-foreground">
            updated {flag.updatedAt.toLocaleTimeString()}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ id: flag.id })}
          >
            Toggle
          </Button>
        </li>
      ))}
    </ul>
  );
};

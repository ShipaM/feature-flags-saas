"use client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useTRPC } from "@/lib/trpc/client";

export const PingCheck = () => {
  const trpc = useTRPC();
  const ping = useQuery(trpc.ping.queryOptions());
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>tRPC health check</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ping.isPending && <Spinner />}
        {ping.isError && (
          <p className="text-destructive">Error: {ping.error.message}</p>
        )}
        {ping.isSuccess && (
          <>
            <p>
              Server: <b>{ping.data.message}</b>{" "}
              <Badge
                variant={ping.data.db === "ok" ? "default" : "destructive"}
              >
                DB: {ping.data.db}
              </Badge>
            </p>
            {/* `at` is a real Date thanks to superjson */}
            <p className="text-muted-foreground">
              at {ping.data.at.toLocaleTimeString()}
            </p>
          </>
        )}
        <Button onClick={() => ping.refetch()} disabled={ping.isFetching}>
          {ping.isFetching ? "Pinging…" : "Ping again"}
        </Button>
      </CardContent>
    </Card>
  );
};

"use client";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { useState } from "react";
import type { Environment } from "@/shared/types";
import { ENVIRONMENTS } from "@/shared/constants";
import { usePermissions } from "@/shared/hooks";
import { EnvTabs } from "./env-tabs";
import { FlagTable } from "./flag-table";

export const FlagList = ({ projectId }: { projectId: number }) => {
  const trpc = useTRPC();
  const [selectedEnv, setSelectedEnv] = useState<Environment>("dev");
  const permissions = usePermissions();
  const { canEdit, isReadonly } = permissions;

  // The server returns only prod for readonly - mirror that in the UI
  const environment: Environment = isReadonly ? "prod" : selectedEnv;
  const visibleEnvs: readonly Environment[] = isReadonly
    ? ["prod"]
    : ENVIRONMENTS;
  // Wait for the role: otherwise a readonly user would first request "dev"
  const flagsQuery = useQuery({
    ...trpc.flag.list.queryOptions({ projectId, environment }),
    enabled: permissions.isReady,
  });

  if (permissions.error) {
    return (
      <p className="text-destructive">Error: {permissions.error.message}</p>
    );
  }
  if (!permissions.isReady) return <p>Loading flags…</p>;

  return (
    <div className="flex w-full flex-col gap-4">
      <EnvTabs
        value={environment}
        envs={visibleEnvs}
        onChange={setSelectedEnv}
      />
      {flagsQuery.isPending && <p>Loading flags…</p>}
      {flagsQuery.isError && (
        <p className="text-destructive">Error: {flagsQuery.error.message}</p>
      )}
      {flagsQuery.isSuccess && (
        <FlagTable
          flags={flagsQuery.data}
          environment={environment}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};

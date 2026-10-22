"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { useState } from "react";
import type { Environment } from "@/shared/types";
import { ENVIRONMENTS } from "@/shared/constants";
import { usePermissions } from "@/shared/hooks";
import { EnvTabs } from "./env-tabs";
import { FlagTable } from "./flag-table";
import { FlagDialog } from "./flag-dialog";
import { Button } from "@/components/ui/button";

export const FlagList = ({ projectId }: { projectId: number }) => {
  const trpc = useTRPC();
  const [selectedEnv, setSelectedEnv] = useState<Environment>("dev");
  const permissions = usePermissions();
  const { canEdit, isReadonly } = permissions;

  const environment: Environment = isReadonly ? "prod" : selectedEnv;
  const visibleEnvs: readonly Environment[] = isReadonly
    ? ["prod"]
    : ENVIRONMENTS;

  const flagsQuery = useQuery({
    ...trpc.flag.list.queryOptions({ projectId, environment }),
    enabled: permissions.isReady,
  });

  if (permissions.error) {
    return (
      <p className="text-destructive">Error: {permissions.error.message}</p>
    );
  }

  if (!permissions.isReady) {
    return (
      <FlagTable flags={undefined} environment={environment} canEdit={false} />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EnvTabs
        value={environment}
        envs={visibleEnvs}
        onChange={setSelectedEnv}
      />
      {flagsQuery.isError && (
        <p className="text-destructive">Error: {flagsQuery.error.message}</p>
      )}
      {canEdit && (
        <div className="flex justify-end">
          <FlagDialog
            projectId={projectId}
            environment={environment}
            trigger={<Button size="sm">New flag</Button>}
          />
        </div>
      )}
      {!flagsQuery.isError && (
        <FlagTable
          flags={flagsQuery.data}
          environment={environment}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};

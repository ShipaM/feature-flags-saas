"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { Environment } from "@/shared/types";
import { ENVIRONMENTS } from "@/shared/constants";
import { usePermissions } from "@/shared/hooks";
import { EnvTabs } from "./env-tabs";
import { FlagTable } from "./flag-table";
import { FlagDialog } from "./flag-dialog";
import { TablePagination } from "./table-pagination";
import { Button } from "@/components/ui/button";
import { FLAGS_MAX_PAGE_SIZE, FLAGS_PAGE_SIZE } from "../_constants";
import { Role } from "@/server/auth/roles";

export const FlagList = ({
  projectId,
  initialRole,
}: {
  projectId: number;
  initialRole?: Role;
}) => {
  const trpc = useTRPC();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL is the source of truth (?env=staging&page=2&perPage=20); bad values fall back to defaults
  const envParam = searchParams.get("env");
  const selectedEnv: Environment = ENVIRONMENTS.includes(
    envParam as Environment,
  )
    ? (envParam as Environment)
    : "dev";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPageParam = Number(searchParams.get("perPage"));
  const perPage =
    Number.isInteger(perPageParam) && perPageParam > 0
      ? Math.min(perPageParam, FLAGS_MAX_PAGE_SIZE) // server rejects > max
      : FLAGS_PAGE_SIZE;

  const buildUrl = (env: Environment, nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("env", env);
    params.set("page", String(nextPage));
    params.set("perPage", String(perPage));
    return `${pathname}?${params}`;
  };

  const permissions = usePermissions(initialRole);

  const { canEdit, isReadonly } = permissions;

  const environment: Environment = isReadonly ? "prod" : selectedEnv;
  const visibleEnvs: readonly Environment[] = isReadonly
    ? ["prod"]
    : ENVIRONMENTS;

  const flagsQuery = useQuery({
    ...trpc.flag.list.queryOptions({
      projectId,
      environment,
      page,
      perPage,
    }),
    enabled: permissions.isReady,
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
  });

  // Write resolved defaults into the URL (/projects/1 -> ?env=dev&page=1&perPage=10);
  // waits for permissions since readonly users are forced to prod
  const needsNormalize =
    permissions.isReady &&
    (envParam !== environment ||
      searchParams.get("page") !== String(page) ||
      searchParams.get("perPage") !== String(perPage));
  useEffect(() => {
    if (needsNormalize)
      window.history.replaceState(null, "", buildUrl(environment, page));
  }, [needsNormalize]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = flagsQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  // Page out of range (last page emptied by a delete, or a hand-edited URL):
  // replace, not push, so Back does not return to the empty page
  const outOfRange =
    !!flagsQuery.data && !flagsQuery.isPlaceholderData && page > pageCount;
  useEffect(() => {
    if (outOfRange)
      window.history.replaceState(null, "", buildUrl(environment, pageCount));
  }, [outOfRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // History API instead of router: Next syncs useSearchParams without an RSC
  // round-trip, and the server page does not depend on these params
  const goTo = (env: Environment, nextPage: number) =>
    window.history.pushState(null, "", buildUrl(env, nextPage));

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
        onChange={(env) => goTo(env, 1)}
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
        <>
          <FlagTable
            flags={flagsQuery.data?.items}
            environment={environment}
            canEdit={canEdit}
          />
          <TablePagination
            page={page}
            pageCount={pageCount}
            onChange={(p) => goTo(environment, p)}
          />
        </>
      )}
    </div>
  );
};

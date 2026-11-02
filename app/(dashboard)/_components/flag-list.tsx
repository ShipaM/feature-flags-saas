"use client";

import { useQuery } from "@tanstack/react-query";
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
import { FLAGS_PER_PAGE } from "../_constants";
import { parsePerPage } from "../_utils";
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
  const perPage = parsePerPage(searchParams.get("perPage"), FLAGS_PER_PAGE);

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
    // Keep the old page visible only while paging: another environment's flags
    // would pass for this one's, so an env switch shows the skeleton
    placeholderData: (prev, prevQuery) => {
      const prevInput = prevQuery?.queryKey[1]?.input as
        { projectId?: number; environment?: Environment } | undefined;
      return prevInput?.projectId === projectId &&
        prevInput?.environment === environment
        ? prev
        : undefined;
    },
  });

  const total = flagsQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  // Fix the URL in place (replace, not push, so Back does not return to a bad URL):
  // write resolved defaults (/projects/1 -> ?env=dev&page=1&perPage=10) and move
  // an out-of-range page (last page emptied by a delete, or a hand-edited URL)
  // to the last one. Waits for permissions since readonly users are forced to prod.
  // Depends on both URLs, so every bad URL is fixed, even one in a row after another
  const outOfRange =
    !!flagsQuery.data && !flagsQuery.isPlaceholderData && page > pageCount;
  const targetUrl = permissions.isReady
    ? buildUrl(environment, outOfRange ? pageCount : page)
    : null;
  const currentUrl = `${pathname}?${searchParams}`;
  useEffect(() => {
    if (targetUrl && targetUrl !== currentUrl)
      window.history.replaceState(null, "", targetUrl);
  }, [targetUrl, currentUrl]);

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
      <FlagTable
        flags={undefined}
        environment={environment}
        canEdit={false}
        skeletonRows={perPage}
      />
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
            skeletonRows={perPage}
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

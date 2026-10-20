import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import { Role } from "@/server/auth/roles";
import { Environment } from "@/shared/types";

export type LinkType = {
  href: string;
  label: string;
  minRole: Role;
};

export type EditableFlag = {
  id: number;
  key: string;
  description: string | null;
  enabled: boolean;
  rollout: number;
  environment: Environment;
};

export type Flag = inferRouterOutputs<AppRouter>["flag"]["list"][number];

export type ApiKey =
  inferRouterOutputs<AppRouter>["apiKeys"]["list"][number];

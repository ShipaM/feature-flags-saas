import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";
import type { Environment } from "../types";
import type { Role } from "@/server/auth/roles";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

// `satisfies Record` fails the build if an environment is added to the DB enum but not here
const ENV_BADGE = {
  dev: "outline",
  staging: "secondary",
  prod: "destructive",
} as const satisfies Record<Environment, BadgeVariant>;

// Derived from ENV_BADGE so the list is complete by construction (key order is kept)
const ENVIRONMENTS = Object.keys(ENV_BADGE) as readonly Environment[];

// `satisfies Record<Role, ...>` fails the build if a role is added to the DB enum but not here
const ROLE_LABEL = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  readonly: "Read-only",
} as const satisfies Record<Role, string>;

const ROLES = Object.keys(ROLE_LABEL) as readonly Role[];

export { ENVIRONMENTS, ENV_BADGE, ROLE_LABEL, ROLES };

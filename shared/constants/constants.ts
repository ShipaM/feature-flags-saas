import type { Environment } from "../types";
import type { Role } from "@/server/auth/roles";

// `satisfies Record` fails the build if an environment is added to the DB enum but not here
const ENV_BADGE = {
  dev: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
  staging:
    "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  prod: "bg-destructive/10 text-destructive dark:bg-destructive/20",
} as const satisfies Record<Environment, string>;

const KEY_STATUS_BADGE = {
  active:
    "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  revoked: "bg-muted text-muted-foreground",
} as const;

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

export { ENVIRONMENTS, ENV_BADGE, KEY_STATUS_BADGE, ROLE_LABEL, ROLES };

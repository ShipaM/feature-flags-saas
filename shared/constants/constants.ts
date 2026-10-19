import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";
import type { Environment } from "../types";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

// `satisfies Record` fails the build if an environment is added to the DB enum but not here
const ENV_BADGE = {
  dev: "outline",
  staging: "secondary",
  prod: "destructive",
} as const satisfies Record<Environment, BadgeVariant>;

// Derived from ENV_BADGE so the list is complete by construction (key order is kept)
const ENVIRONMENTS = Object.keys(ENV_BADGE) as readonly Environment[];

export { ENVIRONMENTS, ENV_BADGE };

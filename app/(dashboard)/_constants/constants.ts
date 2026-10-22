import { Action, LinkType } from "../_types";

export const LINKS = [
  { href: "/projects", label: "Projects", minRole: "readonly" },
  { href: "/organizations", label: "Organizations", minRole: "readonly" },
  { href: "/audit-log", label: "Audit log", minRole: "admin" },
  { href: "/settings", label: "Settings", minRole: "admin" },
] as const satisfies readonly LinkType[];

export const ACTION_BADGE = {
  "flag.create":
    "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  "flag.update":
    "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
  "flag.toggle":
    "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  "flag.delete": "bg-destructive/10 text-destructive dark:bg-destructive/20",
  "member.role_update":
    "bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
} as const satisfies Record<Action, string>;

// Flags shown per page in the project flag table
export const FLAGS_PAGE_SIZE = 10;
// Upper bound for ?perPage, matches the max in the flag.list input schema
export const FLAGS_MAX_PAGE_SIZE = 100;

import { userRoleEnum } from "@/server/db/schema";

// "owner" | "admin" | "developer" | "readonly" — taken from the DB enum, so it never drifts
export type Role = (typeof userRoleEnum.enumValues)[number];

// Bigger number = more rights. Owner > Admin > Developer > Read-only
const ROLE_RANK: Record<Role, number> = {
  readonly: 0,
  developer: 1,
  admin: 2,
  owner: 3,
};

/** true if `userRole` is the same as `minRole` or stronger */
export function hasRole(userRole: Role, minRole: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

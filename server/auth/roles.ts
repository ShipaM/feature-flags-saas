import { ROLE_RANK } from "@/server/constants/roles";
import { userRoleEnum } from "@/server/db/schema";

// "owner" | "admin" | "developer" | "readonly" — taken from the DB enum, so it never drifts
export type Role = (typeof userRoleEnum.enumValues)[number];

/** true if `userRole` is the same as `minRole` or stronger */
export function hasRole(userRole: Role, minRole: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

import type { Role } from "@/server/auth/roles";

// Bigger number = more rights. Owner > Admin > Developer > Read-only
export const ROLE_RANK: Record<Role, number> = {
  readonly: 0,
  developer: 1,
  admin: 2,
  owner: 3,
};

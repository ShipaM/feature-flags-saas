// Allowed values live in ONE place, so a typo like "flag.togle" will not compile
export const AUDIT_ACTIONS = [
  "flag.create",
  "flag.update",
  "flag.toggle",
  "flag.delete",
  "member.role_update", // new
] as const;

export const AUDIT_ENTITIES = ["flag", "member"] as const; // "member" is new

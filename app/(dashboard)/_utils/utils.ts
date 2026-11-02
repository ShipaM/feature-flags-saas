import { Json } from "../_types";

// Which fields differ? create: before=null -> everything is new; delete: after=null
export const changedFields = (before: Json, after: Json) => {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  return [...keys]
    .filter((k) => k !== "updatedAt") // noise: changes on every update
    .filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]))
    .map((k) => ({ field: k, from: before?.[k], to: after?.[k] }));
};

export const show = (v: unknown) => (v === undefined ? "—" : JSON.stringify(v));

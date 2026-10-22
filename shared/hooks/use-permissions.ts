"use client";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

type Role = "owner" | "admin" | "developer" | "readonly";

// UI-side mirror of the server role checks; the server still enforces them.
// initialRole comes from the server page: then the `me` request is not needed at all.
export const usePermissions = (initialRole?: Role) => {
  const trpc = useTRPC();

  const me = useQuery({
    ...trpc.me.queryOptions(),
    enabled: initialRole === undefined,
  });

  const role = initialRole ?? me.data?.role;

  return {
    role,
    canEdit: role === "admin" || role === "owner",
    isReadonly: role === "readonly",
    // Callers should wait for this before rendering role-dependent UI
    isReady: role !== undefined,
    error: me.error,
  };
};

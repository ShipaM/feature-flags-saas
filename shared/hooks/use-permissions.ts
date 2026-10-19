"use client";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

// UI-side mirror of the server role checks; the server still enforces them
export const usePermissions = () => {
  const trpc = useTRPC();
  const me = useQuery(trpc.me.queryOptions());
  const role = me.data?.role;

  return {
    role,
    canEdit: role === "admin" || role === "owner",
    isReadonly: role === "readonly",
    // Callers should wait for this before rendering role-dependent UI
    isReady: me.isSuccess,
    error: me.error,
  };
};

import "server-only"; // Prevents this module from being imported into client-side code.

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "@/server/trpc/context";
import { getCurrentSession } from "@/server/auth/session";
import { appRouter } from "@/server/trpc/router";
import { makeQueryClient } from "./query-client";

// Reuses the same QueryClient within one server request.
export const getQueryClient = cache(makeQueryClient);

// Creates one context per request and reuses the cached result.
const createContext = cache(async () =>
  createTRPCContext({
    headers: await headers(), // Passes the current request headers to the context.
    session: await getCurrentSession(), // Passes the current user's session to the context.
  }),
);

// Creates a typed proxy for using tRPC procedures with TanStack Query.
export const trpc = createTRPCOptionsProxy({
  ctx: createContext, // Provides the context for server-side procedure calls.
  router: appRouter, // Defines the available tRPC procedures.
  queryClient: getQueryClient, // Provides the QueryClient for query operations.
});

// Creates a caller for direct server-side procedure calls.
// Calls procedures directly without automatically updating the TanStack Query cache.
export const caller = appRouter.createCaller(createContext);

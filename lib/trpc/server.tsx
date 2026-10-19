import "server-only";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "@/server/trpc/context";
import { getCurrentSession } from "@/server/auth/session";
import { appRouter } from "@/server/trpc/router";
import { makeQueryClient } from "./query-client";

// The same QueryClient within one request
export const getQueryClient = cache(makeQueryClient);

// One context per request, reusing the cached session (headers() is async in Next.js 15+)
const createContext = cache(async () =>
  createTRPCContext({
    headers: await headers(),
    session: await getCurrentSession(),
  }),
);

export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: getQueryClient,
});

// Direct server-side call (data does NOT go into the client cache)
export const caller = appRouter.createCaller(createContext);

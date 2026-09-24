import "server-only";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";
import { makeQueryClient } from "./query-client";

// The same QueryClient within one request
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: async () => createTRPCContext({ headers: await headers() }), // headers() is async in Next.js 15+
  router: appRouter,
  queryClient: getQueryClient,
});

// Direct server-side call (data does NOT go into the client cache)
export const caller = appRouter.createCaller(async () =>
  createTRPCContext({ headers: await headers() }),
);

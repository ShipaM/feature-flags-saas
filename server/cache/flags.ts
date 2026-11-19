import type { environmentEnum } from "@/server/db/schema";
import {
  FLAGS_CACHE_TTL_SECONDS,
  STALE_TTL_SECONDS,
} from "@/server/constants/cache";
import { redis } from "./redis";

type Environment = (typeof environmentEnum.enumValues)[number]; // "dev" | "staging" | "prod"

// Spec: flags:{project_id}:{environment} -> e.g. "flags:1:prod"
export const flagsCacheKey = (projectId: number, environment: Environment) =>
  `flags:${projectId}:${environment}`;

export const staleFlagsCacheKey = (
  projectId: number,
  environment: Environment,
) => `flags-stale:${projectId}:${environment}`;

// Returns the cached JSON string, or null on a miss
export async function getCachedFlags(
  projectId: number,
  environment: Environment,
) {
  try {
    return await redis.get(flagsCacheKey(projectId, environment)); // "await" is REQUIRED here
  } catch (error) {
    console.error(
      "[cache] get failed, falling back to DB:",
      (error as Error).message,
    );

    return null; // for the caller a failure looks exactly like a miss
  }
}

export async function getStaleFlags(
  projectId: number,
  environment: Environment,
) {
  try {
    return await redis.get(staleFlagsCacheKey(projectId, environment));
  } catch {
    return null; // Redis is down too: nothing to serve
  }
}

export async function setCachedFlags(
  projectId: number,
  environment: Environment,
  body: string,
) {
  try {
    const key = flagsCacheKey(projectId, environment);
    await Promise.all([
      redis.set(key, body, "EX", FLAGS_CACHE_TTL_SECONDS),
      redis.set(
        staleFlagsCacheKey(projectId, environment),
        body,
        "EX",
        STALE_TTL_SECONDS,
      ),
    ]);
  } catch (error) {
    console.error("[cache] set failed (ignored):", error); // the response is still fine
  }
}

export async function invalidateFlags(
  projectId: number,
  environment: Environment,
) {
  try {
    await redis.del(
      flagsCacheKey(projectId, environment),
      staleFlagsCacheKey(projectId, environment),
    );
  } catch (error) {
    // The DB change already succeeded; stale data lives at most FLAGS_CACHE_TTL_SECONDS
    console.error("[cache] invalidate failed (ignored):", error);
  }
}

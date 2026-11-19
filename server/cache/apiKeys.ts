import type { ApiKeyAuth } from "@/server/auth/apiKey";
import { STALE_TTL_SECONDS } from "@/server/constants/cache";
import { redis } from "./redis";

// Short on purpose: revoke/rotate delete the entry, this is the safety net
const API_KEY_TTL_SECONDS = 30;

// The cache key is built from the HASH, never from the plaintext key
const cacheKey = (hash: string) => `apikey:${hash}`;
const staleKey = (hash: string) => `apikey-stale:${hash}`;

export async function getCachedApiKey(
  hash: string,
): Promise<ApiKeyAuth | null> {
  try {
    const raw = await redis.get(cacheKey(hash));
    return raw ? (JSON.parse(raw) as ApiKeyAuth) : null; // null = miss
  } catch (error) {
    console.error(
      "[cache] api key get failed, falling back to DB:",
      (error as Error).message,
    );
    return null; // a failure looks exactly like a miss
  }
}

export async function getStaleApiKey(hash: string): Promise<ApiKeyAuth | null> {
  try {
    const raw = await redis.get(staleKey(hash));
    return raw ? (JSON.parse(raw) as ApiKeyAuth) : null;
  } catch {
    return null;
  }
}

export async function setCachedApiKey(hash: string, auth: ApiKeyAuth) {
  try {
    const value = JSON.stringify(auth);

    await Promise.all([
      redis.set(cacheKey(hash), value, "EX", API_KEY_TTL_SECONDS),
      redis.set(staleKey(hash), value, "EX", STALE_TTL_SECONDS),
    ]);
  } catch (error) {
    console.error("[cache] api key set failed (ignored):", error);
  }
}

export async function invalidateApiKey(hash: string) {
  try {
    await redis.del(cacheKey(hash), staleKey(hash));
  } catch (error) {
    console.error("[cache] api key invalidate failed (ignored):", error);
  }
}

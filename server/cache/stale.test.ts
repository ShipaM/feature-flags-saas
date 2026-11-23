import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  getStaleApiKey,
  invalidateApiKey,
  setCachedApiKey,
} from "@/server/cache/apiKeys";
import {
  flagsCacheKey,
  getStaleFlags,
  invalidateFlags,
  setCachedFlags,
  staleFlagsCacheKey,
} from "@/server/cache/flags";
import { redis } from "@/server/cache/redis";
import {
  FLAGS_CACHE_TTL_SECONDS,
  STALE_TTL_SECONDS,
} from "@/server/constants/cache";

beforeAll(async () => {
  // enableOfflineQueue is false: wait until the connection is ready
  while (redis.status !== "ready") await new Promise((r) => setTimeout(r, 20));
});

beforeEach(async () => {
  await redis.flushdb(); // tests use a separate Redis DB
});

afterAll(async () => {
  await redis.quit();
});

describe("flags stale copy", () => {
  it("setCachedFlags writes both copies with their own TTLs", async () => {
    await setCachedFlags(1, "prod", '{"flags":{}}');

    expect(await redis.get(flagsCacheKey(1, "prod"))).toBe('{"flags":{}}');
    expect(await getStaleFlags(1, "prod")).toBe('{"flags":{}}');

    const ttl = await redis.ttl(flagsCacheKey(1, "prod"));
    const staleTtl = await redis.ttl(staleFlagsCacheKey(1, "prod"));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(FLAGS_CACHE_TTL_SECONDS);
    expect(staleTtl).toBeGreaterThan(FLAGS_CACHE_TTL_SECONDS);
    expect(staleTtl).toBeLessThanOrEqual(STALE_TTL_SECONDS);
  });

  it("invalidateFlags removes both copies", async () => {
    await setCachedFlags(1, "prod", '{"flags":{}}');
    await invalidateFlags(1, "prod");

    expect(await redis.get(flagsCacheKey(1, "prod"))).toBeNull();
    expect(await getStaleFlags(1, "prod")).toBeNull();
  });

  it("is scoped by project and environment", async () => {
    await setCachedFlags(1, "prod", '{"flags":{}}');
    expect(await getStaleFlags(1, "dev")).toBeNull();
    expect(await getStaleFlags(2, "prod")).toBeNull();
  });
});

describe("API key stale copy", () => {
  const auth = { keyId: 7, projectId: 1, environment: "prod" as const };

  it("setCachedApiKey writes a stale copy keyed by the hash", async () => {
    await setCachedApiKey("abc", auth);

    expect(await getStaleApiKey("abc")).toEqual(auth);
    expect(await redis.ttl("apikey-stale:abc")).toBeGreaterThan(30);
  });

  it("invalidateApiKey removes the stale copy too (revoked key stays revoked)", async () => {
    await setCachedApiKey("abc", auth);
    await invalidateApiKey("abc");

    expect(await redis.get("apikey:abc")).toBeNull();
    expect(await getStaleApiKey("abc")).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateApiKey } from "@/lib/apiKey";

// Every DB query fails the way postgres-js does when Postgres is down
const dbDown = () => {
  throw Object.assign(new Error("connect failed"), {
    cause: { code: "ECONNREFUSED" },
  });
};

const select = vi.fn(dbDown);

vi.mock("@/server/db", () => ({ db: { select: () => select() } }));

const getCachedApiKey = vi.fn();

const getStaleApiKey = vi.fn();

vi.mock("@/server/cache/apiKeys", () => ({
  getCachedApiKey: (...a: unknown[]) => getCachedApiKey(...a),
  getStaleApiKey: (...a: unknown[]) => getStaleApiKey(...a),
  setCachedApiKey: vi.fn(),
}));

const getStaleFlags = vi.fn();

vi.mock("@/server/cache/flags", () => ({
  getCachedFlags: vi.fn().mockResolvedValue(null), // cache miss -> goes to the DB
  getStaleFlags: (...a: unknown[]) => getStaleFlags(...a),
  setCachedFlags: vi.fn(),
}));

vi.mock("@/server/cache/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

const logSecurityEvent = vi.fn();

vi.mock("@/server/security/log", () => ({
  logSecurityEvent: (...a: unknown[]) => logSecurityEvent(...a),
}));

import { GET } from "./route"; // import AFTER vi.mock

const { plaintext } = generateApiKey("prod");
const call = (headers: Record<string, string> = {}) =>
  GET(
    new Request("http://x/api/v1/flags", {
      headers: { authorization: `Bearer ${plaintext}`, ...headers },
    }),
  );

const AUTH = { keyId: 1, projectId: 1, environment: "prod" };
const STALE_BODY = JSON.stringify({
  flags: { "new-checkout": { enabled: true, rollout: 30 } },
});

async function expect503(res: Response) {
  expect(res.status).toBe(503);
  expect(res.headers.get("retry-after")).toBe("5");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(await res.json()).toEqual({ error: "service_unavailable" });
}

async function expectStale200(res: Response) {
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store"); // never cached by the client
  expect(res.headers.get("x-cache")).toBe("stale");
  expect(await res.text()).toBe(STALE_BODY);
}

describe("GET /api/v1/flags when the DB is down", () => {
  beforeEach(() => {
    select.mockReset().mockImplementation(dbDown);
    getCachedApiKey.mockReset();
    getStaleApiKey.mockReset().mockResolvedValue(null); // no stale copy by default
    getStaleFlags.mockReset().mockResolvedValue(null);
    logSecurityEvent.mockReset();
  });

  it("API key lookup fails, no stale key -> 503", async () => {
    getCachedApiKey.mockResolvedValue(null); // key not cached -> DB lookup

    await expect503(await call());
  });

  it("key is cached but the flags query fails, no stale flags -> 503", async () => {
    getCachedApiKey.mockResolvedValue(AUTH);

    await expect503(await call());
  });

  it("flags query fails, stale flags exist -> 200 from the stale copy", async () => {
    getCachedApiKey.mockResolvedValue(AUTH);
    getStaleFlags.mockResolvedValue(STALE_BODY);

    await expectStale200(await call());

    expect(getStaleFlags).toHaveBeenCalledWith(1, "prod");
    expect(logSecurityEvent).toHaveBeenCalledWith("served_stale", {
      what: "flags",
    });
  });

  it("key lookup fails, stale key + stale flags exist -> 200", async () => {
    getCachedApiKey.mockResolvedValue(null);
    getStaleApiKey.mockResolvedValue(AUTH);
    getStaleFlags.mockResolvedValue(STALE_BODY);

    await expectStale200(await call());

    expect(logSecurityEvent).toHaveBeenCalledWith("served_stale", {
      what: "api_key",
    });
  });

  it("stale key exists but no stale flags -> 503", async () => {
    getCachedApiKey.mockResolvedValue(null);
    getStaleApiKey.mockResolvedValue(AUTH);

    await expect503(await call());
  });

  it("stale response still honors If-None-Match -> 304", async () => {
    getCachedApiKey.mockResolvedValue(AUTH);
    getStaleFlags.mockResolvedValue(STALE_BODY);

    const first = await call();
    const etag = first.headers.get("etag")!;
    const res = await call({ "if-none-match": etag });

    expect(res.status).toBe(304);
    expect(res.headers.get("x-cache")).toBe("stale");
  });

  it("a non-connection DB error does NOT use the stale copy -> 500", async () => {
    getCachedApiKey.mockResolvedValue(AUTH);
    getStaleFlags.mockResolvedValue(STALE_BODY);
    select.mockImplementation(() => {
      throw new Error("syntax error"); // a real bug, not an outage
    });

    const res = await call();
    
    expect(res.status).toBe(500);
    expect(getStaleFlags).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateApiKey } from "@/lib/apiKey";

// Every DB query fails the way postgres-js does when Postgres is down
const dbDown = () => {
  throw Object.assign(new Error("connect failed"), {
    cause: { code: "ECONNREFUSED" },
  });
};
vi.mock("@/server/db", () => ({ db: { select: () => dbDown() } }));

const getCachedApiKey = vi.fn();
vi.mock("@/server/cache/apiKeys", () => ({
  getCachedApiKey: (...a: unknown[]) => getCachedApiKey(...a),
  setCachedApiKey: vi.fn(),
}));
vi.mock("@/server/cache/flags", () => ({
  getCachedFlags: vi.fn().mockResolvedValue(null), // cache miss -> goes to the DB
  setCachedFlags: vi.fn(),
}));
vi.mock("@/server/cache/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/server/security/log", () => ({ logSecurityEvent: vi.fn() }));

import { GET } from "./route"; // import AFTER vi.mock

const { plaintext } = generateApiKey("prod");
const call = () =>
  GET(
    new Request("http://x/api/v1/flags", {
      headers: { authorization: `Bearer ${plaintext}` },
    }),
  );

async function expect503(res: Response) {
  expect(res.status).toBe(503);
  expect(res.headers.get("retry-after")).toBe("5");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(await res.json()).toEqual({ error: "service_unavailable" });
}

describe("GET /api/v1/flags when the DB is down", () => {
  beforeEach(() => {
    getCachedApiKey.mockReset();
  });

  it("API key lookup fails -> 503", async () => {
    getCachedApiKey.mockResolvedValue(null); // key not cached -> DB lookup
    await expect503(await call());
  });

  it("key is cached but the flags query fails -> 503", async () => {
    getCachedApiKey.mockResolvedValue({
      keyId: 1,
      projectId: 1,
      environment: "prod",
    });
    await expect503(await call());
  });
});

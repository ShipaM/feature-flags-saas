import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateApiKey } from "@/lib/apiKey";
import { redis } from "@/server/cache/redis";
import { db } from "@/server/db/client";
import { apiKeys, flags, organizations, projects } from "@/server/db/schema";
import { GET } from "./route";

let projectA: number;
let projectB: number;

beforeEach(async () => {
  vi.restoreAllMocks();
  await redis.flushdb(); // safe: tests use Redis database 1 only
  await db.execute(
    sql`TRUNCATE organizations, projects, flags, api_keys RESTART IDENTITY CASCADE`,
  );
  const [org] = await db
    .insert(organizations)
    .values({ name: "Org" })
    .returning();
  const [a, b] = await db
    .insert(projects)
    .values([
      { organizationId: org.id, name: "A" },
      { organizationId: org.id, name: "B" },
    ])
    .returning();
  projectA = a.id;
  projectB = b.id;
  await db.insert(flags).values([
    {
      projectId: projectA,
      environment: "prod",
      key: "a-flag",
      enabled: true,
      rollout: 100,
    },
    {
      projectId: projectB,
      environment: "prod",
      key: "b-secret",
      enabled: true,
      rollout: 100,
    },
  ]);
});

afterAll(async () => {
  await db.$client.end();
  await redis.quit();
});

async function seedKey(projectId: number) {
  const { plaintext, hashedKey, keyPrefix } = generateApiKey("prod");
  await db.insert(apiKeys).values({
    projectId,
    environment: "prod",
    type: "server",
    name: "t",
    keyPrefix,
    hashedKey,
  });
  return plaintext;
}

const call = (
  key: string | null,
  extraHeaders: Record<string, string> = {},
  url = "http://x/api/v1/flags",
) =>
  GET(
    new Request(url, {
      headers: {
        ...(key ? { authorization: `Bearer ${key}` } : {}),
        ...extraHeaders,
      },
    }),
  );

const silence = () =>
  (["log", "info", "warn", "error"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );

describe("failed-auth limit (per IP)", () => {
  it("blocks an IP after 20 failed attempts with 429 + Retry-After", async () => {
    silence();
    const ip = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 20; i++) {
      expect((await call("wrong", ip)).status).toBe(401);
    }
    const blocked = await call("wrong", ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("another IP is not affected", async () => {
    silence();
    for (let i = 0; i < 21; i++) {
      await call("wrong", { "x-forwarded-for": "203.0.113.7" });
    }
    const other = await call("wrong", { "x-forwarded-for": "198.51.100.9" });
    expect(other.status).toBe(401);
  });

  it("failed attempts do not eat the limit of a valid key", async () => {
    silence();
    const key = await seedKey(projectA);
    for (let i = 0; i < 25; i++) {
      await call("wrong", { "x-forwarded-for": "203.0.113.7" });
    }
    expect((await call(key, { "x-forwarded-for": "198.51.100.9" })).status).toBe(
      200,
    );
  });
});

describe("fail open for the limiter only", () => {
  it("still answers 200 when the rate-limit counter cannot reach Redis", async () => {
    const key = await seedKey(projectA);
    silence();
    vi.spyOn(redis, "multi").mockImplementation(() => {
      throw new Error("redis down");
    });
    expect((await call(key)).status).toBe(200);
  });
});

describe("secrets and logs", () => {
  it("never writes the plaintext key to the console", async () => {
    const key = await seedKey(projectA);
    const unknown = generateApiKey("prod").plaintext; // well-formed, but not in the DB
    const spies = silence();
    await call(key);
    await call(unknown);
    await call(`${key}x`);
    for (const spy of spies) {
      const printed = JSON.stringify(spy.mock.calls);
      expect(printed).not.toContain(key);
      expect(printed).not.toContain(unknown);
    }
  });

  it("logs a security event for a rejected key, without the token", async () => {
    const spies = silence();
    const warn = spies[2];
    await call("some-token-value", { "x-forwarded-for": "203.0.113.7" });
    const events = warn.mock.calls.map((c) => JSON.parse(String(c[0])));
    expect(events).toContainEqual(
      expect.objectContaining({ event: "api_key_rejected", ip: "203.0.113.7" }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("some-token-value");
  });

  it("logs a rate_limited event when an IP is blocked", async () => {
    const spies = silence();
    const ip = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 21; i++) await call("wrong", ip);
    const events = spies[2].mock.calls.map((c) => JSON.parse(String(c[0])));
    expect(events).toContainEqual(
      expect.objectContaining({ event: "rate_limited", ip: "203.0.113.7" }),
    );
  });
});

describe("the key decides the project, not the request", () => {
  it("ignores project_id in the query string and in headers", async () => {
    const keyA = await seedKey(projectA);
    const res = await call(
      keyA,
      { "x-project-id": String(projectB) },
      `http://x/api/v1/flags?project_id=${projectB}&projectId=${projectB}&environment=dev`,
    );
    expect(res.status).toBe(200);
    expect(Object.keys((await res.json()).flags)).toEqual(["a-flag"]);
  });
});

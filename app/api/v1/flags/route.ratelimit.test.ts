import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateApiKey } from "@/lib/apiKey";
import { redis } from "@/server/cache/redis";
import { db } from "@/server/db/client";
import { apiKeys, organizations, projects } from "@/server/db/schema";

vi.mock("@/server/constants/rateLimit", async (orig) => ({
  ...(await orig<object>()),
  FLAGS_RATE_LIMIT: 3,
}));

import { GET } from "./route"; // импорт ПОСЛЕ vi.mock

beforeEach(async () => {
  await redis.flushdb(); // обнуляем счётчики (тесты используют отдельную базу Redis)
  await db.execute(
    sql`TRUNCATE organizations, projects, api_keys RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await db.$client.end();
  await redis.quit();
});

describe("rate limit", () => {
  it("returns 429 with Retry-After after the limit", async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Org" })
      .returning();
    const [p] = await db
      .insert(projects)
      .values({ organizationId: org.id, name: "P" })
      .returning();
    const { plaintext, hashedKey, keyPrefix } = generateApiKey("prod");
    await db.insert(apiKeys).values({
      projectId: p.id,
      environment: "prod",
      type: "server",
      name: "t",
      keyPrefix,
      hashedKey,
    });
    const call = () =>
      GET(
        new Request("http://x/api/v1/flags", {
          headers: { authorization: `Bearer ${plaintext}` },
        }),
      );
    for (let i = 0; i < 3; i++) expect((await call()).status).toBe(200);
    const blocked = await call(); // 4-й запрос
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

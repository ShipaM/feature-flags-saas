import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateApiKey } from "@/lib/apiKey";
import { db } from "@/server/db/client";
import {
  apiKeys,
  flags,
  type environmentEnum,
  organizations,
  projects,
} from "@/server/db/schema";
import { GET } from "./route";

type Env = (typeof environmentEnum.enumValues)[number];

let projectA: number;
let projectB: number;

beforeAll(async () => {
  await db.execute(
    sql`TRUNCATE organizations, users, sessions, accounts,
verifications, projects, flags, api_keys, audit_logs RESTART IDENTITY CASCADE`,
  );

  const [org] = await db
    .insert(organizations)
    .values({ name: "Org" })
    .returning();
  const [a, b] = await db
    .insert(projects)
    .values([
      { organizationId: org.id, name: "Project A" },
      { organizationId: org.id, name: "Project B" },
    ])
    .returning();
  projectA = a.id;
  projectB = b.id;

  await db.insert(flags).values([
    { projectId: projectA, environment: "prod", key: "beta", enabled: true, rollout: 25 },
    { projectId: projectA, environment: "prod", key: "alpha", enabled: false, rollout: 0 },
    // other environment of the same project: must not leak into prod
    { projectId: projectA, environment: "dev", key: "dev-only", enabled: true, rollout: 100 },
    // other project: must not leak into project A
    { projectId: projectB, environment: "prod", key: "b-secret", enabled: true, rollout: 50 },
  ]);
});

beforeEach(async () => {
  // Every test starts with an empty api_keys table
  await db.execute(sql`TRUNCATE api_keys RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$client.end();
});

// Insert a key straight into the DB and return its plaintext
async function seedKey(
  projectId: number,
  environment: Env,
  overrides: Partial<typeof apiKeys.$inferInsert> = {},
) {
  const { plaintext, hashedKey, keyPrefix } = generateApiKey(environment);
  await db.insert(apiKeys).values({
    projectId,
    environment,
    type: "server",
    name: "test",
    keyPrefix,
    hashedKey,
    ...overrides,
  });
  return plaintext;
}

const call = (headers: Record<string, string> = {}) =>
  GET(new Request("http://localhost/api/v1/flags", { headers }));
const bearer = (key: string) => ({ authorization: `Bearer ${key}` });

describe("GET /api/v1/flags", () => {
  it("returns the flags of the key's project and environment in the spec format", async () => {
    const key = await seedKey(projectA, "prod");

    const res = await call(bearer(key));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({
      flags: {
        alpha: { enabled: false, rollout: 0 },
        beta: { enabled: true, rollout: 25 },
      },
    });
  });

  it("401 without an Authorization header", async () => {
    const res = await call();

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("401 for an unknown but well-formed key", async () => {
    const { plaintext } = generateApiKey("prod");

    const res = await call(bearer(plaintext));

    expect(res.status).toBe(401);
  });

  it("401 for a revoked key", async () => {
    const key = await seedKey(projectA, "prod", { revokedAt: new Date() });

    const res = await call(bearer(key));

    expect(res.status).toBe(401);
  });

  it("a key of one project cannot read the flags of another project", async () => {
    const keyB = await seedKey(projectB, "prod");

    const body = await (await call(bearer(keyB))).json();

    expect(Object.keys(body.flags)).toEqual(["b-secret"]);
  });

  it("answers 304 with no body when If-None-Match matches", async () => {
    const key = await seedKey(projectA, "prod");
    const etag = (await call(bearer(key))).headers.get("etag")!;

    const res = await call({ ...bearer(key), "if-none-match": etag });

    expect(res.status).toBe(304);
    expect(await res.text()).toBe("");
    expect(res.headers.get("etag")).toBe(etag);
    expect(res.headers.get("cache-control")).toContain("max-age=30");
  });

  it("a revoked key gets 401 even with a matching If-None-Match", async () => {
    const key = await seedKey(projectA, "prod");
    const etag = (await call(bearer(key))).headers.get("etag")!;
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.projectId, projectA));

    const res = await call({ ...bearer(key), "if-none-match": etag });

    expect(res.status).toBe(401);
  });
});

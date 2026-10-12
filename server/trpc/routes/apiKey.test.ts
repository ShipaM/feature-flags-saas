import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashApiKey } from "@/lib/apiKey";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { apiKeys, organizations, projects, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

let admin: SessionUser;
let developer: SessionUser;
let readonly: SessionUser;
let outsider: SessionUser; // admin of another organization
let projectId: number;
let otherProjectId: number; // second project of the same organization
let outsiderProjectId: number; // project of another organization

beforeAll(async () => {
  await db.execute(
    sql`TRUNCATE organizations, users, sessions, accounts,
verifications, projects, flags, api_keys, audit_logs RESTART IDENTITY CASCADE`,
  );

  const [org, otherOrg] = await db
    .insert(organizations)
    .values([{ name: "Org" }, { name: "Other org" }])
    .returning();

  const [p1, p2, p3] = await db
    .insert(projects)
    .values([
      { organizationId: org.id, name: "Project 1" },
      { organizationId: org.id, name: "Project 2" },
      { organizationId: otherOrg.id, name: "Foreign project" },
    ])
    .returning();
  projectId = p1.id;
  otherProjectId = p2.id;
  outsiderProjectId = p3.id;

  const inserted = await db
    .insert(users)
    .values([
      { organizationId: org.id, name: "a", email: "a@t.test", role: "admin" },
      {
        organizationId: org.id,
        name: "d",
        email: "d@t.test",
        role: "developer",
      },
      {
        organizationId: org.id,
        name: "r",
        email: "r@t.test",
        role: "readonly",
      },
      {
        organizationId: otherOrg.id,
        name: "x",
        email: "x@t.test",
        role: "admin",
      },
    ])
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      organizationId: users.organizationId,
    });
  [admin, developer, readonly, outsider] = inserted;
});

beforeEach(async () => {
  // Every test starts with an empty api_keys table
  await db.execute(sql`TRUNCATE api_keys RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$client.end();
});

const newKey = (overrides: Record<string, unknown> = {}) =>
  as(admin).apiKeys.create({
    projectId,
    environment: "prod",
    name: "CI server",
    ...overrides,
  } as never);

// Key of another organization, created through its own admin
const foreignKey = () =>
  as(outsider).apiKeys.create({
    projectId: outsiderProjectId,
    environment: "prod",
    name: "Foreign key",
  } as never);

describe("apiKeys.create", () => {
  it("returns the plaintext key once, with the safe columns", async () => {
    const created = await newKey();

    expect(created.key).toMatch(/^ffk_prod_[A-Za-z0-9_-]{43}$/);
    expect(created).toMatchObject({
      projectId,
      environment: "prod",
      type: "server",
      name: "CI server",
      revokedAt: null,
    });
    expect(created.keyPrefix).toBe(
      created.key.slice(0, created.keyPrefix.length),
    );
    expect(created).not.toHaveProperty("hashedKey");
  });

  it("stores only the hash: the plaintext is nowhere in the database", async () => {
    const created = await newKey();

    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));

    expect(row.hashedKey).toBe(hashApiKey(created.key));
    expect(row.hashedKey).not.toBe(created.key);
    expect(JSON.stringify(row)).not.toContain(created.key);
  });

  it.each([
    ["developer", () => developer],
    ["readonly", () => readonly],
  ])("%s cannot create keys (FORBIDDEN)", async (_role, getUser) => {
    await expect(
      as(getUser()).apiKeys.create({
        projectId,
        environment: "dev",
        name: "nope",
      } as never),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });

  it("cannot create a key for a foreign organization's project (NOT_FOUND)", async () => {
    await expect(
      newKey({ projectId: outsiderProjectId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });
});

describe("apiKeys.rotate", () => {
  it("issues a new key with the same settings and revokes the old one", async () => {
    const old = await newKey({
      name: "CI",
      environment: "staging",
      type: "client",
    });

    const rotated = await as(admin).apiKeys.rotate({ id: old.id });

    expect(rotated.id).not.toBe(old.id);
    expect(rotated.rotatedFromId).toBe(old.id);
    expect(rotated.key).not.toBe(old.key);
    expect(rotated).toMatchObject({
      projectId,
      environment: "staging",
      type: "client",
      name: "CI",
      revokedAt: null,
    });
    expect(rotated.key).toMatch(/^ffk_staging_/);

    const [oldRow] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, old.id));
    expect(oldRow.revokedAt).toBeInstanceOf(Date);
  });

  it("two parallel rotations: exactly one succeeds", async () => {
    const old = await newKey();

    const results = await Promise.allSettled([
      as(admin).apiKeys.rotate({ id: old.id }),
      as(admin).apiKeys.rotate({ id: old.id }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const active = (await db.select().from(apiKeys)).filter(
      (k) => !k.revokedAt,
    );
    expect(active).toHaveLength(1);
  });
});

describe("apiKeys.list", () => {
  it("returns an empty array when there are no keys", async () => {
    expect(await as(admin).apiKeys.list()).toEqual([]);
  });

  it("returns the organization's keys ordered by id", async () => {
    const a = await newKey({ name: "a" });
    const b = await newKey({ name: "b", projectId: otherProjectId });
    const c = await newKey({ name: "c" });

    const list = await as(admin).apiKeys.list();

    expect(list.map((k) => k.id)).toEqual([a.id, b.id, c.id]);
  });

  it("never exposes the plaintext key or the hash", async () => {
    const created = await newKey();

    const [item] = await as(admin).apiKeys.list();

    expect(Object.keys(item).sort()).toEqual(
      [
        "createdAt",
        "environment",
        "id",
        "keyPrefix",
        "name",
        "projectId",
        "revokedAt",
        "type",
      ].sort(),
    );
    expect(JSON.stringify(item)).not.toContain(created.key);
    expect(JSON.stringify(item)).not.toContain(hashApiKey(created.key));
  });

  it("includes revoked keys with their revokedAt", async () => {
    const created = await newKey();
    await as(admin).apiKeys.revoke({ id: created.id });

    const [item] = await as(admin).apiKeys.list();

    expect(item.id).toBe(created.id);
    expect(item.revokedAt).toBeInstanceOf(Date);
  });

  it("does not return keys of another organization", async () => {
    const mine = await newKey();
    await foreignKey();

    const list = await as(admin).apiKeys.list();

    expect(list.map((k) => k.id)).toEqual([mine.id]);
  });

  it("filters by projectId", async () => {
    await newKey({ name: "p1" });
    const p2 = await newKey({ name: "p2", projectId: otherProjectId });

    const list = await as(admin).apiKeys.list({ projectId: otherProjectId });

    expect(list.map((k) => k.id)).toEqual([p2.id]);
  });

  it("returns an empty list for a foreign projectId", async () => {
    await newKey();
    await foreignKey();

    const list = await as(admin).apiKeys.list({
      projectId: outsiderProjectId,
    });

    expect(list).toEqual([]);
  });

  it.each([
    ["developer", () => developer],
    ["readonly", () => readonly],
  ])("%s cannot list keys (FORBIDDEN)", async (_role, getUser) => {
    await newKey();

    await expect(as(getUser()).apiKeys.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("apiKeys.revoke", () => {
  it("sets revokedAt and returns only the safe columns", async () => {
    const created = await newKey();

    const revoked = await as(admin).apiKeys.revoke({ id: created.id });

    expect(revoked.id).toBe(created.id);
    expect(revoked.revokedAt).toBeInstanceOf(Date);
    expect(revoked).not.toHaveProperty("hashedKey");
    expect(revoked).not.toHaveProperty("key");

    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));
    expect(row.revokedAt).toBeInstanceOf(Date);
  });

  it("is idempotent: the second revoke keeps the first revokedAt", async () => {
    const created = await newKey();

    const first = await as(admin).apiKeys.revoke({ id: created.id });
    const second = await as(admin).apiKeys.revoke({ id: created.id });

    expect(second.revokedAt).toEqual(first.revokedAt);
  });

  it("revokes only the requested key", async () => {
    const target = await newKey({ name: "target" });
    const other = await newKey({ name: "other" });

    await as(admin).apiKeys.revoke({ id: target.id });

    const rows = await db.select().from(apiKeys);
    expect(rows.find((k) => k.id === target.id)?.revokedAt).not.toBeNull();
    expect(rows.find((k) => k.id === other.id)?.revokedAt).toBeNull();
  });

  it("a revoked key can no longer be rotated (CONFLICT)", async () => {
    const created = await newKey();
    await as(admin).apiKeys.revoke({ id: created.id });

    await expect(
      as(admin).apiKeys.rotate({ id: created.id }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.select().from(apiKeys)).toHaveLength(1);
  });

  it("returns NOT_FOUND for a missing key", async () => {
    await expect(
      as(admin).apiKeys.revoke({ id: 999_999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot revoke a key of another organization (NOT_FOUND)", async () => {
    const foreign = await foreignKey();

    await expect(
      as(admin).apiKeys.revoke({ id: foreign.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, foreign.id));
    expect(row.revokedAt).toBeNull();
  });

  it.each([
    ["developer", () => developer],
    ["readonly", () => readonly],
  ])("%s cannot revoke keys (FORBIDDEN)", async (_role, getUser) => {
    const created = await newKey();

    await expect(
      as(getUser()).apiKeys.revoke({ id: created.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id));
    expect(row.revokedAt).toBeNull();
  });

  it("rejects an invalid id", async () => {
    await expect(
      as(admin).apiKeys.revoke({ id: "abc" as never }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

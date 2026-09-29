import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { flags, organizations, projects, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

// Caller without a session
const anonymous = () =>
  createCaller({ db, session: null, headers: new Headers() } as never);

let owner: SessionUser;
let admin: SessionUser;
let developer: SessionUser;
let readonly: SessionUser;
let outsider: SessionUser; // owner of another organization
let projectId: number;
let otherProjectId: number;
let outsiderProjectId: number;

// Insert a flag directly into the DB, bypassing the router
async function seedFlag(values: Partial<typeof flags.$inferInsert> = {}) {
  const [row] = await db
    .insert(flags)
    .values({
      projectId,
      key: "seed-flag",
      environment: "prod",
      ...values,
    })
    .returning();
  return row;
}

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

  const cols = {
    id: users.id,
    email: users.email,
    role: users.role,
    organizationId: users.organizationId,
  };
  const inserted = await db
    .insert(users)
    .values([
      { organizationId: org.id, name: "o", email: "o@t.test", role: "owner" },
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
        role: "owner",
      },
    ])
    .returning(cols);
  [owner, admin, developer, readonly, outsider] = inserted;
});

beforeEach(async () => {
  // Every test starts with an empty flags table
  await db.execute(sql`TRUNCATE flags RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$client.end();
});

describe("flag.list", () => {
  it("returns an empty array when there are no flags", async () => {
    expect(await as(developer).flag.list()).toEqual([]);
  });

  it("returns all organization flags ordered by id", async () => {
    const a = await seedFlag({ key: "a", environment: "dev" });
    const b = await seedFlag({ key: "b", environment: "prod" });
    const c = await seedFlag({ key: "c", projectId: otherProjectId });

    const list = await as(developer).flag.list();

    expect(list.map((f) => f.id)).toEqual([a.id, b.id, c.id]);
  });

  it("does not return flags of another organization", async () => {
    const mine = await seedFlag({ key: "mine" });
    await seedFlag({ key: "foreign", projectId: outsiderProjectId });

    const list = await as(developer).flag.list();

    expect(list.map((f) => f.id)).toEqual([mine.id]);
  });

  it("filters by projectId", async () => {
    await seedFlag({ key: "p1" });
    const p2 = await seedFlag({ key: "p2", projectId: otherProjectId });

    const list = await as(developer).flag.list({ projectId: otherProjectId });

    expect(list.map((f) => f.id)).toEqual([p2.id]);
  });

  it("returns an empty list for a foreign projectId", async () => {
    await seedFlag({ key: "mine" });
    await seedFlag({ key: "foreign", projectId: outsiderProjectId });

    const list = await as(developer).flag.list({
      projectId: outsiderProjectId,
    });

    expect(list).toEqual([]);
  });

  it("filters by environment", async () => {
    await seedFlag({ key: "d", environment: "dev" });
    const s = await seedFlag({ key: "s", environment: "staging" });

    const list = await as(developer).flag.list({ environment: "staging" });

    expect(list.map((f) => f.id)).toEqual([s.id]);
  });

  it("combines projectId and environment filters", async () => {
    await seedFlag({ key: "a", environment: "dev" });
    await seedFlag({ key: "b", environment: "prod", projectId: otherProjectId });
    const target = await seedFlag({
      key: "c",
      environment: "dev",
      projectId: otherProjectId,
    });

    const list = await as(developer).flag.list({
      projectId: otherProjectId,
      environment: "dev",
    });

    expect(list.map((f) => f.id)).toEqual([target.id]);
  });

  it("readonly sees only prod flags", async () => {
    await seedFlag({ key: "d", environment: "dev" });
    await seedFlag({ key: "s", environment: "staging" });
    const p = await seedFlag({ key: "p", environment: "prod" });

    const list = await as(readonly).flag.list();

    expect(list.map((f) => f.id)).toEqual([p.id]);
  });

  it("readonly cannot bypass the restriction via environment", async () => {
    await seedFlag({ key: "d", environment: "dev" });
    const p = await seedFlag({ key: "p", environment: "prod" });

    const list = await as(readonly).flag.list({ environment: "dev" });

    expect(list.map((f) => f.id)).toEqual([p.id]);
  });

  it("rejects an invalid environment", async () => {
    await expect(
      as(developer).flag.list({ environment: "qa" as never }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires authentication", async () => {
    await expect(anonymous().flag.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("flag.create", () => {
  it("creates a flag with defaults (enabled=false, rollout=0)", async () => {
    const created = await as(developer).flag.create({
      projectId,
      key: "new-flag",
      environment: "dev",
    });

    expect(created).toMatchObject({
      projectId,
      key: "new-flag",
      environment: "dev",
      enabled: false,
      rollout: 0,
      description: null,
    });
    const [row] = await db.select().from(flags).where(eq(flags.id, created.id));
    expect(row).toBeDefined();
  });

  it("persists the provided enabled, rollout and description", async () => {
    const created = await as(developer).flag.create({
      projectId,
      key: "full",
      environment: "staging",
      enabled: true,
      rollout: 45,
      description: "Full flag",
    });

    expect(created).toMatchObject({
      enabled: true,
      rollout: 45,
      description: "Full flag",
    });
  });

  it("allows developer, admin and owner roles", async () => {
    for (const [i, user] of [developer, admin, owner].entries()) {
      const created = await as(user).flag.create({
        projectId,
        key: `by-role-${i}`,
        environment: "dev",
      });
      expect(created.key).toBe(`by-role-${i}`);
    }
  });

  it("readonly cannot create flags (FORBIDDEN)", async () => {
    await expect(
      as(readonly).flag.create({ projectId, key: "nope", environment: "dev" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(await db.select().from(flags)).toHaveLength(0);
  });

  it("requires authentication", async () => {
    await expect(
      anonymous().flag.create({ projectId, key: "x", environment: "dev" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("cannot create a flag in a foreign organization's project (NOT_FOUND)", async () => {
    await expect(
      as(developer).flag.create({
        projectId: outsiderProjectId,
        key: "evil",
        environment: "dev",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await db.select().from(flags)).toHaveLength(0);
  });

  it("returns NOT_FOUND for a non-existent project", async () => {
    await expect(
      as(developer).flag.create({
        projectId: 999_999,
        key: "ghost",
        environment: "dev",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a duplicate (project, key, environment) gives CONFLICT", async () => {
    await as(developer).flag.create({
      projectId,
      key: "dup",
      environment: "dev",
    });

    await expect(
      as(developer).flag.create({ projectId, key: "dup", environment: "dev" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("the same key is allowed in another environment", async () => {
    await as(developer).flag.create({ projectId, key: "same", environment: "dev" });

    const created = await as(developer).flag.create({
      projectId,
      key: "same",
      environment: "prod",
    });

    expect(created.environment).toBe("prod");
  });

  it("the same key is allowed in another project", async () => {
    await as(developer).flag.create({ projectId, key: "same", environment: "dev" });

    const created = await as(developer).flag.create({
      projectId: otherProjectId,
      key: "same",
      environment: "dev",
    });

    expect(created.projectId).toBe(otherProjectId);
  });

  describe("input validation", () => {
    const base = { projectId: 0, key: "valid-key", environment: "dev" } as const;
    const call = (input: Record<string, unknown>) =>
      as(developer).flag.create({
        ...base,
        projectId,
        ...input,
      } as never);

    it.each([
      ["empty key", { key: "" }],
      ["key with uppercase letters", { key: "BadKey" }],
      ["key with a space", { key: "bad key" }],
      ["key with an underscore", { key: "bad_key" }],
      ["key longer than 255 characters", { key: "a".repeat(256) }],
      ["rollout < 0", { rollout: -1 }],
      ["rollout > 100", { rollout: 101 }],
      ["fractional rollout", { rollout: 10.5 }],
      ["description longer than 1000 characters", { description: "d".repeat(1001) }],
      ["invalid environment", { environment: "qa" }],
      ["projectId = 0", { projectId: 0 }],
      ["negative projectId", { projectId: -1 }],
      ["fractional projectId", { projectId: 1.5 }],
      ["non-boolean enabled", { enabled: "yes" }],
    ])("rejects: %s", async (_name, input) => {
      await expect(call(input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("accepts boundary values (255-char key, rollout 0 and 100)", async () => {
      const a = await call({ key: "a".repeat(255), rollout: 0 });
      const b = await call({ key: "boundary", rollout: 100 });

      expect(a.key).toHaveLength(255);
      expect(b.rollout).toBe(100);
    });
  });
});

describe("flag.update", () => {
  it("updates description, enabled and rollout in one call", async () => {
    const flag = await seedFlag();

    const updated = await as(developer).flag.update({
      id: flag.id,
      description: "changed",
      enabled: true,
      rollout: 70,
    });

    expect(updated).toMatchObject({
      id: flag.id,
      description: "changed",
      enabled: true,
      rollout: 70,
    });
  });

  it("a partial update leaves other fields untouched", async () => {
    const flag = await seedFlag({
      description: "keep me",
      enabled: true,
      rollout: 30,
    });

    const updated = await as(developer).flag.update({ id: flag.id, rollout: 60 });

    expect(updated).toMatchObject({
      description: "keep me",
      enabled: true,
      rollout: 60,
    });
  });

  it("description: null clears the description", async () => {
    const flag = await seedFlag({ description: "to clear" });

    const updated = await as(developer).flag.update({
      id: flag.id,
      description: null,
    });

    expect(updated.description).toBeNull();
  });

  it("enabled: false and rollout: 0 are applied (not treated as empty)", async () => {
    const flag = await seedFlag({ enabled: true, rollout: 50 });

    const updated = await as(developer).flag.update({
      id: flag.id,
      enabled: false,
      rollout: 0,
    });

    expect(updated).toMatchObject({ enabled: false, rollout: 0 });
  });

  it("bumps updatedAt and keeps key, environment, projectId", async () => {
    const flag = await seedFlag({ key: "immutable", environment: "staging" });

    const updated = await as(developer).flag.update({
      id: flag.id,
      enabled: true,
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      flag.updatedAt.getTime(),
    );
    expect(updated).toMatchObject({
      key: "immutable",
      environment: "staging",
      projectId,
    });
  });

  it("allows developer, admin and owner roles", async () => {
    const flag = await seedFlag();

    for (const user of [developer, admin, owner]) {
      const updated = await as(user).flag.update({ id: flag.id, rollout: 10 });
      expect(updated.rollout).toBe(10);
    }
  });

  it("readonly cannot update flags (FORBIDDEN)", async () => {
    const flag = await seedFlag({ rollout: 5 });

    await expect(
      as(readonly).flag.update({ id: flag.id, rollout: 99 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const [row] = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(row.rollout).toBe(5);
  });

  it("requires authentication", async () => {
    const flag = await seedFlag();

    await expect(
      anonymous().flag.update({ id: flag.id, rollout: 1 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("NOT_FOUND for a non-existent id", async () => {
    await expect(
      as(developer).flag.update({ id: 999_999, rollout: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot update a foreign organization's flag (NOT_FOUND)", async () => {
    const foreign = await seedFlag({
      key: "foreign",
      projectId: outsiderProjectId,
      rollout: 5,
    });

    await expect(
      as(developer).flag.update({ id: foreign.id, rollout: 99 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [row] = await db.select().from(flags).where(eq(flags.id, foreign.id));
    expect(row.rollout).toBe(5);
  });

  it("an empty update (id only) is rejected", async () => {
    const flag = await seedFlag();

    await expect(
      as(developer).flag.update({ id: flag.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.each([
    ["rollout < 0", { rollout: -1 }],
    ["rollout > 100", { rollout: 101 }],
    ["fractional rollout", { rollout: 1.5 }],
    ["description longer than 1000 characters", { description: "d".repeat(1001) }],
    ["non-boolean enabled", { enabled: "yes" }],
    ["id = 0", { id: 0, rollout: 1 }],
    ["negative id", { id: -1, rollout: 1 }],
  ])("rejects: %s", async (_name, input) => {
    const flag = await seedFlag();

    await expect(
      as(developer).flag.update({ id: flag.id, ...input } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("flag.toggle", () => {
  it("turns a disabled flag on", async () => {
    const flag = await seedFlag({ enabled: false });

    const updated = await as(developer).flag.toggle({ id: flag.id });

    expect(updated.enabled).toBe(true);
  });

  it("turns an enabled flag off", async () => {
    const flag = await seedFlag({ enabled: true });

    const updated = await as(developer).flag.toggle({ id: flag.id });

    expect(updated.enabled).toBe(false);
  });

  it("a double toggle restores the original state in the DB", async () => {
    const flag = await seedFlag({ enabled: false });

    await as(developer).flag.toggle({ id: flag.id });
    await as(developer).flag.toggle({ id: flag.id });

    const [row] = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(row.enabled).toBe(false);
  });

  it("keeps other fields and bumps updatedAt", async () => {
    const flag = await seedFlag({ rollout: 40, description: "desc" });

    const updated = await as(developer).flag.toggle({ id: flag.id });

    expect(updated).toMatchObject({ rollout: 40, description: "desc" });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      flag.updatedAt.getTime(),
    );
  });

  it("does not affect other flags", async () => {
    const target = await seedFlag({ key: "target" });
    const other = await seedFlag({ key: "other" });

    await as(developer).flag.toggle({ id: target.id });

    const [row] = await db.select().from(flags).where(eq(flags.id, other.id));
    expect(row.enabled).toBe(false);
  });

  it("allows developer, admin and owner roles", async () => {
    const flag = await seedFlag({ enabled: false });

    for (const user of [developer, admin, owner]) {
      await as(user).flag.toggle({ id: flag.id });
    }

    // Three toggles -> enabled
    const [row] = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(row.enabled).toBe(true);
  });

  it("readonly cannot toggle flags (FORBIDDEN)", async () => {
    const flag = await seedFlag({ enabled: false });

    await expect(
      as(readonly).flag.toggle({ id: flag.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const [row] = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(row.enabled).toBe(false);
  });

  it("requires authentication", async () => {
    const flag = await seedFlag();

    await expect(anonymous().flag.toggle({ id: flag.id })).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
  });

  it("NOT_FOUND for a non-existent id", async () => {
    await expect(
      as(developer).flag.toggle({ id: 999_999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot toggle a foreign organization's flag (NOT_FOUND)", async () => {
    const foreign = await seedFlag({
      key: "foreign",
      projectId: outsiderProjectId,
    });

    await expect(
      as(developer).flag.toggle({ id: foreign.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [row] = await db.select().from(flags).where(eq(flags.id, foreign.id));
    expect(row.enabled).toBe(false);
  });

  it("an owner of another organization can toggle their own flag", async () => {
    const foreign = await seedFlag({
      key: "foreign",
      projectId: outsiderProjectId,
    });

    const updated = await as(outsider).flag.toggle({ id: foreign.id });

    expect(updated.enabled).toBe(true);
  });

  it.each([0, -1, 1.5])("rejects an invalid id: %s", async (badId) => {
    await expect(
      as(developer).flag.toggle({ id: badId }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("flag.delete", () => {
  it("deletes a flag and returns its id", async () => {
    const flag = await seedFlag();

    const result = await as(admin).flag.delete({ id: flag.id });

    expect(result).toEqual({ id: flag.id });
    const rows = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(rows).toHaveLength(0);
  });

  it("deletes only the specified flag", async () => {
    const target = await seedFlag({ key: "target" });
    const keep = await seedFlag({ key: "keep" });

    await as(admin).flag.delete({ id: target.id });

    const rows = await db.select().from(flags);
    expect(rows.map((r) => r.id)).toEqual([keep.id]);
  });

  it("allows admin and owner roles", async () => {
    const a = await seedFlag({ key: "a" });
    const b = await seedFlag({ key: "b" });

    await as(admin).flag.delete({ id: a.id });
    await as(owner).flag.delete({ id: b.id });

    expect(await db.select().from(flags)).toHaveLength(0);
  });

  it.each([
    ["developer", () => developer],
    ["readonly", () => readonly],
  ])("%s cannot delete flags (FORBIDDEN)", async (_role, getUser) => {
    const flag = await seedFlag();

    await expect(
      as(getUser()).flag.delete({ id: flag.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const rows = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(rows).toHaveLength(1);
  });

  it("requires authentication", async () => {
    const flag = await seedFlag();

    await expect(anonymous().flag.delete({ id: flag.id })).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
  });

  it("NOT_FOUND for a non-existent id", async () => {
    await expect(
      as(admin).flag.delete({ id: 999_999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deleting twice gives NOT_FOUND", async () => {
    const flag = await seedFlag();
    await as(admin).flag.delete({ id: flag.id });

    await expect(
      as(admin).flag.delete({ id: flag.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot delete a foreign organization's flag (NOT_FOUND)", async () => {
    const foreign = await seedFlag({
      key: "foreign",
      projectId: outsiderProjectId,
    });

    await expect(
      as(admin).flag.delete({ id: foreign.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const rows = await db.select().from(flags).where(eq(flags.id, foreign.id));
    expect(rows).toHaveLength(1);
  });

  it.each([0, -1, 1.5])("rejects an invalid id: %s", async (badId) => {
    await expect(
      as(admin).flag.delete({ id: badId }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

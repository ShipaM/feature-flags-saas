import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { auditLogs, organizations, projects, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

let admin: SessionUser;
let outsider: SessionUser; // admin of another organization
let projectId: number;
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

  const [project, foreignProject] = await db
    .insert(projects)
    .values([
      { organizationId: org.id, name: "Project 1" },
      { organizationId: otherOrg.id, name: "Foreign project" },
    ])
    .returning();
  projectId = project.id;
  outsiderProjectId = foreignProject.id;

  [admin, outsider] = await db
    .insert(users)
    .values([
      { organizationId: org.id, name: "a", email: "a@t.test", role: "admin" },
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
});

beforeEach(async () => {
  // TRUNCATE is allowed on audit_logs (the trigger blocks only UPDATE / DELETE);
  // RESTART IDENTITY makes the ids in the pagination test predictable
  await db.execute(sql`TRUNCATE flags, audit_logs RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$client.end();
});

describe("audit log records", () => {
  it("create: before=null, after=snapshot, correct actor and org", async () => {
    const flag = await as(admin).flag.create({
      projectId,
      key: "new-ui",
      environment: "prod",
    });
    const [log] = await db.select().from(auditLogs);
    expect(log).toMatchObject({
      organizationId: admin.organizationId,
      actorId: admin.id,
      action: "flag.create",
      entity: "flag",
      before: null,
    });
    expect(log.after).toMatchObject({ id: flag.id, key: "new-ui" });
  });
  it("UPDATE is rejected by the database", async () => {
    await as(admin).flag.create({ projectId, key: "k", environment: "dev" });
    await expect(
      db.execute(sql`UPDATE audit_logs SET action = 'hacked'`),
    ).rejects.toThrow();
  });
  it("DELETE is rejected by the database", async () => {
    await as(admin).flag.create({ projectId, key: "k", environment: "dev" });
    await expect(db.execute(sql`DELETE FROM audit_logs`)).rejects.toThrow();
    expect(await db.select().from(auditLogs)).toHaveLength(1);
  });
});

describe("auditLog.list", () => {
  it("paginates by page with the total count, newest first", async () => {
    for (const key of ["a", "b", "c", "d", "e"]) {
      await as(admin).flag.create({ projectId, key, environment: "dev" });
    }
    const page1 = await as(admin).auditLog.list({ page: 1, perPage: 2 });
    expect(page1.items.map((i) => i.id)).toEqual([5, 4]);
    expect(page1).toMatchObject({ total: 5, page: 1, perPage: 2 });
    const page2 = await as(admin).auditLog.list({ page: 2, perPage: 2 });
    expect(page2.items.map((i) => i.id)).toEqual([3, 2]);
    const page3 = await as(admin).auditLog.list({ page: 3, perPage: 2 });
    expect(page3.items.map((i) => i.id)).toEqual([1]);
  });

  it("rows written after the first page do not shift later pages (anchor)", async () => {
    for (const key of ["a", "b", "c", "d", "e"]) {
      await as(admin).flag.create({ projectId, key, environment: "dev" });
    }
    const page1 = await as(admin).auditLog.list({ page: 1, perPage: 2 });
    expect(page1.anchor).toBe(5);

    // Three new entries arrive while the user reads page 1
    for (const key of ["f", "g", "h"]) {
      await as(admin).flag.create({ projectId, key, environment: "dev" });
    }

    const page2 = await as(admin).auditLog.list({
      page: 2,
      perPage: 2,
      anchor: page1.anchor ?? undefined,
    });
    expect(page2.items.map((i) => i.id)).toEqual([3, 2]); // no duplicates
    expect(page2).toMatchObject({ total: 5, anchor: 5 }); // same snapshot

    // Without an anchor the newest rows are visible again
    const fresh = await as(admin).auditLog.list({ page: 1, perPage: 2 });
    expect(fresh.items.map((i) => i.id)).toEqual([8, 7]);
    expect(fresh).toMatchObject({ total: 8, anchor: 8 });
  });

  it("an empty log has no anchor", async () => {
    const list = await as(admin).auditLog.list();

    expect(list).toMatchObject({ items: [], total: 0, anchor: null });
  });

  it("organizations are isolated: each one sees only its own log", async () => {
    // 4 rows in "Org"
    for (const key of ["a", "b", "c", "d"]) {
      await as(admin).flag.create({ projectId, key, environment: "dev" });
    }
    // 1 row in "Other org"
    await as(outsider).flag.create({
      projectId: outsiderProjectId,
      key: "secret",
      environment: "prod",
    });

    const mine = await as(admin).auditLog.list();
    const theirs = await as(outsider).auditLog.list();

    expect(mine.items).toHaveLength(4);
    expect(theirs.items).toHaveLength(1);
    expect(theirs.items[0].actorId).toBe(outsider.id);
    expect(JSON.stringify(mine.items)).not.toContain("secret");
  });
});

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { auditLogs, organizations, projects, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

let admin: SessionUser;
let projectId: number;

beforeAll(async () => {
  await db.execute(
    sql`TRUNCATE organizations, users, sessions, accounts,
verifications, projects, flags, api_keys, audit_logs RESTART IDENTITY CASCADE`,
  );

  const [org] = await db
    .insert(organizations)
    .values({ name: "Org" })
    .returning();

  const [project] = await db
    .insert(projects)
    .values({ organizationId: org.id, name: "Project 1" })
    .returning();
  projectId = project.id;

  [admin] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      name: "a",
      email: "a@t.test",
      role: "admin",
    })
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
it("paginates with a cursor, newest first", async () => {
  for (const key of ["a", "b", "c", "d", "e"]) {
    await as(admin).flag.create({ projectId, key, environment: "dev" });
  }
  const page1 = await as(admin).auditLog.list({ limit: 2 });
  expect(page1.items.map((i) => i.id)).toEqual([5, 4]);
  expect(page1.nextCursor).toBe(4);
  const page2 = await as(admin).auditLog.list({
    limit: 2,
    cursor: page1.nextCursor!,
  });
  expect(page2.items.map((i) => i.id)).toEqual([3, 2]);
  const page3 = await as(admin).auditLog.list({
    limit: 2,
    cursor: page2.nextCursor!,
  });
  expect(page3.items.map((i) => i.id)).toEqual([1]);
  expect(page3.nextCursor).toBeNull();
});

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { organizations, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

const anon = () =>
  createCaller({ db, session: null, headers: new Headers() } as never);

let member: SessionUser;
let outsider: SessionUser; // member of another organization
let orgId: number;
let otherOrgId: number;

beforeAll(async () => {
  await db.execute(
    sql`TRUNCATE organizations, users, sessions, accounts,
verifications, projects, flags, api_keys, audit_logs RESTART IDENTITY CASCADE`,
  );

  const [org, otherOrg] = await db
    .insert(organizations)
    .values([{ name: "Org" }, { name: "Other org" }])
    .returning();
  orgId = org.id;
  otherOrgId = otherOrg.id;

  [member, outsider] = await db
    .insert(users)
    .values([
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
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      organizationId: users.organizationId,
    });
});

afterAll(async () => {
  await db.$client.end();
});

describe("organization.current", () => {
  it("returns the organization from the session (any role)", async () => {
    const org = await as(member).organization.current();

    expect(org).toMatchObject({ id: orgId, name: "Org" });
  });

  it("each user sees only their own organization", async () => {
    const theirs = await as(outsider).organization.current();

    expect(theirs).toMatchObject({ id: otherOrgId, name: "Other org" });
  });

  it("UNAUTHORIZED without a session", async () => {
    await expect(anon().organization.current()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

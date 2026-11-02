import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { auditLogs, organizations, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

let owner: SessionUser;
let admin: SessionUser;
let developer: SessionUser;
let readonly: SessionUser;
let outsider: SessionUser; // owner of another organization

// Current role straight from the DB, bypassing the router
async function roleOf(id: number) {
  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, id));
  return row.role;
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
  // Every test starts with the original roles and an empty audit log
  for (const user of [owner, admin, developer, readonly, outsider]) {
    await db
      .update(users)
      .set({ role: user.role })
      .where(eq(users.id, user.id));
  }
  await db.execute(sql`TRUNCATE audit_logs RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$client.end();
});

describe("member.list", () => {
  it("returns only the organization's members, ordered by id, with the safe columns", async () => {
    const list = await as(admin).member.list();

    expect(list.map((m) => m.id)).toEqual([
      owner.id,
      admin.id,
      developer.id,
      readonly.id,
    ]);

    expect(Object.keys(list[0]).sort()).toEqual(
      ["createdAt", "email", "id", "name", "role"].sort(),
    );
  });
});

describe("member.updateRole", () => {
  it("owner changes a member's role and it is written to the audit log", async () => {
    const updated = await as(owner).member.updateRole({
      id: developer.id,
      role: "admin",
    });

    expect(updated).toMatchObject({ id: developer.id, role: "admin" });
    expect(await roleOf(developer.id)).toBe("admin");

    const [log] = await db.select().from(auditLogs);
    expect(log).toMatchObject({
      organizationId: owner.organizationId,
      actorId: owner.id,
      action: "member.role_update",
      entity: "member",
    });
    expect(log.before).toMatchObject({ id: developer.id, role: "developer" });
    expect(log.after).toMatchObject({ id: developer.id, role: "admin" });
  });

  it("an owner cannot change their own role", async () => {
    await expect(
      as(owner).member.updateRole({ id: owner.id, role: "readonly" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await roleOf(owner.id)).toBe("owner");
  });

  it("a user of another organization looks like a missing one (NOT_FOUND)", async () => {
    await expect(
      as(owner).member.updateRole({ id: outsider.id, role: "readonly" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await roleOf(outsider.id)).toBe("owner"); // untouched
  });

  it("NOT_FOUND for a non-existent id", async () => {
    await expect(
      as(owner).member.updateRole({ id: 99999, role: "admin" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each(["admin", "developer", "readonly"] as const)(
    "%s gets FORBIDDEN (owner only)",
    async (role) => {
      const user = { admin, developer, readonly }[role];
      await expect(
        as(user).member.updateRole({ id: developer.id, role: "owner" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(await roleOf(developer.id)).toBe("developer");
    },
  );
});

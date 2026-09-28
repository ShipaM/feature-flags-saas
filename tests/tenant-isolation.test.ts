import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth/session";
import { db } from "@/server/db/client"; // Use the DB client directly in tests
import { flags, organizations, projects, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/trpc";

// Create a caller for the real application router
const createCaller = createCallerFactory(appRouter);

// Create a caller that acts as a specific user
const as = (user: SessionUser) =>
  createCaller({ db, session: { user }, headers: new Headers() });

let userA: SessionUser;
let userB: SessionUser;
let projectB: number;
let flagA: number;
let flagB: number;

beforeAll(async () => {
  // Start with a clean database and predictable IDs
  await db.execute(
    sql`TRUNCATE organizations, users, sessions, accounts,
verifications, projects, flags, api_keys, audit_logs RESTART IDENTITY CASCADE`,
  );

  // Create two separate tenants
  const [orgA, orgB] = await db
    .insert(organizations)
    .values([{ name: "Org A" }, { name: "Org B" }])
    .returning();

  // Create one project for each tenant
  const [pA, pB] = await db
    .insert(projects)
    .values([
      { organizationId: orgA.id, name: "A app" },
      { organizationId: orgB.id, name: "B app" },
    ])
    .returning();

  // Save B's project ID for cross-tenant tests
  projectB = pB.id;

  // Create one owner in each organization
  [userA, userB] = await db
    .insert(users)
    .values([
      { organizationId: orgA.id, name: "A", email: "a@a.test", role: "owner" },
      { organizationId: orgB.id, name: "B", email: "b@b.test", role: "owner" },
    ])
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      organizationId: users.organizationId,
    });

  // Create one flag for each project
  const [fA, fB] = await db
    .insert(flags)
    .values([
      { projectId: pA.id, key: "a-flag", environment: "prod", enabled: false },
      { projectId: pB.id, key: "b-flag", environment: "prod", enabled: false },
    ])
    .returning();

  // Save flag IDs for the tests
  flagA = fA.id;
  flagB = fB.id;
});

afterAll(async () => {
  // Close the database connection after all tests
  await db.$client.end();
});

describe("cross-tenant access is impossible", () => {
  it("list: A видит только свои флаги", async () => {
    // User A should only see flags from tenant A
    const list = await as(userA).flag.list();

    expect(list.map((f) => f.id)).toEqual([flagA]);
  });

  it("toggle: A не может переключить флаг B, подставив его id", async () => {
    // User A must not be able to modify tenant B's flag
    await expect(as(userA).flag.toggle({ id: flagB })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Verify that the database was not changed
    const [row] = await db.select().from(flags).where(eq(flags.id, flagB));
    expect(row.enabled).toBe(false);
  });

  it("delete: A не может удалить флаг B", async () => {
    // User A must not be able to delete tenant B's flag
    await expect(as(userA).flag.delete({ id: flagB })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Verify that the flag still exists
    const rows = await db.select().from(flags).where(eq(flags.id, flagB));
    expect(rows).toHaveLength(1);
  });

  it("create: A не может создать флаг в проекте B", async () => {
    // User A must not create a flag in another tenant's project
    await expect(
      as(userA).flag.create({
        projectId: projectB,
        key: "evil",
        environment: "prod",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("project.byId: A не видит проект B", async () => {
    // User A must not access another tenant's project
    await expect(
      as(userA).project.byId({ id: projectB }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("organizationId из тела запроса игнорируется", async () => {
    // The server must use the user's tenant, not a client-provided org ID
    const created = await as(userA).project.create({
      name: "sneaky",
      organizationId: userB.organizationId, // Extra malicious field
    } as never);

    // The project must belong to user A's organization
    expect(created.organizationId).toBe(userA.organizationId);
  });

  it("контроль: B может переключить свой флаг", async () => {
    // Control test: users can modify their own tenant's data
    const updated = await as(userB).flag.toggle({ id: flagB });

    expect(updated.enabled).toBe(true);
  });
});

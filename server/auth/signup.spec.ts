import { eq, sql } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createOrganizationWithOwner } from "@/server/auth/signup";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db/client";
import { isUniqueViolation } from "@/server/db/errors";
import { accounts, organizations, users } from "@/server/db/schema";
import { signupSchema } from "@/shared/schemas/signup";

const valid = {
  organizationName: "Acme Inc.",
  name: "Jane Doe",
  email: "jane@acme.test",
  password: "correct-horse-battery",
};

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organizations, users RESTART IDENTITY CASCADE`);
});

describe("createOrganizationWithOwner", () => {
  it("creates the organization, the owner and a password login", async () => {
    const res = await createOrganizationWithOwner(signupSchema.parse(valid));

    const [org] = await db.select().from(organizations);

    expect(org).toMatchObject({ id: res.organizationId, name: "Acme Inc." });

    const [user] = await db.select().from(users);

    expect(user).toMatchObject({
      organizationId: org.id,
      role: "owner",
      email: "jane@acme.test",
    });

    // the password is stored as a hash and can be verified
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id));
    expect(account.providerId).toBe("credential");
    expect(account.password).not.toBe(valid.password);
    expect(
      await verifyPassword({
        hash: account.password!,
        password: valid.password,
      }),
    ).toBe(true);
  });

  it("the new owner can sign in through Better Auth", async () => {
    await createOrganizationWithOwner(signupSchema.parse(valid));

    const res = await auth.api.signInEmail({
      body: { email: valid.email, password: valid.password },
      headers: new Headers(),
    });

    expect(res.user.email).toBe(valid.email);
  });

  it("duplicate email -> unique violation and NO orphan organization", async () => {
    await createOrganizationWithOwner(signupSchema.parse(valid));

    const second = createOrganizationWithOwner(
      signupSchema.parse({ ...valid, organizationName: "Other Co" }),
    );

    await expect(second).rejects.toSatisfy(isUniqueViolation);

    const orgs = await db.select().from(organizations);

    expect(orgs).toHaveLength(1); // the second organization was rolled back
    expect(orgs[0].name).toBe("Acme Inc.");
  });

  it("each sign-up gets its own organization (tenants are separate)", async () => {
    const a = await createOrganizationWithOwner(signupSchema.parse(valid));
    const b = await createOrganizationWithOwner(
      signupSchema.parse({ ...valid, email: "bob@other.test" }),
    );

    expect(a.organizationId).not.toBe(b.organizationId);
  });
});

describe("Better Auth's own sign-up stays closed", () => {
  it("POST /api/auth/sign-up/email does not create a user", async () => {
    const res = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "hacker@evil.test",
          password: "correct-horse-battery",
          name: "Hacker",
          organizationId: 1,
          role: "owner",
        }),
      }),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.select().from(users)).toHaveLength(0);
  });
});

describe("signupSchema", () => {
  it("lowercases and trims the email, trims names", () => {
    const parsed = signupSchema.parse({
      ...valid,
      email: "  Jane@Acme.TEST ",
      name: "  Jane ",
    });

    expect(parsed.email).toBe("jane@acme.test");
    expect(parsed.name).toBe("Jane");
  });

  it.each([
    ["empty organization", { organizationName: "   " }],
    ["empty name", { name: "" }],
    ["bad email", { email: "not-an-email" }],
    ["short password (11)", { password: "a".repeat(11) }],
    ["too long password (129)", { password: "a".repeat(129) }],
  ])("rejects %s", (_title, patch) => {
    expect(signupSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

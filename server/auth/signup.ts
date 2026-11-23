import { hashPassword } from "better-auth/crypto";
import { db } from "@/server/db/client"; // not "@/server/db": tests run outside Next.js
import { accounts, organizations, users } from "@/server/db/schema";
import type { SignupInput } from "@/shared/schemas/signup";

// Self-service onboarding: a new organization and its first user (the owner).
//
// Why not Better Auth's own sign-up? It can only create a bare user, and a user
// MUST belong to an organization. So public sign-up stays disabled in config.ts
// (/api/auth/sign-up/email is closed) and this is the ONLY way to register.
//
// Everything runs in ONE transaction: if the email is already taken, the
// organization is rolled back too (no orphan organizations).
// Throws a Postgres unique violation for a duplicate email (see isUniqueViolation).
export async function createOrganizationWithOwner(input: SignupInput) {
  // Hash before the transaction: hashing is deliberately slow
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: input.organizationName })
      .returning();

    const [owner] = await tx
      .insert(users)
      .values({
        organizationId: org.id,
        name: input.name,
        email: input.email,
        role: "owner",
      })
      .returning({ id: users.id, email: users.email });

    // How Better Auth stores "email + password" login (same as in the old seed)
    await tx.insert(accounts).values({
      userId: owner.id,
      accountId: String(owner.id),
      providerId: "credential",
      password: passwordHash,
    });

    return { organizationId: org.id, userId: owner.id, email: owner.email };
  });
}

import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { accounts, flags, organizations, projects, users } from "./schema";
const PASSWORD = "password123"; // dev only! Same password for every seeded user
type Role = (typeof users.$inferInsert)["role"] & string;
type Environment = (typeof flags.$inferInsert)["environment"];
const ENVIRONMENTS: Environment[] = ["dev", "staging", "prod"];
type OrgSeed = {
  name: string;
  emailDomain: string; // users get `${role}@${emailDomain}`
  roles: Role[];
  projectName: string;
  flag: { key: string; description: string };
};
// Two organizations = two tenants. With only one org a cross-tenant leak is invisible.
// Acme goes FIRST so its ids stay the same as before (org 1, project 1, users 1-4, flags 1-3).
const ORGS: OrgSeed[] = [
  {
    name: "Acme Inc",
    emailDomain: "acme.test",
    roles: ["owner", "admin", "developer", "readonly"], // one user per role
    projectName: "Main App",
    flag: { key: "new-dashboard", description: "Show a new dashboard" },
  },
  {
    name: "Globex",
    emailDomain: "globex.test",
    roles: ["owner", "developer"],
    projectName: "Globex App",
    // Acme users must NEVER see this flag (day 5: tenant isolation)
    flag: { key: "globex-secret-flag", description: "Globex-only flag" },
  },
];
async function seed() {
  // Hash once: scrypt is slow on purpose, and the password is the same for everyone
  const password = await hashPassword(PASSWORD);
  // One transaction: if anything fails, the DB is not left half-seeded
  const result = await db.transaction(async (tx) => {
    // Empty ALL tables and restart ids from 1, so seed can be re-run and ids are predictable
    await tx.execute(
      sql`TRUNCATE organizations, users, sessions, accounts, verifications, projects, flags,
api_keys, audit_logs
RESTART IDENTITY CASCADE`,
    );
    const summary = [];
    for (const orgSeed of ORGS) {
      const [org] = await tx
        .insert(organizations)
        .values({ name: orgSeed.name })
        .returning();
      const [project] = await tx
        .insert(projects)
        .values({ organizationId: org.id, name: orgSeed.projectName })
        .returning();
      const createdUsers = await tx
        .insert(users)
        .values(
          orgSeed.roles.map((role) => ({
            organizationId: org.id,
            name: `${orgSeed.name} ${role}`,
            email: `${role}@${orgSeed.emailDomain}`,
            role,
          })),
        )
        .returning({ id: users.id, email: users.email, role: users.role });
      // Password lives in `accounts` (providerId "credential"), hashed the same way Better Auth does it
      await tx.insert(accounts).values(
        createdUsers.map((user) => ({
          userId: user.id,
          accountId: String(user.id),
          providerId: "credential",
          password,
        })),
      );
      // The same flag in every environment, so the Read-only filter (prod only) is visible
      const createdFlags = await tx
        .insert(flags)
        .values(
          ENVIRONMENTS.map((environment) => ({
            projectId: project.id,
            key: orgSeed.flag.key,
            description: orgSeed.flag.description,
            enabled: environment !== "prod",
            rollout: 50,
            environment,
          })),
        )
        .returning({ id: flags.id, environment: flags.environment });
      summary.push({ org, project, users: createdUsers, flags: createdFlags });
    }
    return summary;
  });
  console.dir(result, { depth: null });
  console.log(`Password for all users: ${PASSWORD}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

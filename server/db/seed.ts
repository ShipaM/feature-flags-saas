import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { accounts, flags, organizations, projects, users } from "./schema";
const PASSWORD = "password123"; // dev only!
async function seed() {
  // Empty ALL tables and restart ids from 1, so seed can be re-run and ids are predictable
  await db.execute(
    sql`TRUNCATE organizations, users, sessions, accounts, verifications, projects, flags, api_keys, audit_logs
RESTART IDENTITY CASCADE`,
  );
  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Inc" })
    .returning();
  const [project] = await db
    .insert(projects)
    .values({ organizationId: org.id, name: "Main App" })
    .returning();
  // One user per role
  const createdUsers = await db
    .insert(users)
    .values(
      (["owner", "admin", "developer", "readonly"] as const).map((role) => ({
        organizationId: org.id,
        name: role,
        email: `${role}@acme.test`,
        role,
      })),
    )
    .returning({ id: users.id, email: users.email, role: users.role });
  // Password lives in `accounts` (providerId "credential"), hashed the same way Better Auth does it
  const password = await hashPassword(PASSWORD);
  await db.insert(accounts).values(
    createdUsers.map((user) => ({
      userId: user.id,
      accountId: String(user.id),
      providerId: "credential",
      password,
    })),
  );
  // The same flag in every environment, so the Read-only filter is visible
  const createdFlags = await db
    .insert(flags)
    .values(
      (["dev", "staging", "prod"] as const).map((environment) => ({
        projectId: project.id,
        key: "new-dashboard",
        description: "Show a new dashboard",
        enabled: environment !== "prod",
        rollout: 50,
        environment,
      })),
    )
    .returning({ id: flags.id, environment: flags.environment });
  console.log("Seed done:", { org, project, createdUsers, createdFlags });
  console.log(`Password for all users: ${PASSWORD}`);
}
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

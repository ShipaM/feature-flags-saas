import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./client";
import {
  apiKeys,
  auditLogs,
  flags,
  organizations,
  projects,
  users,
} from "./schema";
const PASSWORD = "password123"; // dev only!
async function seed() {
  // Clean tables (children first, because of foreign keys), so seed can be re-run
  await db.delete(auditLogs);
  await db.delete(apiKeys);
  await db.delete(flags);
  await db.delete(users);
  await db.delete(projects);
  await db.delete(organizations);
  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Inc" })
    .returning();
  const [project] = await db
    .insert(projects)
    .values({ organizationId: org.id, name: "Main App" })
    .returning();
  // One user per role, all with the same password
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const createdUsers = await db
    .insert(users)
    .values(
      (["owner", "admin", "developer", "readonly"] as const).map((role) => ({
        organizationId: org.id,
        email: `${role}@acme.test`,
        passwordHash,
        role,
      })),
    )
    .returning({ email: users.email, role: users.role });
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

import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { accounts, flags, organizations, projects, users } from "./schema";

// Development only: all seeded users use the same password
const PASSWORD = "password123";

type Role = (typeof users.$inferInsert)["role"] & string;

type Environment = (typeof flags.$inferInsert)["environment"];

// Seed flags for all supported environments
const ENVIRONMENTS: Environment[] = ["dev", "staging", "prod"];

type OrgSeed = {
  name: string;
  emailDomain: string; // Users are created as `${role}@${emailDomain}`
  roles: Role[];
  projectName: string;
  flag: { key: string; description: string };
};

// Two organizations are needed to test tenant isolation
// Acme goes first so its IDs remain predictable
const ORGS: OrgSeed[] = [
  {
    name: "Acme Inc",
    emailDomain: "acme.test",
    roles: ["owner", "admin", "developer", "readonly"], // One user per role
    projectName: "Main App",
    flag: {
      key: "new-dashboard",
      description: "Show a new dashboard",
    },
  },
  {
    name: "Globex",
    emailDomain: "globex.test",
    roles: ["owner", "developer"],
    projectName: "Globex App",
    // Used to verify that Acme users cannot access another tenant's data
    flag: {
      key: "globex-secret-flag",
      description: "Globex-only flag",
    },
  },
];

async function seed() {
  // Hash the shared password once before creating users
  const password = await hashPassword(PASSWORD);

  // Use one transaction so a failure rolls back the entire seed
  const result = await db.transaction(async (tx) => {
    // Clear existing data and reset IDs for predictable seed results
    await tx.execute(
      sql`TRUNCATE organizations, users, sessions, accounts, verifications, projects, flags,
api_keys, audit_logs
RESTART IDENTITY CASCADE`,
    );

    const summary = [];

    // Create each organization and all of its related data
    for (const orgSeed of ORGS) {
      // Create the organization
      const [org] = await tx
        .insert(organizations)
        .values({ name: orgSeed.name })
        .returning();

      // Create the organization's project
      const [project] = await tx
        .insert(projects)
        .values({
          organizationId: org.id,
          name: orgSeed.projectName,
        })
        .returning();

      // Create one user for each configured role
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
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
        });

      // Store the hashed password in the Better Auth credential account
      await tx.insert(accounts).values(
        createdUsers.map((user) => ({
          userId: user.id,
          accountId: String(user.id),
          providerId: "credential",
          password,
        })),
      );

      // Create the same flag for each environment
      const createdFlags = await tx
        .insert(flags)
        .values(
          ENVIRONMENTS.map((environment) => ({
            projectId: project.id,
            key: orgSeed.flag.key,
            description: orgSeed.flag.description,

            // Enable dev/staging and disable production by default
            enabled: environment !== "prod",

            // Seed a 50% rollout for every environment
            rollout: 50,
            environment,
          })),
        )
        .returning({
          id: flags.id,
          environment: flags.environment,
        });

      // Keep created records for the final seed summary
      summary.push({
        org,
        project,
        users: createdUsers,
        flags: createdFlags,
      });
    }

    return summary;
  });

  // Print all created records
  console.dir(result, { depth: null });

  // Print the shared development password
  console.log(`Password for all users: ${PASSWORD}`);
}

// Run the seed and exit with the appropriate status code
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

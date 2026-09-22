import "dotenv/config";
import { db } from "./client";
import { organizations, projects, flags } from "./schema";

async function seed() {
  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Inc" })
    .returning();
  const [project] = await db
    .insert(projects)
    .values({ organizationId: org.id, name: "Main App" })
    .returning();
  const [flag] = await db
    .insert(flags)
    .values({
      projectId: project.id,
      key: "new-dashboard",
      description: "Show a new dashboard",
      enabled: true,
      rollout: 50,
      environment: "dev",
    })
    .returning();
  console.log("Seed done:", { org, project, flag });
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { caller } from "@/lib/trpc/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectsPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  const projects = await caller.project.list();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Projects</h1>

      {projects.length === 0 && (
        <p className="text-muted-foreground">No projects yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { caller } from "@/lib/trpc/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectsPage() {
  // 1) No session -> redirect to login. The layout checks too, but layout and page
  // render in parallel, so the page must not rely on it; the call is cached per request
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  // 2) Direct server-side procedure call. The backend scopes the result to the user's organization (ctx.tenant.byOrg), so we don't filter by hand
  const projects = await caller.project.list();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Projects</h1>

      {/* Empty state */}
      {projects.length === 0 && (
        <p className="text-muted-foreground">No projects yet.</p>
      )}

      {/* Two-column grid of project cards, each linking to its project page */}
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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { caller } from "@/lib/trpc/server";
import { getCurrentSession } from "@/server/auth/session";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export default async function OrganizationsPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  const [org, projects] = await Promise.all([
    caller.organization.current(),
    caller.project.list(),
  ]);

  // v1: one user = one organization (ADR-001).
  // A real switcher needs a `memberships` table and an "active organization" in the session.
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <Card>
        <CardHeader>
          <CardTitle>{org.name}</CardTitle>
          <CardDescription>Your current organization</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Created {format(org.createdAt, "dd.MM.yyyy")} · {projects.length}{" "}
          project(s)
        </CardContent>
      </Card>
    </main>
  );
}

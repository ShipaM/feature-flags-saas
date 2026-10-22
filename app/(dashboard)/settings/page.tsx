import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { caller } from "@/lib/trpc/server";
import { hasRole } from "@/server/auth/roles";
import { getCurrentSession } from "@/server/auth/session";
import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CardSkeleton, MembersTable } from "../_components";

// Streams in on its own, so the members table starts loading without waiting for it
async function OrganizationCard() {
  const org = await caller.organization.current();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{org.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Created {format(org.createdAt, "dd.MM.yyyy")}
      </CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  if (!hasRole(session.user.role, "admin")) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Suspense fallback={<CardSkeleton withContent />}>
        <OrganizationCard />
      </Suspense>
      <MembersTable />
    </main>
  );
}

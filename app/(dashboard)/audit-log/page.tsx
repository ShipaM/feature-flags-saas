import { notFound, redirect } from "next/navigation";
import { hasRole } from "@/server/auth/roles";
import { getCurrentSession } from "@/server/auth/session";
import { AuditLogs } from "../_components";

export default async function AuditLogPage() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  if (!hasRole(session.user.role, "admin")) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <AuditLogs />
    </main>
  );
}

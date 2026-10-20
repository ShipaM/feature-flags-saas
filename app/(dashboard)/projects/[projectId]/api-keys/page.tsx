import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { caller } from "@/lib/trpc/server";
import { hasRole } from "@/server/auth/roles";
import { getCurrentSession } from "@/server/auth/session";
import { ApiKeysPanel } from "../../../_components";

export default async function ApiKeysPage(
  props: PageProps<"/projects/[projectId]/api-keys">,
) {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  if (!hasRole(session.user.role, "admin")) notFound();

  const { projectId } = await props.params;

  const id = Number(projectId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const project = await caller.project.byId({ id }).catch((e: unknown) => {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") return null;
    throw e;
  });

  if (!project) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">API keys · {project.name}</h1>
      <ApiKeysPanel projectId={project.id} />
    </main>
  );
}

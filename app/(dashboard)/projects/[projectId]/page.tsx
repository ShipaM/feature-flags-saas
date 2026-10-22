import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { getCurrentSession } from "@/server/auth/session";
import { caller } from "@/lib/trpc/server";
import { FlagList } from "../../_components";

export default async function ProjectFlagsPage(
  props: PageProps<"/projects/[projectId]">,
) {
  // Cached per request, shared with the layout and the tRPC caller
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  // In Next.js 15/16 params is a Promise and must be awaited
  const { projectId } = await props.params;

  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  // byId throws NOT_FOUND both for a missing project and for another org's project.
  // Any other error (DB down, UNAUTHORIZED) goes to the error boundary
  const project = await caller.project.byId({ id }).catch((e: unknown) => {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") return null;
    throw e;
  });

  if (!project) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <FlagList projectId={project.id} />
    </main>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { hasRole } from "@/server/auth/roles";
import { getCurrentSession } from "@/server/auth/session";
import { FlagTablePlaceholder } from "../../_components";

export default async function ProjectFlagsLoading() {
  // Cached per request (the layout already loaded it), so this adds no query
  const session = await getCurrentSession();
  const canEdit = !!session && hasRole(session.user.role, "admin");

  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8"
    >
      {/* The title is the project name, so it is unknown until the data arrives */}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-64" />
      <FlagTablePlaceholder canEdit={canEdit} />
    </main>
  );
}

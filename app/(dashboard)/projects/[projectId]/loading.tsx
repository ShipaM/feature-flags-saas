import { Skeleton } from "@/components/ui/skeleton";
import { TablePlaceholder } from "../../_components";

export default function ProjectFlagsLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8"
    >
      {/* The title is the project name, so it is unknown until the data arrives */}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-64" />
      <TablePlaceholder columns={5} />
    </main>
  );
}

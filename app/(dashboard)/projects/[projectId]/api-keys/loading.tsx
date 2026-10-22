import { Skeleton } from "@/components/ui/skeleton";
import { TablePlaceholder } from "../../../_components";

export default function ApiKeysLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8"
    >
      <Skeleton className="h-8 w-64" />
      <TablePlaceholder columns={6} />
    </main>
  );
}

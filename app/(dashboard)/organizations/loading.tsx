import { CardSkeleton } from "../_components";

export default function OrganizationsLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8"
    >
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <CardSkeleton withContent />
    </main>
  );
}

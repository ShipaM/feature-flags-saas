import { CardSkeleton, TablePlaceholder } from "../_components";

export default function SettingsLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8"
    >
      <h1 className="text-2xl font-semibold">Settings</h1>
      <CardSkeleton withContent />
      <TablePlaceholder columns={4} />
    </main>
  );
}

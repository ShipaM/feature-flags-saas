import { TablePlaceholder } from "../_components";

export default function AuditLogLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8"
    >
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <TablePlaceholder columns={5} />
    </main>
  );
}

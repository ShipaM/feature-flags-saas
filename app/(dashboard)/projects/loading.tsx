import { CardSkeleton } from "../_components";

export default function ProjectsLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8"
    >
      <h1 className="text-2xl font-semibold">Projects</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

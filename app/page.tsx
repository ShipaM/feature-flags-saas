import { PingCheck, FlagList } from "./_components";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center p-8 gap-4">
      <PingCheck />
      <FlagList />
    </main>
  );
}

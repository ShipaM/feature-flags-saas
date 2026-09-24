import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { FlagList, PingCheck, UserMenu } from "./_components";

export default async function Home() {
  const session = await getSession();
  console.log("session:", session);

  if (!session) redirect("/login"); // not logged in -> login page

  return (
    <main className="flex flex-col items-center justify-center p-8 gap-4">
      <UserMenu user={session.user} />
      <PingCheck />
      <FlagList />
    </main>
  );
}

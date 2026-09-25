import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { FlagList, PingCheck, UserMenu } from "./_components";
import { headers } from "next/headers";

export default async function Home() {
  const session = await getSession(await headers());
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

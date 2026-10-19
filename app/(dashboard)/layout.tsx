import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { UserMenu } from "./_components";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-8 py-4">
        <UserMenu user={session.user} />
        <ModeToggle />
      </header>
      {children}
    </>
  );
}

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { NavLinks, UserMenu } from "./_components";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-8 py-4">
        <NavLinks role={session.user.role} />
        <div className="flex items-center gap-3">
          <UserMenu user={session.user} />
          <ModeToggle />
        </div>
      </header>
      {children}
    </>
  );
}

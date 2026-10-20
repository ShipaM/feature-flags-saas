import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth/config";
import type { SessionUser } from "@/server/auth/session";

export const UserMenu = ({ user }: { user: SessionUser }) => (
  <div className="flex items-center gap-3">
    <span>{user.email}</span>
    <Badge variant="secondary">{user.role}</Badge>
    <form
      action={async () => {
        "use server";
        await auth.api.signOut({ headers: await headers() });
        redirect("/login");
      }}
    >
      <Button type="submit" size="sm" variant="outline">
        <LogOut />
        Log out
      </Button>
    </form>
  </div>
);

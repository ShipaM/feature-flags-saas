import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/auth/config";
import type { SessionUser } from "@/server/auth/session";

// Server Component: shows who is logged in + the "Sign out" button
export const UserMenu = ({ user }: { user: SessionUser }) => (
  <div className="flex items-center gap-3">
    <span>{user.email}</span>
    <Badge variant="secondary">{user.role}</Badge>
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button type="submit" size="sm" variant="outline">
        Sign out
      </Button>
    </form>
  </div>
);

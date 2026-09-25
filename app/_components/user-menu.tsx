import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth/config";
import type { SessionUser } from "@/server/auth/session";

// Server Component: shows who is logged in + the "Sign out" button
export const UserMenu = ({ user }: { user: SessionUser }) => (
  <div className="flex items-center gap-3">
    <span>{user.email}</span>
    <Badge variant="secondary">{user.role}</Badge>
    <form
      action={async () => {
        "use server";
        // Deletes the row in `sessions` and clears the cookie
        await auth.api.signOut({ headers: await headers() });
        redirect("/login");
      }}
    >
      <Button type="submit" size="sm" variant="outline">
        Sign out
      </Button>
    </form>
  </div>
);

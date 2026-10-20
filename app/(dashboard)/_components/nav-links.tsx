import Link from "next/link";
import { hasRole, type Role } from "@/server/auth/roles";
import { LINKS } from "../_constants";

export const NavLinks = ({ role }: { role: Role }) => (
  <nav className="flex items-center gap-4 text-sm">
    {LINKS.filter((l) => hasRole(role, l.minRole)).map((l) => (
      <Link key={l.href} href={l.href} className="hover:underline">
        {l.label}
      </Link>
    ))}
  </nav>
);

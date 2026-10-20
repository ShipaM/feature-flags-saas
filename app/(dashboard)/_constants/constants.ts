import { LinkType } from "../_types";

export const LINKS = [
  { href: "/projects", label: "Projects", minRole: "readonly" },
  { href: "/organizations", label: "Organizations", minRole: "readonly" },
  { href: "/audit-log", label: "Audit log", minRole: "admin" },
  { href: "/settings", label: "Settings", minRole: "admin" },
] as const satisfies readonly LinkType[];

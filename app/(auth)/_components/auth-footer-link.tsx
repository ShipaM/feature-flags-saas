import Link from "next/link";

type AuthFooterLinkProps = { text: string; href: string; label: string };

export const AuthFooterLink = ({ text, href, label }: AuthFooterLinkProps) => (
  <>
    {text}{" "}
    <Link
      href={href}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  </>
);

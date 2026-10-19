import { redirect } from "next/navigation";

// The dashboard lives under /projects; the session check happens there
export default function Home() {
  redirect("/projects");
}

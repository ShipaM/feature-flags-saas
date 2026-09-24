"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/server/auth/config";

// Server Action: runs on the server when the form is submitted
export async function login(formData: FormData) {
  console.log("formData:", formData);
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    // Wrong email/password -> back to the form with an error flag
    if (error instanceof AuthError) redirect("/login?error=1");
    throw error; // IMPORTANT: a successful signIn "throws" a redirect, let it through
  }
}

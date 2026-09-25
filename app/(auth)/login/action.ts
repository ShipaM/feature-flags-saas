"use server";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";

export type LoginState = { error?: string; email?: string };

export async function loginAction(
  _prev: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? ""; // пароль не обрезаем
  if (!email || !password) {
    return { error: "Enter email and password", email };
  }
  try {
    // Checks the password, creates a row in `sessions`, sets the cookie (via nextCookies plugin)
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        error:
          error.status === "UNAUTHORIZED"
            ? "Invalid email or password"
            : "Something went wrong, please try again",
        email,
      };
    }
    throw error;
  }
  redirect("/"); // outside try/catch: redirect() works by throwing
}

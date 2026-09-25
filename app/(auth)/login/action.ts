"use server";

import { signIn } from "@/server/auth/config";
import { AuthError } from "next-auth";

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
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Invalid email or password"
            : "Something went wrong, please try again",
        email,
      };
    }
    throw error; // NEXT_REDIRECT при успешном входе должен пройти дальше
  }

  return {}; // недостижимо: signIn с redirectTo всегда бросает редирект
}

"use server";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { createOrganizationWithOwner } from "@/server/auth/signup";
import { checkRateLimit } from "@/server/cache/rateLimit";
import {
  SIGNUP_LIMIT,
  SIGNUP_WINDOW_SECONDS,
} from "@/server/constants/rateLimit";
import { isUniqueViolation } from "@/server/db/errors";
import { signupSchema } from "@/shared/schemas/signup";

// Values are echoed back so the form does not lose them on an error (never the password)
export type SignupState = {
  error?: string;
  values?: { organizationName: string; name: string; email: string };
};

export async function signupAction(
  _prev: SignupState | null,
  formData: FormData,
): Promise<SignupState> {
  const raw = {
    organizationName: formData.get("organizationName")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };

  const values = {
    organizationName: raw.organizationName,
    name: raw.name,
    email: raw.email,
  };

  // 1) Validate on the server: the browser check is only a convenience
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  // 2) Rate limit by IP (fail-open if Redis is down, like the rest of the app)
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit(
    `signup:${ip}`,
    SIGNUP_LIMIT,
    SIGNUP_WINDOW_SECONDS,
  );

  if (!limit.allowed) {
    return { error: "Too many sign-ups from this address. Try later.", values };
  }

  // 3) Create organization + owner in one transaction
  try {
    await createOrganizationWithOwner(parsed.data);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "This email is already registered", values };
    }
    throw error;
  }

  // 4) Log the new user in (sets the session cookie) and go to the dashboard
  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof APIError) redirect("/login"); // account exists: sign in manually
    throw error;
  }

  redirect("/projects");
}

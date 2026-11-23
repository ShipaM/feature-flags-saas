"use client";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import { loginAction } from "@/app/(auth)/login/action";
import { AuthCard } from "./auth-card";
import { AuthFooterLink } from "./auth-footer-link";
import { FormError } from "./form-error";
import { IconField } from "./icon-field";
import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";
import { useFieldError } from "../hooks/use-field-error";

export const LoginForm = () => {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const { errorId, errorProps } = useFieldError(state?.error);

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage your feature flags"
      action={formAction}
      pending={isPending}
      footer={
        <AuthFooterLink
          text="No account yet?"
          href="/signup"
          label="Create an organization"
        />
      }
    >
      <IconField
        icon={Mail}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        defaultValue={state?.email}
        {...errorProps}
      />
      <PasswordField
        autoComplete="current-password"
        placeholder="••••••••"
        {...errorProps}
      />
      <FormError id={errorId} message={state?.error} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </AuthCard>
  );
};

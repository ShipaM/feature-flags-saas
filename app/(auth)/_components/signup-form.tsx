"use client";
import { useActionState } from "react";
import { Building2, Mail, User } from "lucide-react";
import { signupAction } from "@/app/(auth)/signup/action";
import { AuthCard } from "./auth-card";
import { AuthFooterLink } from "./auth-footer-link";
import { FormError } from "./form-error";
import { IconField } from "./icon-field";
import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";
import { useFieldError } from "../hooks";

export const SignupForm = () => {
  const [state, formAction, isPending] = useActionState(signupAction, null);
  const { errorId, errorProps } = useFieldError(state?.error);

  return (
    <AuthCard
      title="Create your organization"
      description="You will be the owner and can invite your team later"
      action={formAction}
      pending={isPending}
      footer={
        <AuthFooterLink
          text="Already have an account?"
          href="/login"
          label="Sign in"
        />
      }
    >
      <IconField
        icon={Building2}
        label="Organization"
        name="organizationName"
        autoComplete="organization"
        placeholder="Acme Inc."
        maxLength={255}
        defaultValue={state?.values?.organizationName}
        {...errorProps}
      />
      <IconField
        icon={User}
        label="Your name"
        name="name"
        autoComplete="name"
        placeholder="Jane Doe"
        maxLength={255}
        defaultValue={state?.values?.name}
        {...errorProps}
      />
      <IconField
        icon={Mail}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        defaultValue={state?.values?.email}
        {...errorProps}
      />
      <PasswordField
        autoComplete="new-password"
        placeholder="At least 12 characters"
        minLength={12}
        maxLength={128}
        {...errorProps}
      />
      <FormError id={errorId} message={state?.error} />
      <SubmitButton pendingLabel="Creating…">Create organization</SubmitButton>
    </AuthCard>
  );
};

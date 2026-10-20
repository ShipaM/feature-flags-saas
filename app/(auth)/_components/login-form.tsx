"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ToggleRight,
} from "lucide-react";
import { loginAction, type LoginState } from "@/app/(auth)/login/action";
import { inputClass } from "../constants";

export const LoginForm = () => {
  const [state, formAction, isPending] = useActionState<
    LoginState | null,
    FormData
  >(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  const errorRef = useRef<HTMLParagraphElement>(null);
  const errorId = "login-error";
  const hasError = Boolean(state?.error);

  // Focus on error message when it appears
  useEffect(() => {
    if (state?.error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [state?.error]);

  return (
    <div className="relative w-full max-w-sm motion-safe:animate-fade-up">
      {/* Soft glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-px -z-10 rounded-3xl bg-linear-to-br from-violet-500/40 via-transparent to-sky-500/40 blur-xl"
      />

      <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl shadow-violet-500/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/40">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-sky-500 text-white shadow-lg shadow-violet-500/30">
            <ToggleRight aria-hidden className="size-6" />
          </div>
          <h1
            id="login-title"
            className="font-heading text-2xl font-semibold tracking-tight"
          >
            Welcome back
          </h1>
          <p
            id="login-description"
            className="mt-1.5 text-sm text-muted-foreground"
          >
            Sign in to manage your feature flags
          </p>
        </div>

        <form
          action={formAction}
          aria-labelledby="login-title"
          aria-describedby="login-description"
          aria-busy={isPending}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                defaultValue={state?.email}
                required
                aria-required
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                aria-required
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Show password"
                aria-pressed={showPassword}
                aria-controls="password"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="size-4" />
                ) : (
                  <Eye aria-hidden className="size-4" />
                )}
              </button>
            </div>
          </div>

          {state?.error && (
            <p
              ref={errorRef}
              id={errorId}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive outline-none"
            >
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="group mt-1 h-11 rounded-xl bg-linear-to-r from-violet-600 to-sky-500 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/40 hover:brightness-110"
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

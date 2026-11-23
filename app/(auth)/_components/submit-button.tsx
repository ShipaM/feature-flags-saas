"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = { children: ReactNode; pendingLabel: string };

export const SubmitButton = ({ children, pendingLabel }: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="group mt-1 h-11 rounded-xl bg-linear-to-r from-violet-600 to-sky-500 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/40 hover:brightness-110"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </>
      )}
    </Button>
  );
};

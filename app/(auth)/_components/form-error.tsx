"use client";
import { useEffect, useRef } from "react";

type FormErrorProps = { id: string; message?: string };

export const FormError = ({ id, message }: FormErrorProps) => {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <p
      ref={ref}
      id={id}
      tabIndex={-1}
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive outline-none"
    >
      {message}
    </p>
  );
};

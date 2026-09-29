"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Route-level error boundary: renders inside RootLayout, so theme/tRPC providers stay intact.
// In production Next strips the message and only passes `digest` (match it with server logs).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col items-center justify-center p-8 gap-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        The service is temporarily unavailable. Please try again in a moment.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}

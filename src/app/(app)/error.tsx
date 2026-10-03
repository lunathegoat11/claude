"use client";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the opaque digest is reported — never error details that might contain health data.
    if (error.digest) console.error(`Request failed (ref ${error.digest})`);
  }, [error.digest]);
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 text-center">
      <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        We couldn&apos;t load this page. Your data is safe. Please try again
        {error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <Button onClick={reset} className="mt-6">
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}

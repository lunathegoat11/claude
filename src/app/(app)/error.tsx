"use client";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    // Only the opaque digest is reported — never error details that might contain health data.
    if (error.digest) console.error(`Request failed (ref ${error.digest})`);
  }, [error.digest]);
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 text-center">
      <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-[var(--radius)]">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold">{t("app.error.title")}</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        {error.digest ? t("app.error.bodyRef", { ref: error.digest }) : t("app.error.body")}
      </p>
      <Button onClick={reset} className="mt-6">
        <RotateCcw /> {t("app.error.retry")}
      </Button>
    </div>
  );
}

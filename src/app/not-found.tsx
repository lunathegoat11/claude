import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist on Kosha Health.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-8">
      <header className="mx-auto">
        <Link
          href="/"
          aria-label="Kosha Health home"
          className="inline-flex min-h-11 items-center rounded-full"
        >
          <Logo />
        </Link>
      </header>
      <main className="enter mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <span className="glass relative flex size-16 items-center justify-center rounded-full">
          <Compass className="text-primary size-7" />
        </span>
        <p className="figure text-muted-foreground mt-6 text-[15px] font-semibold tracking-wide">
          404
        </p>
        <h1 className="mt-1 text-[28px] font-semibold">This page isn&apos;t here</h1>
        <p className="text-muted-foreground mt-3 text-[15px]">
          The link may be mistyped, or the page or record may have been deleted. Nothing you saved
          was affected.
        </p>
        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">Go to my records</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/">Kosha Health home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

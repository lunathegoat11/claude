import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-2xl">
        <Compass className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold">We couldn&apos;t find that</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        The page or record may have been deleted, or the link may be incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}

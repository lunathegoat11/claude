import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { PLAN_NAME } from "@/lib/pricing";

/** What the Ask tab shows on the free plan. */
export function PlusOnly() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Ask Kosha" />
      <div className="surface flex flex-col items-center gap-4 px-6 py-10 text-center">
        <span className="glass grid size-14 place-items-center rounded-full">
          <Bot className="text-primary size-7" />
        </span>
        <h2 className="text-xl font-semibold">The AI helper is part of {PLAN_NAME}</h2>
        <p className="text-muted-foreground max-w-sm text-[15px]">
          Ask questions about your reports and readings, in plain words, with every answer linked
          to your own records. {PLAN_NAME} also gives you unlimited reports.
        </p>
        <Button asChild>
          <Link href="/settings?tab=plan">See {PLAN_NAME}</Link>
        </Button>
      </div>
    </div>
  );
}

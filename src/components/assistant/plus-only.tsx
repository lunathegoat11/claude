import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { PLAN_NAME } from "@/lib/pricing";
import { getT } from "@/i18n/server";

/** What the Ask tab shows on the free plan. */
export async function PlusOnly() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("nav.assistant")} />
      <div className="surface flex flex-col items-center gap-4 px-6 py-10 text-center">
        <span className="glass grid size-14 place-items-center rounded-full">
          <Bot className="text-primary size-7" />
        </span>
        <h2 className="text-xl font-semibold">{t("app.plus.title", { plan: PLAN_NAME })}</h2>
        <p className="text-muted-foreground max-w-sm text-[15px]">
          {t("app.plus.body", { plan: PLAN_NAME })}
        </p>
        <Button asChild>
          <Link href="/settings?tab=plan">{t("app.plus.see", { plan: PLAN_NAME })}</Link>
        </Button>
      </div>
    </div>
  );
}

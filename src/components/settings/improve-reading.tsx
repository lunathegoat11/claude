"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setImproveReadingAction } from "@/actions/settings";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n/client";

export function ImproveReadingSwitch({ initial }: { initial: boolean }) {
  const t = useT();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span className="block font-medium">{t("account.improve.title")}</span>
        <span className="text-muted-foreground mt-1 block">{t("account.improve.desc")}</span>
      </span>
      <Switch
        checked={on}
        disabled={pending}
        aria-label={t("account.improve.title")}
        onCheckedChange={(next) => {
          setOn(next);
          start(async () => {
            const res = await setImproveReadingAction(next);
            if (res.ok) toast.success(res.message);
            else {
              setOn(!next);
              toast.error(res.error ?? t("account.changeFailed"));
            }
          });
        }}
      />
    </label>
  );
}

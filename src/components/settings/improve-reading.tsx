"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setImproveReadingAction } from "@/actions/settings";
import { Switch } from "@/components/ui/switch";

export function ImproveReadingSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span className="block font-medium">Learn from my corrections</span>
        <span className="text-muted-foreground mt-1 block">
          Optional. When you correct values Kosha read from a report, Kosha compares them with what
          it read, notes only the kind of mistake (for example, that a 7 was read as a 1, or that a
          line like &ldquo;Received&rdquo; isn&apos;t a test), and throws the comparison away at
          once. No values, names, dates or reports are kept for this, and nothing is sent to any
          other company. Your corrected report stays in your records as usual.
        </span>
      </span>
      <Switch
        checked={on}
        disabled={pending}
        aria-label="Learn from my corrections"
        onCheckedChange={(next) => {
          setOn(next);
          start(async () => {
            const res = await setImproveReadingAction(next);
            if (res.ok) toast.success(res.message);
            else {
              setOn(!next);
              toast.error(res.error ?? "Couldn't change this setting");
            }
          });
        }}
      />
    </label>
  );
}

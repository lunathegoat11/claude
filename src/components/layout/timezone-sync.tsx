"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncTimezoneAction } from "@/actions/settings";

/**
 * Dates and times follow the device: if the phone's time zone setting differs from the
 * one saved for this account (for example after travelling), save it and redraw the page.
 */
export function TimezoneSync({ saved }: { saved: string }) {
  const router = useRouter();
  useEffect(() => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!device || device === saved) return;
    syncTimezoneAction(device)
      .then((res) => res.ok && router.refresh())
      .catch(() => undefined); // try again on the next page; nothing to tell the person
  }, [saved, router]);
  return null;
}

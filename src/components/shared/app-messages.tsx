"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

/** One-off confirmations after a page change, keyed by a flag in the address (e.g. ?welcome=1). */
const SUCCESS: Record<string, MessageKey> = {
  welcome: "app.msg.welcome",
  signedout: "app.msg.signedout",
  deleted: "app.msg.deleted",
};

export const OFFLINE_MESSAGE = "You're offline. Check your internet connection and try again.";
export const FAILED_MESSAGE = "Something went wrong. Please try again in a moment.";

/** The two failure messages in the person's language, kept up to date by AppMessages. */
let localized = { offline: OFFLINE_MESSAGE, failed: FAILED_MESSAGE };

/** A plain-language message for an action that failed before the server could answer. */
export function failureMessage() {
  return typeof navigator !== "undefined" && !navigator.onLine
    ? localized.offline
    : localized.failed;
}

/**
 * Shows success messages that arrive with a page change, and an error message whenever
 * something fails without one of its own (no internet, server unreachable), so nothing
 * ever fails silently. Also says when the connection drops and comes back.
 */
export function AppMessages() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(new Set<string>());
  const t = useT();

  useEffect(() => {
    localized = { offline: t("app.msg.offline"), failed: t("app.msg.failed") };
  }, [t]);

  useEffect(() => {
    const key = Object.keys(SUCCESS).find((k) => sp.get(k));
    if (!key || shown.current.has(`${pathname}:${key}`)) return;
    shown.current.add(`${pathname}:${key}`);
    toast.success(t(SUCCESS[key]));
    const next = new URLSearchParams(sp);
    next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [sp, pathname, router, t]);

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const digest = (e.reason as { digest?: string } | undefined)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) return; // navigation, not a failure
      toast.error(failureMessage());
    };
    const offline = () => toast.error(t("app.msg.offline"), { id: "network" });
    const online = () => toast.success(t("app.msg.online"), { id: "network" });
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [t]);
  return null;
}

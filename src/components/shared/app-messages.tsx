"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** One-off confirmations after a page change, keyed by a flag in the address (e.g. ?welcome=1). */
const SUCCESS: Record<string, string> = {
  welcome: "Welcome to Kosha Health! Your account is ready.",
  signedout: "You're signed out. See you soon.",
  deleted: "Your account and everything in it has been deleted.",
};

export const OFFLINE_MESSAGE = "You're offline. Check your internet connection and try again.";
export const FAILED_MESSAGE = "Something went wrong. Please try again in a moment.";

/** A plain-language message for an action that failed before the server could answer. */
export function failureMessage() {
  return typeof navigator !== "undefined" && !navigator.onLine ? OFFLINE_MESSAGE : FAILED_MESSAGE;
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

  useEffect(() => {
    const key = Object.keys(SUCCESS).find((k) => sp.get(k));
    if (!key || shown.current.has(`${pathname}:${key}`)) return;
    shown.current.add(`${pathname}:${key}`);
    toast.success(SUCCESS[key]);
    const next = new URLSearchParams(sp);
    next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [sp, pathname, router]);

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const digest = (e.reason as { digest?: string } | undefined)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) return; // navigation, not a failure
      toast.error(failureMessage());
    };
    const offline = () => toast.error(OFFLINE_MESSAGE, { id: "network" });
    const online = () => toast.success("You're back online.", { id: "network" });
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}

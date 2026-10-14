"use client";
import { useEffect, useState } from "react";
import type { LoadingKind } from "@/lib/loading-messages";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

const SPINNER_AFTER_MS = 1000;
const TEXT_AFTER_MS = 2500;
const NEXT_TEXT_MS = 2200;

/** The words for each kind of wait (the English is also in lib/loading-messages.ts). */
const ALMOST = "app.loading.almost";
const TIMELINE = "app.loading.updatingTimeline";
const LOADING_KEYS: Record<LoadingKind, readonly MessageKey[]> = {
  page: [
    "app.loading.page.1",
    "app.loading.page.2",
    "app.loading.page.3",
    "app.loading.page.4",
    ALMOST,
  ],
  upload: [
    "app.loading.upload.1",
    "app.loading.upload.2",
    "app.loading.upload.3",
    "app.loading.upload.4",
    "app.loading.upload.5",
    "app.loading.upload.6",
    "app.loading.upload.7",
    "app.loading.upload.8",
    "app.loading.upload.9",
    "app.loading.upload.10",
    ALMOST,
  ],
  assistant: [
    "app.loading.assistant.1",
    "app.loading.assistant.2",
    "app.loading.assistant.3",
    "app.loading.assistant.4",
    "app.loading.assistant.5",
    "app.loading.assistant.6",
    ALMOST,
  ],
  save: ["app.loading.save.1", "app.loading.save.2", TIMELINE, ALMOST],
  signIn: ["app.loading.signIn.1", "app.loading.signIn.2", "app.loading.signIn.3", ALMOST],
  signUp: ["app.loading.signUp.1", "app.loading.signUp.2", "app.loading.signUp.3", ALMOST],
  aiKey: ["app.loading.aiKey.1", "app.loading.aiKey.2", "app.loading.aiKey.3", ALMOST],
  export: [
    "app.loading.export.1",
    "app.loading.export.2",
    "app.loading.export.3",
    "app.loading.export.4",
    ALMOST,
  ],
  chart: ["app.loading.chart.1", "app.loading.chart.2", ALMOST],
  document: ["app.loading.document.1", "app.loading.document.2", ALMOST],
  import: ["app.loading.import.1", "app.loading.import.2", "app.loading.import.3", ALMOST],
  email: ["app.loading.email.1", ALMOST],
  signOut: ["app.loading.signOut.1", ALMOST],
  delete: ["app.loading.delete.1", TIMELINE, ALMOST],
};

/**
 * How long something has been loading, as a phase: nothing for the first second, then a
 * spinner, then (after ~2.5 s) a message that changes every couple of seconds and stops
 * on the last one ("Almost there…").
 */
export function useLoadingPhase(active: boolean, kind: LoadingKind = "page") {
  const t = useT();
  const messages = LOADING_KEYS[kind];
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(id);
  }, [active]);
  const spinner = active && elapsed >= SPINNER_AFTER_MS;
  const showText = active && elapsed >= TEXT_AFTER_MS;
  const index = showText
    ? Math.min(messages.length - 1, Math.floor((elapsed - TEXT_AFTER_MS) / NEXT_TEXT_MS))
    : -1;
  return { spinner, message: index >= 0 ? t(messages[index]) : null };
}

/** The iOS-style activity indicator: twelve spokes fading round a circle. */
export function Spinner({
  className,
  label,
  decorative,
}: {
  className?: string;
  label?: string;
  /** Inside a button whose text already says what's happening. */
  decorative?: boolean;
}) {
  const t = useT();
  return (
    <svg
      viewBox="0 0 24 24"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label ?? t("app.loading.label") })}
      className={cn("kosha-spinner text-muted-foreground size-7", className)}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x="11"
          y="1.5"
          width="2"
          height="6"
          rx="1"
          fill="currentColor"
          opacity={0.15 + (i / 12) * 0.85}
          transform={`rotate(${i * 30} 12 12)`}
        />
      ))}
    </svg>
  );
}

/**
 * Shows nothing for a second, then a spinner, then one changing message below it.
 * Use while something is loading; unmount (or pass active={false}) when done.
 */
export function DelayedLoader({
  kind = "page",
  active = true,
  className,
  size = "md",
}: {
  kind?: LoadingKind;
  active?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = useT();
  const { spinner, message } = useLoadingPhase(active, kind);
  if (!spinner) return <div className={className} aria-busy={active || undefined} />;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}
    >
      {/* The spinner sits in a small glass bubble that pops in, like iOS 26 controls. */}
      <span
        className={cn(
          "glass glass-pop relative flex items-center justify-center rounded-full",
          size === "sm" ? "size-10" : "size-14",
        )}
      >
        <Spinner className={size === "sm" ? "size-5" : "size-7"} />
      </span>
      {/* One line at a time; the key makes each new message fade in. */}
      <p
        key={message ?? "none"}
        className={cn(
          "text-muted-foreground min-h-[1.5em] text-[15px]",
          message && "kosha-fade-in",
        )}
      >
        {message ?? <span className="sr-only">{t("app.loading.label")}</span>}
      </p>
    </div>
  );
}

/**
 * Contents for a button that starts something slow: its icon turns into a spinner after a
 * second, and after ~2.5 s its words step through the messages for that kind of wait.
 */
export function BusyContent({
  active,
  kind = "save",
  icon,
  busyLabel,
  children,
}: {
  active: boolean;
  kind?: LoadingKind;
  icon?: React.ReactNode;
  /** Shown while busy, before the changing messages start. */
  busyLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { spinner, message } = useLoadingPhase(active, kind);
  return (
    <>
      {spinner ? <Spinner decorative className="size-4 text-current" /> : icon}
      {message ?? (active ? (busyLabel ?? children) : children)}
    </>
  );
}

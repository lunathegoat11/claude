"use client";
import { useEffect, useState } from "react";
import { LOADING_MESSAGES, type LoadingKind } from "@/lib/loading-messages";
import { cn } from "@/lib/utils";

const SPINNER_AFTER_MS = 1000;
const TEXT_AFTER_MS = 2500;
const NEXT_TEXT_MS = 2200;

/**
 * How long something has been loading, as a phase: nothing for the first second, then a
 * spinner, then (after ~2.5 s) a message that changes every couple of seconds and stops
 * on the last one ("Almost there…").
 */
export function useLoadingPhase(active: boolean, kind: LoadingKind = "page") {
  const messages = LOADING_MESSAGES[kind];
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
  return { spinner, message: index >= 0 ? messages[index] : null };
}

/** The iOS-style activity indicator: twelve spokes fading round a circle. */
export function Spinner({
  className,
  label = "Loading",
  decorative,
}: {
  className?: string;
  label?: string;
  /** Inside a button whose text already says what's happening. */
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
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
  const { spinner, message } = useLoadingPhase(active, kind);
  if (!spinner) return <div className={className} aria-busy={active || undefined} />;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}
    >
      <Spinner className={size === "sm" ? "size-5" : "size-8"} />
      {/* One line at a time; the key makes each new message fade in. */}
      <p
        key={message ?? "none"}
        className={cn(
          "text-muted-foreground min-h-[1.5em] text-[15px]",
          message && "kosha-fade-in",
        )}
      >
        {message ?? <span className="sr-only">Loading</span>}
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

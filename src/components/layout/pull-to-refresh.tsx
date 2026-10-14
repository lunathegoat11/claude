"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/shared/delayed-loader";
import { useT } from "@/i18n/client";

const TRIGGER = 72; // how far (after resistance) a pull must go to reload
const MAX = 120;

/**
 * Pull down hard at the top of a page to reload it, as in iOS apps: a glass bubble with
 * the spinner follows the finger, the phone gives a short tap of vibration when the pull
 * is far enough (Android; iPhones don't let websites vibrate), and the page's data is
 * fetched again on release. Touch screens only; off while a sheet or menu is open.
 */
export function PullToRefresh() {
  const router = useRouter();
  const t = useT();
  const [pull, setPull] = useState(0);
  const [refreshing, startRefresh] = useTransition();
  const [holding, setHolding] = useState(false);
  const start = useRef<number | null>(null);
  const armed = useRef(false);
  const pullRef = useRef(0);

  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = "contain"; // stop the browser's own pull-to-refresh
    const blocked = () =>
      window.scrollY > 0 ||
      document.body.hasAttribute("data-scroll-locked") || // a sheet or menu is open
      !!document.querySelector("[role=dialog]");

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked()) return;
      start.current = e.touches[0].clientY;
      armed.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        start.current = dy <= 0 ? e.touches[0].clientY : null;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      if (e.cancelable) e.preventDefault(); // the page stays put while pulling
      const p = Math.min(MAX, dy * 0.5);
      pullRef.current = p;
      setPull(p);
      if (p >= TRIGGER && !armed.current) {
        armed.current = true;
        navigator.vibrate?.(12);
      } else if (p < TRIGGER) armed.current = false;
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      const go = pullRef.current >= TRIGGER;
      pullRef.current = 0;
      setPull(0);
      if (!go) return;
      setHolding(true);
      startRefresh(() => router.refresh());
      // Keep the spinner up long enough to be seen, even when the reload is instant.
      window.setTimeout(() => setHolding(false), 700);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      html.style.overscrollBehaviorY = before;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const busy = refreshing || holding;
  const offset = busy ? TRIGGER : pull;
  if (!busy && pull <= 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 flex justify-center"
      style={{
        transform: `translateY(${offset}px)`,
        transition:
          start.current === null ? "transform 320ms cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
    >
      <span
        className="glass relative flex size-11 items-center justify-center rounded-full"
        style={{
          opacity: busy ? 1 : Math.min(1, pull / TRIGGER),
          transform: busy ? undefined : `rotate(${(pull / TRIGGER) * 270}deg)`,
        }}
      >
        <Spinner
          className={busy ? "size-6" : "size-6 [animation:none]"}
          label={busy ? t("app.shell.refreshing") : t("app.shell.pull")}
        />
      </span>
    </div>
  );
}

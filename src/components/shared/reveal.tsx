"use client";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades its content up once as it scrolls into view, like sections on apple.com.
 * CSS-only animation (transform + opacity); respects reduced motion; renders visible
 * immediately if JavaScript or IntersectionObserver is unavailable.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.shown = "true";
      return;
    }
    el.dataset.shown = "false";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.shown = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // Starts visible (data-shown unset) so the page is fine without JavaScript.
    <Tag ref={ref as never} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}

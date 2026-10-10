import { cn } from "@/lib/utils";

/** A file folder with its tab, and a marigold line where a label would be written. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <path
        d="M4 8.5A2.5 2.5 0 016.5 6h6.4c.7 0 1.36.29 1.83.8L16.6 9H25.5A2.5 2.5 0 0128 11.5v13a2.5 2.5 0 01-2.5 2.5h-19A2.5 2.5 0 014 24.5v-16z"
        className="fill-primary"
      />
      <rect x="9" y="17" width="14" height="2.6" rx="1.3" className="fill-marigold" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[1.375rem] font-semibold">Kosha</span>
    </span>
  );
}

import { cn } from "@/lib/utils";

/** A rounded folder with a label line: the family health file. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M7.5 11.2A1.7 1.7 0 019.2 9.5h4.1c.5 0 .95.2 1.27.56L16.1 11.6h6.7a1.7 1.7 0 011.7 1.7v8.5a1.7 1.7 0 01-1.7 1.7H9.2a1.7 1.7 0 01-1.7-1.7V11.2z"
        fill="#fff"
      />
      <rect x="11" y="16.2" width="10" height="2" rx="1" className="fill-primary" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={compact ? "size-7" : undefined} />
      <span className={cn("font-display font-semibold", compact ? "text-[17px]" : "text-[19px]")}>
        Kosha
        {/* The full name, Kosha Health; on small phones the compact bar shows just "Kosha". */}
        <span className={cn("text-muted-foreground font-medium", compact && "max-sm:hidden")}>
          {" "}
          Health
        </span>
      </span>
    </span>
  );
}

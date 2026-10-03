import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M9 10.5c0-.83.67-1.5 1.5-1.5h11c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5h-11A1.5 1.5 0 019 21.5v-11z"
        className="fill-primary-foreground/18"
      />
      <path
        d="M8 17h4.2l2-4.5 3.4 8 2-3.5H24"
        fill="none"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">Kosha</span>
    </span>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(pathname === "/search" ? (params.get("q") ?? "") : "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v) router.push(`/search?q=${encodeURIComponent(v)}`);
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        aria-label="Search your health records"
        placeholder="Search…"
        className="bg-secondary placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-ring/20 h-9 w-full rounded-full border border-transparent pr-10 pl-9 text-[16px] transition outline-none focus:ring-4 pointer-coarse:h-11 pointer-fine:text-[15px]"
      />
      <kbd className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 text-[12px] sm:block">
        /
      </kbd>
    </form>
  );
}

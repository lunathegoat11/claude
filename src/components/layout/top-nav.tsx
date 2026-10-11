"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav-items";
import { cn } from "@/lib/utils";

/** Desktop navigation: one quiet row of text links, like apple.com's global nav. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {NAV_ITEMS.filter((i) => i.href !== "/settings").map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-[14px] whitespace-nowrap transition-colors duration-200",
              active
                ? "text-foreground bg-secondary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.short ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}

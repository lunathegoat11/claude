"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { MOBILE_PRIMARY, NAV_ITEMS, isActive } from "./nav-items";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const more = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));
  const moreActive = more.some((i) => isActive(pathname, i.href));

  return (
    <>
      {/* A floating glass capsule, like the tab bar in iOS 26. Taps around it reach the page. */}
      <nav
        aria-label="Main"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="glass pointer-events-auto mx-auto grid h-[3.875rem] max-w-md grid-cols-5 gap-0.5 rounded-full p-1">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-200",
                    active
                      ? "text-primary bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]"
                      : "text-foreground/70",
                  )}
                >
                  <item.icon className="size-[1.375rem]" strokeWidth={active ? 2 : 1.6} />
                  {item.short ?? item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-200",
                moreActive
                  ? "text-primary bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]"
                  : "text-foreground/70",
              )}
            >
              <MoreHorizontal className="size-[1.375rem]" strokeWidth={1.6} />
              More
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>More</DialogTitle>
          <DialogDescription className="sr-only">Other sections</DialogDescription>
          <ul className="grid gap-2">
            {more.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "hover:bg-muted flex items-center gap-3 rounded-xl px-3 py-3 text-[17px] transition-colors",
                    isActive(pathname, item.href) && "bg-accent text-accent-foreground",
                  )}
                >
                  <item.icon className="text-primary size-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

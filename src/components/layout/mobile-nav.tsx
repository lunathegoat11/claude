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
      <nav
        aria-label="Main"
        className="bg-card/90 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-lg lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
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
                "flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="size-[22px]" />
              More
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>More</DialogTitle>
          <DialogDescription className="sr-only">Other sections</DialogDescription>
          <ul className="grid grid-cols-2 gap-2">
            {more.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "hover:bg-muted flex flex-col gap-3 rounded-xl border p-4 text-sm font-medium transition-colors",
                    isActive(pathname, item.href) &&
                      "border-primary/40 bg-accent text-accent-foreground",
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

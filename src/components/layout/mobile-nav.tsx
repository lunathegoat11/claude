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
        className="bg-card/85 supports-[backdrop-filter]:bg-card/70 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-black/5 backdrop-blur-xl backdrop-saturate-150 lg:hidden dark:border-white/10"
      >
        <ul className="mx-auto grid h-[3.25rem] max-w-lg grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 border-t-[3px] text-[12px] font-medium",
                    active
                      ? "border-primary text-primary"
                      : "text-muted-foreground border-transparent",
                  )}
                >
                  <item.icon className="size-6" strokeWidth={active ? 2 : 1.6} />
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
                "flex h-full w-full flex-col items-center justify-center gap-0.5 border-t-[3px] text-[12px] font-medium",
                moreActive
                  ? "border-primary text-primary"
                  : "text-muted-foreground border-transparent",
              )}
            >
              <MoreHorizontal className="size-6" strokeWidth={1.6} />
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

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload } from "lucide-react";
import { NAV_ITEMS, isActive } from "./nav-items";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="rounded-md" aria-label="Kosha home">
          <Logo />
        </Link>
      </div>
      <div className="px-4 pt-2 pb-4">
        <Button asChild className="w-full">
          <Link href="/documents?upload=1">
            <Upload /> Add a report
          </Link>
        </Button>
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto pr-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // The active section reads like the tab of an open file.
                "group flex items-center gap-3 rounded-r-md border-l-[3px] py-2.5 pr-3 pl-[21px] text-[15px] font-medium transition-colors",
                active
                  ? "border-primary bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60 border-transparent",
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px]",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="text-muted-foreground px-6 py-5 text-[13px] leading-snug">
        Kosha keeps your records in order. It doesn&apos;t give medical advice, so talk to your
        doctor about what results mean for you.
      </p>
    </aside>
  );
}

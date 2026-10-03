"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav-items";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="rounded-lg" aria-label="Kosha dashboard">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
      <div className="bg-card text-muted-foreground m-3 rounded-xl border p-3.5 text-[12.5px] leading-relaxed">
        Kosha organises your records. It does not give medical advice — always consult a qualified
        doctor.
      </div>
    </aside>
  );
}

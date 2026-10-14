"use client";
import { useT } from "@/i18n/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal, Phone } from "lucide-react";
import { MOBILE_PRIMARY, NAV_ITEMS, isActive } from "./nav-items";
import { signOutAction } from "@/actions/auth";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const tap = () => navigator.vibrate?.(8); // a light tick on Android; iPhones ignore it

/**
 * The bottom bar, in the style of apps like Bevel: a floating glass capsule with a glass
 * "lens" that springs to the tab you touch. The lens moves the instant your finger lands
 * (before the next page has loaded), so the bar always feels immediate.
 */
export function MobileNav() {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const more = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));
  const fromPath = () => {
    const i = primary.findIndex((item) => isActive(pathname, item.href));
    return i >= 0 ? i : more.some((m) => isActive(pathname, m.href)) ? primary.length : -1;
  };
  const [active, setActive] = useState(fromPath);
  // Follow the address when it changes (back button, links elsewhere in the page).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setActive(fromPath()), [pathname]);
  const slots = primary.length + 1;

  const item = (i: number, isOn: boolean) =>
    cn(
      "relative z-10 flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium",
      "transition-[color,transform] duration-150 ease-out active:scale-90",
      isOn ? "text-primary" : "text-foreground/70",
    );

  return (
    <>
      <nav
        aria-label={t("nav.main")}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul
          className="glass pointer-events-auto relative mx-auto grid h-[3.875rem] max-w-md rounded-full p-1"
          style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}
        >
          {/* The sliding lens. It overshoots a little and settles, like a drop of liquid. */}
          {active >= 0 && (
            <span
              aria-hidden
              className="glass-lens pointer-events-none absolute inset-y-1 left-1 rounded-full"
              style={{
                width: `calc((100% - 0.5rem) / ${slots})`,
                transform: `translateX(${active * 100}%)`,
              }}
            >
              <span key={active} className="glass-lens-squish block size-full rounded-full" />
            </span>
          )}
          {primary.map((nav, i) => {
            const on = active === i;
            return (
              <li key={nav.href} className="min-w-0">
                <Link
                  href={nav.href}
                  aria-current={isActive(pathname, nav.href) ? "page" : undefined}
                  onPointerDown={() => {
                    if (active !== i) tap();
                    setActive(i);
                  }}
                  className={item(i, on)}
                >
                  <nav.icon className="size-[1.375rem]" strokeWidth={on ? 2.1 : 1.6} />
                  <span className="truncate">{t(nav.short ?? nav.label)}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onPointerDown={tap}
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={item(primary.length, active === primary.length)}
            >
              <MoreHorizontal className="size-[1.375rem]" strokeWidth={1.6} />
              {t("nav.more")}
            </button>
          </li>
        </ul>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>{t("nav.more")}</DialogTitle>
          <DialogDescription className="sr-only">{t("nav.moreSections")}</DialogDescription>
          <ul className="grid gap-1">
            {more.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onClick={() => {
                    setActive(primary.length);
                    setOpen(false);
                  }}
                  aria-current={isActive(pathname, m.href) ? "page" : undefined}
                  className={cn(
                    "pressable hover:bg-foreground/5 flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[17px] transition-colors",
                    isActive(pathname, m.href) && "bg-accent text-accent-foreground",
                  )}
                >
                  <m.icon className="text-primary size-5" />
                  {t(m.label)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="grid gap-1 border-t pt-3">
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="pressable hover:bg-foreground/5 flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[17px]"
            >
              <Phone className="text-primary size-5" />
              {t("nav.callUs", { phone: CONTACT_PHONE_DISPLAY })}
            </a>
            <form action={signOutAction}>
              <button
                type="submit"
                className="pressable text-destructive hover:bg-foreground/5 flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-[17px]"
              >
                <LogOut className="size-5" />
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

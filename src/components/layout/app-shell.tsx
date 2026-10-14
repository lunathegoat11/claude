import { LanguageSwitch } from "@/components/shared/language-switch";
import { Suspense } from "react";
import Link from "next/link";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { TimezoneSync } from "./timezone-sync";
import { PullToRefresh } from "./pull-to-refresh";
import { SearchBox } from "./search-box";
import { UserMenu } from "./user-menu";
import { Logo } from "@/components/shared/logo";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifyEmailBanner } from "./verify-email-banner";
import { getT } from "@/i18n/server";

export async function AppShell({
  user,
  children,
}: {
  user: {
    name: string;
    email: string;
    isDemo: boolean;
    emailVerified: boolean;
    timezone: string;
  };
  children: React.ReactNode;
}) {
  const t = await getT();
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="focus:bg-card sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-3 focus:py-2 focus:shadow"
      >
        {t("app.shell.skip")}
      </a>
      <div>
        {/* A glass bar the page scrolls beneath; on computers it floats as a glass panel. */}
        <header className="glass-bar lg:glass sticky top-0 z-20 lg:top-3 lg:mx-4 lg:mt-3 lg:overflow-hidden lg:rounded-[1.75rem] xl:mx-6 2xl:mx-auto 2xl:max-w-[78rem]">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:gap-5 lg:px-8">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 shrink-0 items-center rounded-full"
              aria-label={t("app.shell.home")}
            >
              <Logo compact />
            </Link>
            <TopNav />
            <Suspense fallback={<div className="h-9 flex-1 pointer-coarse:h-11" />}>
              <SearchBox className="max-w-md flex-1 lg:ml-auto lg:max-w-56" />
            </Suspense>
            <div className="flex shrink-0 items-center gap-2">
              {user.isDemo && (
                <Badge variant="demo" className="hidden xl:inline-flex">
                  {t("app.shell.demo")}
                </Badge>
              )}
              <Button asChild size="sm" className="hidden lg:inline-flex">
                <Link href="/documents?upload=1">
                  <Upload /> {t("app.dash.addReport")}
                </Link>
              </Button>
              <UserMenu name={user.name} email={user.email} />
            </div>
          </div>
          {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
        </header>
        <main
          id="main"
          className="enter mx-auto max-w-6xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 lg:px-8 lg:pb-20"
        >
          {children}
          <footer className="text-muted-foreground mt-16 border-t pt-5 text-[12px] leading-relaxed">
            <p>{t("app.shell.disclaimer")}</p>
            <nav aria-label={t("app.shell.legal")} className="mt-1 flex flex-wrap gap-x-4">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="hover:text-foreground py-2 underline-offset-2 hover:underline"
              >
                {t("nav.callUs", { phone: CONTACT_PHONE_DISPLAY })}
              </a>
              <Link
                href="/privacy"
                className="hover:text-foreground py-2 underline-offset-2 hover:underline"
              >
                {t("app.shell.privacy")}
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground py-2 underline-offset-2 hover:underline"
              >
                {t("app.shell.terms")}
              </Link>
              <a
                href="/licenses/THIRD_PARTY_NOTICES.txt"
                className="hover:text-foreground py-2 underline-offset-2 hover:underline"
              >
                {t("app.shell.notices")}
              </a>
              <LanguageSwitch compact />
            </nav>
          </footer>
        </main>
      </div>
      <MobileNav />
      <TimezoneSync saved={user.timezone} />
      <PullToRefresh />
    </div>
  );
}

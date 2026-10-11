import { Suspense } from "react";
import Link from "next/link";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";
import { UserMenu } from "./user-menu";
import { Logo } from "@/components/shared/logo";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifyEmailBanner } from "./verify-email-banner";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; isDemo: boolean; emailVerified: boolean };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="focus:bg-card sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <div>
        {/* Translucent bar, as on apple.com. The blur is limited to this one small sticky element. */}
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-20 border-b border-black/5 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:gap-5 lg:px-8">
            <Link href="/dashboard" className="shrink-0 rounded-full" aria-label="Kosha home">
              <Logo compact />
            </Link>
            <TopNav />
            <Suspense fallback={<div className="h-9 flex-1" />}>
              <SearchBox className="max-w-md flex-1 lg:ml-auto lg:max-w-56" />
            </Suspense>
            <div className="flex shrink-0 items-center gap-2">
              {user.isDemo && (
                <Badge variant="demo" className="hidden xl:inline-flex">
                  Demo
                </Badge>
              )}
              <Button asChild size="sm" className="hidden lg:inline-flex">
                <Link href="/documents?upload=1">
                  <Upload /> Add a report
                </Link>
              </Button>
              <UserMenu name={user.name} email={user.email} />
            </div>
          </div>
          {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
        </header>
        <main
          id="main"
          className="enter mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:px-8 lg:pb-20"
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

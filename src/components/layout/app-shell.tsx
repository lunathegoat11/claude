import { Suspense } from "react";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LogoMark } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; isDemo: boolean };
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
      <Sidebar />
      <div className="lg:pl-64">
        <header className="bg-background/85 sticky top-0 z-20 border-b backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="lg:hidden" aria-label="Kosha dashboard">
              <LogoMark />
            </Link>
            <Suspense fallback={<div className="h-10 flex-1" />}>
              <SearchBox className="max-w-md flex-1" />
            </Suspense>
            <div className="ml-auto flex items-center gap-1.5">
              {user.isDemo && (
                <Badge variant="demo" className="hidden sm:inline-flex">
                  Demo account
                </Badge>
              )}
              <ThemeToggle />
              <UserMenu name={user.name} email={user.email} />
            </div>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16"
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

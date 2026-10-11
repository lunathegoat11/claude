import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/** Centred and quiet, like Apple's sign-in pages: the form is the only thing on screen. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-8 sm:py-12">
      <header className="mx-auto">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full"
          aria-label="Kosha home"
        >
          <Logo />
        </Link>
      </header>
      <main className="enter mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
        <div className="surface p-6 sm:p-9">{children}</div>
      </main>
      <footer className="mx-auto">
        <nav aria-label="Legal" className="text-muted-foreground flex gap-5 text-[13px]">
          <Link href="/privacy" className="hover:text-foreground py-3 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground py-3 hover:underline">
            Terms of Use
          </Link>
        </nav>
      </footer>
    </div>
  );
}

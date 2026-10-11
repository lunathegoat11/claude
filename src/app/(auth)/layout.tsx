import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/** Centred and quiet, like Apple's sign-in pages: the form is the only thing on screen. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-8 sm:py-12">
      <Link href="/" className="mx-auto rounded-full" aria-label="Kosha home">
        <Logo />
      </Link>
      <main className="enter mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
        <div className="surface p-6 sm:p-9">{children}</div>
      </main>
      <nav aria-label="Legal" className="text-muted-foreground mx-auto flex gap-5 text-[13px]">
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">
          Terms of Use
        </Link>
      </nav>
    </div>
  );
}

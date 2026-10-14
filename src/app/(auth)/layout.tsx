import { LanguageSwitch } from "@/components/shared/language-switch";
import Link from "next/link";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { Logo } from "@/components/shared/logo";
import { getT } from "@/i18n/server";

/** Centred and quiet, like Apple's sign-in pages: the form is the only thing on screen. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="flex min-h-dvh flex-col px-4 py-8 sm:py-12">
      <header className="mx-auto">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full"
          aria-label={t("account.auth.home")}
        >
          <Logo />
        </Link>
      </header>
      <main className="enter mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
        <div className="surface p-6 sm:p-9">{children}</div>
      </main>
      <footer className="mx-auto">
        <nav
          aria-label={t("account.auth.footer")}
          className="text-muted-foreground flex flex-wrap justify-center gap-x-5 text-[13px]"
        >
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="hover:text-foreground py-3 hover:underline"
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
          <Link href="/privacy" className="hover:text-foreground py-3 hover:underline">
            {t("account.link.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground py-3 hover:underline">
            {t("account.link.terms")}
          </Link>
          <LanguageSwitch compact />
        </nav>
      </footer>
    </div>
  );
}

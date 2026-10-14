import { LanguageSwitch } from "@/components/shared/language-switch";
import Link from "next/link";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="max-w-xl leading-relaxed">
          Kosha Health helps you organise health information. It does not provide medical diagnosis,
          treatment or emergency services. In an emergency, call 112.
        </p>
        <nav className="flex flex-wrap gap-x-4" aria-label="Contact and legal">
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="hover:text-foreground py-3 hover:underline"
          >
            Call us: {CONTACT_PHONE_DISPLAY}
          </a>
          <Link href="/privacy" className="hover:text-foreground py-3 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground py-3 hover:underline">
            Terms of Use
          </Link>
          <a
            href="/licenses/THIRD_PARTY_NOTICES.txt"
            className="hover:text-foreground py-3 hover:underline"
          >
            Open-source notices
          </a>
          <LanguageSwitch compact />
        </nav>
      </div>
    </footer>
  );
}

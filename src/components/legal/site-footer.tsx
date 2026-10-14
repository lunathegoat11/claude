import { LanguageSwitch } from "@/components/shared/language-switch";
import Link from "next/link";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { getT } from "@/i18n/server";

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="max-w-xl leading-relaxed">{t("marketing.footer.disclaimer")}</p>
        <nav className="flex flex-wrap gap-x-4" aria-label={t("marketing.footer.navLabel")}>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="hover:text-foreground py-3 hover:underline"
          >
            {t("nav.callUs", { phone: CONTACT_PHONE_DISPLAY })}
          </a>
          <Link href="/privacy" className="hover:text-foreground py-3 hover:underline">
            {t("marketing.footer.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground py-3 hover:underline">
            {t("marketing.footer.terms")}
          </Link>
          <a
            href="/licenses/THIRD_PARTY_NOTICES.txt"
            className="hover:text-foreground py-3 hover:underline"
          >
            {t("marketing.footer.notices")}
          </a>
          <LanguageSwitch compact />
        </nav>
      </div>
    </footer>
  );
}

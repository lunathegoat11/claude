import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="max-w-xl leading-relaxed">
          Kosha Health helps you organise health information. It does not provide medical diagnosis,
          treatment or emergency services. In an emergency, call 112.
        </p>
        <nav className="flex flex-wrap gap-x-4" aria-label="Legal">
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
        </nav>
      </div>
    </footer>
  );
}

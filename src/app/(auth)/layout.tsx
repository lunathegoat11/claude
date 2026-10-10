import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,520px)]">
      <div className="bg-sidebar relative hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" aria-label="Kosha home">
          <Logo />
        </Link>
        <div className="max-w-md">
          <h2 className="text-[2.5rem] leading-[1.05] font-semibold text-balance">
            Your family&apos;s health file, kept in order.
          </h2>
          <dl className="mt-10 divide-y border-y text-[15px]">
            <div className="py-3.5">
              <dt className="font-semibold">Reports read for you</dt>
              <dd className="text-muted-foreground">
                Every result saved with the lab&apos;s name and the report&apos;s date.
              </dd>
            </div>
            <div className="py-3.5">
              <dt className="font-semibold">Private to your account</dt>
              <dd className="text-muted-foreground">
                Nothing is shared with hospitals, insurers or anyone else.
              </dd>
            </div>
            <div className="py-3.5">
              <dt className="font-semibold">Yours to take away</dt>
              <dd className="text-muted-foreground">
                Download everything, or delete your account, whenever you like.
              </dd>
            </div>
          </dl>
        </div>
        <p className="text-muted-foreground text-[13px]">
          Kosha keeps records in order. It does not give medical advice.
        </p>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="mb-10 lg:hidden" aria-label="Kosha home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {children}
        </div>
        <nav aria-label="Legal" className="text-muted-foreground mx-auto mt-10 flex gap-4 text-xs">
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms of Use
          </Link>
        </nav>
      </div>
    </div>
  );
}

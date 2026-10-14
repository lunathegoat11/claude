import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { SignInForm } from "@/components/auth/sign-in-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { oauthEnabled } from "@/server/auth/oauth";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("account.signIn"), description: t("account.meta.signIn.desc") };
}

/** Why "Continue with Google/Apple" didn't finish, in plain words (codes only in the URL). */
const OAUTH_MESSAGES: Record<string, MessageKey> = {
  failed: "account.oauth.failed",
  cancelled: "account.oauth.cancelled",
  invite: "account.oauth.invite",
  closed: "account.oauth.closed",
  email: "account.oauth.email",
  off: "account.oauth.off",
  busy: "account.oauth.busy",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; oauth?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const t = await getT();
  const { next, reset, oauth } = await searchParams;
  const oauthMessage = oauth ? t(OAUTH_MESSAGES[oauth] ?? OAUTH_MESSAGES.failed) : null;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">{t("account.signIn.welcome")}</h1>
        <p className="text-muted-foreground text-[15px]">{t("account.signIn.desc")}</p>
      </div>
      {reset && (
        <p
          role="status"
          className="border-success/30 bg-success/8 rounded-md border px-3.5 py-2.5 text-sm"
        >
          {t("account.signIn.resetDone")}
        </p>
      )}
      {oauthMessage && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/6 rounded-md border px-3.5 py-2.5 text-sm"
        >
          {oauthMessage}
        </p>
      )}
      <OAuthButtons google={oauthEnabled("google")} apple={oauthEnabled("apple")} next={next} />
      <SignInForm next={next} demoEnabled={env().DEMO_LOGIN_ENABLED} />
      {env().ALLOW_SIGNUP && (
        <p className="text-muted-foreground text-center text-sm">
          {t("account.signIn.newHere")}{" "}
          <Link href="/sign-up" className="text-primary font-medium hover:underline">
            {t("account.signIn.create")}
          </Link>
        </p>
      )}
    </div>
  );
}

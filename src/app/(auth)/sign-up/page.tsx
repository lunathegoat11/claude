import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { oauthEnabled } from "@/server/auth/oauth";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("account.meta.signUp.title"), description: t("account.meta.signUp.desc") };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  // An invite link (/sign-up?invite=CODE) fills in the code for the person.
  const t = await getT();
  const { invite } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  if (!env().ALLOW_SIGNUP) redirect("/sign-in");
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">{t("account.meta.signUp.title")}</h1>
        <p className="text-muted-foreground text-[15px]">
          {env().SIGNUP_INVITE_CODE?.trim()
            ? t("account.signUp.inviteDesc")
            : t("account.signUp.desc")}
        </p>
      </div>
      <SignUpForm
        inviteOnly={!!env().SIGNUP_INVITE_CODE?.trim()}
        invite={typeof invite === "string" ? invite.slice(0, 200) : undefined}
        google={oauthEnabled("google")}
        apple={oauthEnabled("apple")}
      />
    </div>
  );
}

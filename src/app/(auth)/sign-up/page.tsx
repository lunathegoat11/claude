import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { oauthEnabled } from "@/server/auth/oauth";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a free Kosha Health account. Photograph a lab report and Kosha saves every result with its date, so you can see how your numbers change.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  // An invite link (/sign-up?invite=CODE) fills in the code for the person.
  const { invite } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  if (!env().ALLOW_SIGNUP) redirect("/sign-in");
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">Create your account</h1>
        <p className="text-muted-foreground text-[15px]">
          {env().SIGNUP_INVITE_CODE?.trim()
            ? "Kosha is open to invited people for now. Enter the invite code you were given."
            : "Start organising your health records. It takes under a minute."}
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

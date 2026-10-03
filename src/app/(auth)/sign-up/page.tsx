import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  if (!env().ALLOW_SIGNUP) redirect("/sign-in");
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-[15px]">
          Start organising your health records. It takes under a minute.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}

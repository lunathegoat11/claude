import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-[15px]">Sign in to see your health records.</p>
      </div>
      <SignInForm next={next} demoEnabled={env().DEMO_LOGIN_ENABLED} />
      {env().ALLOW_SIGNUP && (
        <p className="text-muted-foreground text-center text-sm">
          New to Kosha?{" "}
          <Link href="/sign-up" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </div>
  );
}

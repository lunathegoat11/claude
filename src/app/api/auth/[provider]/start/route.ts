import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { oauthEnabled, startOAuth, type OAuthProvider } from "@/server/auth/oauth";
import { requestMeta } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { env } from "@/server/env";
import { safeNext } from "@/lib/safe-next";

/** GET /api/auth/google/start and /api/auth/apple/start — begin "Continue with …". */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const back = (code: string) =>
    NextResponse.redirect(new URL(`/sign-in?oauth=${code}`, env().APP_URL), 303);
  if (provider !== "google" && provider !== "apple") return back("failed");
  const p = provider as OAuthProvider;
  if (!oauthEnabled(p)) return back("off");
  try {
    await rateLimit("signIn", `ip:${(await requestMeta()).ip}`);
  } catch {
    return back("busy");
  }
  // Invite-only: a new account needs the code (an existing account doesn't).
  const invite = env().SIGNUP_INVITE_CODE?.trim();
  const given = (req.nextUrl.searchParams.get("invite") ?? "").trim();
  const inviteOk =
    !invite ||
    (given.length === invite.length && timingSafeEqual(Buffer.from(given), Buffer.from(invite)));
  const url = await startOAuth(p, {
    next: safeNext(req.nextUrl.searchParams.get("next")),
    inviteOk,
  });
  return NextResponse.redirect(url, 303);
}

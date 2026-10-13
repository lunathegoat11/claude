import { NextResponse, type NextRequest } from "next/server";
import { accountForIdentity, finishOAuth, type OAuthProvider } from "@/server/auth/oauth";
import { createSession, requestMeta, setSessionCookie } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { env } from "@/server/env";
import { logger } from "@/server/logger";

/**
 * Where Google (GET) and Apple (form POST) send the person back. On success they are
 * signed in; a new account first sees the age confirmation and consents (/consent).
 */
async function handle(provider: string, params: Record<string, string | null>) {
  const to = (path: string) => NextResponse.redirect(new URL(path, env().APP_URL), 303);
  if (provider !== "google" && provider !== "apple") return to("/sign-in?oauth=failed");
  if (params.error) return to("/sign-in?oauth=cancelled");
  try {
    const id = await finishOAuth(provider as OAuthProvider, params);
    const account = await accountForIdentity(id);
    if (account.isDemo) return to("/sign-in?oauth=failed");
    const meta = await requestMeta();
    const { token, expiresAt } = await createSession(account.userId, meta.userAgent);
    await setSessionCookie(token, expiresAt);
    await audit(
      account.userId,
      account.created ? "auth.sign_up" : "auth.sign_in",
      undefined,
      meta,
      {
        method: provider,
      },
    );
    return to(account.created ? "/consent" : id.next);
  } catch (err) {
    if (err instanceof AppError) {
      const code = /invite-only/.test(err.message)
        ? "invite"
        : /closed/.test(err.message)
          ? "closed"
          : /email address/.test(err.message)
            ? "email"
            : "failed";
      return to(`/sign-in?oauth=${code}`);
    }
    logger.error("oauth.callback_failed", { provider, err });
    return to("/sign-in?oauth=failed");
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const sp = req.nextUrl.searchParams;
  return handle((await ctx.params).provider, {
    code: sp.get("code"),
    state: sp.get("state"),
    error: sp.get("error"),
    user: null,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const fd = await req.formData().catch(() => null);
  const get = (k: string) => (typeof fd?.get(k) === "string" ? (fd!.get(k) as string) : null);
  return handle((await ctx.params).provider, {
    code: get("code"),
    state: get("state"),
    error: get("error"),
    user: get("user"),
  });
}

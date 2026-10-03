import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, type SessionUser } from "./auth/session";
import { AppError, statusFor, toSafeError } from "./errors";
import { logger } from "./logger";
import { LIMITS, rateLimit } from "./rate-limit";
import { env } from "./env";

type Handler<C> = (req: NextRequest, ctx: { user: SessionUser; params: C }) => Promise<Response>;

/**
 * Guard for route handlers:
 * - requires a valid session (401 otherwise)
 * - same-origin check for state-changing methods (CSRF defence in depth on top of SameSite=Lax)
 * - per-user rate limit
 * - converts errors into safe JSON without internal details
 */
export function withApi<C = Record<string, string>>(
  handler: Handler<C>,
  opts: { bucket?: keyof typeof LIMITS } = {},
) {
  return async (req: NextRequest, context: { params: Promise<C> }) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
      await rateLimit(opts.bucket ?? "api", user.id);
      return await handler(req, { user, params: await context.params });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients; cookies are SameSite=Lax so cross-site browsers always send Origin
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("FORBIDDEN", "Request origin not allowed.");
  }
  // Same check Next.js applies to Server Actions: the browser's Origin must match the
  // host the request was addressed to (as seen through the hosting proxy) or APP_URL.
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const allowed = new Set(
    [new URL(env().APP_URL).host, forwarded, req.headers.get("host")].filter(Boolean),
  );
  if (!allowed.has(originHost)) throw new AppError("FORBIDDEN", "Request origin not allowed.");
}

export function errorResponse(err: unknown) {
  const safe = toSafeError(err);
  if (safe.code === "INTERNAL") logger.error("api.unhandled", { err });
  return NextResponse.json(
    { error: { code: safe.code, message: safe.message, fieldErrors: safe.fieldErrors } },
    { status: statusFor(safe.code) },
  );
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "private, no-store", ...(init?.headers ?? {}) },
  });
}

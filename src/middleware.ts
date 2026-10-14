import { NextResponse, type NextRequest } from "next/server";

const APP_PREFIXES = [
  "/dashboard",
  "/records",
  "/labs",
  "/tracking",
  "/assistant",
  "/timeline",
  "/documents",
  "/search",
  "/settings",
];
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-kosha_session" : "kosha_session";

/**
 * Content-Security-Policy with a fresh nonce per page: only scripts that Kosha itself
 * put on the page (which carry the nonce) can run, so injected scripts are blocked.
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.paddle.com",
    "font-src 'self' data:",
    // Paddle (payments): its checkout opens in a frame and talks to its own servers.
    "connect-src 'self' https://*.paddle.com",
    "frame-src 'self' blob: https://*.paddle.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Cheap edge check: send visitors without a session cookie to sign-in.
 * Real session validation (DB lookup) happens server-side on every request.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (
    APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !req.cookies.get(COOKIE)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

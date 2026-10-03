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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

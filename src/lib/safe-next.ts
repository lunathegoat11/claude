/**
 * Only same-site paths are allowed after sign-in. Browsers drop tabs and newlines from
 * URLs, so "/\t/evil.example" would become "//evil.example"; any control character,
 * space or backslash is refused, and the result must resolve to this site.
 */
export function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/") || /[\x00-\x20\x7f\\]/.test(next))
    return "/dashboard";
  try {
    const base = "https://kosha.invalid";
    const u = new URL(next, base);
    if (u.origin !== base) return "/dashboard";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/dashboard";
  }
}

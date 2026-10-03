/**
 * Date & number formatting for an Indian audience.
 * - Dates read as "25 Sep 2026" (day-month-year), never US month-first.
 * - Times in 12-hour format with AM/PM.
 * - Default time zone is IST (Asia/Kolkata) unless the profile overrides it.
 * - Numbers use the Indian digit grouping (1,00,000) via the en-IN locale.
 */
export const DEFAULT_TZ = "Asia/Kolkata";
const LOCALE = "en-IN";

function d(input: Date | string | number) {
  return input instanceof Date ? input : new Date(input);
}

export function formatDate(input: Date | string | number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz,
  }).format(d(input));
}

export function formatDateLong(input: Date | string | number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(d(input));
}

export function formatDayMonth(input: Date | string | number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: tz }).format(
    d(input),
  );
}

export function formatMonthYear(input: Date | string | number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: tz }).format(
    d(input),
  );
}

export function formatTime(input: Date | string | number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  })
    .format(d(input))
    .replace("am", "AM")
    .replace("pm", "PM");
}

export function formatDateTime(input: Date | string | number, tz = DEFAULT_TZ) {
  return `${formatDate(input, tz)}, ${formatTime(input, tz)}`;
}

/** Numeric dd/mm/yyyy — the format most Indian reports use. */
export function formatDateNumeric(input: Date | string | number, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: tz,
  }).format(d(input));
}

function ymd(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(date);
  return parts; // YYYY-MM-DD
}

/** "Today, 8:32 AM" / "Yesterday, 9:10 PM" / "12 Sep 2026, 7:05 AM" */
export function formatRelativeDateTime(
  input: Date | string | number,
  now = new Date(),
  tz = DEFAULT_TZ,
) {
  const date = d(input);
  const today = ymd(now, tz);
  const yesterday = ymd(new Date(now.getTime() - 86_400_000), tz);
  const day = ymd(date, tz);
  if (day === today) return `Today, ${formatTime(date, tz)}`;
  if (day === yesterday) return `Yesterday, ${formatTime(date, tz)}`;
  return formatDateTime(date, tz);
}

export function formatRelativeDate(
  input: Date | string | number,
  now = new Date(),
  tz = DEFAULT_TZ,
) {
  const date = d(input);
  const today = ymd(now, tz);
  const yesterday = ymd(new Date(now.getTime() - 86_400_000), tz);
  const day = ymd(date, tz);
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return formatDate(date, tz);
}

/** YYYY-MM-DD in the given zone — for <input type="date"> default values. */
export function toDateInputValue(
  input: Date | string | number | null | undefined,
  tz = DEFAULT_TZ,
) {
  if (!input) return "";
  return ymd(d(input), tz);
}

/** YYYY-MM-DDTHH:mm in the given zone — for <input type="datetime-local">. */
export function toDateTimeInputValue(
  input: Date | string | number | null | undefined,
  tz = DEFAULT_TZ,
) {
  if (!input) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).formatToParts(d(input));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Offset of a time zone from UTC in minutes at a given instant. */
function tzOffsetMinutes(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Parse a wall-clock "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" value entered by a user
 * in time zone `tz` into an absolute Date.
 */
export function parseZonedInput(value: string, tz = DEFAULT_TZ): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, da, h = "12", mi = "00"] = m;
  // Date-only values are anchored at local noon so they never shift a day.
  const guess = new Date(Date.UTC(+y, +mo - 1, +da, +h, +mi));
  if (Number.isNaN(guess.getTime())) return null;
  const offset = tzOffsetMinutes(guess, tz);
  return new Date(guess.getTime() - offset * 60000);
}

export function formatNumber(n: number, maxFractionDigits = 1) {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxFractionDigits }).format(n);
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSigned(n: number, decimals = 0) {
  const v = Number(n.toFixed(decimals));
  if (v === 0) return "±0";
  return `${v > 0 ? "+" : "−"}${formatNumber(Math.abs(v), decimals)}`;
}

export function ageFromDob(dob: Date | string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const b = d(dob);
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

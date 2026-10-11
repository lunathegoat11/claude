import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { hmac } from "@/server/auth/tokens";
import { logger } from "@/server/logger";
import { OUTSIDE_RANGE_CHECK, type LabCandidate } from "@/server/extraction/lab-parser";

/**
 * Learning from corrections, without keeping anyone's data.
 *
 * When someone who has agreed to it corrects values Kosha read from a report, the
 * before-and-after rows are compared in memory, turned into anonymous patterns, and then
 * dropped. Only the patterns are kept, in ReadingPattern:
 *
 * - DIGIT: a character the photo reader mistook for another ("1" read where the report
 *   said "7"). Just the two characters and a count.
 * - JUNK: a line that people delete because it isn't a test result ("Recieved").
 * - ALIAS: a line label that people rename to a known test ("S.G.O.T" → AST).
 *
 * JUNK and ALIAS labels are stored only as a keyed hash, and only after three different
 * people have made the same correction. Until then they wait in memory (gone on restart,
 * and after a day at most), so a name or address on one person's report is never stored.
 */

const PEOPLE_NEEDED = 3;
const PENDING_TTL_MS = 24 * 60 * 60_000;
const CACHE_MS = 10 * 60_000;

export interface CorrectionRow {
  testName: string;
  biomarkerCode: string | null;
  value: string | null;
}

export interface LearnedPatterns {
  isJunk(label: string): boolean;
  aliasFor(label: string): string | null;
  /** Character swaps seen in corrections, most common first: [read, actually]. */
  digitSwaps: [string, string][];
}

function normaliseLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 60);
}

/** A keyed hash of a line label, or null if there's too little to go on. */
export function labelHash(label: string): string | null {
  const n = normaliseLabel(label);
  if (n.replace(/[^a-z]/g, "").length < 3) return null;
  return hmac(`reading-label:${n}`, env().APP_SECRET);
}

/** Compare a report as read with the same report after the person corrected it. */
export function correctionEvents(before: CorrectionRow[], after: CorrectionRow[]) {
  const digits: [string, string][] = [];
  const junk: string[] = [];
  const alias: [string, string][] = [];
  const newCodes = new Set(after.map((a) => a.biomarkerCode).filter(Boolean));
  for (const b of before) {
    const same = b.biomarkerCode
      ? after.find((a) => a.biomarkerCode === b.biomarkerCode)
      : after.find((a) => normaliseLabel(a.testName) === normaliseLabel(b.testName));
    if (same) {
      // One character changed in a value of the same length: a misread digit.
      const x = b.value?.trim() ?? "";
      const y = same.value?.trim() ?? "";
      if (x && y && x !== y && x.length === y.length) {
        const diff = [...x].map((c, i) => [c, y[i]] as const).filter(([c, d]) => c !== d);
        if (diff.length === 1 && /^[\d.]$/.test(diff[0][0]) && /^[\d.]$/.test(diff[0][1]))
          digits.push([diff[0][0], diff[0][1]]);
      }
      continue;
    }
    // Labels are only learned for lines that weren't matched to a known test.
    if (b.biomarkerCode) continue;
    const renamed = after.find(
      (a) =>
        a.biomarkerCode &&
        a.value?.trim() === b.value?.trim() &&
        !before.some((o) => o.biomarkerCode === a.biomarkerCode),
    );
    if (renamed?.biomarkerCode && newCodes.has(renamed.biomarkerCode))
      alias.push([b.testName, renamed.biomarkerCode]);
    else junk.push(b.testName);
  }
  return { digits, junk, alias };
}

type Pending = { people: Set<string>; since: number };
const g = globalThis as unknown as {
  __readingPending?: Map<string, Pending>;
  __readingCache?: { at: number; value: LearnedPatterns };
};
const pending = (g.__readingPending ??= new Map());

async function bump(kind: string, key: string, target: string) {
  await db.readingPattern.upsert({
    where: { kind_key_target: { kind, key, target } },
    create: { kind, key, target, count: 1 },
    update: { count: { increment: 1 } },
  });
}

async function waitForOthers(kind: string, key: string, target: string, person: string) {
  const now = Date.now();
  for (const [k, p] of pending) if (now - p.since > PENDING_TTL_MS) pending.delete(k);
  const id = `${kind}|${key}|${target}`;
  const p = pending.get(id) ?? { people: new Set<string>(), since: now };
  p.people.add(person);
  pending.set(id, p);
  if (p.people.size < PEOPLE_NEEDED) return;
  pending.delete(id);
  await db.readingPattern.upsert({
    where: { kind_key_target: { kind, key, target } },
    create: { kind, key, target, count: PEOPLE_NEEDED },
    update: { count: { increment: 1 } },
  });
}

/**
 * Learn from one correction, if the person agreed to it. The rows passed in are not
 * kept anywhere: only the anonymous patterns described above.
 */
export async function learnFromCorrection(
  userId: string,
  before: CorrectionRow[],
  after: CorrectionRow[],
) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { improveReadingAt: true, isDemo: true },
    });
    if (!user?.improveReadingAt || user.isDemo) return;
    const ev = correctionEvents(before, after);
    const person = hmac(`reading-person:${userId}`, env().APP_SECRET);
    for (const [from, to] of ev.digits) await bump("DIGIT", from, to);
    for (const label of ev.junk) {
      const h = labelHash(label);
      if (h) await waitForOthers("JUNK", h, "-", person);
    }
    for (const [label, code] of ev.alias) {
      const h = labelHash(label);
      if (h) await waitForOthers("ALIAS", h, code, person);
    }
    g.__readingCache = undefined;
  } catch (err) {
    logger.warn("reading.learn_failed", { err });
  }
}

/** Turn learning on or off for a person. Turning it off forgets anything still waiting. */
export async function setImproveReading(userId: string, on: boolean) {
  await db.user.update({
    where: { id: userId },
    data: { improveReadingAt: on ? new Date() : null },
  });
  if (!on) {
    const person = hmac(`reading-person:${userId}`, env().APP_SECRET);
    for (const [k, p] of pending) {
      p.people.delete(person);
      if (!p.people.size) pending.delete(k);
    }
  }
}

/** What has been learned so far, for the report reader. Cached for ten minutes. */
export async function loadPatterns(): Promise<LearnedPatterns> {
  if (g.__readingCache && Date.now() - g.__readingCache.at < CACHE_MS)
    return g.__readingCache.value;
  const rows = await db.readingPattern
    .findMany({ orderBy: { count: "desc" }, take: 5000 })
    .catch(() => []);
  const junk = new Set(rows.filter((r) => r.kind === "JUNK").map((r) => r.key));
  const alias = new Map<string, string>();
  for (const r of rows) if (r.kind === "ALIAS" && !alias.has(r.key)) alias.set(r.key, r.target);
  const value: LearnedPatterns = {
    isJunk: (label) => {
      const h = labelHash(label);
      return !!h && junk.has(h);
    },
    aliasFor: (label) => {
      const h = labelHash(label);
      return h ? (alias.get(h) ?? null) : null;
    },
    digitSwaps: rows
      .filter((r) => r.kind === "DIGIT" && r.count >= 2)
      .slice(0, 8)
      .map((r) => [r.key, r.target]),
  };
  g.__readingCache = { at: Date.now(), value };
  return value;
}

/**
 * For a value read from a photo that falls outside its printed range, suggest the value
 * it may really be, using the digit mix-ups people have corrected before. The value
 * itself is never changed: the suggestion is added to the note asking to check it.
 */
export function suggestFromSwaps(c: LabCandidate, swaps: [string, string][]): LabCandidate {
  const i = c.warnings?.indexOf(OUTSIDE_RANGE_CHECK) ?? -1;
  if (i < 0 || c.refLow === null || c.refHigh === null) return c;
  for (const [from, to] of swaps) {
    for (let p = 0; p < c.value.length; p++) {
      if (c.value[p] !== from) continue;
      const alt = c.value.slice(0, p) + to + c.value.slice(p + 1);
      const n = Number(alt);
      if (Number.isFinite(n) && n >= c.refLow && n <= c.refHigh) {
        const warnings = [...c.warnings!];
        warnings[i] = `${OUTSIDE_RANGE_CHECK} It may be ${alt}.`;
        return { ...c, warnings };
      }
    }
  }
  return c;
}

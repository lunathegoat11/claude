import type {
  AIProvider,
  ContextBundle,
  GenerateInput,
  LabPoint,
  MeasurementSeries,
  PanelSummary,
} from "../types";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { formatDate, formatDateTime, formatNumber, formatSigned } from "@/lib/format";
import { formatRange } from "@/lib/lab-range";
import { isEmptyBundle } from "../bundle-utils";

/**
 * Demo provider: no external API. Produces a deterministic, fully grounded
 * answer directly from the retrieved records. Every figure it prints comes
 * from the context bundle, and every statement about the user is cited.
 */
export class DemoProvider implements AIProvider {
  readonly name = "demo";
  readonly model = "grounded-summary-v1";
  readonly supportsVision = false;

  async generate(input: GenerateInput): Promise<string> {
    return composeGroundedAnswer(input.bundle);
  }
}

function v(n: number | null, text: string | null, decimals = 2) {
  return n !== null ? formatNumber(n, decimals) : (text ?? "—");
}

function rangeWord(p: {
  value: number | null;
  refLow: number | null;
  refHigh: number | null;
  flag: string;
}) {
  if (p.flag === "HIGH") return "above the range printed on that report";
  if (p.flag === "LOW") return "below the range printed on that report";
  if (p.flag === "ABNORMAL") return "flagged by the lab on that report";
  if (p.flag === "NORMAL") return "within the range printed on that report";
  return null;
}

function measurementSection(s: MeasurementSeries, b: ContextBundle): string[] {
  const tz = b.timezone;
  const L: string[] = [];
  const fmt = (x: number, y: number | null) =>
    s.valueType === "DUAL" && y !== null
      ? `${formatNumber(x, 0)}/${formatNumber(y, 0)}`
      : formatNumber(x, s.decimals);
  L.push(
    `**${s.metricName} — ${b.analysis.range.from ? b.analysis.range.label : "recent readings"}**`,
  );
  const shown = Math.min(8, s.points.length);
  L.push(
    `You recorded ${s.totalInRange} reading${s.totalInRange === 1 ? "" : "s"}${shown < s.totalInRange ? `; the ${shown} most recent are:` : ":"}`,
  );
  for (const p of s.points.slice(0, 8)) {
    L.push(
      `- ${formatDateTime(p.at, tz)} — ${fmt(p.value, p.value2)} ${s.unit}${p.context ? ` (${CONTEXT_LABELS[p.context] ?? p.context})` : ""} [${p.ref}]`,
    );
  }
  if (s.stats && s.stats.count > 1) {
    L.push("");
    L.push(
      `*Calculated from all ${s.stats.count} readings in this period:* lowest ${formatNumber(s.stats.min, s.decimals)}, highest ${formatNumber(s.stats.max, s.decimals)}, average ${formatNumber(s.stats.mean, s.decimals || 1)} ${s.unit}${s.stats.mean2 !== undefined ? ` (average diastolic ${formatNumber(s.stats.mean2, 0)})` : ""}.`,
    );
    if (s.metricKey === "blood_glucose") {
      const groups = new Map<string, number[]>();
      for (const p of s.points)
        if (p.context) groups.set(p.context, [...(groups.get(p.context) ?? []), p.value]);
      const parts = [...groups]
        .filter(([, xs]) => xs.length >= 2)
        .map(
          ([c, xs]) =>
            `${CONTEXT_LABELS[c] ?? c}: ${formatNumber(xs.reduce((a, x) => a + x, 0) / xs.length, 0)} ${s.unit} (${xs.length} readings)`,
        );
      if (parts.length)
        L.push(
          `*Calculated averages by context (from the ${s.points.length} most recent readings):* ${parts.join("; ")}.`,
        );
    }
  }
  return L;
}

function labSeriesSection(
  points: LabPoint[],
  name: string,
  unit: string | null,
  tz: string,
): string[] {
  const asc = [...points].reverse();
  const L: string[] = [];
  L.push(`**${name}**`);
  L.push(
    asc
      .map(
        (p) =>
          `${v(p.value, p.valueText)}${unit ? ` ${unit}` : ""} on ${formatDate(p.at, tz)} [${p.ref}]`,
      )
      .join(" → "),
  );
  const nums = asc.filter((p) => p.value !== null);
  if (nums.length >= 2) {
    const diff = nums[nums.length - 1].value! - nums[0].value!;
    L.push(
      `*Calculated:* the latest value is ${formatSigned(diff, 2)}${unit ? ` ${unit}` : ""} compared with the earliest one shown.`,
    );
  }
  const latest = points[0];
  if (latest) {
    const w = rangeWord(latest);
    const range = formatRange(latest.refLow, latest.refHigh, latest.refText);
    if (w) L.push(`On the latest report, the value was ${w}${range ? ` (${range})` : ""}.`);
    else L.push("The latest report did not include a reference range for this test.");
  }
  return L;
}

function panelCompare(a: PanelSummary, b: PanelSummary, tz: string): string[] {
  // a = newer, b = older
  const key = (r: PanelSummary["results"][number]) => r.biomarkerCode ?? r.testName.toLowerCase();
  const older = new Map(b.results.map((r) => [key(r), r]));
  const L: string[] = [];
  L.push(
    `Comparing **${b.name}** from ${formatDate(b.at, tz)} [${b.ref}] with **${a.name}** from ${formatDate(a.at, tz)} [${a.ref}]:`,
  );
  let shared = 0;
  for (const r of a.results) {
    const o = older.get(key(r));
    if (!o) continue;
    shared++;
    const change =
      r.value !== null && o.value !== null
        ? ` (calculated change ${formatSigned(r.value - o.value, 2)})`
        : "";
    L.push(
      `- ${r.testName}: ${v(o.value, o.valueText)} → ${v(r.value, r.valueText)}${r.unit ? ` ${r.unit}` : ""}${change}`,
    );
  }
  if (!shared) L.push("- These two reports don't have any tests in common.");
  const onlyNew = a.results.filter((r) => !older.has(key(r))).map((r) => r.testName);
  if (onlyNew.length) L.push(`Only in the newer report: ${onlyNew.join(", ")}.`);
  if (
    a.results.some((r, i) => a.results[i].unit !== older.get(key(r))?.unit && older.get(key(r)))
  ) {
    L.push("Note: some tests use different units between reports, so compare them with care.");
  }
  return L;
}

export function composeGroundedAnswer(b: ContextBundle): string {
  const tz = b.timezone;
  const i = new Set(b.analysis.intents);
  const out: string[] = [];
  let outOfRange = false;

  if (isEmptyBundle(b) && !b.explanations.length) {
    return [
      `I couldn't find anything in your records that matches this question for ${b.analysis.range.label}.`,
      "",
      "You can add readings under **Health Tracking**, lab reports under **Lab Results**, or upload documents under **Documents** — I'll be able to summarise them here afterwards.",
    ].join("\n");
  }

  if (i.has("MEASUREMENT_TREND") || (i.has("GENERAL") && b.measurements.length)) {
    if (i.has("GENERAL") && !b.analysis.metricKeys.length) {
      out.push("**Your latest recorded measurements**");
      for (const s of b.measurements) {
        const p = s.points[0];
        if (!p) continue;
        const val =
          s.valueType === "DUAL" && p.value2 !== null
            ? `${formatNumber(p.value, 0)}/${formatNumber(p.value2, 0)}`
            : formatNumber(p.value, s.decimals);
        out.push(`- ${s.metricName}: ${val} ${s.unit} on ${formatDateTime(p.at, tz)} [${p.ref}]`);
      }
      out.push("");
    } else {
      for (const s of b.measurements) out.push(...measurementSection(s, b), "");
      if (!b.measurements.length)
        out.push(`I couldn't find any recorded readings for ${b.analysis.range.label}.`, "");
    }
  }

  if (i.has("LAB_COMPARE")) {
    if (b.panels.length >= 2) out.push(...panelCompare(b.panels[0], b.panels[1], tz), "");
    else if (b.labs.some((l) => l.points.length >= 2)) {
      for (const s of b.labs.filter((l) => l.points.length >= 2))
        out.push(...labSeriesSection(s.points.slice(0, 2), s.testName, s.unit, tz), "");
    } else out.push("I found fewer than two lab reports to compare for this question.", "");
  }

  if (i.has("LAB_TREND") && !i.has("LAB_COMPARE")) {
    for (const s of b.labs) {
      out.push(...labSeriesSection(s.points, s.testName, s.unit, tz), "");
      if (s.points[0] && ["HIGH", "LOW", "ABNORMAL"].includes(s.points[0].flag)) outOfRange = true;
    }
  }

  if ((i.has("LAB_SUMMARY") || i.has("GENERAL")) && !i.has("LAB_COMPARE") && b.panels.length) {
    out.push(i.has("GENERAL") ? "**Most recent lab report**" : "**Your recent lab reports**");
    for (const p of b.panels.slice(0, i.has("GENERAL") ? 1 : 3)) {
      out.push(
        `${p.name} — ${formatDate(p.at, tz)}${p.labName ? `, ${p.labName}` : ""} [${p.ref}]`,
      );
      for (const r of p.results) {
        const range = formatRange(r.refLow, r.refHigh, r.refText);
        const flag =
          r.flag === "HIGH"
            ? " — above report range"
            : r.flag === "LOW"
              ? " — below report range"
              : r.flag === "ABNORMAL"
                ? " — flagged by lab"
                : "";
        if (flag) outOfRange = true;
        out.push(
          `- ${r.testName}: ${v(r.value, r.valueText)}${r.unit ? ` ${r.unit}` : ""}${range ? ` (report range ${range})` : ""}${flag}`,
        );
      }
      out.push("");
    }
  }

  if (i.has("DOCUMENT_SEARCH")) {
    if (b.documents.length) {
      out.push(`**Documents that mention this** (${b.documents.length})`);
      for (const d of b.documents)
        out.push(
          `- ${d.name} — ${d.type}, ${formatDate(d.at, tz)} [${d.ref}]${d.snippet ? `\n  “${d.snippet}”` : ""}`,
        );
    } else out.push("I couldn't find any uploaded documents mentioning this.");
    out.push("");
  }

  if (i.has("VISIT_SUMMARY") || (i.has("GENERAL") && b.records.length)) {
    if (b.records.length) {
      out.push(
        i.has("GENERAL")
          ? "**Recent medical events**"
          : `**Your doctor visits and medical events — ${b.analysis.range.label}**`,
      );
      for (const r of b.records.slice(0, i.has("GENERAL") ? 4 : 8)) {
        const who = [r.doctorName, r.specialty, r.facilityName].filter(Boolean).join(", ");
        const note = r.notes ? ` — ${r.notes.split(/(?<=\.)\s/)[0].slice(0, 180)}` : "";
        out.push(
          `- ${formatDate(r.at, tz)}: ${r.title} (${r.type}${who ? `, ${who}` : ""})${note} [${r.ref}]`,
        );
      }
    } else
      out.push(
        `I couldn't find any doctor visits or medical events for ${b.analysis.range.label}.`,
      );
    out.push("");
  }

  if (b.summary && (i.has("HEALTH_SUMMARY") || i.has("GENERAL"))) {
    const s = b.summary;
    if (s.conditions.length)
      out.push(
        `**Conditions you've recorded:** ${s.conditions.map((c) => `${c.name} (${c.status.toLowerCase()})`).join(", ")}`,
      );
    if (s.medications.length)
      out.push(
        `**Medications you've recorded (as written on your prescriptions):** ${
          s.medications
            .filter((m) => m.active)
            .map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(" "))
            .join("; ") || "none currently active"
        }`,
      );
    if (s.allergies.length)
      out.push(`**Allergies you've recorded:** ${s.allergies.map((a) => a.allergen).join(", ")}`);
    if (s.conditions.length || s.medications.length || s.allergies.length) out.push("");
  }

  if (b.explanations.length && (i.has("EXPLAIN_TERM") || i.has("LAB_TREND"))) {
    out.push("**General information** *(not specific to you)*");
    for (const e of b.explanations.slice(0, 5)) out.push(`- **${e.term}**: ${e.description}`);
    out.push("");
  }

  if (i.has("DOCTOR_QUESTIONS")) {
    out.push("**Questions you could ask your doctor**");
    const qs: string[] = [];
    for (const p of b.panels.slice(0, 1))
      for (const r of p.results) {
        if (["HIGH", "LOW", "ABNORMAL"].includes(r.flag)) {
          qs.push(
            `My ${r.testName} was ${v(r.value, r.valueText)}${r.unit ? ` ${r.unit}` : ""} on ${formatDate(p.at, tz)}, outside the range on the report. What could explain this, and does it need follow-up?`,
          );
        }
      }
    for (const s of b.measurements.filter((m) => m.stats && m.stats.count >= 3).slice(0, 2)) {
      qs.push(
        `I've recorded ${s.stats!.count} ${s.metricName.toLowerCase()} readings recently (average ${formatNumber(s.stats!.mean, s.decimals || 1)} ${s.unit}). What range would you like me to aim for?`,
      );
    }
    qs.push("Are there any tests I should repeat, and when?");
    qs.push("Is there anything in my recent reports you would like me to keep an eye on?");
    for (const q of qs.slice(0, 6)) out.push(`- ${q}`);
    out.push("");
  }

  if (outOfRange)
    out.push(
      "Some values are outside the ranges printed on your reports. Only a doctor can say what this means for you, so it's worth sharing these results with them.",
    );

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

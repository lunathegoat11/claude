import Link from "next/link";
import { Sparkline } from "@/components/charts/sparkline";
import { formatRelativeDateTime, formatSigned } from "@/lib/format";
import { CONTEXT_LABELS, type UnitPrefs } from "@/lib/catalog/metrics";
import { presentMeasurement } from "@/lib/display";
import type { DashboardCard } from "@/server/services/dashboard";

/** One reading or test as a ruled line: name, when, change since last time, trend and value. */
export function MetricRow({
  card,
  prefs,
  timezone,
}: {
  card: DashboardCard;
  prefs: UnitPrefs;
  timezone: string;
}) {
  const metric = {
    key: card.kind === "lab" ? `lab:${card.key}` : card.key,
    unit: card.unit,
    decimals: card.decimals,
    valueType: card.valueType,
  };
  const now = presentMeasurement(metric, card.latest.value, card.latest.value2, prefs);
  let delta: { text: string; dir: number } | null = null;
  if (card.previous) {
    const prev = presentMeasurement(metric, card.previous.value, card.previous.value2, prefs);
    const diff = now.value - prev.value;
    const decimals = card.valueType === "DUAL" ? 0 : now.decimals;
    const rounded = Number(diff.toFixed(decimals));
    let text = `${formatSigned(diff, decimals)} ${now.unit}`;
    if (card.valueType === "DUAL" && card.latest.value2 != null && card.previous.value2 != null) {
      text = `${formatSigned(card.latest.value - card.previous.value, 0)}/${formatSigned(card.latest.value2 - card.previous.value2, 0).replace("±", "±")} ${now.unit}`;
    }
    delta = {
      text: rounded === 0 ? "Same as last time" : `${text} since last time`,
      dir: Math.sign(rounded),
    };
  }
  return (
    <li>
      <Link
        href={card.href}
        className="group hover:bg-muted/50 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_auto] sm:px-5"
      >
        <div className="min-w-0">
          <div className="group-hover:text-primary truncate font-medium">{card.name}</div>
          <div className="text-muted-foreground truncate text-[13px]">
            {formatRelativeDateTime(card.latest.at, new Date(), timezone)}
            {card.latest.context &&
              `, ${(CONTEXT_LABELS[card.latest.context] ?? card.latest.context).toLowerCase()}`}
            {delta && <span className="tabular">. {delta.text}</span>}
          </div>
        </div>
        <Sparkline
          values={card.spark}
          className="hidden h-8 w-full sm:block"
          label={`${card.name} recent trend`}
        />
        <div className="text-right whitespace-nowrap">
          <span className="figure text-[1.375rem] leading-none font-semibold">{now.text}</span>{" "}
          <span className="text-muted-foreground text-sm">{now.unit}</span>
        </div>
      </Link>
    </li>
  );
}

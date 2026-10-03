import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { metricIcon } from "@/components/shared/icons";
import { formatRelativeDateTime, formatSigned } from "@/lib/format";
import { CONTEXT_LABELS, type UnitPrefs } from "@/lib/catalog/metrics";
import { presentMeasurement } from "@/lib/display";
import type { DashboardCard } from "@/server/services/dashboard";

export function MetricCard({
  card,
  prefs,
  timezone,
}: {
  card: DashboardCard;
  prefs: UnitPrefs;
  timezone: string;
}) {
  const Icon = metricIcon(card.key);
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
    delta = { text: `${text} from previous`, dir: Math.sign(rounded) };
  }
  const DeltaIcon = !delta
    ? null
    : delta.dir > 0
      ? ArrowUpRight
      : delta.dir < 0
        ? ArrowDownRight
        : Minus;
  return (
    <Link
      href={card.href}
      className="group bg-card hover:border-primary/30 relative flex flex-col rounded-2xl border p-4 transition-[border-color,box-shadow] hover:shadow-md hover:shadow-black/[0.03] sm:p-5"
    >
      <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        <span className="bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <span className="truncate">{card.name}</span>
        {card.kind === "lab" && (
          <span className="bg-muted ml-auto rounded-md px-1.5 py-0.5 text-[10.5px] font-medium tracking-wide uppercase">
            Lab
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-[28px] leading-none font-semibold tracking-tight">
              {now.text}
            </span>
            <span className="text-muted-foreground text-sm">{now.unit}</span>
          </div>
          <div className="text-muted-foreground mt-2 text-[13px]">
            {formatRelativeDateTime(card.latest.at, new Date(), timezone)}
            {card.latest.context && (
              <> · {CONTEXT_LABELS[card.latest.context] ?? card.latest.context}</>
            )}
          </div>
        </div>
        <Sparkline
          values={card.spark}
          className="h-9 w-24 shrink-0"
          label={`${card.name} recent trend`}
        />
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-[13px]">
        {delta && DeltaIcon ? (
          <span className="text-muted-foreground tabular flex items-center gap-1">
            <DeltaIcon className="size-3.5" /> {delta.text}
          </span>
        ) : (
          <span className="text-muted-foreground">First reading</span>
        )}
        <span className="text-primary flex items-center gap-1 font-medium opacity-80 transition group-hover:opacity-100">
          View trend{" "}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

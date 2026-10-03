/**
 * Lightweight inline-SVG sparkline (no client JS) for KPI cards.
 * Shows shape only; the card carries the actual value and date.
 */
export function Sparkline({
  values,
  className,
  label,
}: {
  values: number[];
  className?: string;
  label?: string;
}) {
  if (values.length < 2) return <div className={className} aria-hidden />;
  const w = 120,
    h = 36,
    pad = 3;
  const min = Math.min(...values),
    max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map(
    (v, i) =>
      [
        pad + (i * (w - pad * 2)) / (values.length - 1),
        h - pad - ((v - min) / span) * (h - pad * 2),
      ] as const,
  );
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={label ?? "Recent trend"}
    >
      <path d={`${d} L${lx},${h} L${pad},${h} Z`} fill="var(--chart-1)" opacity="0.08" />
      <path
        d={d}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r="3" fill="var(--chart-1)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}

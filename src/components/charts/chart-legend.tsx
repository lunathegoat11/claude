export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-4 text-sm" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} /> {i.label}
        </li>
      ))}
    </ul>
  );
}

"use client";
import dynamic from "next/dynamic";
import { DelayedLoader } from "@/components/shared/delayed-loader";

/** Recharts is loaded only when a chart is actually rendered. */
export const LazyTrendChart = dynamic(() => import("./trend-chart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <DelayedLoader kind="chart" size="sm" className="h-[280px]" />,
});

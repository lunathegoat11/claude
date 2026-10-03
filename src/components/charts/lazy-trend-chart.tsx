"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Recharts is loaded only when a chart is actually rendered. */
export const LazyTrendChart = dynamic(() => import("./trend-chart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-xl" />,
});

import { DelayedLoader } from "@/components/shared/delayed-loader";

/** Shown while a page loads: nothing for a second, then a spinner and changing words. */
export default function Loading() {
  return <DelayedLoader kind="page" className="min-h-[55dvh]" />;
}

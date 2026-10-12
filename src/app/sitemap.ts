import type { MetadataRoute } from "next";
import { env } from "@/server/env";

// Built when requested, not during the build: the server's settings (its web address)
// only exist once it is running.
export const dynamic = "force-dynamic";

/** The public pages search engines should know about. Everything else needs a sign-in. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL.replace(/\/$/, "");
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly") => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/sign-up", 0.6, "monthly"),
    page("/sign-in", 0.4, "monthly"),
    page("/privacy", 0.3, "monthly"),
    page("/terms", 0.3, "monthly"),
  ];
}

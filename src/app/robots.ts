import type { MetadataRoute } from "next";
import { env } from "@/server/env";

/** Search engines may read the public pages; people's records are never crawlable. */
export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/labs",
        "/records",
        "/documents",
        "/tracking",
        "/timeline",
        "/assistant",
        "/search",
        "/settings",
        "/consent",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

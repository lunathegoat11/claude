import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// The Content-Security-Policy is set per request in src/middleware.ts, because it carries
// a fresh nonce for every page.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Lets you open the dev server from a phone on the same Wi-Fi (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "tesseract.js", "sharp"],
  // OCR loads its worker, WebAssembly core and language data at runtime; make sure
  // they are copied into the standalone production build.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/@tesseract.js-data/eng/4.0.0/**",
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

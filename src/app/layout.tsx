import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { env } from "@/server/env";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/** What search engines and link previews (WhatsApp, X, LinkedIn) show for Kosha. */
export function generateMetadata(): Metadata {
  const e = env();
  return {
    metadataBase: new URL(e.APP_URL),
    title: { default: SITE_TITLE, template: "%s – Kosha" },
    description: SITE_DESCRIPTION,
    applicationName: "Kosha",
    keywords: [
      "lab report app",
      "blood test report",
      "health records India",
      "medical records app",
      "read lab report from photo",
      "HbA1c tracker",
      "thyroid report",
      "personal health record",
    ],
    openGraph: {
      type: "website",
      siteName: "Kosha",
      locale: "en_IN",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
    appleWebApp: { capable: true, title: "Kosha", statusBarStyle: "default" },
    icons: { apple: "/icons/apple-touch-icon.png" },
    formatDetection: { telephone: false },
    robots: { index: true, follow: true },
    ...(e.GOOGLE_SITE_VERIFICATION ? { verification: { google: e.GOOGLE_SITE_VERIFICATION } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
};

/**
 * Turns glass off when the person chose "Reduce transparency" in Kosha, or on low-end
 * phones (2 GB of memory or less, two cores or fewer, or Data Saver on), where blurring
 * the page while scrolling would make it stutter. A fixed string: no user data in it.
 */
const GLASS_SCRIPT = `try{var p=localStorage.getItem("kosha-glass"),n=navigator,low=(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2)||(n.connection&&n.connection.saveData);if(p==="off"||(p!=="on"&&low))document.documentElement.dataset.glass="off"}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set per request by middleware.ts; only scripts carrying it may run.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Runs before the first paint so glass never flickers on, then off. */}
        {/* Browsers hide nonce values from the page, so React sees "" when hydrating. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: GLASS_SCRIPT }}
        />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider nonce={nonce}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{ className: "!rounded-md" }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

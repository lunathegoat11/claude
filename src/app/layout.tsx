import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kosha — your health records in one place", template: "%s – Kosha" },
  description:
    "Organise your medical records, track health measurements, understand your lab results, and see your health history over time.",
  applicationName: "Kosha",
  appleWebApp: { capable: true, title: "Kosha", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

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

import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kosha — your health records in one place", template: "%s – Kosha" },
  description:
    "Securely organise your medical records, track health measurements, understand your lab results, and see your health history over time.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
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

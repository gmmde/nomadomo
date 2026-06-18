import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadomo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NomaDomo - Meet a real local in Japan",
    template: "%s | NomaDomo",
  },
  description: "Match with local student guides across Japan. Free mates or paid amateur guides — get the real local experience, not a tourist tour.",
  keywords: ["Japan", "local guide", "travel", "student guide", "mate", "日本", "ガイド"],
  authors: [{ name: "gmmde" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ja_JP"],
    url: SITE_URL,
    siteName: "NomaDomo",
    title: "NomaDomo - Meet a real local in Japan",
    description: "Match with local student guides across Japan. Free mates or paid amateur guides — get the real local experience.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NomaDomo - Meet a real local in Japan",
    description: "Match with student guides across Japan — free mates or paid amateur guides.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ad001c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${nunito.className} min-h-full flex flex-col`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

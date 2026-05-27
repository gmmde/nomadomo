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
    default: "NomaDomo - Meet a real local in Kyoto",
    template: "%s | NomaDomo",
  },
  description: "Match with Kyoto student guides and locals. Free mates or paid amateur guides — get the real Kyoto experience, not a tourist tour.",
  keywords: ["Kyoto", "Japan", "local guide", "travel", "student guide", "mate", "京都", "ガイド"],
  authors: [{ name: "gmmde" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ja_JP"],
    url: SITE_URL,
    siteName: "NomaDomo",
    title: "NomaDomo - Meet a real local in Kyoto",
    description: "Match with Kyoto student guides and locals. Free mates or paid amateur guides — get the real Kyoto experience.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NomaDomo - Meet a real local in Kyoto",
    description: "Match with Kyoto student guides — free mates or paid amateur guides.",
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

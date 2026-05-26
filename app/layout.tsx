import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadomo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NomaDomo - 京都で本物のローカルと出会う",
    template: "%s | NomaDomo",
  },
  description: "京都の大学生ガイドと旅行者をマッチング。観光ツアーじゃ味わえない地元の体験を。",
  keywords: ["京都", "ガイド", "旅行", "Kyoto", "local guide", "travel", "学生ガイド"],
  authors: [{ name: "gmmde" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: "NomaDomo",
    title: "NomaDomo - 京都で本物のローカルと出会う",
    description: "京都の大学生ガイドと旅行者をマッチング。観光ツアーじゃ味わえない地元の体験を。",
  },
  twitter: {
    card: "summary_large_image",
    title: "NomaDomo - 京都で本物のローカルと出会う",
    description: "京都の大学生ガイドと旅行者をマッチング。",
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
    <html lang="ja" className="h-full">
      <body className={`${nunito.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}

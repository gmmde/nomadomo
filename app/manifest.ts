import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NomaDomo - 日本で本物のローカルと出会う",
    short_name: "NomaDomo",
    description: "日本各地の学生ガイド・地元民と旅行者をマッチングするモバイルWebアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f5ead0",
    theme_color: "#ad001c",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    lang: "ja",
    categories: ["travel", "social", "lifestyle"],
  };
}

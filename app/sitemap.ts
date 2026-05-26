import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadomo.vercel.app";

// 個別ガイドページは SPA 内 state なので URL なし。
// ルート / だけ index させる。将来 /guides/[id] ページ作ったらここに追加。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}

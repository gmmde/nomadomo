import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadomo.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/signup", "/guides/*/edit", "/travelers/edit", "/travelers/new"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

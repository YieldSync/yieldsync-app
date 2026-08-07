import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard", "/settings", "/notifications"],
    },
    sitemap: "https://yieldsync.io/sitemap.xml",
    host: "https://yieldsync.io",
  };
}

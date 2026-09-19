import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://e-vote.fiidev.my.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/verify"],
        disallow: [
          "/admin/",
          "/api/admin/",
          "/vote",
          "/success",
          "/unauthorized",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

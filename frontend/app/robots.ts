import { config } from "@cmsjs/config";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/preview", "/refresh"],
      },
    ],
    sitemap: new URL("/sitemap.xml", config.siteUrl).href,
  };
}

import { listNews } from "@cmsjs/cms/data";
import { config } from "@cmsjs/config";
import type { MetadataRoute } from "next";
import { connection } from "next/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const news = await listNews();

  const base = config.siteUrl.href.replace(/\/$/, "");

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/chi-siamo`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/attivita`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/notizie`, changeFrequency: "daily", priority: 0.9 },
    ...news.map((item) => ({
      url: `${base}/notizie/${item.identity.slug}`,
      changeFrequency: "weekly" as const,
    })),
  ];
}

import { listNews } from "@cmsjs/cms/data";
import { config } from "@cmsjs/config";
import { createSitemap } from "@cmsjs/seo";
import type { MetadataRoute } from "next";
import { connection } from "next/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const news = await listNews();

  return createSitemap(config.siteUrl, news);
}

import { getNewsBySlug } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import {
  createPageMetadata,
  NEWS_FALLBACK_DESCRIPTION,
  NEWS_FALLBACK_TITLE,
  newsPath,
  textOrFallback,
} from "@cmsjs/seo";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/notizie/[slug]">): Promise<Metadata> {
  await io();
  const { slug } = await params;
  const page = await getNewsBySlug(slug);
  if (!page) notFound();
  const title = textOrFallback(page.identity.title, NEWS_FALLBACK_TITLE);
  const description = textOrFallback(page.summary, NEWS_FALLBACK_DESCRIPTION);

  return createPageMetadata({
    path: newsPath(slug),
    title,
    openGraphTitle: `${title} | U.S. Albatese`,
    description,
    image: page.heroImage,
    type: "article",
  });
}
export default async function NewsRoute({
  params,
}: PageProps<"/notizie/[slug]">) {
  await io();
  const { slug } = await params;
  const page = await getNewsBySlug(slug);
  if (!page) notFound();
  return <PageSwitch page={page} />;
}

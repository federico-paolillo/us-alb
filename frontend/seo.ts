import type { ImageDto, NewsListItemDto } from "@cmsjs/cms/model";
import type { Metadata, MetadataRoute } from "next";

export const SITE_NAME = "U.S. Albatese";
export const LEGAL_NAME = "Unione Sportiva Albatese ASD";
export const HOME_TITLE = "U.S. Albatese (Como) — Calcio, atletica e comunità";
export const SITE_DESCRIPTION =
  "Polisportiva dilettantistica di Albate (Como): calcio, atletica e sport di comunità dal 1968.";
export const ABOUT_DESCRIPTION =
  "Storia, valori, persone e luoghi dell’U.S. Albatese, polisportiva di Albate (Como) dal 1968.";
export const ACTIVITY_DESCRIPTION =
  "Calcio, atletica e proposte sportive dell’U.S. Albatese per giovani, adulti e comunità di Albate.";
export const NEWS_DESCRIPTION =
  "Notizie, risultati, appuntamenti e documenti ufficiali dell’U.S. Albatese.";
export const NEWS_FALLBACK_TITLE = "Notizia";
export const NEWS_FALLBACK_DESCRIPTION = "Aggiornamento dall’U.S. Albatese.";

interface PageMetadataInput {
  path: string;
  title: string;
  openGraphTitle: string;
  description: string;
  image?: ImageDto;
  type: "website" | "article";
  absoluteTitle?: boolean;
}

export function textOrFallback(value: string, fallback: string): string {
  return value.trim() || fallback;
}

export function newsPath(slug: string): `/notizie/${string}` {
  return `/notizie/${encodeURIComponent(slug)}`;
}

export function createPageMetadata({
  path,
  title,
  openGraphTitle,
  description,
  image,
  type,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: "it_IT",
      title: openGraphTitle,
      description,
      url: path,
      images: image
        ? [
            {
              url: image.url,
              width: image.width,
              height: image.height,
              alt: image.alt,
              type: image.mime,
            },
          ]
        : undefined,
    },
  };
}

export function createOrganizationJsonLd(siteUrl: URL) {
  const publicUrl = new URL("/", siteUrl).href;

  return Object.freeze({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${publicUrl}#organization`,
    name: LEGAL_NAME,
    alternateName: SITE_NAME,
    url: publicUrl,
    foundingDate: "1968",
    description: SITE_DESCRIPTION,
    areaServed: Object.freeze({
      "@type": "Place",
      name: "Albate, Como",
    }),
  });
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function createSitemap(
  siteUrl: URL,
  news: readonly NewsListItemDto[],
): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, siteUrl).href;

  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    {
      url: url("/chi-siamo"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: url("/attivita"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/notizie"), changeFrequency: "daily", priority: 0.9 },
    ...news.map((item) => ({
      url: url(newsPath(item.identity.slug)),
      changeFrequency: "weekly" as const,
    })),
  ];
}

export function previewRobotsMetadata(enabled: boolean): Metadata {
  return {
    robots: enabled
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

import type { ImageDto, NewsListItemDto } from "@cmsjs/cms/model";
import { describe, expect, it } from "vitest";
import {
  createOrganizationJsonLd,
  createPageMetadata,
  createSitemap,
  HOME_TITLE,
  newsPath,
  previewRobotsMetadata,
  SITE_DESCRIPTION,
  serializeJsonLd,
  textOrFallback,
} from "./seo";

const image: ImageDto = {
  url: "https://cms.example/uploads/hero.png",
  alt: "Segnaposto per una squadra giovanile U.S. Albatese",
  width: 1600,
  height: 1000,
  mime: "image/png",
};

function newsItem(slug: string): NewsListItemDto {
  return {
    identity: { slug, title: `Notizia ${slug}` },
    category: "Società",
    summary: "Una notizia di prova",
    editorialDate: "2026-10-08",
    heroImage: image,
    featured: false,
  };
}

describe("SEO policy", () => {
  it("creates exact Home metadata with an absolute title", () => {
    const metadata = createPageMetadata({
      path: "/",
      title: HOME_TITLE,
      openGraphTitle: HOME_TITLE,
      description: SITE_DESCRIPTION,
      image,
      type: "website",
      absoluteTitle: true,
    });

    expect(metadata.title).toEqual({ absolute: HOME_TITLE });
    expect(metadata.description).toBe(SITE_DESCRIPTION);
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      siteName: "U.S. Albatese",
      locale: "it_IT",
      title: HOME_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      images: [
        {
          url: image.url,
          width: image.width,
          height: image.height,
          alt: image.alt,
          type: image.mime,
        },
      ],
    });
  });

  it("keeps a child document title short and its Open Graph title branded", () => {
    const metadata = createPageMetadata({
      path: "/chi-siamo",
      title: "Chi siamo",
      openGraphTitle: "Chi siamo | U.S. Albatese",
      description: "Descrizione",
      type: "website",
    });

    expect(metadata.title).toBe("Chi siamo");
    expect(metadata.alternates?.canonical).toBe("/chi-siamo");
    expect(metadata.openGraph).toMatchObject({
      title: "Chi siamo | U.S. Albatese",
      url: "/chi-siamo",
    });
    expect(metadata.openGraph?.images).toBeUndefined();
  });

  it("trims CMS text, applies fallbacks, and encodes one path segment", () => {
    expect(textOrFallback("  Titolo CMS  ", "Notizia")).toBe("Titolo CMS");
    expect(textOrFallback(" \n ", "Notizia")).toBe("Notizia");
    expect(newsPath("notizia con spazio/è")).toBe(
      "/notizie/notizia%20con%20spazio%2F%C3%A8",
    );
  });

  it("creates the ordered sitemap without modification dates", () => {
    const sitemap = createSitemap(new URL("https://club.example/base"), [
      newsItem("prima notizia"),
      newsItem("seconda"),
    ]);

    expect(sitemap.map((entry) => entry.url)).toEqual([
      "https://club.example/",
      "https://club.example/chi-siamo",
      "https://club.example/attivita",
      "https://club.example/notizie",
      "https://club.example/notizie/prima%20notizia",
      "https://club.example/notizie/seconda",
    ]);
    expect(sitemap.every((entry) => !("lastModified" in entry))).toBe(true);
  });

  it("creates only the approved Organization identity fields", () => {
    const organization = createOrganizationJsonLd(
      new URL("https://club.example/subpath"),
    );

    expect(organization).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://club.example/#organization",
      name: "Unione Sportiva Albatese ASD",
      alternateName: "U.S. Albatese",
      url: "https://club.example/",
      foundingDate: "1968",
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Place", name: "Albate, Como" },
    });
    for (const unsafeKey of [
      "logo",
      "address",
      "email",
      "telephone",
      "sameAs",
      "employee",
    ]) {
      expect(organization).not.toHaveProperty(unsafeKey);
    }
  });

  it("escapes HTML starts in serialized JSON-LD", () => {
    const serialized = serializeJsonLd({ description: "<script>alert(1)" });

    expect(serialized).toContain("\\u003cscript>");
    expect(serialized).not.toContain("<script>");
  });

  it("distinguishes public and Preview robots metadata", () => {
    expect(previewRobotsMetadata(false)).toEqual({
      robots: { index: true, follow: true },
    });
    expect(previewRobotsMetadata(true)).toEqual({
      robots: { index: false, follow: false, nocache: true },
    });
  });
});

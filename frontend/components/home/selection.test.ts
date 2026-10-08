import type { CalendarEntryDto, NewsListItemDto } from "@cmsjs/cms/model";
import { describe, expect, it } from "vitest";
import { selectFeaturedNews, selectNextFixture } from "./selection";

function calendarEntry(
  kind: CalendarEntryDto["kind"],
  startsAt: string,
): CalendarEntryDto {
  return {
    kind,
    startsAt,
    competition: "Campionato",
    title: `${kind}-${startsAt}`,
    venue: "Albate",
    summary: "Appuntamento di prova",
  };
}

function newsItem(slug: string, featured = false): NewsListItemDto {
  return {
    identity: { slug, title: `Notizia ${slug}` },
    category: "Società",
    summary: "Una notizia di prova",
    editorialDate: "2026-10-08",
    heroImage: {
      url: `https://example.com/${slug}.png`,
      alt: `Immagine ${slug}`,
      width: 640,
      height: 400,
      mime: "image/png",
    },
    featured,
  };
}

describe("selectNextFixture", () => {
  it("skips past matches, results, and events before returning the first future match", () => {
    const entries = [
      calendarEntry("match", "2026-10-07T20:30:00+02:00"),
      calendarEntry("result", "2026-10-09T20:30:00+02:00"),
      calendarEntry("event", "2026-10-10T20:30:00+02:00"),
      calendarEntry("match", "2026-10-11T15:00:00+02:00"),
      calendarEntry("match", "2026-10-18T15:00:00+02:00"),
    ] as const;

    expect(
      selectNextFixture(entries, new Date("2026-10-08T12:00:00+02:00")),
    ).toBe(entries[3]);
  });

  it("returns undefined when no future match qualifies", () => {
    const entries = [
      calendarEntry("match", "2026-10-08T12:00:00+02:00"),
      calendarEntry("event", "2026-10-09T12:00:00+02:00"),
    ];

    expect(
      selectNextFixture(entries, new Date("2026-10-08T12:00:00+02:00")),
    ).toBeUndefined();
  });
});

describe("selectFeaturedNews", () => {
  it("puts featured stories first while preserving both relative orders", () => {
    const news = [
      newsItem("newest"),
      newsItem("featured-one", true),
      newsItem("middle"),
      newsItem("featured-two", true),
    ];

    expect(selectFeaturedNews(news).map((item) => item.identity.slug)).toEqual([
      "featured-one",
      "featured-two",
      "newest",
    ]);
  });

  it("keeps newest input order when no story is featured", () => {
    const news = [newsItem("newest"), newsItem("middle"), newsItem("oldest")];

    expect(selectFeaturedNews(news).map((item) => item.identity.slug)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("respects positive and non-positive limits", () => {
    const news = [newsItem("one", true), newsItem("two"), newsItem("three")];

    expect(selectFeaturedNews(news, 2)).toHaveLength(2);
    expect(selectFeaturedNews(news, 0)).toEqual([]);
  });

  it("does not mutate frozen inputs", () => {
    const first = Object.freeze(newsItem("first"));
    const second = Object.freeze(newsItem("second", true));
    const news = Object.freeze([first, second]);

    expect(selectFeaturedNews(news)).toEqual([second, first]);
    expect(news).toEqual([first, second]);
  });
});

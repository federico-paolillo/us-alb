import type {
  CalendarEntryData,
  HomePageData,
  NewsData,
  OfficialDocumentData,
} from "@cmsjs/cms/client";
import {
  toCalendarEntryDto,
  toHomePageDto,
  toNewsDto,
  toOfficialDocumentDto,
} from "@cmsjs/cms/mappers";
import { describe, expect, it } from "vitest";

const media = {
  url: "/uploads/hero.jpg",
  name: "hero.jpg",
  width: 1200,
  height: 800,
  mime: "image/jpeg",
  size: 12,
};
const news = {
  identity: { slug: "campionato", title: "Campionato" },
  category: "Prima squadra",
  summary: "Sintesi",
  editorialDate: "2026-10-08",
  heroImage: media,
  content: [],
  featured: false,
} as unknown as NewsData;
const home = {
  eyebrow: "Società",
  headline: "U.S. Albatese",
  introduction: "Introduzione",
  heroImage: media,
  metrics: [{ value: "100", label: "Atleti" }],
  institutionalQuote: {
    text: "Insieme",
    attribution: "Presidente",
    role: "Società",
  },
  activityTeasers: [
    { title: "Calcio", summary: "Settore calcio", image: media },
  ],
} as unknown as HomePageData;

describe("institutional mappers", () => {
  it("maps and freezes a nested home page while normalizing media URLs", () => {
    const result = toHomePageDto(home, "https://cms.example", "published");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.heroImage.url).toBe(
        "https://cms.example/uploads/hero.jpg",
      );
      expect(result.value.institutionalQuote.role).toBe("Società");
      expect(Object.isFrozen(result.value.activityTeasers)).toBe(true);
    }
  });

  it("keeps published validation strict", () => {
    expect(
      toHomePageDto({} as HomePageData, "https://cms.example", "published").ok,
    ).toBe(false);
  });

  it("normalizes missing draft repeatable components to empty arrays", () => {
    const result = toHomePageDto(
      {
        ...home,
        metrics: null,
        activityTeasers: null,
      } as unknown as HomePageData,
      "https://cms.example",
      "draft",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metrics).toEqual([]);
      expect(result.value.activityTeasers).toEqual([]);
    }
  });
});

describe("news mapper", () => {
  it("accepts real Gregorian dates and rejects impossible or loose dates", () => {
    expect(toNewsDto(news, "https://cms.example", "published").ok).toBe(true);
    expect(
      toNewsDto(
        { ...news, editorialDate: "2026-02-29" } as NewsData,
        "https://cms.example",
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toNewsDto(
        { ...news, editorialDate: "08-10-2026" } as NewsData,
        "https://cms.example",
        "published",
      ).ok,
    ).toBe(false);
  });

  it("rejects an empty editorial date", () => {
    expect(
      toNewsDto(
        { ...news, editorialDate: "" } as NewsData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
  });

  it("normalizes missing draft scalars and blocks but never fabricates required media", () => {
    const incomplete = {
      ...news,
      identity: { slug: "bozza", title: null },
      category: null,
      summary: null,
      content: null,
    } as unknown as NewsData;
    const result = toNewsDto(incomplete, "https://cms.example", "draft");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.identity.title).toBe("");
      expect(result.value.content).toEqual([]);
      expect(result.value.summary).toBe("");
    }
    expect(
      toNewsDto(
        { ...incomplete, editorialDate: null } as unknown as NewsData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
    expect(
      toNewsDto(
        { ...incomplete, heroImage: null } as unknown as NewsData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
  });
});

describe("calendar and document mappers", () => {
  const entry = {
    kind: "result",
    startsAt: "2026-10-08T20:30:00+02:00",
    competition: "Campionato",
    title: "Albatese - Ospiti",
    homeScore: 2,
    awayScore: 1,
    venue: "Campo",
    summary: "Vittoria",
  } as unknown as CalendarEntryData;

  it("validates calendar enums, offset-aware datetimes, and integer scores", () => {
    expect(toCalendarEntryDto(entry, "published").ok).toBe(true);
    expect(
      toCalendarEntryDto(
        { ...entry, kind: "training" } as unknown as CalendarEntryData,
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toCalendarEntryDto(
        { ...entry, startsAt: "2026-10-08T20:30:00" } as CalendarEntryData,
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toCalendarEntryDto(
        { ...entry, startsAt: "2026-02-30T20:30:00Z" } as CalendarEntryData,
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toCalendarEntryDto(
        { ...entry, homeScore: 1.5 } as CalendarEntryData,
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toCalendarEntryDto(
        { ...entry, homeScore: -1 } as CalendarEntryData,
        "published",
      ).ok,
    ).toBe(false);
  });

  it("rejects an empty calendar start datetime", () => {
    expect(
      toCalendarEntryDto(
        { ...entry, startsAt: "" } as CalendarEntryData,
        "draft",
      ).ok,
    ).toBe(false);
  });

  it("rejects non-image hero media", () => {
    expect(
      toNewsDto(
        {
          ...news,
          heroImage: { ...media, mime: "application/pdf" },
        } as NewsData,
        "https://cms.example",
        "published",
      ).ok,
    ).toBe(false);
  });

  it("requires a PDF file even for drafts", () => {
    const document = {
      title: "Statuto",
      category: "Società",
      season: "2026",
      displayOrder: 1,
      file: {
        url: "/uploads/statuto.pdf",
        name: "statuto.pdf",
        mime: "application/pdf",
        ext: ".pdf",
        size: 20,
      },
    } as unknown as OfficialDocumentData;
    expect(
      toOfficialDocumentDto(document, "https://cms.example", "published").ok,
    ).toBe(true);
    expect(
      toOfficialDocumentDto(
        {
          ...document,
          file: { ...document.file, mime: "image/jpeg" },
        } as OfficialDocumentData,
        "https://cms.example",
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toOfficialDocumentDto(
        { ...document, displayOrder: -1 } as OfficialDocumentData,
        "https://cms.example",
        "published",
      ).ok,
    ).toBe(false);
    expect(
      toOfficialDocumentDto(
        { ...document, file: null } as unknown as OfficialDocumentData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
  });
});

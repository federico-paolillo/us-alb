import type {
  CalendarEntryData,
  HomePageData,
  LocationData,
  NewsData,
  OfficialDocumentData,
} from "@cmsjs/cms/client";
import {
  toCalendarEntryDto,
  toHomePageDto,
  toLocationDto,
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
const location = {
  documentId: "location-1",
  name: "Campo comunale",
  address: "Via dello Sport 1",
  aboutSummary: "La sede principale",
  aboutImage: media,
  activityDetails: "Ingresso nord",
  contactMethods: [
    { kind: "phone", label: " Segreteria ", value: " +39 (031) 123-456 " },
    { kind: "email", label: " Email ", value: " Info@Club.Example " },
  ],
  displayOrder: 1,
  showOnHome: true,
  showOnAbout: true,
  showOnActivity: false,
} as unknown as LocationData;

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
      expect(result.value.contactMethods).toEqual([]);
    }
  });

  it("maps contact copy and safe phone and email links", () => {
    const result = toHomePageDto(
      {
        ...home,
        contactHeading: "Dove trovarci",
        contactIntroduction: "Scrivici o chiamaci",
        contactMethods: location.contactMethods,
      } as HomePageData,
      "https://cms.example",
      "published",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.contactHeading).toBe("Dove trovarci");
      expect(result.value.contactIntroduction).toBe("Scrivici o chiamaci");
      expect(result.value.contactMethods).toEqual([
        {
          kind: "phone",
          label: "Segreteria",
          value: "+39 (031) 123-456",
          href: "tel:+39031123456",
        },
        {
          kind: "email",
          label: "Email",
          value: "Info@Club.Example",
          href: "mailto:Info@Club.Example",
        },
      ]);
      expect(Object.isFrozen(result.value.contactMethods[0])).toBe(true);
    }
  });

  it.each([
    [
      "unsafe phone",
      { kind: "phone", label: "Telefono", value: "+39;ext=2" },
      "expected safe phone number at $.contactMethods[0].value",
    ],
    [
      "unsafe email",
      { kind: "email", label: "Email", value: "info@example.com?subject=x" },
      "expected safe email address at $.contactMethods[0].value",
    ],
    [
      "blank label",
      { kind: "email", label: "  ", value: "info@example.com" },
      "expected non-blank string at $.contactMethods[0].label",
    ],
    [
      "unknown kind",
      { kind: "fax", label: "Fax", value: "031123456" },
      "expected contact kind at $.contactMethods[0].kind",
    ],
    [
      "oversized value",
      {
        kind: "email",
        label: "Email",
        value: `${"a".repeat(244)}@example.com`,
      },
      "expected at most 255 characters at $.contactMethods[0].value",
    ],
  ])("rejects a published %s with its contact path", (_name, method, cause) => {
    const result = toHomePageDto(
      { ...home, contactMethods: [method] } as unknown as HomePageData,
      "https://cms.example",
      "published",
    );

    expect(result.ok).toBe(false);
    if (!result.ok && result.problem.kind === "validation") {
      expect(result.problem.cause).toContain(cause);
    }
  });

  it("omits invalid draft methods while preserving valid siblings", () => {
    const result = toHomePageDto(
      {
        ...home,
        contactMethods: [
          { kind: "phone", label: "Telefono", value: "+39;ext=2" },
          { kind: "email", label: "Email", value: "info@example.com?x=1" },
          { kind: "email", label: "  ", value: "info@example.com" },
          { kind: "phone", label: " Reception ", value: " 031 123 456 " },
        ],
      } as unknown as HomePageData,
      "https://cms.example",
      "draft",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.contactMethods).toEqual([
        {
          kind: "phone",
          label: "Reception",
          value: "031 123 456",
          href: "tel:031123456",
        },
      ]);
    }
  });

  it.each([
    "published",
    "draft",
  ] as const)("rejects a non-array contact collection in %s mode", (status) => {
    expect(
      toHomePageDto(
        { ...home, contactMethods: {} } as unknown as HomePageData,
        "https://cms.example",
        status,
      ).ok,
    ).toBe(false);
  });
});

describe("location mapper", () => {
  it("maps and deeply freezes a complete location", () => {
    const result = toLocationDto(location, "https://cms.example", "published");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.aboutImage?.url).toBe(
        "https://cms.example/uploads/hero.jpg",
      );
      expect(result.value.contactMethods.map(({ href }) => href)).toEqual([
        "tel:+39031123456",
        "mailto:Info@Club.Example",
      ]);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.contactMethods)).toBe(true);
    }
  });

  it("defaults only absent draft editorial fields and omits invalid methods", () => {
    const incomplete = {
      documentId: "location-draft",
      name: null,
      address: null,
      displayOrder: null,
      showOnHome: null,
      showOnAbout: undefined,
      showOnActivity: null,
      contactMethods: [
        { kind: "phone", label: "", value: "" },
        { kind: "email", label: " Club ", value: " club@example.com " },
      ],
    } as unknown as LocationData;
    const result = toLocationDto(incomplete, "https://cms.example", "draft");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        documentId: "location-draft",
        name: "",
        address: "",
        displayOrder: 0,
        showOnHome: false,
        showOnAbout: false,
        showOnActivity: false,
        contactMethods: [
          {
            kind: "email",
            label: "Club",
            value: "club@example.com",
            href: "mailto:club@example.com",
          },
        ],
      });
    }
    expect(
      toLocationDto(incomplete, "https://cms.example", "published").ok,
    ).toBe(false);
  });

  it("keeps image and non-null draft defaults strict", () => {
    expect(
      toLocationDto(
        {
          ...location,
          aboutImage: { broken: true },
        } as unknown as LocationData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
    expect(
      toLocationDto(
        { ...location, displayOrder: "0" } as unknown as LocationData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
    expect(
      toLocationDto(
        { ...location, showOnHome: 0 } as unknown as LocationData,
        "https://cms.example",
        "draft",
      ).ok,
    ).toBe(false);
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

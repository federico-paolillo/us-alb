import type { CalendarEntryDto, NewsListItemDto } from "@cmsjs/cms/model";
import { describe, expect, it } from "vitest";
import {
  getResultScoreState,
  groupCalendarEntries,
  splitNewsLead,
} from "./presentation";

function calendarEntry(
  kind: CalendarEntryDto["kind"],
  title: string,
  scores: Partial<Pick<CalendarEntryDto, "homeScore" | "awayScore">> = {},
): CalendarEntryDto {
  return {
    kind,
    startsAt: "2026-10-08T20:30:00+02:00",
    competition: "Campionato",
    title,
    venue: "Albate",
    summary: "Appuntamento di prova",
    ...scores,
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

describe("Notizie presentation policy", () => {
  it("groups entries stably without mutating the source", () => {
    const resultOne = Object.freeze(calendarEntry("result", "Risultato 1"));
    const matchOne = Object.freeze(calendarEntry("match", "Partita 1"));
    const eventOne = Object.freeze(calendarEntry("event", "Evento 1"));
    const matchTwo = Object.freeze(calendarEntry("match", "Partita 2"));
    const resultTwo = Object.freeze(calendarEntry("result", "Risultato 2"));
    const entries = Object.freeze([
      resultOne,
      matchOne,
      eventOne,
      matchTwo,
      resultTwo,
    ]);

    expect(groupCalendarEntries(entries)).toEqual({
      matches: [matchOne, matchTwo],
      results: [resultOne, resultTwo],
      events: [eventOne],
    });
    expect(entries).toEqual([
      resultOne,
      matchOne,
      eventOne,
      matchTwo,
      resultTwo,
    ]);
  });

  it("returns complete scores, including a goalless draw", () => {
    expect(
      getResultScoreState(
        calendarEntry("result", "Pareggio", {
          homeScore: 0,
          awayScore: 0,
        }),
      ),
    ).toEqual({ kind: "complete", home: 0, away: 0 });
  });

  it("never exposes an incomplete result score", () => {
    expect(
      getResultScoreState(
        calendarEntry("result", "Parziale casa", { homeScore: 2 }),
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      getResultScoreState(
        calendarEntry("result", "Parziale ospiti", { awayScore: 1 }),
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      getResultScoreState(calendarEntry("result", "Senza punteggio")),
    ).toEqual({ kind: "unavailable" });
  });

  it("ignores score fields on matches and events", () => {
    const scores = { homeScore: 2, awayScore: 1 };

    expect(
      getResultScoreState(calendarEntry("match", "Partita", scores)),
    ).toEqual({ kind: "not-applicable" });
    expect(
      getResultScoreState(calendarEntry("event", "Evento", scores)),
    ).toEqual({ kind: "not-applicable" });
  });

  it("selects the first featured story and preserves the remaining order", () => {
    const newest = Object.freeze(newsItem("newest"));
    const featured = Object.freeze(newsItem("featured", true));
    const older = Object.freeze(newsItem("older"));
    const anotherFeatured = Object.freeze(newsItem("another-featured", true));
    const news = Object.freeze([newest, featured, older, anotherFeatured]);

    expect(splitNewsLead(news)).toEqual({
      lead: featured,
      remaining: [newest, older, anotherFeatured],
    });
    expect(news).toEqual([newest, featured, older, anotherFeatured]);
  });

  it("falls back to the first story and handles one or no items", () => {
    const newest = newsItem("newest");
    const older = newsItem("older");

    expect(splitNewsLead([newest, older])).toEqual({
      lead: newest,
      remaining: [older],
    });
    expect(splitNewsLead([newest])).toEqual({
      lead: newest,
      remaining: [],
    });
    expect(splitNewsLead([])).toEqual({ lead: undefined, remaining: [] });
  });
});

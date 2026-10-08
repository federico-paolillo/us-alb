import type { CalendarEntryDto, NewsListItemDto } from "@cmsjs/cms/model";

export function groupCalendarEntries(
  entries: readonly CalendarEntryDto[],
): Readonly<{
  matches: CalendarEntryDto[];
  results: CalendarEntryDto[];
  events: CalendarEntryDto[];
}> {
  return {
    matches: entries.filter((entry) => entry.kind === "match"),
    results: entries.filter((entry) => entry.kind === "result"),
    events: entries.filter((entry) => entry.kind === "event"),
  };
}

export type ResultScoreState =
  | { kind: "not-applicable" }
  | { kind: "unavailable" }
  | { kind: "complete"; home: number; away: number };

export function getResultScoreState(entry: CalendarEntryDto): ResultScoreState {
  if (entry.kind !== "result") return { kind: "not-applicable" };
  if (entry.homeScore === undefined || entry.awayScore === undefined) {
    return { kind: "unavailable" };
  }

  return {
    kind: "complete",
    home: entry.homeScore,
    away: entry.awayScore,
  };
}

export function splitNewsLead(news: readonly NewsListItemDto[]): Readonly<{
  lead: NewsListItemDto | undefined;
  remaining: NewsListItemDto[];
}> {
  if (news.length === 0) return { lead: undefined, remaining: [] };

  const featuredIndex = news.findIndex((item) => item.featured);
  const leadIndex = featuredIndex === -1 ? 0 : featuredIndex;

  return {
    lead: news[leadIndex],
    remaining: news.filter((_, index) => index !== leadIndex),
  };
}

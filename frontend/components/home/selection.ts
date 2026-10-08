import type { CalendarEntryDto, NewsListItemDto } from "@cmsjs/cms/model";

export function selectNextFixture(
  entries: readonly CalendarEntryDto[],
  now: Date,
): CalendarEntryDto | undefined {
  const nowTimestamp = now.getTime();

  return entries.find(
    (entry) =>
      entry.kind === "match" && Date.parse(entry.startsAt) > nowTimestamp,
  );
}

export function selectFeaturedNews(
  news: readonly NewsListItemDto[],
  limit = 3,
): NewsListItemDto[] {
  if (limit <= 0 || news.length === 0) return [];

  return [
    ...news.filter((item) => item.featured),
    ...news.filter((item) => !item.featured),
  ].slice(0, limit);
}

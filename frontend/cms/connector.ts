import type { CmsClient } from "@cmsjs/cms/client";
import {
  toAboutPageDto,
  toActivityPageDto,
  toCalendarEntryDto,
  toHomePageDto,
  toNewsDto,
  toNewsListItemDto,
  toOfficialDocumentDto,
} from "@cmsjs/cms/mappers";
import type {
  AboutPageDto,
  ActivityPageDto,
  CalendarEntryDto,
  HomePageDto,
  NewsDto,
  NewsListItemDto,
  OfficialDocumentDto,
} from "@cmsjs/cms/model";
import type { ContentStatus } from "@cmsjs/cms/preview";
import { ok, type Result } from "@cmsjs/cms/result";

export interface CmsConnector {
  getHomePage(status: ContentStatus): Promise<Result<HomePageDto>>;
  getAboutPage(status: ContentStatus): Promise<Result<AboutPageDto>>;
  getActivityPage(status: ContentStatus): Promise<Result<ActivityPageDto>>;
  getNewsBySlug(slug: string, status: ContentStatus): Promise<Result<NewsDto>>;
  listNews(): Promise<Result<NewsListItemDto[]>>;
  listCalendarEntries(
    status: ContentStatus,
  ): Promise<Result<CalendarEntryDto[]>>;
  listOfficialDocuments(
    status: ContentStatus,
  ): Promise<Result<OfficialDocumentDto[]>>;
}

export function makeCmsConnector(
  client: CmsClient,
  mediaBaseUrl: string,
): CmsConnector {
  const connector: CmsConnector = {
    getHomePage: (status) =>
      mapSingle(client.getHomePage(status), (data) =>
        toHomePageDto(data, mediaBaseUrl, status),
      ),
    getAboutPage: (status) =>
      mapSingle(client.getAboutPage(status), (data) =>
        toAboutPageDto(data, mediaBaseUrl, status),
      ),
    getActivityPage: (status) =>
      mapSingle(client.getActivityPage(status), (data) =>
        toActivityPageDto(data, mediaBaseUrl, status),
      ),
    getNewsBySlug: (slug, status) =>
      mapSingle(client.getNewsBySlug(slug, status), (data) =>
        toNewsDto(data, mediaBaseUrl, status),
      ),
    listNews: () =>
      mapList(client.listNews(), (data) =>
        toNewsListItemDto(data, mediaBaseUrl),
      ),
    listCalendarEntries: (status) =>
      mapList(client.listCalendarEntries(status), (data) =>
        toCalendarEntryDto(data, status),
      ),
    listOfficialDocuments: (status) =>
      mapList(client.listOfficialDocuments(status), (data) =>
        toOfficialDocumentDto(data, mediaBaseUrl, status),
      ),
  };
  return Object.freeze(connector);
}

async function mapSingle<T, D>(
  promise: Promise<Result<T>>,
  map: (value: T) => Result<D>,
): Promise<Result<D>> {
  const result = await promise;
  return result.ok ? map(result.value) : result;
}
async function mapList<T, D>(
  promise: Promise<Result<T[]>>,
  map: (value: T) => Result<D>,
): Promise<Result<D[]>> {
  const result = await promise;
  if (!result.ok) return result;
  const values: D[] = [];
  for (const item of result.value) {
    const mapped = map(item);
    if (!mapped.ok) return mapped;
    values.push(mapped.value);
  }
  return ok(values);
}

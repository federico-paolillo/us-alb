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
import type { Result } from "@cmsjs/cms/result";
import { deps } from "@cmsjs/deps";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";

async function contentStatus(): Promise<ContentStatus> {
  return (await draftMode()).isEnabled ? "draft" : "published";
}

export async function getHomePage(): Promise<HomePageDto | null> {
  return getHomePageCached(await contentStatus());
}
async function getHomePageCached(
  status: ContentStatus,
): Promise<HomePageDto | null> {
  "use cache";
  cacheLife("days");
  cacheTag("home-page");
  return valueOrThrow(await deps.connector.getHomePage(status));
}

export async function getAboutPage(): Promise<AboutPageDto | null> {
  return getAboutPageCached(await contentStatus());
}
async function getAboutPageCached(
  status: ContentStatus,
): Promise<AboutPageDto | null> {
  "use cache";
  cacheLife("days");
  cacheTag("about-page");
  return valueOrThrow(await deps.connector.getAboutPage(status));
}

export async function getActivityPage(): Promise<ActivityPageDto | null> {
  return getActivityPageCached(await contentStatus());
}
async function getActivityPageCached(
  status: ContentStatus,
): Promise<ActivityPageDto | null> {
  "use cache";
  cacheLife("days");
  cacheTag("activity-page");
  return valueOrThrow(await deps.connector.getActivityPage(status));
}

export async function getNewsBySlug(slug: string): Promise<NewsDto | null> {
  return getNewsBySlugCached(slug, await contentStatus());
}
async function getNewsBySlugCached(
  slug: string,
  status: ContentStatus,
): Promise<NewsDto | null> {
  "use cache";
  cacheLife("days");
  cacheTag("news", `news:${slug}`);
  return valueOrThrow(await deps.connector.getNewsBySlug(slug, status));
}

export async function listNews(): Promise<NewsListItemDto[]> {
  "use cache";
  cacheLife("days");
  cacheTag("news");
  return listOrThrow(await deps.connector.listNews());
}

export async function listCalendarEntries(): Promise<CalendarEntryDto[]> {
  return listCalendarEntriesCached(await contentStatus());
}
async function listCalendarEntriesCached(
  status: ContentStatus,
): Promise<CalendarEntryDto[]> {
  "use cache";
  cacheLife("days");
  cacheTag("calendar-entries");
  return listOrThrow(await deps.connector.listCalendarEntries(status));
}

export async function listOfficialDocuments(): Promise<OfficialDocumentDto[]> {
  return listOfficialDocumentsCached(await contentStatus());
}
async function listOfficialDocumentsCached(
  status: ContentStatus,
): Promise<OfficialDocumentDto[]> {
  "use cache";
  cacheLife("days");
  cacheTag("official-documents");
  return listOrThrow(await deps.connector.listOfficialDocuments(status));
}

function valueOrThrow<T>(result: Result<T>): T | null {
  if (result.ok) return result.value;
  if (result.problem.kind === "not_found") return null;
  throw new Error(result.problem.message, { cause: result.problem });
}
function listOrThrow<T>(result: Result<T[]>): T[] {
  if (result.ok) return result.value;
  if (result.problem.kind === "not_found") return [];
  throw new Error(result.problem.message, { cause: result.problem });
}

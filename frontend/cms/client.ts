import type { ContentStatus } from "@cmsjs/cms/preview";
import {
  httpError,
  networkError,
  notFound,
  ok,
  parseError,
  type ResourceRef,
  type Result,
} from "@cmsjs/cms/result";
import type { paths } from "@cmsjs/cms/schema";
import createClient, { type Client } from "openapi-fetch";

export type HomePageData =
  paths["/home-page"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type AboutPageData =
  paths["/about-page"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type ActivityPageData =
  paths["/activity-page"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type NewsData =
  paths["/news"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NewsListData = NewsData[];
export type CalendarEntryData =
  paths["/calendar-entries"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type CalendarEntryListData = CalendarEntryData[];
export type OfficialDocumentData =
  paths["/official-documents"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type OfficialDocumentListData = OfficialDocumentData[];

const LIST_PAGE_SIZE = 100;

export interface CmsClient {
  getHomePage(status: ContentStatus): Promise<Result<HomePageData>>;
  getAboutPage(status: ContentStatus): Promise<Result<AboutPageData>>;
  getActivityPage(status: ContentStatus): Promise<Result<ActivityPageData>>;
  getNewsBySlug(slug: string, status: ContentStatus): Promise<Result<NewsData>>;
  listNews(): Promise<Result<NewsListData>>;
  listCalendarEntries(
    status: ContentStatus,
  ): Promise<Result<CalendarEntryListData>>;
  listOfficialDocuments(
    status: ContentStatus,
  ): Promise<Result<OfficialDocumentListData>>;
}

export function makeCmsClient(
  fetch: typeof globalThis.fetch,
  baseUrl: string,
  token: string | null,
): CmsClient {
  const rawClient = createClient<paths>({
    baseUrl,
    fetch,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    querySerializer: serializeQuery,
  });
  const client: CmsClient = {
    getHomePage: (status) =>
      singleton<HomePageData>(
        rawClient,
        "/home-page",
        status,
        homePopulate,
        "home-page",
      ),
    getAboutPage: (status) =>
      singleton<AboutPageData>(
        rawClient,
        "/about-page",
        status,
        aboutPopulate,
        "about-page",
      ),
    getActivityPage: (status) =>
      singleton<ActivityPageData>(
        rawClient,
        "/activity-page",
        status,
        activityPopulate,
        "activity-page",
      ),
    getNewsBySlug: (slug, status) => getNewsBySlug(rawClient, slug, status),
    listNews: () => listNews(rawClient),
    listCalendarEntries: (status) => listCalendarEntries(rawClient, status),
    listOfficialDocuments: (status) => listOfficialDocuments(rawClient, status),
  };
  return Object.freeze(client);
}

const homePopulate = {
  heroImage: true,
  metrics: true,
  institutionalQuote: true,
  activityTeasers: { populate: { image: true } },
};
const aboutPopulate = {
  heroImage: true,
  timeline: true,
  values: true,
  boardMembers: { populate: { portrait: true } },
  facilities: { populate: { image: true } },
};
const activityPopulate = {
  heroImage: true,
  programs: { populate: { image: true } },
  schedules: true,
  venues: true,
  openTeamFeature: { populate: { image: true } },
  athleticsFeature: { populate: { image: true } },
  registrationSteps: true,
};
const newsPopulate = { identity: true, heroImage: true };

async function singleton<T>(
  rawClient: Client<paths>,
  path: "/home-page" | "/about-page" | "/activity-page",
  status: ContentStatus,
  populate: unknown,
  resource: string,
): Promise<Result<T>> {
  return toResult(
    rawClient.GET(path, {
      params: { query: deepQuery({ status, populate }) },
    }) as Promise<{ data?: { data: T }; response: Response }>,
    { resource },
  );
}

async function getNewsBySlug(
  rawClient: Client<paths>,
  slug: string,
  status: ContentStatus,
): Promise<Result<NewsData>> {
  const result = await toResult(
    rawClient.GET("/news", {
      params: {
        query: deepQuery({
          status,
          populate: newsPopulate,
          filters: { identity: { slug: { $eq: slug } } },
          pagination: { pageSize: 1 },
        }),
      },
    }),
    { resource: "news", slug },
  );
  if (!result.ok) return result;
  return result.value[0]
    ? ok(result.value[0])
    : notFound({ resource: "news", slug });
}

function listNews(rawClient: Client<paths>): Promise<Result<NewsListData>> {
  return toResult(
    rawClient.GET("/news", {
      params: {
        query: listQuery(newsPopulate, "editorialDate:desc", "published"),
      },
    }),
    { resource: "news" },
  );
}

function listCalendarEntries(
  rawClient: Client<paths>,
  status: ContentStatus,
): Promise<Result<CalendarEntryListData>> {
  return toResult(
    rawClient.GET("/calendar-entries", {
      params: {
        query: listQuery({ callToAction: true }, "startsAt:asc", status),
      },
    }),
    { resource: "calendar-entries" },
  );
}

function listOfficialDocuments(
  rawClient: Client<paths>,
  status: ContentStatus,
): Promise<Result<OfficialDocumentListData>> {
  return toResult(
    rawClient.GET("/official-documents", {
      params: {
        query: listQuery(
          { file: true },
          ["displayOrder:asc", "title:asc"],
          status,
        ),
      },
    }),
    { resource: "official-documents" },
  );
}

async function toResult<T>(
  resultPromise: Promise<{ data?: { data: T }; response: Response }>,
  metadata: ResourceRef,
): Promise<Result<T>> {
  try {
    const result = await resultPromise;
    if (result.data !== undefined) return ok(result.data.data);
    if (result.response.status === 404) return notFound(metadata);
    return httpError(result.response.status, metadata);
  } catch (underlying) {
    return underlying instanceof SyntaxError
      ? parseError(metadata, underlying)
      : networkError(metadata, underlying);
  }
}

function listQuery(
  populate: unknown,
  sort: string | string[],
  status: ContentStatus,
): never {
  return deepQuery({
    status,
    populate,
    sort,
    pagination: { pageSize: LIST_PAGE_SIZE },
  });
}

function deepQuery(query: Record<string, unknown>): never {
  return query as never;
}

export function serializeQuery(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  function append(path: string, value: unknown): void {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        append(`${path}[${index}]`, item);
      });
      return;
    }
    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, item]) => {
          append(path ? `${path}[${key}]` : key, item);
        },
      );
      return;
    }
    params.append(path, String(value));
  }
  Object.entries(query).forEach(([key, value]) => {
    append(key, value);
  });
  return params.toString();
}

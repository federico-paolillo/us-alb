import { makeCmsClient, serializeQuery } from "@cmsjs/cms/client";
import { describe, expect, it } from "vitest";

describe("serializeQuery", () => {
  it("serializes nested values and arrays with Strapi brackets", () => {
    expect(
      serializeQuery({
        populate: { identity: true },
        sort: ["displayOrder:asc", "title:asc"],
        omitted: null,
      }),
    ).toBe(
      "populate%5Bidentity%5D=true&sort%5B0%5D=displayOrder%3Aasc&sort%5B1%5D=title%3Aasc",
    );
  });
});

describe("CmsClient queries", () => {
  it("uses the institutional endpoints, populations, statuses, and sorts", async () => {
    const urls: URL[] = [];
    const fetch: typeof globalThis.fetch = async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      const url = new URL(request.url);
      urls.push(url);
      const singleton = [
        "/api/home-page",
        "/api/about-page",
        "/api/activity-page",
      ].includes(url.pathname);
      return Response.json({ data: singleton ? {} : [] });
    };
    const client = makeCmsClient(fetch, "http://localhost:1337/api", null);

    await client.getHomePage("draft");
    await client.getAboutPage("published");
    await client.getActivityPage("draft");
    await client.getNewsBySlug("una-notizia", "draft");
    await client.listNews();
    await client.listCalendarEntries("draft");
    await client.listOfficialDocuments("published");
    await client.listLocations("draft");
    await client.listLocations("published");

    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/home-page",
      "/api/about-page",
      "/api/activity-page",
      "/api/news",
      "/api/news",
      "/api/calendar-entries",
      "/api/official-documents",
      "/api/locations",
      "/api/locations",
    ]);
    expect(urls[0]?.searchParams.get("status")).toBe("draft");
    expect(
      urls[0]?.searchParams.get("populate[activityTeasers][populate][image]"),
    ).toBe("true");
    expect(urls[0]?.searchParams.get("populate[contactMethods]")).toBe("true");
    expect(
      urls[1]?.searchParams.get("populate[boardMembers][populate][portrait]"),
    ).toBe("true");
    expect(
      urls[2]?.searchParams.get("populate[programs][populate][image]"),
    ).toBe("true");
    expect(urls[3]?.searchParams.get("filters[identity][slug][$eq]")).toBe(
      "una-notizia",
    );
    expect(urls[3]?.searchParams.get("status")).toBe("draft");
    expect(urls[4]?.searchParams.get("status")).toBe("published");
    expect(urls[4]?.searchParams.get("sort")).toBe("editorialDate:desc");
    expect(urls[5]?.searchParams.get("sort")).toBe("startsAt:asc");
    expect(urls[6]?.searchParams.get("sort[0]")).toBe("displayOrder:asc");
    expect(urls[6]?.searchParams.get("sort[1]")).toBe("title:asc");
    expect(urls[7]?.searchParams.get("status")).toBe("draft");
    expect(urls[8]?.searchParams.get("status")).toBe("published");
    for (const url of urls.slice(7)) {
      expect(url.searchParams.get("populate[aboutImage]")).toBe("true");
      expect(url.searchParams.get("populate[contactMethods]")).toBe("true");
      expect(url.searchParams.get("sort[0]")).toBe("displayOrder:asc");
      expect(url.searchParams.get("sort[1]")).toBe("name:asc");
    }
    expect(
      urls
        .slice(4)
        .every((url) => url.searchParams.get("pagination[pageSize]") === "100"),
    ).toBe(true);
  });
});

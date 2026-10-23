import { makeAppConfig, resolveCmsMediaUrl } from "@cmsjs/environment";
import { describe, expect, it } from "vitest";

const required: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  CMS_API_URL: "http://cms.example/api",
  REVALIDATION_HEADER: "x-revalidation-secret",
  REVALIDATION_SECRET: "test-secret",
  PREVIEW_SECRET: "preview-secret",
  SITE_URL: "https://site.example",
};

describe("application environment", () => {
  it("uses SITE_URL for media when CMS_MEDIA_URL is absent", () => {
    expect(makeAppConfig(required).cmsMediaUrl.href).toBe(
      "https://site.example/",
    );
    expect(makeAppConfig(required).cmsApiToken).toBeNull();
  });

  it("uses an explicit media URL when configured", () => {
    expect(
      resolveCmsMediaUrl({
        ...required,
        CMS_MEDIA_URL: "https://media.example",
      }).href,
    ).toBe("https://media.example/");
  });

  it.each([
    ["CMS_API_URL", ""],
    ["REVALIDATION_HEADER", ""],
    ["REVALIDATION_SECRET", ""],
    ["PREVIEW_SECRET", ""],
    ["SITE_URL", ""],
    ["SITE_URL", "not a URL"],
  ])("rejects invalid required %s", (name, value) => {
    expect(() => makeAppConfig({ ...required, [name]: value })).toThrow(name);
  });
});

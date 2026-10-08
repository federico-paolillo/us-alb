import { parsePreviewRequest } from "@cmsjs/cms/preview";
import { describe, expect, it } from "vitest";

const secret = "preview-test-secret";
function requestUrl(url: string, status = "draft", value = secret): string {
  const request = new URL("https://frontend.example/preview");
  request.searchParams.set("url", url);
  request.searchParams.set("status", status);
  request.searchParams.set("secret", value);
  return request.href;
}

describe("parsePreviewRequest", () => {
  it.each([
    "/",
    "/chi-siamo",
    "/attivita",
    "/notizie",
  ])("accepts static path %s", (path) => {
    expect(parsePreviewRequest(requestUrl(path), secret)).toEqual({
      pathname: path,
      status: "draft",
    });
  });
  it("canonicalizes a news slug and accepts published previews", () => {
    expect(
      parsePreviewRequest(
        requestUrl("/notizie/coppa albatese", "published"),
        secret,
      ),
    ).toEqual({ pathname: "/notizie/coppa%20albatese", status: "published" });
  });
  it.each([
    "/articles/old",
    "/events/old",
    "/news/old",
    "https://attacker.example/path",
    "//attacker/path",
    "/notizie/",
    "/notizie/a/b",
    "/notizie/.",
    "/notizie/..",
    "/notizie/slash%2Fvalue",
    "/notizie/backslash%5Cvalue",
    "/notizie/item?x=1",
    "/notizie/item#x",
    "/notizie/%",
  ])("rejects unsupported or unsafe target %s", (target) => {
    expect(parsePreviewRequest(requestUrl(target), secret)).toBeNull();
  });
  it("rejects invalid credentials and status", () => {
    expect(
      parsePreviewRequest(requestUrl("/", "draft", "wrong"), secret),
    ).toBeNull();
    expect(parsePreviewRequest(requestUrl("/", "invalid"), secret)).toBeNull();
  });
});

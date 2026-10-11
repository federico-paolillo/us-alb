import { tagsForWebhook } from "@cmsjs/cms/tags";
import type { WebhookPayload } from "@cmsjs/cms/webhook";
import { describe, expect, it } from "vitest";

function payload(model: string, slug?: string): WebhookPayload {
  return {
    event: "entry.update",
    createdAt: "2026-01-01T00:00:00.000Z",
    model,
    entry: slug ? { id: 1, identity: { slug, title: "Titolo" } } : { id: 1 },
  };
}

describe("tagsForWebhook", () => {
  it.each([
    ["home-page", ["home-page"]],
    ["about-page", ["about-page"]],
    ["activity-page", ["activity-page"]],
    ["calendar-entry", ["calendar-entries"]],
    ["official-document", ["official-documents"]],
    ["location", ["locations"]],
  ])("maps %s", (model, tags) => {
    expect(tagsForWebhook(payload(model as string))).toEqual(tags);
  });
  it("maps news collection and slug tags", () => {
    expect(tagsForWebhook(payload("news-item", "campionato"))).toEqual([
      "news",
      "news:campionato",
    ]);
    expect(tagsForWebhook(payload("news-item"))).toEqual(["news"]);
  });
  it("ignores unknown models", () => {
    expect(tagsForWebhook(payload("unknown"))).toEqual([]);
  });
});

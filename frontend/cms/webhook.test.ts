import { parseWebhookPayload } from "@cmsjs/cms/webhook";
import { describe, expect, it } from "vitest";

describe("parseWebhookPayload", () => {
  it("parses a valid entry payload", () => {
    const parsed = parseWebhookPayload({
      event: "entry.update",
      createdAt: "2026-01-01T00:00:00.000Z",
      model: "news-item",
      entry: { id: 1, identity: { slug: "hello-world" } },
    });

    expect(parsed?.model).toBe("news-item");
  });

  it("short-circuits trigger-test payloads without a model", () => {
    const parsed = parseWebhookPayload({ event: "trigger-test" });

    expect(parsed?.event).toBe("trigger-test");
  });

  it("returns null for non-object input", () => {
    expect(parseWebhookPayload("nope")).toBeNull();
  });

  it("returns null when the event is missing", () => {
    expect(
      parseWebhookPayload({ model: "news-item", entry: { id: 1 } }),
    ).toBeNull();
  });

  it("rejects malformed entry payloads", () => {
    expect(
      parseWebhookPayload({
        event: "entry.update",
        model: "news-item",
        entry: { id: 1 },
      }),
    ).toBeNull();
    expect(
      parseWebhookPayload({
        event: "entry.update",
        createdAt: "2026-01-01T00:00:00.000Z",
        model: "news-item",
        entry: { id: "1" },
      }),
    ).toBeNull();
  });
});

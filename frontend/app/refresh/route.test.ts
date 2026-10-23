import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();

vi.mock("@cmsjs/config", () => ({
  config: {
    revalidationHeader: "x-custom-revalidation",
    revalidationSecret: "expected-secret",
  },
}));

vi.mock("next/cache", () => ({ revalidateTag }));

const { POST } = await import("./route");

function request(secret?: string): Request {
  return new Request("https://site.example/refresh", {
    method: "POST",
    headers: secret ? { "x-custom-revalidation": secret } : undefined,
    body: JSON.stringify({ event: "trigger-test" }),
  });
}

function entryRequest(): Request {
  return new Request("https://site.example/refresh", {
    method: "POST",
    headers: { "x-custom-revalidation": "expected-secret" },
    body: JSON.stringify({
      event: "entry.update",
      createdAt: "2026-01-01T00:00:00.000Z",
      model: "home-page",
      entry: { id: 1 },
    }),
  });
}

describe("refresh route", () => {
  beforeEach(() => revalidateTag.mockClear());

  it("accepts the complete configured header name", async () => {
    expect((await POST(request("expected-secret"))).status).toBe(201);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates supported events authenticated by the configured header", async () => {
    expect((await POST(entryRequest())).status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("home-page", "days");
  });

  it.each([
    undefined,
    "wrong-secret",
  ])("rejects invalid credentials", async (secret) => {
    expect((await POST(request(secret))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

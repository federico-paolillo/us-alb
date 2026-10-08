// Typed view of the Strapi 5 webhook payload for entry events.

import type { components } from "@cmsjs/cms/schema";

export interface WebhookEntry {
  id: number;
  identity?: components["schemas"]["IdentitySlugEntry"];
  [key: string]: unknown;
}

export interface WebhookPayload {
  event: string;
  createdAt: string;
  model: string;
  entry: WebhookEntry;
}

export function parseWebhookPayload(value: unknown): WebhookPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.event !== "string") return null;

  if (value.event === "trigger-test") {
    return value as unknown as WebhookPayload; // Short-circuit here for test payloads
  }

  if (typeof value.createdAt !== "string") return null;

  if (typeof value.model !== "string") {
    return null;
  }

  if (!isRecord(value.entry) || typeof value.entry.id !== "number") {
    return null;
  }

  return value as unknown as WebhookPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Pure mapping from a Strapi webhook payload to Next.js cache tags.

import type { WebhookPayload } from "@cmsjs/cms/webhook";

const tagsByModel = {
  "news-item": { collection: "news", item: "news" },
  "home-page": { collection: "home-page", item: null },
  "about-page": { collection: "about-page", item: null },
  "activity-page": { collection: "activity-page", item: null },
  "calendar-entry": { collection: "calendar-entries", item: null },
  "official-document": { collection: "official-documents", item: null },
  location: { collection: "locations", item: null },
} as const;

export function tagsForWebhook(payload: WebhookPayload): string[] {
  if (!(payload.model in tagsByModel)) {
    return [];
  }

  const mapping = tagsByModel[payload.model as keyof typeof tagsByModel];

  const tags: string[] = [mapping.collection];

  if (mapping.item) {
    const slug = payload.entry.identity?.slug;

    if (typeof slug === "string") {
      tags.push(`${mapping.item}:${slug}`);
    }
  }

  return tags;
}

import type { Core } from "@strapi/strapi";

const WEBHOOK_NAME = "Next revalidation";

const WEBHOOK_EVENTS = [
  "entry.create",
  "entry.update",
  "entry.delete",
  "entry.publish",
  "entry.unpublish",
];

export async function ensureNextJsWebhook(strapi: Core.Strapi): Promise<void> {
  const baseUrl = process.env.WEBHOOKS_NEXTJS_TARGET;

  if (!baseUrl) {
    strapi.log.warn(
      "Skipping Next.js webhook creation: WEBHOOKS_NEXTJS_TARGET is not set.",
    );
    return;
  }

  const secretHeader = process.env.WEBHOOKS_SECRET_HEADER;
  const secretValue = process.env.WEBHOOKS_SECRET_HEADER_VALUE;

  if (!secretHeader?.trim() || !secretValue?.trim()) {
    throw new Error(
      "WEBHOOKS_SECRET_HEADER and WEBHOOKS_SECRET_HEADER_VALUE must be set when WEBHOOKS_NEXTJS_TARGET is set.",
    );
  }

  const url = new URL("/refresh", baseUrl).toString();
  const webhookStore = strapi.get("webhookStore");

  const existing = await webhookStore.findWebhooks();

  if (existing) {
    const match = existing.find((webhook: { url: string }) => webhook.url === url);

    if (match) {
      return;
    }
  }

  const webhook = await webhookStore.createWebhook({
    name: WEBHOOK_NAME,
    url,
    headers: { [`x-${secretHeader}`]: secretValue },
    events: WEBHOOK_EVENTS,
  });

  strapi.get("webhookRunner").add(webhook);

  strapi.log.info(`Created Next.js revalidation webhook: ${url}`);
}

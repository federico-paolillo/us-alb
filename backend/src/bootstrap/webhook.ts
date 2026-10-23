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
  const baseUrl = process.env.FRONTEND_INTERNAL_URL?.trim();

  if (!baseUrl) {
    strapi.log.warn(
      "Skipping Next.js webhook creation: FRONTEND_INTERNAL_URL is not set.",
    );
    return;
  }

  const secretHeader = process.env.REVALIDATION_HEADER?.trim();
  const secretValue = process.env.REVALIDATION_SECRET?.trim();

  if (!secretHeader?.trim() || !secretValue?.trim()) {
    throw new Error(
      "REVALIDATION_HEADER and REVALIDATION_SECRET must be set when FRONTEND_INTERNAL_URL is set.",
    );
  }

  const url = new URL("/refresh", baseUrl).toString();
  const webhookStore = strapi.get("webhookStore");

  const webhook = (await webhookStore.findWebhooks()).find(
    (candidate: { name: string }) => candidate.name === WEBHOOK_NAME,
  );
  const desired = {
    name: WEBHOOK_NAME,
    url,
    headers: { [secretHeader]: secretValue },
    events: WEBHOOK_EVENTS,
  };

  if (webhook) {
    if (matchesManagedWebhook(webhook, desired)) return;

    const updated = await webhookStore.updateWebhook(webhook.id, {
      ...desired,
      id: webhook.id,
      isEnabled: webhook.isEnabled,
    });
    if (!updated) throw new Error("Unable to update Next revalidation webhook");

    strapi.get("webhookRunner").update(updated);
    strapi.log.info(`Updated Next.js revalidation webhook: ${url}`);
    return;
  }

  const created = await webhookStore.createWebhook(desired);

  strapi.get("webhookRunner").add(created);

  strapi.log.info(`Created Next.js revalidation webhook: ${url}`);
}

function matchesManagedWebhook(
  webhook: { url: string; headers: Record<string, string>; events: string[] },
  desired: { url: string; headers: Record<string, string>; events: readonly string[] },
): boolean {
  return (
    webhook.url === desired.url &&
    sameHeaders(webhook.headers, desired.headers) &&
    sameEvents(webhook.events, desired.events)
  );
}

function sameHeaders(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([key, value]) => right[key] === value)
  );
}

function sameEvents(left: string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((event) => right.includes(event));
}

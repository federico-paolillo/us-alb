import "server-only";

export interface AppConfig {
  cmsUrl: URL;
  cmsMediaUrl: URL;
  cmsApiToken: string | null;
  cmsWebhooksSecretHeader: string;
  cmsWebhooksSecretHeaderValue: string;
  previewSecret: string;
  siteUrl: URL;
}

// Remember to upkeep this list when adding new env. vars

const envVarKeys = [
  "NEXT_PUBLIC_APP_VERSION",
  "CMS_URL",
  "CMS_MEDIA_URL",
  "CMS_API_TOKEN",
  "CMS_WEBHOOKS_SECRET_HEADER",
  "CMS_WEBHOOKS_SECRET_HEADER_VALUE",
  "PREVIEW_SECRET",
  "SITE_URL",
] as const;

type EnvVarKey = (typeof envVarKeys)[number];

export const config = makeConfig();

function makeConfig(): AppConfig {
  return Object.freeze({
    cmsUrl: new URL(requireEnvVar("CMS_URL")),
    cmsMediaUrl: new URL(requireEnvVar("CMS_MEDIA_URL")),
    cmsApiToken: optionalEnvVar("CMS_API_TOKEN"),
    cmsWebhooksSecretHeader: requireEnvVar("CMS_WEBHOOKS_SECRET_HEADER"),
    cmsWebhooksSecretHeaderValue: requireEnvVar(
      "CMS_WEBHOOKS_SECRET_HEADER_VALUE",
    ),
    previewSecret: requireEnvVar("PREVIEW_SECRET"),
    siteUrl: new URL(requireEnvVar("SITE_URL")),
  });
}

function optionalEnvVar(value: EnvVarKey): string | null {
  return process.env[value]?.trim() || null;
}

function requireEnvVar(value: EnvVarKey): string {
  const maybeValue = process.env[value];

  if (maybeValue) {
    return maybeValue;
  }

  throw new Error(`Env. var. ${value} is not set`);
}

export interface AppConfig {
  cmsApiUrl: URL;
  cmsMediaUrl: URL;
  cmsApiToken: string | null;
  revalidationHeader: string;
  revalidationSecret: string;
  previewSecret: string;
  siteUrl: URL;
}

export function makeAppConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const siteUrl = requiredUrl(environment, "SITE_URL");

  return Object.freeze({
    cmsApiUrl: requiredUrl(environment, "CMS_API_URL"),
    cmsMediaUrl: resolveConfiguredCmsMediaUrl(environment, siteUrl),
    cmsApiToken: optionalValue(environment, "CMS_API_TOKEN"),
    revalidationHeader: requiredValue(environment, "REVALIDATION_HEADER"),
    revalidationSecret: requiredValue(environment, "REVALIDATION_SECRET"),
    previewSecret: requiredValue(environment, "PREVIEW_SECRET"),
    siteUrl,
  });
}

export function resolveCmsMediaUrl(environment: NodeJS.ProcessEnv): URL {
  return resolveConfiguredCmsMediaUrl(
    environment,
    requiredUrl(environment, "SITE_URL"),
  );
}

function resolveConfiguredCmsMediaUrl(
  environment: NodeJS.ProcessEnv,
  fallback: URL,
): URL {
  const value = optionalValue(environment, "CMS_MEDIA_URL");
  return value ? requiredUrl(environment, "CMS_MEDIA_URL") : fallback;
}

function optionalValue(
  environment: NodeJS.ProcessEnv,
  name: string,
): string | null {
  return environment[name]?.trim() || null;
}

function requiredValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = optionalValue(environment, name);
  if (!value) throw new Error(`Env. var. ${name} is not set`);
  return value;
}

function requiredUrl(environment: NodeJS.ProcessEnv, name: string): URL {
  const value = requiredValue(environment, name);

  try {
    return new URL(value);
  } catch {
    throw new Error(`Env. var. ${name} must be an absolute URL`);
  }
}

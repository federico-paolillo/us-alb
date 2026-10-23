export interface PublicUrls {
  siteUrl: URL;
  cmsPublicUrl: URL;
  adminCookiePath: string;
}

export function resolvePublicUrls(
  siteUrlValue: string | undefined,
  cmsPublicUrlValue: string | undefined,
  adminCookiePathValue: string | undefined,
): PublicUrls {
  const siteUrl = requiredUrl(siteUrlValue, "SITE_URL");
  const cmsPublicUrl = optionalUrl(cmsPublicUrlValue, "CMS_PUBLIC_URL") ?? new URL("/cms", siteUrl);

  return {
    siteUrl,
    cmsPublicUrl,
    adminCookiePath:
      optionalValue(adminCookiePathValue) ?? adminCookiePath(cmsPublicUrl),
  };
}

function adminCookiePath(cmsPublicUrl: URL): string {
  const pathname = cmsPublicUrl.pathname.replace(/\/+$/, "");
  return `${pathname || ""}/admin`;
}

function optionalUrl(value: string | undefined, name: string): URL | undefined {
  const configured = optionalValue(value);
  if (!configured) return undefined;
  return requiredUrl(configured, name);
}

function requiredUrl(value: string | undefined, name: string): URL {
  const configured = optionalValue(value);
  if (!configured) throw new Error(`Env. var. ${name} is not set`);

  try {
    return new URL(configured);
  } catch {
    throw new Error(`Env. var. ${name} must be an absolute URL`);
  }
}

function optionalValue(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

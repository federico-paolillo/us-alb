import { timingSafeCompareSecret } from "@cmsjs/cms/secret";

export type ContentStatus = "draft" | "published";
type PreviewPath =
  | "/"
  | "/chi-siamo"
  | "/attivita"
  | "/notizie"
  | `/notizie/${string}`;

export interface PreviewRequest {
  pathname: PreviewPath;
  status: ContentStatus;
}

const staticPaths = new Set<PreviewPath>([
  "/",
  "/chi-siamo",
  "/attivita",
  "/notizie",
]);

export function parsePreviewRequest(
  requestUrl: string,
  expectedSecret: string,
): PreviewRequest | null {
  const { searchParams } = new URL(requestUrl);
  const target = searchParams.get("url");
  const status = searchParams.get("status");

  if (
    !timingSafeCompareSecret(searchParams.get("secret"), expectedSecret) ||
    !isContentStatus(status) ||
    !target ||
    target.includes("?") ||
    target.includes("#") ||
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("\\")
  ) {
    return null;
  }

  if (staticPaths.has(target as PreviewPath)) {
    return { pathname: target as PreviewPath, status };
  }

  const [empty, contentType, encodedSlug, ...rest] = target.split("/");
  if (
    empty !== "" ||
    contentType !== "notizie" ||
    !encodedSlug ||
    rest.length > 0
  ) {
    return null;
  }

  try {
    const slug = decodeURIComponent(encodedSlug);
    if (!slug || slug === "." || slug === ".." || /[\\/]/.test(slug)) {
      return null;
    }

    return {
      pathname: `/notizie/${encodeURIComponent(slug)}`,
      status,
    };
  } catch {
    return null;
  }
}

function isContentStatus(value: string | null): value is ContentStatus {
  return value === "draft" || value === "published";
}

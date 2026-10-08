import type { Core } from '@strapi/strapi';

declare const strapi: Core.Strapi;

const previewPaths = {
  'api::home-page.home-page': '/',
  'api::about-page.about-page': '/chi-siamo',
  'api::activity-page.activity-page': '/attivita',
  'api::calendar-entry.calendar-entry': '/notizie',
  'api::official-document.official-document': '/notizie',
} as const;

const newsUid = 'api::news-item.news-item' as const;

type PreviewContentType = keyof typeof previewPaths | typeof newsUid;

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => {
  const previewClientUrl = requiredUrl(env('PREVIEW_CLIENT_URL'), 'PREVIEW_CLIENT_URL');
  const previewSecret = requiredValue(env('PREVIEW_SECRET'), 'PREVIEW_SECRET');

  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET')!,
    },
    apiToken: {
      salt: env('API_TOKEN_SALT')!,
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT')!,
      },
    },
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY')!,
    },
    preview: {
      enabled: true,
      config: {
        allowedOrigins: [previewClientUrl.origin],
        async handler(uid, { documentId, status }) {
          if (!isPreviewContentType(uid) || !documentId || !isContentStatus(status)) {
            return null;
          }

          let path: string;
          if (uid === newsUid) {
            const entry = await strapi.documents(newsUid).findOne({
              documentId,
              status,
              populate: { identity: true },
            });
            if (!hasSlug(entry)) {
              return null;
            }

            path = `/notizie/${encodeURIComponent(entry.identity.slug)}`;
          } else {
            path = previewPaths[uid];
          }

          const previewUrl = new URL('/preview', previewClientUrl);
          previewUrl.searchParams.set('url', path);
          previewUrl.searchParams.set('secret', previewSecret);
          previewUrl.searchParams.set('status', status);
          return previewUrl.href;
        },
      },
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
      docLinks: env.bool('FLAG_DOC_LINKS', true),
    },
  };
};

function requiredValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Env. var. ${name} is not set`);
  }

  return value;
}

function requiredUrl(value: string | undefined, name: string): URL {
  try {
    return new URL(requiredValue(value, name));
  } catch {
    throw new Error(`Env. var. ${name} must be an absolute URL`);
  }
}

function isPreviewContentType(uid: string): uid is PreviewContentType {
  return uid === newsUid || uid in previewPaths;
}

function isContentStatus(status: string | undefined): status is 'draft' | 'published' {
  return status === 'draft' || status === 'published';
}

function hasSlug(entry: unknown): entry is { identity: { slug: string } } {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const identity = (entry as { identity?: unknown }).identity;
  return (
    !!identity &&
    typeof identity === 'object' &&
    typeof (identity as { slug?: unknown }).slug === 'string' &&
    (identity as { slug: string }).slug.length > 0
  );
}

export default config;

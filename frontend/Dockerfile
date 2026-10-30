FROM node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608 AS build

# These variables are inlined by next/image allowlist and robots.ts

ARG CMS_MEDIA_URL=
ARG SITE_URL=http://127.0.0.1:65100

# This variable is inlined at compile time

ARG NEXT_PUBLIC_APP_VERSION=development

WORKDIR /app

COPY package.json      /app/package.json
COPY package-lock.json /app/package-lock.json

RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

COPY . /app/

RUN CMS_API_URL=http://127.0.0.1:65101/api \
    CMS_MEDIA_URL="$CMS_MEDIA_URL" \
    REVALIDATION_HEADER=x-build-validation-header \
    REVALIDATION_SECRET=build-validation-placeholder \
    PREVIEW_SECRET=build-validation-placeholder \
    SITE_URL="$SITE_URL" \
    NEXT_PUBLIC_APP_VERSION="$NEXT_PUBLIC_APP_VERSION" \
    npm run build

# Standalone output omits static assets

RUN cp -R .next/static .next/standalone/.next/static

# Prepare cache folder for later

RUN mkdir -p .next/standalone/.next/cache

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=info
ENV HOSTNAME=0.0.0.0
ENV PORT=65100

WORKDIR /app

# Supply tmpfs mounts for /app/.next/cache and /tmp

COPY --from=build --chown=0:0 --chmod=755 /usr/local/bin/node /nodejs/bin/node
COPY --from=build --chown=0:0 --chmod=555 /app/.next/standalone /app

USER nonroot

EXPOSE 65100

CMD ["/app/server.js"]

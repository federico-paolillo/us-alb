FROM node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

COPY . .

ARG CMS_MEDIA_URL=http://127.0.0.1:1337
ARG SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_VERSION=development

RUN CMS_URL=http://127.0.0.1:65101/api \
    CMS_MEDIA_URL="$CMS_MEDIA_URL" \
    CMS_WEBHOOKS_SECRET_HEADER=build-validation-header \
    CMS_WEBHOOKS_SECRET_HEADER_VALUE=build-validation-placeholder \
    PREVIEW_SECRET=build-validation-placeholder \
    SITE_URL="$SITE_URL" \
    NEXT_PUBLIC_APP_VERSION="$NEXT_PUBLIC_APP_VERSION" \
    npm run build \
 && test -f .next/standalone/server.js \
 && test -d .next/static \
 && cp -R .next/static .next/standalone/.next/static \
 && if [ -d public ]; then cp -R public .next/standalone/public; fi \
 && mkdir -p .next/standalone/.next/cache \
 && ln -s /run/secrets/frontend.env .next/standalone/.env

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=info
ENV HOSTNAME=0.0.0.0
ENV PORT=65100

WORKDIR /app

# Run with a read-only root, tmpfs mounts for /app/.next/cache and /tmp, and an
# optional nonroot-readable dotenv secret at /run/secrets/frontend.env. Set host and port directly.
COPY --from=build --chown=0:0 --chmod=555 /app/.next/standalone /app

USER nonroot

EXPOSE 65100

CMD ["/app/server.js"]

FROM node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608 AS build

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=info

WORKDIR /strapi

ARG SITE_URL
ARG CMS_PUBLIC_URL=
ARG CMS_ADMIN_COOKIE_PATH=

COPY package.json      /strapi/package.json
COPY package-lock.json /strapi/package-lock.json

RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

COPY config/   /strapi/config/
COPY database/ /strapi/database/
COPY public/   /strapi/public/
COPY src/      /strapi/src/
COPY types/    /strapi/types/

COPY tsconfig.json /strapi/tsconfig.json
COPY favicon.png   /strapi/favicon.png

# Allow an optional .env file injection using Docker Secrets

COPY .env.example  /strapi/.env

RUN SITE_URL="$SITE_URL" \
    CMS_PUBLIC_URL="$CMS_PUBLIC_URL" \
    CMS_ADMIN_COOKIE_PATH="$CMS_ADMIN_COOKIE_PATH" \
    npm run build

RUN npm prune --omit=dev \
    && mkdir -p /runtime/strapi/database/migrations /runtime/data /runtime/config /runtime/staging \
    && cp -a dist/config /runtime/strapi/config \
    && cp -a dist/src /runtime/strapi/src \
    && cp -a dist/build /runtime/strapi/build \
    && cp -a node_modules package.json package-lock.json public favicon.png .env /runtime/strapi/ \
    && if [ -d dist/database/migrations ]; then \
         cp -a dist/database/migrations/. /runtime/strapi/database/migrations/; \
       fi \
    && cp -a /runtime/strapi/public /runtime/data/public

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=info
ENV DATABASE_CLIENT=sqlite
ENV DATABASE_FILENAME=/data/cmsjs-tmpl.db
ENV HOST=0.0.0.0
ENV PORT=65101
ENV SERVER_PUBLIC_FOLDER=/data/public
ENV ENV_PATH=/strapi/.env

# Strapi's Cloud CLI initializes XDG config while registering commands, including `start`.

ENV XDG_CONFIG_HOME=/config 

WORKDIR /strapi

COPY --from=build --chown=0:0 --chmod=755 /usr/local/bin/node /nodejs/bin/node
COPY --from=build --chown=0:0 /runtime/strapi /strapi
COPY --from=build --chown=nonroot:nonroot /runtime/data /data
COPY --from=build --chown=nonroot:nonroot /runtime/config /config
COPY --from=build --chown=nonroot:nonroot /runtime/staging /staging

USER nonroot

# Supply tmpfs mounts for /tmp

VOLUME ["/data", "/config", "/staging"]

EXPOSE 65101

ENTRYPOINT ["/nodejs/bin/node", "/strapi/node_modules/@strapi/strapi/bin/strapi.js"]

CMD ["start"]

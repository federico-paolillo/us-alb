FROM node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608 AS dependencies

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=info

WORKDIR /backupd

COPY package.json      /backupd/package.json
COPY package-lock.json /backupd/package-lock.json

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY src/ /backupd/src/
COPY --from=strapid src/capture-contract.ts /runtime/strapid/src/capture-contract.ts

RUN mkdir -p /runtime/state /runtime/staging /runtime/coordination

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e

ARG APPLICATION_SOURCE_URL
ARG APPLICATION_GIT_REVISION

LABEL org.opencontainers.image.source="${APPLICATION_SOURCE_URL}"
LABEL org.opencontainers.image.revision="${APPLICATION_GIT_REVISION}"

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=info

WORKDIR /backupd

COPY --from=dependencies --chown=0:0 --chmod=755 /usr/local/bin/node /nodejs/bin/node
COPY --from=dependencies --chown=0:0 /backupd /backupd
COPY --from=dependencies --chown=0:0 /runtime/strapid /strapid
COPY --from=dependencies --chown=nonroot:nonroot /runtime/state /state
COPY --from=dependencies --chown=nonroot:nonroot /runtime/staging /staging
COPY --from=dependencies --chown=nonroot:nonroot /runtime/coordination /coordination

USER nonroot

VOLUME ["/state", "/staging", "/coordination"]

ENTRYPOINT ["/nodejs/bin/node", "/backupd/src/main.ts"]

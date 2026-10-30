# Integrate containers and service-specific configuration

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B10 — Integrate containers and service-specific configuration` in `TODO.md`. The repository root is `/home/codex/src/us-alb`, the active branch is `backup-system`, and the implementation baseline is the pushed B09 commit `93b0dd68a92d401bca901536bf800ed6985494cf`. Do not switch branches. Keep `BACKUP.md` byte-for-byte unchanged. Preserve the unrelated untracked `.agents/skills/imagen/scripts/` directory without listing its contents, reading it, formatting it, staging it, or modifying it.

## Purpose / Big Picture

After B10, the application can be started as a Rootless Docker Compose project in which the backend image runs `strapid` as its container process and `strapid` supervises the already-compiled Strapi application, while a separate `backupd` image schedules, validates, and publishes backups. The two services coordinate only through a private Unix socket and share only disk-backed archive staging. `backupd` has no production database/media mount and receives no Strapi secret; the backend has no object-storage credential; neither service has a Docker socket, public control port, host log mount, host timer, or host orchestration dependency.

The result is observable through native Compose rendering, actual image builds and image inspection, a focused configuration-boundary integration test, direct runtime Node version checks, nonroot write probes against task-owned named volumes, and a fresh empty-database backend start. The project-local `.env` remains the single operator configuration source, but Compose passes an explicit per-service allowlist instead of mounting the complete file into the backend and frontend. The visible frontend version remains compiled from `NEXT_PUBLIC_APP_VERSION`, and the backend image digest, Git revision, logical source identity, Node version, and Strapi version are available to the existing capture and manifest pipeline without either daemon querying the container engine.

## Progress

- [x] (2026-10-30 04:45Z) Confirmed `backup-system`, `HEAD`, and `origin/backup-system` are all at pushed B09 commit `93b0dd68a92d401bca901536bf800ed6985494cf`, with only the preserved unrelated Imagen directory untracked.
- [x] (2026-10-30 04:45Z) Read the complete TODO preamble and B10 item, all of `BACKUP.md`, applicable root and frontend instructions, `.agents/docs/PLANS.md`, the B01-B09 plans and implementation interfaces, current Compose/image/environment/release files, and the canonical-validation skill.
- [x] (2026-10-30 04:45Z) Used Context7 as required to resolve the official `/docker/compose/v5.5.1` documentation and confirm native Compose render/build validation and restart behavior; inspected the installed rootless Docker Compose v5.5.1 and Buildx v0.37.1 capabilities without changing repository files.
- [x] (2026-10-30 04:45Z) Resolved image contexts, process entrypoints, explicit environment ownership, release/source attribution, volume ownership, restart/health behavior, configuration-boundary coverage, canonical validation, and B11/B12 later-task boundaries.
- [x] (2026-10-30 04:52Z) Created the `backupd` runtime image and embedded the production-only `strapid` package into the backend image with the exact Node 24.20.0 builder executable; image-build and runtime inspection remain part of final validation.
- [x] (2026-10-30 04:52Z) Replaced whole-file environment distribution in both Compose files with exact per-service mappings, restart/health/stop policies, and project-scoped state, staging, and coordination volumes; both definitions render successfully through Compose v5.5.1.
- [x] (2026-10-30 04:52Z) Removed the frontend runtime `.env` symlink, copied the exact Node builder executable into its runtime, and rewrote the root `.env.example` as complete non-secret service-owned configuration.
- [x] (2026-10-30 04:52Z) Added the focused Compose configuration-boundary integration test; its direct two-file run passes 2 tests with zero failures, skips, or todos. Full daemon suites remain part of final validation.
- [x] (2026-10-30 05:09Z) Refreshed both API artifacts and proved them semantically unchanged, removed only volatile generator timestamp/endpoint churn, and passed every applicable package, Compose, image, Rootless Docker volume, runtime-parity, frontend-version, and empty-database validation with no secret values in evidence.
- [x] (2026-10-30 05:20Z) Recorded remediation-cycle-one review findings and withdrew the prior completion claim: backupd's normal image entrypoint could not resolve the two production value imports of `strapid/src/capture-contract.ts`, and entrypoint-overridden probes had not validated the complete production module graph.
- [x] (2026-10-30 05:20Z) Audited the complete eager production import graph, confirmed two cross-package value imports plus four type-only imports, and packaged only the authoritative `capture-contract.ts` runtime module through backupd's explicit named `strapid` build context.
- [x] (2026-10-30 05:54Z) Rebuilt and validated remediation cycle one: native module-graph import, both Compose renders, image checks/builds, canonical packages/applications under process-scoped `.env.example`, runtime parity, Rootless Docker storage, empty-database startup, frontend artifact inspection, generated-artifact equivalence, and exact residue cleanup all pass.
- [x] (2026-10-30 06:04Z) Independent review approved remediation cycle one with `APPROVED` and `REVIEW_READY`; the coordinator linked this plan and checked B10 as approved queue bookkeeping.

## Surprises & Discoveries

- Observation: The pinned distroless `nodejs24` runtime currently contains Node v24.21.0, not the project-pinned v24.20.0.
  Evidence: `/nodejs/bin/node -p 'process.version'` in `gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e` returned `v24.21.0`. B02 already corrected the backend by copying `/usr/local/bin/node` from the exact Node builder, but the current frontend does not. The new `backupd` image and the changed frontend must use the same correction.

- Observation: The current production and development Compose files mount the entire root `.env` into both backend and frontend as the `app_env` secret.
  Evidence: Both files define `secrets.app_env.file: ./.env`; the backend receives it as `/run/secrets/backend.env`, and the frontend image contains a symlink from its standalone `.env` to `/run/secrets/frontend.env`. Adding storage or Grafana credentials to the root file without removing this mechanism would distribute them to both application services.

- Observation: B10 requires Grafana credentials to belong only to the Collector, but B11 explicitly owns adding the Collector service, its configuration, and its credential mapping.
  Evidence: The B11 queue item says “Add the Collector service and project-owned `otel-config.yml`.” B10 therefore must not preempt B11 by adding a partial Collector. Removing all whole-file mounts and proving that no B10 service receives any `GRAFANA_` setting establishes the required boundary; B11 will be the sole later owner that introduces and maps those credentials.

- Observation: A container image cannot know its own final content digest while it is being built because the digest includes the completed image configuration.
  Evidence: The existing B06 configuration already accepts `BACKUPD_APPLICATION_IMAGE_DIGEST`, while the release workflow obtains the digest only after the build. B10 must pass the immutable backend digest through deployment configuration and must not query `/var/run/docker.sock` or container-management APIs from a daemon.

- Observation: The backend's narrow primary Docker build context cannot see sibling `strapid/`, while B12—not B10—owns updating the publication workflow's build inputs.
  Evidence: `compose.yml` and `.github/workflows/cd.yml` use `./backend` as the primary context. Installed Buildx exposes `--build-context`, and current Compose supports `build.additional_contexts`. B10 kept the narrow backend context and supplied `strapid: ./strapid` as a named context for local/native Compose builds; B12 can add the equivalent named context to `docker/build-push-action` without redesigning the Dockerfile.

- Observation: The selected distroless nonroot runtime uses numeric UID and GID 65532.
  Evidence: A direct Node probe of the pinned base reported `{ "uid": 65532, "gid": 65532 }`. Both project images can seed shared mount points as `nonroot:nonroot`; empty named-volume copy-up then gives either image the same usable numeric ownership under Rootless Docker without a host `chown` or privileged initializer.

- Observation: Docker image configuration retains the symbolic Dockerfile user `nonroot`, while the executing distroless process resolves it to numeric UID/GID 65532.
  Evidence: Selected image inspection reported `user: "nonroot"` for backend, backupd, and frontend; direct Node probes in all three reported UID/GID 65532. Runtime ownership and both shared-volume write probes therefore establish the required identity even though image metadata is symbolic.

- Observation: The authoritative OpenAPI generators include current timestamps in example defaults and derive the server URL from the supplied validation environment, so a no-schema-change refresh creates volatile textual churn.
  Evidence: Normalizing only ISO timestamp defaults and the generated server URL made both refreshed artifacts exactly equal to the B09 versions. The volatile changes were removed; `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` now have zero diff against `93b0dd68a92d401bca901536bf800ed6985494cf`.

- Observation: Canonical backend build/openapi tasks require deployment URL input even though B10 does not change backend TypeScript.
  Evidence: A first `mise run be:build` without local configuration stopped with `SITE_URL is not set`; rerunning the same canonical chain with the project-local `.env.example` loaded into only that subprocess passed. No machine or user environment was changed and no live `.env` was created.

- Observation: The initial image inspection overrode backupd's entrypoint for Node-version, filesystem, and write probes, so it did not load the daemon's complete eager production module graph.
  Evidence: Independent review ran the normal built image and reproduced `ERR_MODULE_NOT_FOUND` for `/strapid/src/capture-contract.ts`. Static audit found runtime value imports in `backupd/src/durable-state.ts` and `backupd/src/snapshot-manifest.ts`; the imports in `backup-lifecycle.ts`, `capture-client.ts`, `staging-manager.ts`, and `staging-policy.ts` are type-only and erased at runtime.

## Decision Log

- Decision: Package `backupd` in a new `backupd/Dockerfile` and `backupd/.dockerignore`, using the exact pinned Node v24.20.0 builder and pinned nonroot distroless Debian 13 runtime already used by the project.
  Rationale: `backupd` is an independent private npm package with a committed lockfile and native TypeScript entrypoint. `npm ci --omit=dev` produces its production dependency tree; copying `package.json`, `package-lock.json`, `src/`, and production `node_modules/` outside the immutable runtime root is sufficient. The runtime needs no shell, npm, npx, TypeScript compiler, test files, fixtures, or development dependencies.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Add `strapid/.dockerignore` and embed `strapid` into the backend through a Compose named build context called `strapid`; install its production dependencies in a dedicated builder stage and copy only `package.json`, `package-lock.json`, `src/`, and production `node_modules/` to `/strapid-daemon`.
  Rationale: This preserves the narrow backend context and avoids sending the repository root or the unrelated untracked directory to the builder. The immutable compiled Strapi application remains at `/strapi`. The final backend entrypoint becomes direct Node execution of `/strapid-daemon/src/main.ts`; `strapid` in turn invokes `/nodejs/bin/node /strapi/node_modules/@strapi/strapi/bin/strapi.js start`, so there is still no shell, npm, npx, or runtime compilation.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use the same numeric nonroot identity in backend and backupd and seed `/staging` and `/coordination` in both images, plus `/state` in backupd, with `nonroot:nonroot` ownership.
  Rationale: Compose starts the backend first, so empty shared volumes normally copy ownership from the backend image, but either creation order must work. Identical UID/GID 65532 lets both images use the shared mounts. `/staging` is a disk-backed archive volume, `/coordination` contains only the private socket, `/state` belongs only to backupd, and `/tmp` is bounded scratch on tmpfs. No host ownership operation or init container is required.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Remove `secrets.app_env`, every service `secrets` attachment, backend `ENV_PATH=/run/secrets/backend.env`, and the frontend standalone `.env` symlink. Pass exact environment mappings from the one project-local `.env` instead of adding per-service files; replace the backend runtime's copied example values with an empty immutable `/strapi/.env` used only to satisfy the existing absolute `ENV_PATH` contract.
  Rationale: Compose interpolation still reads the single local `.env`, but only the named keys enter each container. This directly prevents future storage and Grafana settings from leaking through whole-file distribution and prevents omitted runtime mappings from silently falling back to example credentials. The backend build stage may continue using its package-local example while compiling, but the final runtime receives settings only through its explicit process environment. `ADMIN_PASSWORD_FILE` is not mapped because B10 does not add a second secret file; `ADMIN_PASSWORD` remains the single-local-file deployment interface.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Give backend only Strapi/bootstrap, supervisor, and application-telemetry settings; frontend only its CMS/revalidation/preview settings; and backupd only backup, object-storage, attribution, and application-telemetry settings.
  Rationale: `strapid` must inherit Strapi settings because it creates the serving and export children, but it receives no `BACKUPD_S3_*` setting. `backupd` receives neither Strapi secrets nor `/data` or `/config`. Neither receives a Grafana forwarding credential. The gateway receives no application setting. B11 will add the Collector and will be the only service allowed to receive Grafana forwarding values.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Fix the application OTLP client endpoint at the project-network name and permitted private port `http://otel-collector:65103`, with protocol `http/protobuf`, while leaving the Collector service absent until B11.
  Rationale: B09's telemetry is explicitly fail-open when the Collector is unavailable, and B11 owns receiver configuration. Choosing the endpoint now gives both applications one concrete interface and respects the repository's 65100-65199 service-port rule. Backend startup, backup authority, and completed snapshots remain independent of DNS/export failure.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use `APPLICATION_GIT_REVISION` as both `STRAPID_RELEASE_ID` and `BACKUPD_GIT_REVISION`, pass `APPLICATION_IMAGE_DIGEST` only to backupd, and pass the operator-maintained logical `STRAPI_SOURCE_IDENTITY` only to strapid.
  Rationale: Capture status carries release, source-volume, actual Node, and actual Strapi identities to backupd; B06 then combines them with the independently configured immutable image digest and Git revision in the manifest. The logical source identity must change whenever deployment storage is intentionally replaced. This provides attribution without a Docker socket, container ID, mount inspection, or engine API.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Add OCI source and revision labels to the new/changed backend and backupd Dockerfiles through `APPLICATION_SOURCE_URL` and `APPLICATION_GIT_REVISION` build arguments, but do not attempt to label an image with its own final digest.
  Rationale: Source/revision labels support image inspection and existing release provenance. The final digest is a post-build deployment input. B12 owns passing the named context, adding backupd to publication, and retaining the existing provenance/SBOM/attestation behavior.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Configure `restart: unless-stopped` for backend, frontend, backupd, and gateway; give backend a direct-Node `/_health` check; start backupd only after backend health; and set backend and backupd `stop_grace_period` to 45 seconds.
  Rationale: `unless-stopped` recovers crashes and host/runtime restarts but respects intentional Compose stops. Forty-five seconds exceeds backupd's 30-second internal shutdown deadline and strapid's 30-second graceful plus 5-second forced confirmation and bounded telemetry close, while not altering the 900-second capture deadline. Backend does not depend on backupd or the absent Collector, so either can fail without preventing normal Strapi startup.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Treat both `compose.yml` and `compose.prod.yml` as complete deployment definitions. The development file builds backend/frontend/backupd; the production file consumes required immutable image references, composing the backend repository with `APPLICATION_IMAGE_DIGEST` so the same digest is passed to backupd.
  Rationale: B10 must not leave production with the old Strapi entrypoint or whole-file secret mount. B12 will publish the new images and update delivery automation, but B10 owns the runtime definitions and their native rendering now.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Add one `backupd/test/compose-config.integration.test.ts` test that invokes `docker compose config --format json` with a controlled placeholder environment and asserts only names, mounts, ports, policies, and forbidden boundaries.
  Rationale: Native Compose is the authoritative parser, while a small cross-boundary assertion is necessary to prove credential and mount isolation that parse success alone cannot prove. It is explicitly an integration test because it starts the Docker Compose CLI. It starts no service or container, reads no live `.env`, captures resolved values only in memory, and must never include those values in assertion output.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Give backupd the same explicit named `strapid` build context as backend and copy only `src/capture-contract.ts` to runtime `/strapid/src/capture-contract.ts`.
  Rationale: Two backupd production modules call the capture contract's canonical UUID and identity-token validators at runtime. Packaging the single authoritative implementation preserves validation ownership and avoids duplicated or weakened policy. The contract's only own import is type-only and is erased by Node, so no additional strapid runtime module is needed. B12 must provide this context to both backend and backupd publication builds.
  Date/Author: 2026-10-30 / Codex worker, remediation cycle 1

## Outcomes & Retrospective

Initial B10 worker validation passed the package/application suites, Compose boundaries, image builds, runtime versions, Rootless Docker writes, frontend artifact checks, and empty-database backend startup, but it did not prove backupd's normal production module graph because every backupd probe overrode the image entrypoint. Independent review reproduced a startup failure caused by the omitted authoritative capture-contract runtime module. The earlier completion claim and backupd image evidence are therefore superseded.

Remediation cycle one packages only `strapid/src/capture-contract.ts` through backupd's explicit named build context, preserving the existing validation owner without duplicating policy. A native built-image import of `/backupd/src/main.ts` now exits zero and loads the complete eager graph without starting a backup. Static audit found no other cross-package production value dependency.

The complete superseding validation passed: `strapid:check`; 82 strapid tests; `backupd:check`; 150 backupd tests including both Compose definitions; process-scoped `.env.example` runs of backend build/OpenAPI generation, frontend OpenAPI generation/build/check, and 92 frontend tests across 12 files; quiet rendering of both Compose definitions; `build --check` and full builds for all three images; Node v24.20.0 runtime parity; image layout, entrypoint, volume, label, and forbidden-tool inspection; Rootless Docker writes as UID/GID 65532; compiled frontend version and no-runtime-env inspection; and a healthy backend from fresh empty named volumes. Regenerated API artifacts are semantically and textually unchanged from B09 after removing only generator timestamp/server-URL churn. The superseding local image IDs are backend `sha256:1ce48e342407c95ca3aa9d9bea4f4d244dc78a124081f31df3d62583ebc1dd3b`, backupd `sha256:d956b497101eefa6830e9f570d66f8990adf9ad3049ce4ae0a48a3b2a445052f`, and frontend `sha256:5da79b722c5c854159f361039690046fe948c03a1f56495651b0e9c0c9981597`. The exact validation project was removed with its volumes and has no labeled residue. The Collector/Grafana work remains B11 and release workflow delivery remains B12.

Independent rereview approved remediation cycle one after reproducing the repaired backupd module-graph import, both daemon checks and 82/150 test suites, both Compose renders and configuration boundary, all image checks/builds with Node v24.20.0 parity, Rootless Docker writes, healthy empty-database backend startup, frontend artifact constraints, protected/generated artifact equality, and exact validation-project cleanup. No finding remains for B10.

## Context and Orientation

The repository is a Strapi 5.52.0 backend plus Next.js 16.3.1 frontend. `compose.yml` builds development images, while `compose.prod.yml` references released images. At the B09 baseline, both definitions had only backend, frontend, and Caddy gateway, mounted the complete root `.env` into backend and frontend as one Compose secret, and defined only `backend_data` and `backend_config`. B10 adds backupd, removes that whole-file distribution, and adds the three backup volumes. The gateway remains the only service with a host port, bound to `127.0.0.1:65102`.

`backend/Dockerfile` builds Strapi once, prunes development dependencies, and assembles immutable compiled application files at `/strapi`. The B09 image copied the backend package example into runtime `/strapi/.env` and started the Strapi CLI directly. B10 instead creates an empty immutable `/strapi/.env`, retaining the existing absolute `ENV_PATH=/strapi/.env` without fallback settings, and starts the embedded `strapid` daemon. The image copies the exact Node v24.20.0 builder executable over the pinned distroless runtime's newer Node binary. Its writable paths are `/data` for SQLite and media, `/config` for XDG CLI state, `/staging` for archives, `/coordination` for the socket, and `/tmp` for small workspaces and diagnostics. The compiled-only layout and Strapi version remain unchanged.

`strapid/src/main.ts` is the supervisor composition root. It starts the Strapi serving child, exposes private coordination at `/coordination/strapid.sock`, admits capture windows, runs Strapi export from `/staging`, restarts serving, and exports telemetry. It reads `PORT`, six `STRAPID_*_SECONDS` budget values, `STRAPID_RELEASE_ID`, `STRAPID_SOURCE_VOLUME_ID`, `STRAPID_TELEMETRY_ENVIRONMENT`, `STRAPID_COORDINATION_SOCKET_PATH`, and the two supported OTLP variables. Serving and export children inherit its process environment, which is why backend Compose must include Strapi/bootstrap settings but exclude storage credentials.

`backupd/src/main.ts` is the backup daemon composition root. It reads configuration through `backupd/src/backup-config.ts`, `schedule-policy.ts`, `staging-policy.ts`, and `object-storage-config.ts`. Fixed filesystem roots are `/state`, `/staging`, and `/coordination/strapid.sock`. It requires S3 endpoint, region, bucket, access key, secret key, snapshot site/environment, backend image digest, and Git revision; optional policy variables have the agreed defaults. It gets supervisor release/source/Node/Strapi identity through the private capture protocol and never needs production `/data`, backend `/config`, a TCP control listener, or engine access.

`frontend/Dockerfile` builds standalone Next.js output. The B09 image created a symlink from `/app/.env` to the whole-file Compose secret; B10 removes that symlink and passes only explicit runtime variables. The Dockerfile embeds `NEXT_PUBLIC_APP_VERSION` during `next build`, and `frontend/components/layout/site-footer.tsx` renders `Versione {version}`. B10 preserves that build argument and visible behavior and overwrites `/nodejs/bin/node` from the exact v24.20.0 builder so all project images have actual runtime parity.

A “named build context” is a second explicitly named directory made available to BuildKit without changing the Dockerfile's primary context. In `compose.yml`, backend build configuration will keep `context: ./backend` and add `additional_contexts: { strapid: ./strapid }`. In `backend/Dockerfile`, `COPY --from=strapid ...` reads only selected sibling package paths. This is build-time input, not a runtime mount.

A “logical source identity” is the stable, operator-chosen ASCII token in `STRAPI_SOURCE_IDENTITY` that identifies the selected production database/media set. It is not a Docker volume ID and requires no daemon lookup. It must remain stable while the same source storage is in use and change when storage is intentionally replaced. `strapid` places it in capture identity; the existing B06 manifest records it.

## Interfaces and Configuration Ownership

The root `.env.example` remains the documented shape of the one local `.env`. Replace existing token-like examples with obvious non-production placeholders that still satisfy application parsers. Group and explain the following settings without putting any real credential in the file.

Common application and frontend settings are `SITE_URL`, `CMS_API_URL`, optional `CMS_PUBLIC_URL`, optional `CMS_MEDIA_URL`, optional `CMS_API_TOKEN`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, `PREVIEW_SECRET`, `NEXT_PUBLIC_APP_VERSION`, and optional `CMS_ADMIN_COOKIE_PATH`. Backend-only Strapi/bootstrap secrets are `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_INTERNAL_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

Deployment attribution settings are `APPLICATION_SOURCE_URL`, `APPLICATION_GIT_REVISION`, `APPLICATION_IMAGE_DIGEST`, `STRAPI_SOURCE_IDENTITY`, and `DEPLOYMENT_ENVIRONMENT`. `APPLICATION_IMAGE_DIGEST` must have the form `sha256:` followed by 64 lowercase hexadecimal digits, and `APPLICATION_GIT_REVISION` must contain 7-64 lowercase hexadecimal digits because B06 validates both before any storage request. Example values may use all zeroes and must be labeled placeholders. `STRAPI_SOURCE_IDENTITY` is a bounded printable ASCII token, not a secret.

Production image settings are `BACKEND_IMAGE_REPOSITORY`, `FRONTEND_IMAGE`, and `BACKUPD_IMAGE`. `compose.prod.yml` forms the immutable backend reference as `${BACKEND_IMAGE_REPOSITORY}@${APPLICATION_IMAGE_DIGEST}` so the exact digest passed to the manifest is the digest used to run the backend. The frontend and backupd variables are complete immutable references. B12 later supplies real published references through deployment delivery.

Backupd-only storage settings are `BACKUPD_S3_ENDPOINT`, `BACKUPD_S3_REGION`, `BACKUPD_S3_BUCKET`, `BACKUPD_S3_ACCESS_KEY_ID`, and `BACKUPD_S3_SECRET_ACCESS_KEY`. Backup identity/policy settings are `BACKUPD_SNAPSHOT_SITE`, `BACKUPD_SCHEDULE_UTC`, `BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS`, `BACKUPD_AUTOMATIC_MAX_ATTEMPTS`, `BACKUPD_STAGING_MIN_FREE_BYTES`, `BACKUPD_ARCHIVE_MAX_BYTES`, `BACKUPD_PUBLICATION_WINDOW_SECONDS`, `BACKUPD_UPLOAD_CONCURRENCY`, `BACKUPD_S3_MAX_ATTEMPTS`, and `BACKUPD_SHUTDOWN_TIMEOUT_SECONDS`. Use the implemented defaults `03:00`, `900`, `2`, `107374182400`, `80530636800`, `21600`, `4`, `3`, and `30` respectively.

Strapid-only budget settings are `STRAPID_CAPTURE_WINDOW_SECONDS`, `STRAPID_SERVING_SHUTDOWN_SECONDS`, `STRAPID_EXPORT_SECONDS`, `STRAPID_EXPORT_TERMINATION_SECONDS`, `STRAPID_RECOVERY_SECONDS`, and `STRAPID_FORCE_CONFIRMATION_SECONDS`. Use `900`, `60`, `600`, `30`, `210`, and `5`. The first five phase allocations must retain the existing validated sum and reserve relationships.

The application OTLP client interface is not operator-authenticated and therefore needs no Grafana credential. Compose sets `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:65103` and `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` for backend and backupd. Do not add `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_RESOURCE_ATTRIBUTES`, `GRAFANA_*`, or arbitrary environment forwarding. B11 owns Collector authentication and forwarding configuration.

After rendering, backend's environment key set must be exactly the two fixed serving keys `HOST` and `PORT`; the common settings it consumes (`SITE_URL`, `CMS_PUBLIC_URL`, `CMS_ADMIN_COOKIE_PATH`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, and `PREVIEW_SECRET`); the backend-only Strapi/bootstrap values listed above; `STRAPID_RELEASE_ID`, `STRAPID_SOURCE_VOLUME_ID`, `STRAPID_TELEMETRY_ENVIRONMENT`, `STRAPID_COORDINATION_SOCKET_PATH`; the six strapid budget values; and the two OTLP client values. `STRAPID_RELEASE_ID` maps from `APPLICATION_GIT_REVISION`, `STRAPID_SOURCE_VOLUME_ID` from `STRAPI_SOURCE_IDENTITY`, and `STRAPID_TELEMETRY_ENVIRONMENT` from `DEPLOYMENT_ENVIRONMENT`.

Frontend's runtime environment key set must be exactly `HOSTNAME`, `PORT`, `SITE_URL`, `CMS_API_URL`, `CMS_MEDIA_URL`, `CMS_API_TOKEN`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, and `PREVIEW_SECRET`. `NEXT_PUBLIC_APP_VERSION`, `SITE_URL`, and `CMS_MEDIA_URL` remain build arguments where currently required; the public version is compiled, not supplied as a replacement runtime secret.

Backupd's environment key set must be exactly `BACKUPD_COORDINATION_SOCKET_PATH`; the nine schedule/staging/publication policy keys listed above; the five `BACKUPD_S3_*` connection/credential keys; `BACKUPD_SNAPSHOT_SITE`; `BACKUPD_SNAPSHOT_ENVIRONMENT` mapped from `DEPLOYMENT_ENVIRONMENT`; `BACKUPD_APPLICATION_IMAGE_DIGEST` mapped from `APPLICATION_IMAGE_DIGEST`; `BACKUPD_GIT_REVISION` mapped from `APPLICATION_GIT_REVISION`; and the two OTLP values. Do not pass `SITE_URL`, CMS settings, Strapi salts/keys, admin credentials, preview/revalidation secrets, source data identity, Grafana settings, or any whole environment file.

The final volume mapping is:

- backend only: `backend_data:/data` and `backend_config:/config`;
- backend and backupd: `backup_staging:/staging` and `backup_coordination:/coordination`;
- backupd only: `backup_state:/state`;
- backend and backupd scratch: service-local `/tmp` tmpfs, never archive staging;
- frontend scratch: `/app/.next/cache` and `/tmp` tmpfs as today.

All five volumes are declared without a top-level `name`, `external`, host path, driver override, or account-global identifier, so Compose scopes them to the selected project. No service mount may target `/var/run/docker.sock`, `/run/user/.../docker.sock`, `/var/log`, the journal, another project, or a host data directory. The existing read-only Caddyfile bind mount remains allowed and is not a data/control mount.

## Plan of Work

### Milestone 1: Build the two daemon runtime boundaries

Create `backupd/.dockerignore` excluding `node_modules`, test files, build/output directories, logs, local environment files, and development artifacts while retaining `package.json`, `package-lock.json`, and `src/`. Create `backupd/Dockerfile` with a pinned Node v24.20.0 dependency stage. Run `npm ci --omit=dev`, then assemble `/backupd` from the two package files, `src/`, and production `node_modules/`. Through the explicit named `strapid` context, copy only `src/capture-contract.ts` to runtime `/strapid/src/capture-contract.ts`; this is the sole cross-package production value dependency. Seed empty `/state`, `/staging`, and `/coordination` directories. In the pinned distroless nonroot stage, set production Node environment, copy the exact builder Node executable to `/nodejs/bin/node`, copy immutable application files as root-owned, copy the three writable seeds as `nonroot:nonroot`, set `USER nonroot`, declare those three volume paths, expose no port, and use direct JSON entrypoint `/nodejs/bin/node /backupd/src/main.ts`. Accept `APPLICATION_SOURCE_URL` and `APPLICATION_GIT_REVISION` build arguments in the final stage and write the standard OCI source and revision labels.

Create `strapid/.dockerignore` with the same exclusion principle. Extend `backend/Dockerfile` with a dedicated stage that reads `package.json`, `package-lock.json`, and `src/` from the named `strapid` context, runs `npm ci --omit=dev`, and assembles `/strapid-daemon`. Do not copy tests, fixtures, TypeScript tooling, `tsconfig.json`, or development dependencies. Preserve the existing compiled `/strapi` assembly and exact Node copy, but stop copying example values into the assembled runtime `.env`; create a zero-byte root-owned `/strapi/.env` instead and retain `ENV_PATH=/strapi/.env`. Seed `/coordination` as nonroot-writable in addition to the existing `/data`, `/config`, and `/staging`. Copy the daemon into the final image as immutable root-owned files. Replace the direct Strapi CLI entrypoint and `CMD ["start"]` with `/nodejs/bin/node /strapid-daemon/src/main.ts`. Declare `/coordination` alongside the existing volumes, retain `/tmp` as a runtime tmpfs rather than an image volume, expose only Strapi's internal 65101 serving port, and add OCI source/revision labels. No TCP supervisor port is added.

At this milestone, buildx/Compose must show both daemon source trees outside `node_modules`; backend must still contain compiled Strapi rather than TypeScript application source; and both runtime binaries must report v24.20.0. `docker image inspect` must show the configured `nonroot` user, direct Node entrypoints, no shell, and only the intended volume declarations; direct runtime probes must resolve that user to UID/GID 65532.

### Milestone 2: Make Compose the isolated deployment boundary

Edit both `compose.yml` and `compose.prod.yml`. Add a `backupd` service, all five named volumes, and the exact environment mappings from this plan. In development, build backend from `./backend` with `strapid: ./strapid` under `additional_contexts`; build backupd from `./backupd`; retain the frontend build. Pass source/revision label arguments to backend and backupd. In production, use the required immutable image variables and no build section.

For backend, retain read-only root, `/data`, `/config`, and `/tmp`; add shared staging and coordination; set the exact environment allowlist; remove the whole-file secret; add the direct-Node `/_health` check; set `restart: unless-stopped` and `stop_grace_period: 45s`; and keep it only on the private `app` network. The healthcheck command must invoke `/nodejs/bin/node` directly with a bounded `fetch` to `http://127.0.0.1:65101/_health`, return nonzero for a non-OK response, and use explicit interval, timeout, retry, and startup grace values. It must not need curl, wget, a shell, or a published port.

For backupd, supply `strapid: ./strapid` as the named build context, set read-only root, `/tmp` tmpfs, `backup_state`, shared staging and coordination, exact environment allowlist, private `app` network, `restart: unless-stopped`, and `stop_grace_period: 45s`. Use a long-form `depends_on` condition requiring backend health for initial startup. Do not publish or expose a control port. Do not mount data, config, Docker sockets, host logs, Caddy files, or Collector configuration.

For frontend, retain the existing build-time version argument, replace the whole-file secret with its exact runtime environment allowlist, retain read-only root and tmpfs paths, and add `restart: unless-stopped`. For gateway, retain only the existing loopback `127.0.0.1:65102:65102` publication and add `restart: unless-stopped`. Remove the top-level `secrets` section entirely. Do not add the Collector, `otel-config.yml`, Grafana settings, host timers, scripts, privileged flags, or host services.

Edit `frontend/Dockerfile` to remove creation of `/app/.env -> /run/secrets/frontend.env`. Copy `/usr/local/bin/node` from its exact builder into the distroless runtime just as backend does. Do not change Next.js source, SSR/ISR, CMS fetching, routing, cache/revalidation, or the footer. The existing `NEXT_PUBLIC_APP_VERSION` build argument remains required in Compose.

Rewrite the root `.env.example` as the complete single-file deployment template described above. Keep comments concise and ownership-oriented. Every secret-like value must be an obvious replacement placeholder, not a random token that could be mistaken for a live credential. Ensure placeholders are syntactically valid for Compose, Strapi startup, and B06's digest/revision parsers. Do not edit `backend/.env.example` or `frontend/.env.example` unless actual validation demonstrates that the existing package-local development examples contradict the new runtime behavior; the root file is the Compose contract.

### Milestone 3: Prove configuration isolation at its owning boundary

Add `backupd/test/compose-config.integration.test.ts`. Use `node:test`, `node:assert/strict`, and `node:child_process.execFile` without a shell to run `docker compose --env-file /dev/null --file <compose> config --format json` from the repository root for both Compose files. Supply a complete, controlled environment containing only safe placeholders plus the minimum process variables needed to locate Docker. Never read the repository's live `.env`.

Parse the JSON and compare sorted environment key names, never values. Assert the exact backend, frontend, and backupd key sets described in this plan. Assert no service has `env_file` or Compose `secrets`; no current service receives a name starting with `GRAFANA_`; backupd receives neither backend secrets nor source volumes; backend receives no storage credentials; and frontend receives neither class. Assert backend and backupd share only `/staging` and `/coordination`, backupd alone mounts `/state`, backend alone mounts `/data` and `/config`, and all service volume sources are the declared project-scoped names. Assert project images are read-only, have the expected tmpfs paths, restart policies, stop grace periods, dependency/health wiring, networks, and no privileged/container-management/host-log mount. Assert backupd and backend have no published control port and the gateway's sole host publication is loopback 65102. Keep failure messages limited to service names, setting names, mount targets, and policy values; never include the rendered environment map or resolved placeholder values.

This test is the single durable structural check for service isolation. Do not duplicate parser assertions in shell tests, image tests, and documentation. Existing `backup-config`, object-storage, staging, capture-budget, and telemetry tests remain the owners of value validation and behavioral defaults.

### Milestone 4: Validate images, rootless storage, startup, and preserved frontend behavior

Run the canonical daemon and application commands in `Concrete Steps`. Render both Compose files with `.env.example`, first quietly and then through the key-only integration test. Build backend, backupd, and frontend through Compose. Run Buildx's native Dockerfile check where supported. Inspect image configuration and files without printing an environment dump.

Use a uniquely named Compose project `us-alb-b10-validation`. Start only backend from empty task-owned named volumes and wait for its healthcheck. This is the repository-authorized empty-database startup validation, not an automated backend, smoke, end-to-end, browser, or deployment test. Confirm from container state that `strapid` is PID 1, the root filesystem is read-only, the user is nonroot, Strapi reaches healthy serving, no port is published, and the coordination socket exists. On failure only, inspect bounded backend logs; do not include environment values in evidence.

While that task-owned backend is running, execute direct Node write/remove probes as UID 65532 inside `/data`, `/config`, `/staging`, and `/coordination`. Run a one-shot backupd container with its normal named volumes but override its entrypoint to direct Node and write/remove probes in `/state`, `/staging`, and `/coordination`. This proves image-seeded named-volume ownership under the actual Rootless Docker engine without starting backup publication, changing host ownership, or touching a host path. Do not overwrite the live socket; use unique sentinel filenames and remove only those exact files.

Run direct `/nodejs/bin/node --version` probes in backend, backupd, and frontend images and compare all three with `mise exec -- node --version`; every result must be `v24.20.0`. Inspect backend's Strapi package metadata and expect `5.52.0`. Inspect labels and expect source/revision metadata. Inspect backend and backupd filesystem layout and expect daemon `.ts` sources outside `node_modules`, production dependencies present, no package tests/fixtures/tsconfig, and no shell/npm/npx runtime dependency.

Build the frontend with a recognizable non-secret `NEXT_PUBLIC_APP_VERSION` placeholder from `.env.example`; use direct Node filesystem inspection inside the image to confirm the compiled standalone output contains that version marker and that `/app/.env` is neither the old secret symlink nor a copied root environment file. Existing source and canonical frontend tests must remain green. Do not add a visual/browser test merely to reassert footer styling.

After all evidence is collected, stop the exact validation project and remove only its Compose-labeled containers, network, and named volumes. Retain no SQLite database, socket, state file, staging file, temporary Compose output, or local validation container. Do not prune Docker globally.

## Concrete Steps

All commands run from `/home/codex/src/us-alb`. Before editing, verify the immutable baseline and scope:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch

Expect branch `backup-system`, both revisions `93b0dd68a92d401bca901536bf800ed6985494cf`, and only `?? .agents/skills/imagen/scripts/`. Stop if tracked or overlapping changes appear. Do not inspect that directory.

After implementation, install from locks and run the non-mutating daemon checks/tests. The formatting command may be run once before these checks, but retain no unrelated formatting:

    mise exec -- npm ci --prefix strapid
    mise exec -- npm ci --prefix backupd
    mise run strapid:check
    mise run strapid:test
    mise run backupd:check
    mise run backupd:test

The new Compose integration test runs as part of `backupd:test`. Expect every test to pass with zero failures or skips; record the actual counts rather than encoding a planned count.

Refresh and validate the affected backend/frontend contracts. B10 changes image/runtime integration, not backend types, so `be:types` is not required unless an implementation discovery forces an authorized backend TypeScript type change:

    mise exec -- npm ci --prefix backend
    mise exec -- npm ci --prefix frontend

    (
      set -a
      . ./.env.example
      set +a
      mise run be:build
      mise run be:openapi
      mise run fe:openapi
      mise run fe:build
      mise run fe:check
      mise run fe:test
    )

The subshell exports `.env.example` only to that process tree and restores the invoking shell unchanged; do not read a live `.env` or alter machine/user environment. Expect all commands to pass. The generated `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` should be refreshed but semantically unchanged because B10 changes no API schema. If a generator creates timestamp-only churn, rerun and compare carefully; do not hand-edit schema meaning and do not retain an unexplained change.

Validate native configuration without displaying values:

    docker compose --env-file .env.example -f compose.yml config --quiet
    docker compose --env-file .env.example -f compose.prod.yml config --quiet
    mise exec -- node --test backupd/test/compose-config.integration.test.ts

The first two commands print nothing on success. The test may print test names and pass/fail counts only. Do not run `docker compose config --environment`, print rendered JSON, or inspect a container's complete environment.

Build all affected project images through the actual development definition, using the exact task-owned project name:

    docker compose -p us-alb-b10-validation --env-file .env.example build --check backend backupd frontend
    docker compose -p us-alb-b10-validation --env-file .env.example build backend backupd frontend

If Compose does not support `build --check` for the multi-service form in the installed version, run equivalent native checks without changing files:

    docker buildx build --check --build-context strapid=./strapid -f backend/Dockerfile backend
    docker buildx build --check --build-context strapid=./strapid -f backupd/Dockerfile backupd
    docker buildx build --check -f frontend/Dockerfile frontend

Record the three resulting image IDs from the exact Compose-generated local tags with selected-field `docker image inspect` output; do not dump configuration. Use those IDs for inspection. Expected image facts are backend and backupd configured user `nonroot` resolving to runtime UID/GID 65532, direct Node entrypoints, read-only-at-runtime service configuration, expected named-volume declarations, source/revision labels, and no backupd exposed port.

Before overriding any backupd entrypoint for version or filesystem probes, prove the complete eager production module graph from the built image without starting a backup:

    docker compose -p us-alb-b10-validation --env-file .env.example run --rm --no-deps \
      --entrypoint /nodejs/bin/node backupd \
      -e 'await import("/backupd/src/main.ts")'

Expect exit status zero and no output. This import does not invoke `main()` because the module is not the process entrypoint, but it loads the same eager graph as the normal entrypoint. It must resolve the packaged authoritative `/strapid/src/capture-contract.ts`. Do not replace this native image execution with another structural test.

Compare actual runtimes, not image names:

    project_node_version=$(mise exec -- node --version)
    backend_node_version=$(docker compose -p us-alb-b10-validation --env-file .env.example run --rm --no-deps --entrypoint /nodejs/bin/node backend --version)
    backupd_node_version=$(docker compose -p us-alb-b10-validation --env-file .env.example run --rm --no-deps --entrypoint /nodejs/bin/node backupd --version)
    frontend_node_version=$(docker compose -p us-alb-b10-validation --env-file .env.example run --rm --no-deps --entrypoint /nodejs/bin/node frontend --version)
    test "$project_node_version" = v24.20.0
    test "$backend_node_version" = "$project_node_version"
    test "$backupd_node_version" = "$project_node_version"
    test "$frontend_node_version" = "$project_node_version"

The variable names are task-specific and do not repurpose system options. These commands print only version strings.

Before startup, ensure no existing resource belongs to the task-owned validation project. Use Compose's exact project label for inspection; if matching stopped leftovers exist, remove them with that same project definition. If a resource with the intended name lacks the Compose project label or is running unexpectedly, stop and investigate rather than deleting it.

Start only the backend with empty project volumes:

    docker compose -p us-alb-b10-validation --env-file .env.example up --detach --no-deps backend

Poll the backend container's health through `docker inspect --format '{{.State.Health.Status}}' <container-id>` with short intervals and an overall bound no longer than the configured startup health period plus retries. Expect `healthy`. Inspect only selected non-secret facts such as user, read-only root, health state, PID-1 arguments, mount source type/target, and published port keys. Expect no host port and expect `/data`, `/config`, `/staging`, and `/coordination` to be named volumes.

Use direct Node `fs` calls for write/remove probes. Generate collision-resistant sentinel basenames in the invoking shell, pass only those basenames as arguments, validate each target with `realpath`/fixed parent logic in the Node snippet, and remove the exact files in `finally`. The backend probe covers `/data`, `/config`, `/staging`, and `/coordination`; the one-shot backupd probe covers `/state`, `/staging`, and `/coordination`. Expect both to report UID/GID 65532 and success. Do not modify the socket path or run `chown` anywhere.

Use direct Node inspection in each image to prove required/forbidden runtime paths, Strapi 5.52.0, OCI label presence through `docker image inspect`, the frontend version marker, absence of `/app/.env`, and zero-byte size (not contents) of backend `/strapi/.env`. Keep output to booleans, versions, user IDs, path names, sizes, and label names; do not print environment values, package lock contents, application data, or logs.

Clean up only the exact validation project after capturing evidence:

    docker compose -p us-alb-b10-validation --env-file .env.example down --volumes --remove-orphans

Then confirm no container, network, or volume with Compose project label `com.docker.compose.project=us-alb-b10-validation` remains. Do not use `docker system prune`, broad globs, or another project's resources.

Finish with scope and hygiene checks:

    git diff --check
    git diff --exit-code 93b0dd68a92d401bca901536bf800ed6985494cf -- BACKUP.md TODO.md AGENTS.md frontend/AGENTS.md
    git status --short
    git diff --name-only

The implementation diff may contain only this plan, `backupd/Dockerfile`, `backupd/.dockerignore`, `backupd/test/compose-config.integration.test.ts`, `strapid/.dockerignore`, `backend/Dockerfile`, `frontend/Dockerfile`, `compose.yml`, `compose.prod.yml`, `.env.example`, and generated API artifacts only if the authoritative generators produce a justified change. The worker must not edit `TODO.md`; after independent approval the coordinator alone may add the plan link/checkmark and perform workflow bookkeeping. No source-tree JavaScript, maps, tsbuildinfo, test socket, database, staged archive, state file, or validation resource may remain.

## Validation and Acceptance

B10 is accepted when native rendering succeeds for both Compose definitions from a complete non-secret example file and the integration test proves key-name and mount isolation without printing values. `backupd` must have only state, staging, and coordination volumes; it must not have `/data`, `/config`, Strapi secrets, CMS tokens, revalidation/preview/admin values, or Grafana values. Backend/strapid must have data, config, staging, and coordination but no state volume or `BACKUPD_S3_*` value. Frontend must have only its nine runtime settings. No service receives the entire `.env`, and no top-level Compose secret remains.

Both new runtime boundaries must be real. Backend's PID 1 is direct Node running `/strapid-daemon/src/main.ts`, and that supervisor reaches a healthy Strapi 5.52.0 child from a fresh empty SQLite volume. Backupd's direct entrypoint is `/nodejs/bin/node /backupd/src/main.ts`; a native built-image import of that module must load the complete eager graph successfully without starting a backup, including the single packaged authoritative `/strapid/src/capture-contract.ts`. Backupd exposes no port. Neither image contains or invokes a shell, npm, npx, Docker CLI, or container-management API. No Docker socket, host process namespace, privileged flag, host log directory, timer unit, orchestration script, or extra host service exists.

All project images affected by B10—backend, backupd, and frontend—must be pinned distroless, configured nonroot, and used with read-only root filesystems in Compose. The actual Node executable in all three reports v24.20.0, equal to `mise.toml`; a `nodejs24` tag is not sufficient evidence. Writable locations are limited to explicit named volumes and tmpfs scratch/cache. Rootless volume probes must succeed from both backend and backupd as UID/GID 65532 without any host ownership change.

Compose must define project-scoped `backend_data`, `backend_config`, `backup_state`, `backup_staging`, and `backup_coordination`. Backend and backupd share only the last two. The private socket is never a TCP or host-published endpoint. The gateway remains the only published service, at `127.0.0.1:65102`. Backend must be able to start and remain healthy when backupd and the not-yet-added Collector are absent.

Release attribution must be demonstrable without daemon access. The backend and backupd images carry OCI source/revision labels. Production backend image selection uses the same immutable digest injected as `BACKUPD_APPLICATION_IMAGE_DIGEST`; the same Git revision becomes strapid release identity and backupd manifest revision; strapid supplies the configured logical source identity plus actual runtime Node and Strapi versions through the existing capture protocol. Do not claim that a local placeholder digest equals a local unpushed image digest, and do not query the engine from application code.

The frontend standalone image must no longer contain the runtime secret symlink or a copied root `.env`. `NEXT_PUBLIC_APP_VERSION` remains a required build argument, the canonical frontend build/check/tests pass, and direct compiled-output inspection finds the example version marker. No route, SSR/ISR behavior, CMS pipeline, revalidation behavior, content type, or visible footer implementation changes.

Canonical validation is `strapid:check`, `strapid:test`, `backupd:check`, `backupd:test`, process-scoped `.env.example` execution of `be:build`, `be:openapi`, `fe:openapi`, `fe:build`, `fe:check`, and `fe:test`, plus native Compose rendering, the three affected image builds, the backupd built-image production-graph import, runtime/image inspection, rootless named-volume probes, and fresh empty-database backend startup. `be:types` is added only if backend types actually change. Every applicable command must pass without errors before worker handoff.

## Idempotence and Recovery

`npm ci`, package checks, tests, API generators, Compose rendering, and image builds are repeatable. Builder dependency trees are recreated from committed lockfiles; runtime images remain immutable. Named build contexts contain only package-owned files after `.dockerignore` processing. Rebuilding does not edit host `node_modules` or application data.

The configuration integration test uses `/dev/null` instead of the live `.env`, controlled placeholders, no shell, and no daemon mutation. If Compose rejects a field, fix the Compose/Dockerfile interface and rerun the native renderer; do not replace native parsing with a hand-written YAML parser. If a failing assertion could expose a resolved value, change it to compare/print names before rerunning and do not preserve the unsafe transcript.

The validation project is recoverable because all resources carry the exact Compose project label. Before removing leftovers, confirm the label and that no unexpected task is using them. `docker compose ... down --volumes --remove-orphans` is authorized only for `us-alb-b10-validation`. If labels do not match, stop. Never prune globally or delete a volume by a guessed broad name.

Write probes create unique files and remove only those files in `finally`; rerunning them is safe. If a probe fails, retain the task-owned validation volumes temporarily, inspect only user/mode/mount metadata and the specific sentinel path, correct image ownership, rebuild, and recreate fresh task-owned volumes. Do not use `sudo`, privileged containers, host `chown`, or a one-off root fixer because those would invalidate acceptance.

If empty-database startup fails, retain the exact validation project long enough to inspect selected container state and bounded logs. Correct the image entrypoint, environment mapping, volume ownership, or healthcheck, then remove only the labeled project and retry with newly empty volumes. Do not point validation at production data or a prestarted stack, and do not turn startup validation into an automated Strapi test.

If the copied v24.20.0 executable becomes incompatible with a future runtime base, do not weaken parity or switch to a shell-bearing image. Select a pinned compatible distroless base or exact Node artifact and record evidence in the living plan. If generated API artifacts change unexpectedly, rerun the authoritative generators and compare backend source; an unexplained schema change is a blocker, not a file to hand-edit.

## Artifacts and Notes

Planning established the runtime mismatch that validation must close:

    project pin:                  v24.20.0
    pinned distroless built-in:  v24.21.0
    distroless nonroot uid/gid:  65532/65532

The final expected process and storage map is:

    backend PID 1  -> /nodejs/bin/node /strapid-daemon/src/main.ts
      Strapi child -> /nodejs/bin/node /strapi/node_modules/@strapi/strapi/bin/strapi.js start
      private data -> /data, /config
      shared       -> /staging, /coordination/strapid.sock
      scratch      -> /tmp tmpfs

    backupd PID 1  -> /nodejs/bin/node /backupd/src/main.ts
      private data -> /state
      shared       -> /staging, /coordination/strapid.sock
      scratch      -> /tmp tmpfs

    frontend PID 1 -> /nodejs/bin/node /app/server.js
      cache        -> /app/.next/cache tmpfs
      scratch      -> /tmp tmpfs

Expected attribution flow is:

    .env APPLICATION_GIT_REVISION
      -> backend STRAPID_RELEASE_ID
      -> capture identity releaseId
      -> manifest application.releaseId

    .env APPLICATION_GIT_REVISION
      -> backupd BACKUPD_GIT_REVISION
      -> manifest application.gitRevision

    .env APPLICATION_IMAGE_DIGEST
      -> compose.prod backend image repository@digest
      -> backupd BACKUPD_APPLICATION_IMAGE_DIGEST
      -> manifest application.imageDigest

    .env STRAPI_SOURCE_IDENTITY
      -> backend STRAPID_SOURCE_VOLUME_ID
      -> capture identity sourceVolumeId
      -> manifest capture.sourceVolumeId

    actual backend runtime
      -> capture identity nodeVersion and strapiVersion
      -> manifest application.nodeVersion and strapiVersion

Evidence retained in this plan after implementation should be concise: command names and pass counts, image IDs/digests where non-secret, actual Node/Strapi versions, image user/entrypoint/volume targets, key names by service, mount targets, health/read-only/no-port booleans, rootless write-probe success, generated-artifact diff status, and exact cleanup confirmation. Never retain environment values, access keys, salts, admin credentials, signed URLs, archive content, SQLite content, or a full `docker inspect`/Compose rendering.

## Later-Task Boundaries and Commit Scope

B10 does not add the OpenTelemetry Collector service, `otel-config.yml`, Grafana Cloud endpoints/credentials, receiver/exporter processors, routing, batching, authentication, retry queues, or sampling. B11 owns all of those and must map Grafana credentials only into the Collector. B10's explicit service allowlists make that later addition safe and establish the application endpoint `otel-collector:65103`.

B10 does not edit `.github/workflows/ci.yml` or `.github/workflows/cd.yml`, publish images, generate provenance/SBOM attestations, or trigger deployment. B12 owns adding daemon installs/checks to CI, passing the named `strapid` build context to both backend and backupd publication builds, publishing backupd, and delivering Compose plus Collector configuration while preserving existing release provenance. B10 nevertheless keeps both Compose files internally complete and natively renderable with placeholder immutable image references.

B10 does not change lifecycle, schedule, capture, archive, upload, state, or telemetry semantics; add storage dependencies; add a host/manual control path; modify Strapi application/bootstrap/content types; change Next.js rendering or CMS flow; add backend/browser/E2E/deployment tests; or edit `BACKUP.md`. B13 remains responsible for the complete implementation audit, real deployment values, provider prerequisites, recovery handoff, and manual recovery rehearsal.

The worker-owned implementation scope is limited to the files named in `Concrete Steps`. After `WORK_READY`, independent review must repeat or inspect the material boundary evidence. Only after `APPROVED` and `REVIEW_READY` may the coordinator update this plan for final review evidence, add the B10 plan link/checkmark to `TODO.md`, stage only B10 files, commit with exact title `B10 — Integrate containers and service-specific configuration`, and push to `origin/backup-system`. The worker and planner do not stage, commit, push, or modify the queue.

Revision note (2026-10-30 / Codex planner): Created the initial self-contained B10 plan from pushed B09 commit `93b0dd68a92d401bca901536bf800ed6985494cf`. The plan resolves distroless daemon packaging, named build contexts, exact Node parity, supervisor/backend entrypoints, rootless volume seeding, explicit environment allowlists, release/source attribution without engine access, restart/health/stop behavior, production/development Compose parity, frontend secret-file removal and version preservation, focused configuration-boundary coverage, empty-database startup, safe validation cleanup, and B11/B12 ownership without changing any production, test, queue, design, or unrelated file.

Revision note (2026-10-30 / Codex planner): Planner self-review removed the backend runtime's example-value fallback by requiring a zero-byte immutable `/strapi/.env` while retaining the absolute `ENV_PATH` expected by the compiled Strapi/export runtime. It also replaced an imprecise environment-key count with the authoritative named set. These refinements make the single-local-`.env` ownership and missing-mapping failure boundary explicit without changing B10 scope.

Revision note (2026-10-30 / Codex worker): Recorded the first implementation checkpoint after adding daemon image boundaries, explicit Compose service ownership and storage policies, frontend runtime parity preparation, the complete non-secret environment template, and the passing two-file Compose boundary integration test. Final canonical, image, runtime, storage, startup, and cleanup validation remains open.

Revision note (2026-10-30 / Codex worker): Completed worker validation and recorded actual canonical test counts, local image IDs, Rootless Docker identity and volume evidence, runtime Node/Strapi parity, frontend version/no-env evidence, empty-database health, generated-artifact equivalence, and exact task-project cleanup. The only remaining Progress item is coordinator-owned independent review; no queue, staging, commit, push, Collector, release-workflow, or deployment action was performed.

Revision note (2026-10-30 / Codex worker): Final diff review strengthened the durable test to pin every named-volume source/target and the gateway's no-environment/no-secret boundary, then reran the complete 150-test backupd suite. It also updated baseline-oriented prose and image-inspection instructions to reflect Docker's symbolic `nonroot` metadata and the actual selected-field inspection used during validation.

Revision note (2026-10-30 / Codex worker, remediation cycle 1): Recorded all three independent-review findings, withdrew the incomplete backupd image completion claim, audited cross-package production imports, and selected the narrow authoritative-module packaging fix. Updated Compose/B12 build-context ownership, added native built-image production-graph import acceptance, and made every affected backend/frontend canonical command use a process-scoped `.env.example` subshell. Full remediation validation remains open.

Revision note (2026-10-30 / Codex worker, remediation cycle 1): Completed the superseding remediation validation. The backupd image now imports its complete production graph natively, all canonical suites and B10-native configuration/image/runtime/storage/empty-database checks pass, regenerated API artifacts remain unchanged, and the exact task-owned Compose project has no residual container, network, or volume. Independent review remains coordinator-owned; no queue, staging, commit, push, publication, or deployment action was performed.

Revision note (2026-10-30 / Codex coordinator): Recorded the independent reviewer's `APPROVED`/`REVIEW_READY` handoff after remediation cycle one, closed review progress, finalized the outcome with independently reproduced evidence, linked this plan under B10 in `TODO.md`, and checked the task. No implementation scope, technical decision, validation claim, or implementation file changed during this bookkeeping update.

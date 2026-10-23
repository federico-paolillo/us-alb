# Consolidate frontend and backend configuration

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept current as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root.

## Purpose / Big Picture

The template currently gives one concept different environment-variable names in Next.js and Strapi, repeats values that must remain equal, and mixes framework defaults with project-specific names. After this change, an operator can configure the public site, CMS access, Preview, revalidation, and the bootstrap administrator with one clear vocabulary. Shared revalidation settings will have the same names and values in both services, public CMS and media URLs will have useful gateway defaults, direct local development will use the repository's reserved `65100` and `65101` ports, and existing installations will have the bootstrap-managed webhook corrected when configuration changes.

The result is observable by copying each service example to its local `.env`, running `mise run dev`, and seeing Next.js on `127.0.0.1:65100` and Strapi on `127.0.0.1:65101`. It is also observable through focused frontend tests, an empty-database Strapi startup, successful Next.js and Strapi builds, rendered Compose configuration, and successful container image builds.

## Progress

- [x] (2026-10-23 08:37Z) Inspected the existing environment examples, application readers, bootstrap helpers, Dockerfiles, Compose file, Mise tasks, CI/CD workflows, validation rules, and the pre-existing `.env.example` edit.
- [x] (2026-10-23 08:46Z) Introduced the consolidated frontend configuration contract, media fallback, literal revalidation header handling, and focused unit tests.
- [x] (2026-10-23 08:46Z) Migrated Strapi configuration, Preview, bootstrap administrator creation, and the managed revalidation webhook.
- [x] (2026-10-23 08:46Z) Aligned tracked examples, ignored local environment files, local ports, container builds, Compose, and CD with the new contract.
- [x] (2026-10-23 08:52Z) Refreshed generated API artifacts and completed canonical checks, Compose rendering, container image builds, and empty-database Strapi startup; the host-native frontend build remains blocked by an unrelated Turbopack process-binding restriction, while the identical Docker image build succeeds.
- [x] (2026-10-23 09:02Z) Remediated the initial review findings by synchronizing Preview secrets and deferring administrator-email validation until creation is necessary; verified an invalid email does not prevent startup when administrator creation is skipped.
- [x] (2026-10-23 09:04Z) Obtained independent APPROVED / REVIEW_READY after one remediation cycle resolving two findings; the reviewer accepted the successful isolated frontend production image build as native build evidence and confirmed the host-only limitation remains accurately recorded.

## Surprises & Discoveries

- Observation: `PORT` cannot control `next dev` from `frontend/.env` because Next.js chooses its listener before loading that file.
  Evidence: the installed Next.js CLI guide at `frontend/node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md` says to use `--port` or a process environment variable, so the local port must be placed in the `frontend/package.json` development script.

- Observation: Strapi persists provisioned webhooks in its database, but `backend/src/bootstrap/webhook.ts` currently identifies an existing webhook only by its URL and returns without reconciling headers, events, or a changed destination.
  Evidence: Strapi's installed `webhookStore` exposes `findWebhooks`, `updateWebhook`, and `createWebhook`, while `webhookRunner` exposes `update`; these native APIs can safely update the managed webhook and its in-memory runner together.

- Observation: the only pre-existing tracked worktree change is in `.env.example`, where the API token and frontend-side webhook credential examples were edited.
  Evidence: `git status --short` reports only `.env.example`; its diff contains those three value changes. The implementation must preserve those user-selected values without printing them in logs or replacing them with the stale backend duplicates.

- Observation: the host-native `next build` fails while Turbopack tries to bind a process resource for CSS compilation, but the frontend Docker build completes with the same configuration.
  Evidence: `mise run fe:build` reports `Operation not permitted` while creating a process; `docker compose --env-file .env.example build backend frontend` produces both images successfully.

- Observation: the shell's Node 26 cannot load the local SQLite native module built for Mise's Node 24, but the task commands run correctly through Mise.
  Evidence: direct `npm start` reports a Node module ABI mismatch; `mise exec -- npm start` creates the administrator, creates the webhook, and reports `Strapi started successfully` against an empty temporary database.

## Decision Log

- Decision: Use a clean replacement with no fallback aliases for old names.
  Rationale: The user explicitly chose a clean migration and all repository consumers can change atomically.
  Date/Author: 2026-10-23 / User and Planner

- Decision: Keep `backend/.env` and `frontend/.env` as the local-development sources, with their respective `.env.example` templates, while `.env.example` remains the shared Compose secret and interpolation example.
  Rationale: The user chose service-specific local files rather than changing how Next.js and Strapi load development configuration.
  Date/Author: 2026-10-23 / User and Planner

- Decision: The final configuration names are `SITE_URL`, `CMS_API_URL`, `CMS_PUBLIC_URL`, `CMS_MEDIA_URL`, `CMS_API_TOKEN`, `FRONTEND_INTERNAL_URL`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, `PREVIEW_SECRET`, `CMS_ADMIN_COOKIE_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_PASSWORD_FILE`, plus Strapi's established signing keys and salts and `NEXT_PUBLIC_APP_VERSION`.
  Rationale: Shared concepts receive shared names; service-specific transport endpoints remain distinct because they can legitimately differ.
  Date/Author: 2026-10-23 / User and Planner

- Decision: `REVALIDATION_HEADER` contains the complete HTTP header name. Neither sender nor receiver adds `x-` at runtime.
  Rationale: The user wants the name configurable, and a complete header name removes the current surprising implicit prefix.
  Date/Author: 2026-10-23 / User and Planner

- Decision: `CMS_MEDIA_URL` defaults to `SITE_URL`; `CMS_PUBLIC_URL` defaults to `/cms` on `SITE_URL`; and `CMS_ADMIN_COOKIE_PATH` defaults to the normalized public CMS path followed by `/admin`.
  Rationale: These defaults fit the bundled Caddy gateway while explicit overrides preserve direct local development and deployments with separate CMS or media hosts.
  Date/Author: 2026-10-23 / User and Planner

- Decision: Replace `ADMIN_USER` plus `ADMIN_DOMAIN` with `ADMIN_EMAIL`, default it to `admin@example.com`, and derive the Strapi username from the non-empty local part before `@`.
  Rationale: A full email is the actual Strapi identity and is clearer to configure. A malformed address should fail bootstrap with a secret-free diagnostic rather than creating an ambiguous account.
  Date/Author: 2026-10-23 / User and Planner

- Decision: Find the project-owned webhook by the stable name `Next revalidation`, update it only when its destination, header, or event set differs, preserve its enabled state, and leave every other webhook untouched.
  Rationale: The name establishes ownership across URL changes. Avoiding an unconditional update keeps bootstrap idempotent, and Strapi's store and runner APIs keep persisted and active state consistent.
  Date/Author: 2026-10-23 / Planner

- Decision: Place the backend public-URL resolver in `backend/src/config/public-urls.ts`, imported by the two registered Strapi configuration modules.
  Rationale: A helper below `config/` could be treated as another Strapi configuration entry. The source helper keeps URL policy shared without changing Strapi's loaded configuration surface.
  Date/Author: 2026-10-23 / Worker

## Outcomes & Retrospective

Implementation now uses one configuration contract across both services. `CMS_API_URL`, `CMS_PUBLIC_URL`, `CMS_MEDIA_URL`, `FRONTEND_INTERNAL_URL`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, `CMS_ADMIN_COOKIE_PATH`, and `ADMIN_EMAIL` replace the divergent names without aliases. The root user-edited API token and frontend-side webhook values were retained under their consolidated keys; ignored local files were migrated without staging their contents. The frontend and backend examples, and the two ignored local files, now share the same Preview secret. Administrator-email parsing runs only after a password is available and no administrator exists.

Frontend unit tests (92), type checks, backend type generation and build, OpenAPI generation, Compose rendering, both Docker image builds, and empty-database startup pass. The local native Next build is blocked by the host's Turbopack process-binding restriction even after a sequential retry; its Docker build passes. Independent review returned APPROVED / REVIEW_READY after one remediation cycle resolving both findings, with no remaining findings or unmet acceptance criteria. The reviewer accepted the Docker build's identical production command as valid isolated native build evidence. Local environment files remain ignored; remote deployment settings still require the clean variable-name migration.

## Context and Orientation

This repository combines a Strapi 5 backend in `backend/`, a Next.js 16 frontend in `frontend/`, and a Caddy gateway configured by `Caddyfile` and `compose.yml`. The frontend's server-only configuration is assembled eagerly in `frontend/config.ts`. `frontend/next.config.ts` separately reads the CMS media URL to build the Next Image allowlist. CMS data must continue through the established client, connector, mapper, cache, and webhook invalidation pipeline; this task changes configuration around that pipeline and must not alter SSR plus ISR rendering, content types, page dispatch, or caching. `NEXT_PUBLIC_APP_VERSION` must remain embedded and displayed by the footer and error surfaces.

Strapi reads its network and public URL in `backend/config/server.ts`, its Preview and admin cookie configuration in `backend/config/admin.ts`, and runs bootstrap helpers from `backend/src/index.ts`. `backend/src/bootstrap/webhook.ts` provisions the webhook that posts Strapi content changes to the frontend's `/refresh` route. `backend/src/bootstrap/admin-user.ts` creates the first administrator when a password is present. These are ordinary Strapi configuration and bootstrap mechanisms and must remain so; do not add custom API endpoints or backend tests.

The root `.env.example` serves two roles: Docker Compose uses it for variable interpolation when passed with `--env-file`, and mounts it as the runtime secret for both application containers. The service examples support direct local development. The actual `backend/.env` and `frontend/.env` files exist but are ignored by Git; migrate them as part of the local workspace without staging them. Preserve their current credentials and custom endpoints. The root example is already edited by the user. When collapsing its two revalidation pairs, the current frontend receiver values (`CMS_WEBHOOKS_SECRET_HEADER` and `CMS_WEBHOOKS_SECRET_HEADER_VALUE`) are authoritative, and the new complete header value is the old header fragment prefixed once with the `x-` that runtime previously supplied. Preserve the edited `CMS_API_TOKEN` value exactly. Never print any of these values in command output or the plan.

The old-to-new replacement is exact. `CMS_URL` becomes `CMS_API_URL`. `SERVER_URL` becomes optional `CMS_PUBLIC_URL`. `WEBHOOKS_NEXTJS_TARGET` becomes `FRONTEND_INTERNAL_URL`. Both `CMS_WEBHOOKS_SECRET_HEADER` and `WEBHOOKS_SECRET_HEADER` collapse into `REVALIDATION_HEADER`; both corresponding `*_VALUE` variables collapse into `REVALIDATION_SECRET`. `PREVIEW_CLIENT_URL` is removed in favor of `SITE_URL`. `ADMIN_COOKIE_PATH` becomes optional `CMS_ADMIN_COOKIE_PATH`. `ADMIN_USER` and `ADMIN_DOMAIN` become one `ADMIN_EMAIL`. Do not accept any old name as a fallback after migration.

`SITE_URL` means the absolute public frontend origin used for metadata, sitemap, robots, and Strapi Preview. `CMS_API_URL` means the frontend server's Strapi REST base URL and includes `/api`. `CMS_PUBLIC_URL` means the browser-visible Strapi base URL; when absent, resolve `/cms` against `SITE_URL`. `CMS_MEDIA_URL` means the browser-visible base for uploads and defaults to `SITE_URL`. `FRONTEND_INTERNAL_URL` means the backend-to-frontend origin to which bootstrap appends `/refresh`; when absent or blank, bootstrap continues to log that provisioning is skipped. The two revalidation values are required whenever that internal URL is configured and are always required by the frontend receiver.

## Plan of Work

First, centralize frontend environment parsing without making Next configuration import a `server-only` module. Add `frontend/environment.ts` as a side-effect-free module. It should export the `AppConfig` shape, `makeAppConfig(environment: NodeJS.ProcessEnv): AppConfig`, and `resolveCmsMediaUrl(environment: NodeJS.ProcessEnv): URL`. `AppConfig` should expose `cmsApiUrl`, `cmsMediaUrl`, `cmsApiToken`, `revalidationHeader`, `revalidationSecret`, `previewSecret`, and `siteUrl`. Trim string values, require non-empty `CMS_API_URL`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, `PREVIEW_SECRET`, and `SITE_URL`, treat `CMS_API_TOKEN` as nullable, parse URL settings as absolute URLs, and make media resolution use non-empty `CMS_MEDIA_URL` or fall back to the already-required `SITE_URL`. Keep diagnostics limited to setting names and expected forms. Reduce `frontend/config.ts` to its `server-only` boundary and the frozen `makeAppConfig(process.env)` instance. Make `frontend/next.config.ts` call the same `resolveCmsMediaUrl(process.env)` before constructing the image allowlist, so build-time and runtime default semantics cannot diverge.

Rename frontend consumers to the new `AppConfig` properties. In `frontend/app/refresh/route.ts`, read `request.headers.get(config.revalidationHeader)` literally and compare it with `config.revalidationSecret`; remove the implicit `x-` construction and unreachable checks for missing configured strings. Preserve constant-time comparison, payload validation, accepted events, tag invalidation, and response behavior. The Preview route continues to use the shared `PREVIEW_SECRET`, and metadata continues to use `SITE_URL`.

Add `frontend/environment.test.ts` to prove that the application parser uses `SITE_URL` as the media URL when no override exists, honors an explicit `CMS_MEDIA_URL`, preserves an absent API token as `null`, and fails clearly for each required value or malformed URL using representative cases rather than duplicating every branch. Add `frontend/app/refresh/route.test.ts` using Vitest module mocks for `@cmsjs/config` and `next/cache`. Exercise a complete custom header name, a missing request header, a wrong secret, and an authorized `trigger-test` or supported entry event; assert unauthorized requests return 401 and never call `revalidateTag`, while the authorized representative follows existing behavior. These are frontend unit tests and start no external process.

Next, add a small shared URL-policy module at `backend/src/config/public-urls.ts` for Strapi's server and admin configuration. It must require and parse `SITE_URL`, derive `CMS_PUBLIC_URL` as `new URL('/cms', siteUrl)` when the override is blank, and derive the cookie path from the public CMS URL's normalized pathname plus `/admin` when `CMS_ADMIN_COOKIE_PATH` is blank. A root CMS pathname produces `/admin`; `/cms` or `/cms/` produces `/cms/admin`. Explicit cookie overrides are returned unchanged after trimming. Use this module in `backend/config/server.ts` to replace `SERVER_URL` and in `backend/config/admin.ts` to replace both `PREVIEW_CLIENT_URL` and `ADMIN_COOKIE_PATH`. Preview's `allowedOrigins` and generated `/preview` link use `SITE_URL`; Strapi's server URL uses the resolved public CMS URL. Do not change Preview content mappings, content schemas, or Strapi dependencies.

Change `backend/src/bootstrap/admin-user.ts` to read and trim `ADMIN_EMAIL`, defaulting to `admin@example.com`, require exactly one `@` with a non-empty local part and domain, and pass the complete address as `email` and the local part as `username`. Keep `ADMIN_PASSWORD` and `ADMIN_PASSWORD_FILE` resolution and the existing skip-if-no-password and skip-if-an-admin-exists behavior.

Refactor `backend/src/bootstrap/webhook.ts` to read `FRONTEND_INTERNAL_URL`, `REVALIDATION_HEADER`, and `REVALIDATION_SECRET`. Trim the configured header and URL, append `/refresh` with `new URL`, and use the complete header name as the sole custom header key. Find the existing managed webhook by `name === 'Next revalidation'`. If none exists, create it and register it in `webhookRunner` as today. If it exists and its URL, headers, or event set differs from the desired configuration, call `webhookStore.updateWebhook` with the existing id and enabled state plus the desired name, URL, headers, and events; require a non-null result and pass that result to `webhookRunner.update`. If all managed fields already match, return without writing. Compare events as a set so database ordering does not cause churn. Leave webhooks with other names untouched. Do not add backend tests; the required backend proof is startup against an empty database.

Then update configuration surfaces atomically. In `.env.example`, remove `HOST` and `PORT` because Compose owns container binding, retain `SITE_URL` and `NEXT_PUBLIC_APP_VERSION`, rename `CMS_URL` to `CMS_API_URL`, keep the edited API token, collapse the duplicate webhook settings using the edited frontend values as described above, retain `FRONTEND_INTERNAL_URL`, and keep optional `CMS_PUBLIC_URL`, `CMS_MEDIA_URL`, and `CMS_ADMIN_COOKIE_PATH` as commented overrides with their derived defaults explained. Replace the two administrator identity settings with `ADMIN_EMAIL`. Keep all distinct Strapi signing keys, salts, `PREVIEW_SECRET`, administrator password, and password-file override.

Make `frontend/.env.example` describe direct local development on frontend port `65100` and backend port `65101`. It therefore explicitly sets `SITE_URL=http://127.0.0.1:65100`, `CMS_API_URL=http://127.0.0.1:65101/api`, and `CMS_MEDIA_URL=http://127.0.0.1:65101`; it uses the same representative full revalidation header, revalidation secret, and Preview secret as `backend/.env.example`. Make the backend example use `HOST=127.0.0.1`, `PORT=65101`, the same `SITE_URL`, an explicit direct `CMS_PUBLIC_URL=http://127.0.0.1:65101`, `FRONTEND_INTERNAL_URL=http://127.0.0.1:65100`, matching revalidation and Preview credentials, and `ADMIN_EMAIL=admin@example.com`. Keep example values non-production and internally consistent.

Migrate the ignored `frontend/.env` and `backend/.env` in place without displaying their contents. Use the frontend receiver's existing webhook header fragment and secret as the shared local credentials, prefix the header fragment once with the `x-` that the current code supplied, and write the resulting `REVALIDATION_HEADER` and `REVALIDATION_SECRET` to both files. Preserve all other values while applying the exact name mapping. For the backend, initialize `SITE_URL` from its old `PREVIEW_CLIENT_URL`, combine the old admin user and domain into `ADMIN_EMAIL`, and retain any explicit public CMS URL and cookie path under their new names. Delete all old aliases. If one ignored file is absent, skip only that file and rely on its updated example for future creation. Use a non-logging mechanical transformation and inspect only variable names afterward with a command that removes everything from the first `=` onward.

Set direct Next.js development to port `65100` by changing the `frontend/package.json` `dev` script to `next dev --port 65100`; do not rely on `frontend/.env` for this port. Strapi reads `PORT=65101` from its local file. In `backend/Dockerfile`, replace build arguments with required `SITE_URL` and optional `CMS_PUBLIC_URL` and `CMS_ADMIN_COOKIE_PATH`, expose them only to the Strapi build command, and change the runtime default and `EXPOSE` from `1337` to `65101`. Keep both project images rootless, distroless, and read-only compatible. In `frontend/Dockerfile`, rename the internal build placeholder to `CMS_API_URL`, use the complete new revalidation settings, keep `NEXT_PUBLIC_APP_VERSION`, and allow blank `CMS_MEDIA_URL` to exercise its `SITE_URL` fallback.

Update `compose.yml` so the backend build receives required `SITE_URL` and blank-permitted `CMS_PUBLIC_URL` and `CMS_ADMIN_COOKIE_PATH`, while the frontend build receives required `SITE_URL`, blank-permitted `CMS_MEDIA_URL`, and required `NEXT_PUBLIC_APP_VERSION`. Keep explicit service runtime ports `65101` and `65100`, the gateway's `127.0.0.1:65102` publication, secrets, read-only filesystems, tmpfs mounts, and networks. Update `.github/workflows/cd.yml` so repository configuration validation requires only `SITE_URL`; pass optional `CMS_MEDIA_URL` to the frontend image and optional `CMS_PUBLIC_URL` and `CMS_ADMIN_COOKIE_PATH` plus required `SITE_URL` to the backend image. Remove every reference to the old names. Do not modify remote GitHub repository variables; the clean rename is an operator migration requirement. The CI workflow should continue copying the two service examples and running the same canonical tasks.

Finally, search tracked files for every retired name and inspect environment files by keys only. Refresh backend types and both OpenAPI artifacts because the repository requires these generators after backend or frontend changes, even though this configuration-only task should leave the API surface unchanged. Retain generator output only when it is a legitimate result of the pinned toolchain. Run canonical frontend and backend validation, render Compose with `.env.example`, build both project images through Compose, and start the built Strapi application against a task-owned empty SQLite database. Update this ExecPlan after each milestone and record exact outcomes.

## Concrete Steps

Work from `/Users/federico.paolillo/src/us-alb` on the existing `main` branch. Do not switch branches, overwrite the user's `.env.example` values, or stage ignored local environment files.

After the frontend implementation and tests, run:

    mise run fe:test
    mise run fe:check

Expect Vitest to report all unit tests passing and Biome plus TypeScript to exit successfully. The new environment tests must show the media fallback and override, and the refresh-route tests must show that a full header name authenticates without an added prefix.

After backend and environment migration, check for retired names without revealing values:

    rg -n '\b(CMS_URL|CMS_WEBHOOKS_SECRET_HEADER|CMS_WEBHOOKS_SECRET_HEADER_VALUE|SERVER_URL|WEBHOOKS_SECRET_HEADER|WEBHOOKS_SECRET_HEADER_VALUE|WEBHOOKS_NEXTJS_TARGET|PREVIEW_CLIENT_URL|ADMIN_COOKIE_PATH|ADMIN_USER|ADMIN_DOMAIN)\b' --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/schema.json' --glob '!**/schema.d.ts' --glob '!design/**' --glob '!.agents/**' --glob '!**/.env' --glob '!**/tsconfig.tsbuildinfo'
    sed -E 's/=.*$/=<redacted>/' frontend/.env
    sed -E 's/=.*$/=<redacted>/' backend/.env

The search should return no retired application setting. The redacted key listings should show the consolidated names and no aliases.

Refresh generated artifacts and run canonical validation in this order:

    mise run be:types
    mise run be:build
    mise run be:openapi
    mise run fe:openapi
    mise run fe:build
    mise run fe:check
    mise run fe:test

Every command must exit zero. `be:types`, `be:openapi`, and `fe:openapi` may report no tracked diff because no content schema changed; that is an acceptable and expected result. Do not add a backend test task because none exists and repository policy forbids backend tests.

Render and build the deployable configuration with the project's native tools:

    docker compose --env-file .env.example config --quiet
    docker compose --env-file .env.example build backend frontend

Both commands must exit zero. This proves Compose interpolation, the renamed Docker build arguments, the default public/media URL behavior, and both rootless distroless image builds. Do not start a persistent shared Compose stack.

For the required Strapi empty-database verification, create a task-owned temporary directory with `mktemp -d`, make a `config` subdirectory inside it, and launch the already-built backend from `backend/` with `DATABASE_FILENAME` set to an absolute database path inside that directory, `XDG_CONFIG_HOME` set to its config directory, `HOST=127.0.0.1`, and `PORT=65191`. Keep the configured `FRONTEND_INTERNAL_URL` so bootstrap proves both administrator and managed-webhook creation without requiring a running frontend. Observe the normal Strapi ready/start message, successful default-administrator bootstrap, and managed-webhook creation, then stop the process cleanly with Ctrl-C and remove only that exact temporary directory. Do not use a fixed shared database, a port outside `65100-65199`, or a prestarted dependency.

Before handoff, run:

    git status --short
    git diff --check
    git diff --stat

Confirm the diff contains the implementation, focused tests, updated tracked examples and deployment configuration, any legitimate generated output, and this ExecPlan. Confirm `frontend/.env` and `backend/.env` remain ignored and unstaged, and that no unrelated file changed.

## Validation and Acceptance

Acceptance requires one consistent public configuration vocabulary across code and examples. A full configured `REVALIDATION_HEADER` must be emitted exactly by Strapi and read exactly by Next.js, and `REVALIDATION_SECRET` must be the sole shared value. A missing or incorrect request credential must return HTTP 401 without invalidating cache tags. Preview must build its frontend link from `SITE_URL`, and the website must still expose `NEXT_PUBLIC_APP_VERSION` in its existing footer and metadata/error surfaces.

With the root example, omitting the optional overrides must make public uploads resolve from `SITE_URL`, Strapi's public URL resolve to `/cms` on that origin, and its admin cookie path resolve to `/cms/admin`. With the service examples, explicit overrides must instead support direct frontend and backend origins on `65100` and `65101`. `CMS_API_URL` must continue to include `/api` and point to the backend-reachable REST endpoint. The CMS client-to-connector-to-cache pipeline and SSR plus ISR behavior must be unchanged.

On an empty database, Strapi must create the administrator from `ADMIN_EMAIL` and its password setting and create the named managed webhook when `FRONTEND_INTERNAL_URL` is present. Code inspection and successful build must show that a later startup finds that webhook by name, updates drift through `webhookStore.updateWebhook`, refreshes `webhookRunner`, preserves enabled state, and leaves other webhook names alone. When the internal URL is absent, startup must remain available and log the existing skip behavior.

All canonical tasks listed above, Compose rendering, both image builds, the empty-database startup, `git diff --check`, and independent review must pass without errors. No backend tests, content-type edits, Strapi upgrade, static export, build-time content prerendering, extra endpoints, or README changes are part of acceptance.

## Idempotence and Recovery

All source edits and generators are repeatable. The managed webhook reconciliation compares desired and persisted state before writing, so repeated starts do not create duplicates or update an unchanged row. The administrator bootstrap already returns when an administrator exists. Generated artifacts should stabilize after one run.

The ignored local environment migration is the only operation over user-local configuration. Preserve every value before removing its old key, never print the file, and transform each file atomically through a temporary sibling followed by a rename or another non-logging mechanical edit. If transformation fails before replacement, leave the original untouched. If it fails after one service file is migrated, use the exact mapping in Context and Orientation to migrate the other; the code intentionally does not support a mixed old/new state. The frontend's pre-migration revalidation values are authoritative for reconciling the pair.

The empty-database verification uses an absolute path beneath a freshly created temporary directory and can be repeated. Stop only the process launched by that validation, and remove only the captured task-specific temporary path after verifying it is non-empty and resides in the system temporary area. Do not delete or modify `backend/.tmp`, project volumes, or any existing database. Container builds are cacheable and repeatable, and no persistent Compose services are started.

## Artifacts and Notes

The expected final mapping is summarized by these representative, non-secret relationships:

    Frontend API read:        CMS_API_URL=http://127.0.0.1:65101/api
    Public site:              SITE_URL=http://127.0.0.1:65100
    Direct local media:       CMS_MEDIA_URL=http://127.0.0.1:65101
    Gateway media default:    CMS_MEDIA_URL absent -> SITE_URL
    Gateway public CMS:       CMS_PUBLIC_URL absent -> SITE_URL + /cms
    Gateway admin cookie:     CMS_ADMIN_COOKIE_PATH absent -> /cms/admin
    Revalidation request:     request.headers.get(REVALIDATION_HEADER)
    Preview destination:      new URL('/preview', SITE_URL)

Do not copy actual secrets into test snapshots, logs, this plan, or error messages. Test values must be conspicuous placeholders.

## Interfaces and Dependencies

`frontend/environment.ts` must expose a side-effect-free configuration boundary usable by both Next's runtime and `next.config.ts`:

    export interface AppConfig {
      cmsApiUrl: URL;
      cmsMediaUrl: URL;
      cmsApiToken: string | null;
      revalidationHeader: string;
      revalidationSecret: string;
      previewSecret: string;
      siteUrl: URL;
    }

    export function makeAppConfig(environment: NodeJS.ProcessEnv): AppConfig;
    export function resolveCmsMediaUrl(environment: NodeJS.ProcessEnv): URL;

`frontend/config.ts` remains the server-only composition point and exports `config: AppConfig`. Existing CMS dependency assembly must switch only from `config.cmsUrl` to `config.cmsApiUrl` and otherwise retain the raw Strapi client to connector flow.

The backend URL-policy module at `backend/src/config/public-urls.ts` must expose pure helpers used by both `server.ts` and `admin.ts` to parse the public site URL, resolve the optional public CMS URL, and resolve the admin cookie path. It must use the platform `URL` class and Strapi's existing environment reader; add no dependency.

`backend/src/bootstrap/webhook.ts` must continue using Strapi's installed `webhookStore` and `webhookRunner`. For an existing managed webhook, pass a complete `Modules.WebhookStore.Webhook` shape to `updateWebhook`, including the existing `id` and `isEnabled`, then supply the non-null returned webhook to `webhookRunner.update`. For a new webhook, retain `createWebhook` followed by `webhookRunner.add`. These APIs are present in the pinned Strapi 5.52.0 dependency and avoid low-level database plumbing.

Revision note (2026-10-23): Created the initial implementation-ready plan from the approved configuration contract and current repository state. It records the pre-existing root example edit, exact clean migration, ownership and default rules, focused unit coverage, Strapi reconciliation behavior, port changes, and full repository validation.

Revision note (2026-10-23): Recorded implementation results, the source-level backend URL resolver decision, successful validation evidence, and the host-native Turbopack limitation after implementation.

Revision note (2026-10-23): Corrected plan fidelity after review remediation: recorded the actual source helper path, actual enabled-webhook empty-database verification, UTC timestamps, synchronized Preview credentials, deferred email validation until administrator creation is required, and successful invalid-email/no-password startup verification.

Revision note (2026-10-23): Coordinator recorded final independent approval, the two resolved findings and one remediation cycle, accepted isolated frontend build evidence, and the remaining operator migration note. No implementation scope or validation claims changed.

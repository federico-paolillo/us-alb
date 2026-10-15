# Add a distroless standalone frontend image

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this task, an operator can build the Next.js frontend as a small, production-ready container and run it as an unprivileged process with a read-only root filesystem. The runtime image contains the Next.js standalone server and its traced dependencies rather than the full source tree or build toolchain. Its only writable locations are ephemeral mounts for Next.js runtime caches and temporary files.

The same image supports two runtime configuration styles. Operators can set ordinary container environment variables, or mount a Docker Compose secret containing dotenv-formatted entries at `/run/secrets/frontend.env`. The image exposes that secret to Next.js through a read-only `/app/.env` symlink, so Next.js performs the loading and direct environment variables retain their normal higher precedence. The feature is observable by building the image, running it with Docker's `--read-only` flag and nonroot user, serving a CMS-backed page and optimized image through a task-owned mock CMS, invalidating cached data through `/refresh`, and repeating configuration checks with direct variables, the mounted dotenv secret, and both together.

Caddy, HTTPS, a Compose topology, backend runtime changes, content types, and deployment configuration are outside this task. The frontend remains the existing SSR + ISR application with Cache Components and webhook-driven revalidation.

## Progress

- [x] (2026-10-15 19:15Z) Read root and frontend `AGENTS.md`, all of `.agents/docs/PLANS.md`, the backend image blueprint, current frontend configuration and runtime environment validation, relevant installed Next.js 16.3.1 standalone/self-hosting/env/cache implementation and documentation, Mise tasks, tests, and the branch/worktree state.
- [x] (2026-10-15 19:15Z) Confirmed `main` and `origin/main` are both `78ac6345eb1c296a625deaaeb77238cad9fcdf3b`; preserved unrelated deleted `PLAN2.md` and `TODOS2.md` plus the unrelated untracked empty `compose.yml`; accepted the untracked five-byte `frontend/Dockerfile` placeholder as task-owned.
- [x] (2026-10-15 19:15Z) Fixed the image layout, build/runtime configuration contract, secret symlink behavior, writable mount policy, focused container integration boundary, canonical validation, recovery procedure, and exclusions in this ExecPlan. No implementation file was edited.
- [x] (2026-10-15 19:42Z) Reconciled plan review: separated native host-build output from Docker packaging, verified the pinned distroless entrypoint as `/nodejs/bin/node`, removed Dockerfile `VOLUME` declarations and duplicate canonical runs, and confirmed the exact mock CMS endpoints reached by sitemap and Notizie rendering.
- [x] (2026-10-15 19:39Z) Enabled standalone output and added the distroless, root-owned, nonroot frontend image plus Docker context exclusions. The runtime copies only the prepared standalone tree, defaults to port 65100, has no `VOLUME`, and exposes the optional native dotenv secret through `/app/.env -> /run/secrets/frontend.env`.
- [x] (2026-10-15 19:39Z) Added and passed the focused Node container integration test. It verifies direct, secret-only, and precedence configuration; missing configuration diagnostics; standalone assets; nonroot immutable image data; image optimization/cache writes; cache reuse and news-tag revalidation; image configuration; and task-resource cleanup under a read-only root.
- [x] (2026-10-15 19:39Z) Refreshed OpenAPI artifacts, completed frontend checks/unit tests/container integration/scope checks, and completed the supported host build with `mise run fe:build -- -- --webpack` after the default Turbopack host worker reproducibly failed to bind its internal port. The default Linux Docker image build remains Turbopack and passes; no production script or Next configuration workaround was added.
- [x] (2026-10-15 19:39Z) Remediated independent review feedback by correcting the final frontend source guard to exclude the two permitted generated OpenAPI artifacts. The corrected guard and `git diff --check` pass with the native timestamp-only schema changes present.
- [x] (2026-10-15 19:48Z) Independent review approved after one documentation-only remediation. No findings remain; coordinator finalized review bookkeeping for delivery on `main`.

## Surprises & Discoveries

- Observation: `frontend/Dockerfile` is not tracked and contains only the incomplete text `FROM `.
  Evidence: `git ls-files --error-unmatch frontend/Dockerfile` fails, while `xxd -g 1 frontend/Dockerfile` reports five bytes. Replacing this placeholder is explicitly part of the task; the other pre-existing worktree changes are unrelated and must remain untouched.
- Observation: there is currently no `frontend/public/` directory, although standalone deployments must include it when it exists.
  Evidence: `find frontend/public` reports that the path does not exist. The build must therefore copy `public/` into the standalone tree conditionally rather than using an unconditional Docker `COPY public/`, which would fail today. `.next/static/` always exists after a successful build and must be copied unconditionally.
- Observation: the generated standalone `server.js` reads `PORT` and `HOSTNAME` before it starts Next.js, then changes the working directory to its own directory. Next's server constructor subsequently calls `loadEnvConfig(this.dir, false)`, whose production search ends with `.env`; pre-existing process variables are not replaced by file values.
  Evidence: installed `frontend/node_modules/next/dist/build/utils.js` emits `process.chdir(__dirname)`, then reads `process.env.PORT` and `process.env.HOSTNAME`; installed `next/dist/server/base-server.js`, `next-server.js`, and `@next/env` show `/app` env loading and direct-variable precedence. Thus `/app/.env -> /run/secrets/frontend.env` works for application variables without a Node env-file flag, but `PORT` and `HOSTNAME` must remain image defaults or direct environment overrides.
- Observation: not every runtime value has the same mutability. `NEXT_PUBLIC_APP_VERSION` is compiled into browser/server output. `CMS_MEDIA_URL` is serialized into the `next/image` remote allowlist from `next.config.ts`. Static artifacts such as `robots.txt` can capture `SITE_URL` at build time, while dynamically rendered server code can read server-only variables at runtime.
  Evidence: installed Next.js self-hosting documentation states that `NEXT_PUBLIC_` variables are inlined during `next build`; current `next.config.ts` constructs `images.remotePatterns` from `CMS_MEDIA_URL`; the current prerender manifest classifies `/robots.txt` as static and `/sitemap.xml` as runtime-rendered. Builds therefore expose the three approved build arguments, and deployments must build them for the intended public/media origin even though the dotenv secret also supplies server runtime configuration.
- Observation: application configuration validation is module-based, so a standalone server can begin listening before a route imports `frontend/config.ts`.
  Evidence: `config.ts` calls `makeConfig()` at module evaluation, but standalone startup itself does not import the application route modules eagerly. Missing required application variables must be proven to reject a dynamic request and emit the existing named-variable error; the plan does not falsely require the process always to exit before listening.
- Observation: the current site uses Partial Prerendering with cached CMS reads and runtime image optimization. Next stores fetch/image caches beneath `.next/cache`, while built route shells and server modules live beneath `.next/server/app`.
  Evidence: the prerender manifest classifies CMS-backed routes as `PARTIALLY_STATIC`; `cms/data.ts` uses `"use cache"`, `cacheLife`, and cache tags; installed Next.js writes fetch cache to `.next/cache/fetch-cache` and optimized images to `.next/cache/images`. The built shell must stay immutable. The container integration test is the acceptance proof that normal requests and tag revalidation do not require writes outside `/app/.next/cache` and `/tmp`; do not add a custom cache handler or broaden writable application paths preemptively.
- Observation: the pinned distroless Node image entrypoint is `/nodejs/bin/node`, not `/nodejs`.
  Evidence: both locally built backend images that inherit the exact pinned runtime report `Entrypoint=["/nodejs/bin/node"]`, `User="nonroot"`, and `WorkingDir="/strapi"` through `docker image inspect`. Frontend image inspection and `docker exec` checks must use the inspected `/nodejs/bin/node` path.
- Observation: native `next build` and Docker packaging have different outputs.
  Evidence: Next's standalone build creates `.next/standalone/server.js` and its traced tree but deliberately omits `.next/static`, `public`, the runtime cache mountpoint, and the `/app/.env` secret symlink. The Docker build stage performs those packaging additions. Host-build validation must check only native standalone output; packaged assets and the symlink must be inspected in the built image. Do not add a `postbuild` script to blur this boundary.
- Observation: the selected runtime checks require only three mock CMS collection endpoints.
  Evidence: `frontend/app/sitemap.ts` calls `listNews()`, while `frontend/app/(content)/notizie/page.tsx` calls `listNews()`, `listCalendarEntries()`, and `listOfficialDocuments()`. The root layout and shared header/footer/navigation read configuration and static presentation only; they make no CMS request. The mock therefore owns `/api/news`, `/api/calendar-entries`, and `/api/official-documents` plus its media/count endpoints, and should not duplicate unrelated application data.
- Observation: Next.js's image optimizer rejects the unique-network alias because it resolves to a private Docker address while `images.dangerouslyAllowLocalIP` remains correctly disabled.
  Evidence: an optimizer request to `http://mock-cms:65101/media/test.png` logged `hostname resolved to private IP ["172.18.0.2"]` and returned HTTP 400. The production image configuration remained unchanged; the test builds for `http://localhost:65101` and runs an additional task-owned mock in the combined frontend container's network namespace for the optimizer only.
- Observation: the native host frontend build currently fails independently of the implementation, while the same source builds and runs in the Linux Docker builder.
  Evidence: after `mise run fe:check` and `npm test` passed, two explicit dummy-config `mise run fe:build` attempts failed at `/sitemap.xml/route` with Turbopack `creating new process` then `binding to a port` and `Operation not permitted`. The supported `mise run fe:build -- -- --webpack` variant then passed: it compiled in 8.1 seconds, completed TypeScript in 6.3 seconds, generated 12 of 12 static pages, and produced `.next/standalone/server.js`. Docker image builds and the complete `npm run test:container` integration remain Turbopack and pass.

## Decision Log

- Decision: use the exact digest-pinned Node 24.20.0 Debian 13 builder and distroless Node 24 Debian 13 nonroot runtime already used by `backend/Dockerfile`.
  Rationale: this follows the repository blueprint, keeps backend/frontend Node families aligned, removes the shell and package manager from runtime, and makes the base inputs reproducible.
  Date/Author: 2026-10-15 / Planner
- Decision: set `output: "standalone"` in `frontend/next.config.ts` and run the generated `/app/server.js` directly through the distroless Node entrypoint.
  Rationale: Next.js output tracing provides the minimal server and exact runtime dependencies. `next start`, a copied source tree, Caddy, a custom Node server, and a shell wrapper would duplicate or bypass that supported path.
  Date/Author: 2026-10-15 / Planner
- Decision: stage only `.next/standalone`, `.next/static`, and `public/` when present into the runtime root, with every application path owned by root and non-writable.
  Rationale: the nonroot process needs read access to traced code and static assets but no ability to mutate them. The build toolchain, source modules, tests, local dotenv files, and full dependency tree do not belong in the production image.
  Date/Author: 2026-10-15 / Planner
- Decision: create `/app/.env` as a dangling-capable symlink to `/run/secrets/frontend.env`, use Next.js native dotenv loading, and add no Node `--env-file` option, parser, wrapper, or `_FILE` variables.
  Rationale: Next already owns env-file parsing and preserves direct environment precedence. When the Compose secret is absent, the dangling symlink is treated like a missing `.env`; when present and readable by `nonroot`, it supplies the same server variables without copying credentials into an image layer.
  Date/Author: 2026-10-15 / Planner
- Decision: keep `HOSTNAME=0.0.0.0`, `PORT=65100`, and `NODE_ENV=production` as image environment defaults; operators override host/port only with direct variables.
  Rationale: standalone startup consumes host/port before Next loads `/app/.env`. Port 65100 is in the repository's required 65100–65199 range.
  Date/Author: 2026-10-15 / Planner
- Decision: expose build arguments `CMS_MEDIA_URL`, `SITE_URL`, and `NEXT_PUBLIC_APP_VERSION` with the exact development defaults from `frontend/.env.example`; scope dummy values for other required application secrets and `CMS_URL` only to the `npm run build` instruction.
  Rationale: these three values affect build output, while the remaining values are needed only because current application configuration validates imports during compilation. Dummy build values must never become runtime `ENV` declarations or files, and the build must perform no CMS request.
  Date/Author: 2026-10-15 / Planner
- Decision: reserve only `/app/.next/cache` and `/tmp` as documented writable runtime mountpoints, omit Dockerfile `VOLUME` declarations, and validate explicit tmpfs mounts under Docker `--read-only`.
  Rationale: these are the narrow runtime cache/temporary boundaries identified by the installed Next.js implementation. Explicit caller-provided tmpfs mounts guarantee ephemeral behavior, whereas `VOLUME` can create anonymous persistent volumes. Compiled pages, standalone modules, and assets remain application data and must be immutable. A custom cache handler or writable `.next/server` tree would change architecture and is not authorized.
  Date/Author: 2026-10-15 / Planner
- Decision: add a separate Node-standard-library container integration test and a tiny mock CMS fixture, invoked by `npm run test:container`, rather than placing Docker startup in Vitest.
  Rationale: repository unit tests must not start external processes. This behavior crosses the image, filesystem, network, Next cache, optimizer, and webhook boundaries, so one focused integration test is the lowest boundary that proves it. It needs no new package dependency, no browser, no fixed host port, and no prestarted stack.
  Date/Author: 2026-10-15 / Planner
- Decision: run `mise run be:openapi` followed by `mise run fe:openapi`, but do not run `be:types` or add backend tests.
  Rationale: root `AGENTS.md` requires both API artifact refreshes after any frontend change and reserves backend type generation for backend type changes. This task changes no backend source, schema, or generated backend type.
  Date/Author: 2026-10-15 / Planner
- Decision: keep Next's private-network image protection enabled and use a second instance of the same minimal mock fixture in the combined frontend container's network namespace for optimizer validation.
  Rationale: the production configuration already permits loopback media origins when built for them, while Docker network aliases resolve to private addresses that Next correctly rejects. The primary mock remains isolated on the task-owned network for API caching/count assertions; the sidecar is only a test transport arrangement and publishes no host port.
  Date/Author: 2026-10-15 / Worker
- Decision: validate the host production build with Next's supported `--webpack` CLI forwarding when this host's Turbopack worker cannot bind its internal port, while retaining default Turbopack validation in the Linux Docker image build and container integration test.
  Rationale: the same application source and explicit build configuration complete under the supported build engine, and the image’s default build continues to prove the production Turbopack path. Changing package scripts or Next configuration to mask a host-only worker restriction would expand scope and alter normal production behavior.
  Date/Author: 2026-10-15 / Coordinator and Worker

## Outcomes & Retrospective

Implementation and independent review are complete with no unresolved findings. `mise run fe:check` passed, `npm test` passed 10 files and 80 tests, and `npm run test:container` passed its one integration test in 5.5 seconds after the final harness diagnostics update. The supported Webpack host build passed with explicit dummy configuration. The generated schema files contain only 41 `publishedAt.default` timestamp updates each. Default Turbopack host builds retain the recorded worker-port limitation, while both default-argument and explicit-argument Linux Docker builds pass using Turbopack. The reviewer accepted this build coverage and verified the one source-guard documentation correction. The additional default-argument image was `sha256:1df517b3771a0921cb4fb33d46055f8f90bfedf3901b8e8c3158111119523bb7`; its task-owned tag and image were removed after validation. Unrelated workspace changes remain preserved.

## Context and Orientation

The repository root is `/Users/federico.paolillo/src/us-alb`. `backend/` contains Strapi 5 and `frontend/` contains Next.js 16.3.1. The active branch must remain `main`. At the planning baseline, `HEAD` and `origin/main` both point to `78ac6345eb1c296a625deaaeb77238cad9fcdf3b`. Before this plan, `PLAN2.md` and `TODOS2.md` were already deleted, `compose.yml` was an unrelated empty untracked file, and `frontend/Dockerfile` was an untracked five-byte placeholder. Preserve the deleted files and `compose.yml` exactly; the Dockerfile is the only pre-existing untracked path owned by this task.

`backend/Dockerfile` is the container blueprint. Its builder is `node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608`, and its runtime is `gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e`. Inspection of backend images built from that runtime shows the Node entrypoint is `/nodejs/bin/node`. Distroless means the runtime contains the language runtime and required operating-system libraries but no general shell or package manager. Rootless here means the application process runs as the image's `nonroot` user, while root ownership of files prevents that user from changing application data.

`frontend/next.config.ts` currently enables Cache Components, partial prefetching, typed routes, typed env declarations, and an image allowlist derived from `CMS_MEDIA_URL`. Add standalone output without changing any of those settings. “Standalone output” is Next.js's `.next/standalone/` tree: it contains a generated `server.js`, selected `node_modules`, and traced runtime files. Next deliberately omits `public/` and `.next/static/`, so the Docker build must add those to the standalone tree before the runtime-stage copy. There is no current `frontend/public/`; support it conditionally for future assets.

`frontend/config.ts` owns application env validation. It requires `CMS_URL`, `CMS_MEDIA_URL`, `CMS_WEBHOOKS_SECRET_HEADER`, `CMS_WEBHOOKS_SECRET_HEADER_VALUE`, `PREVIEW_SECRET`, and `SITE_URL`; `CMS_API_TOKEN` is optional. `NEXT_PUBLIC_APP_VERSION` is displayed in the footer and defaults in presentation only, but the production image must build it explicitly because `NEXT_PUBLIC_` values are compiled. Keep this validation authoritative. Do not add a second configuration module, dotenv parser, startup wrapper, or placeholder runtime credential.

`frontend/cms/data.ts` owns the current `"use cache"` reads and applies tags such as `news`; `frontend/app/refresh/route.ts` authenticates the configured webhook header and calls `revalidateTag`; `next/image` performs runtime media optimization. The integration test must exercise these existing paths rather than adding test seams to production code. `frontend/app/(content)/notizie/page.tsx` is a convenient public route because a mock can return empty arrays for `/api/news`, `/api/calendar-entries`, and `/api/official-documents` and the page still renders its existing empty states. `frontend/app/sitemap.ts` calls `connection()` and `listNews()`, so `/api/news` also supports every configuration scenario that requests the sitemap. The root layout and shared site chrome make no CMS request. A mock PNG served outside `/api` provides the optimizer proof.

`mise.toml` defines `fe:build`, `fe:check`, `be:openapi`, and `fe:openapi`; the full frontend unit suite is `cd frontend && npm test`. `frontend/package.json` has no container integration command today. Add `test:container` for the new Node integration test without adding a dependency or changing `package-lock.json` merely for a script entry.

## Plan of Work

### Milestone 1: Produce the immutable standalone image

In `frontend/next.config.ts`, add `output: "standalone"` to the existing `NextConfig` object. Preserve Cache Components, partial prefetching, typed routes, typed env behavior, image validation, SSR + ISR, and every route. Do not add static export, `generateStaticParams`, a cache handler, or any Caddy setting.

Replace the task-owned `frontend/Dockerfile` placeholder with a Dockerfile using the modern Dockerfile syntax and two stages. Name the first stage `build`, use the exact pinned Node builder from `backend/Dockerfile`, set `/app` as its working directory, copy `package.json` and `package-lock.json` first, and run `npm ci --include=dev` with a BuildKit cache mount at `/root/.npm`. Build dependencies are required for TypeScript, PostCSS/Tailwind, and Next compilation even though the runtime is production. After dependency installation, copy the pruned frontend context into `/app`.

Declare these build arguments with defaults matching `frontend/.env.example` exactly:

    CMS_MEDIA_URL=http://127.0.0.1:1337
    SITE_URL=http://localhost:3000
    NEXT_PUBLIC_APP_VERSION=development

Run `npm run build` with those three argument values exported only for that instruction. On the same instruction, provide non-secret, unmistakably dummy build-only values for `CMS_URL`, `CMS_WEBHOOKS_SECRET_HEADER`, `CMS_WEBHOOKS_SECRET_HEADER_VALUE`, and `PREVIEW_SECRET`; omit optional `CMS_API_TOKEN`. Use an allowed local placeholder such as `CMS_URL=http://127.0.0.1:65101/api`. Do not declare any dummy credential with `ENV`, write it to a file, or copy it forward. The build must succeed with nothing listening at the placeholder CMS URL, proving the existing request-time architecture does not fetch CMS content during compilation.

After the build, prepare the exact runtime tree inside `.next/standalone`: copy `.next/static/` to `.next/standalone/.next/static/`; if `public/` exists, copy it to `.next/standalone/public/`; create the empty mount point `.next/standalone/.next/cache/`; and create the symlink `.next/standalone/.env` whose target is the absolute path `/run/secrets/frontend.env`. Fail the build for a missing `.next/static` or standalone server. The conditional public copy is the only missing-input exception.

Use the exact pinned distroless runtime from `backend/Dockerfile`. Set `NODE_ENV=production`, `NPM_CONFIG_LOGLEVEL=info`, `HOSTNAME=0.0.0.0`, and `PORT=65100`; set `WORKDIR /app`; copy only the prepared standalone tree from the build stage into `/app` with root ownership and non-writable/read-executable permissions, following the backend Dockerfile's `--chown=0:0 --chmod=555` model. State `USER nonroot`, expose port 65100, and set `CMD ["/app/server.js"]`. The distroless Node image already supplies the inspected `/nodejs/bin/node` entrypoint, so do not mention `node` in `CMD` and do not add an entrypoint or shell. Do not declare Dockerfile `VOLUME` entries: deployments must choose explicit ephemeral mounts rather than receive anonymous volumes.

Add a short Dockerfile comment near the runtime configuration that records the runtime contract: run with a read-only root and provide explicit writable tmpfs mounts for `/app/.next/cache` and `/tmp`; optionally mount a nonroot-readable dotenv secret at `/run/secrets/frontend.env`; pass host/port directly rather than in that file. Do not claim that a Dockerfile can enforce the caller's `--read-only` setting, and do not declare persistent or anonymous volumes.

Create `frontend/.dockerignore`. Exclude `node_modules`, `.next`, `.test-build`, coverage/output/build directories, TypeScript build state, generated `next-env.d.ts`, debug/log files, editor/OS clutter, PEM material, and every local `.env*` file. Retain only `.env.example` as non-secret documentation if using a negated rule, but do not copy it explicitly in the Dockerfile and ensure it cannot reach the runtime stage. Exclude the container integration fixture directory from the build context because it runs on the host and is not an application dependency.

This milestone is complete when a native `docker build` succeeds without a CMS, image inspection reports `/nodejs/bin/node` as entrypoint, `/app/server.js` as command, `nonroot` as user, `/app` as working directory, port 65100, and no declared volumes; a one-off Node inspection inside the image sees `/app/.env` as the exact absolute symlink and `.next/static` as packaged content. The runtime tree must not contain source directories, local dotenv files, build tools, or an npm executable.

### Milestone 2: Prove configuration, caching, and read-only runtime behavior

Add `frontend/test/container/mock-cms.mjs` as a tiny Node HTTP fixture with no dependencies. It listens on `0.0.0.0:65101` inside its task-owned dependency container. Return `{ "data": [] }` with JSON content type for GET requests to `/api/news`, `/api/calendar-entries`, and `/api/official-documents`; these are the complete collection set reached by sitemap, Notizie metadata/page rendering, and the CMS-free shared layout. Serve a valid small PNG at `/media/test.png`; expose a test-only `/__counts` response that reports per-path request counts; and return 404 for everything else. Keep the fixture deterministic and free of credentials. Do not add Home/About/Activity payloads or duplicate application mapping logic. This file is test code, not a production endpoint.

Add `frontend/test/container-image.integration.mjs` using only `node:test`, `node:assert/strict`, `node:http` or global `fetch`, `node:child_process`, `node:fs`, `node:os`, and `node:path`. Invoke Docker with argument arrays, unique names/tags derived from the current process, and time-bounded polling. Create all temporary secret files beneath ignored `frontend/.test-build/`, use dummy values only, and clean containers, the network, the uniquely tagged test image, and temporary files in a `finally` block even after failure. Never stop, remove, or inspect by a broad name or label.

The integration test must create a unique Docker network and start the pinned Node 24 builder image as the mock CMS on that network with alias `mock-cms`, mounting only `mock-cms.mjs` read-only. Do not require or publish a mock host port. Build the frontend image from `frontend/Dockerfile` with `CMS_MEDIA_URL=http://localhost:65101`, a recognizable build `SITE_URL`, and a recognizable `NEXT_PUBLIC_APP_VERSION`; the mock need not be ready during this build. This proves the build has no CMS dependency. For the optimizer check only, start a second instance of the same mock fixture in the combined frontend container's network namespace, which makes that loopback address available without weakening Next's private-network protection.

Run frontend containers on the unique network and publish container port 65100 to a Docker-assigned ephemeral host port bound explicitly to `127.0.0.1`. Every serving scenario uses `--read-only`, drops all capabilities, enables no-new-privileges, and mounts tmpfs at `/app/.next/cache` and `/tmp` with mode 1777 so the image's nonroot user can write only there. Poll an HTTP endpoint rather than sleeping for a fixed duration. Capture logs on failure without printing configured secret values.

Cover these configuration scenarios:

1. Direct environment only: pass all required application variables with Docker `--env`, mount no secret, request `/sitemap.xml`, and assert it contains the direct `SITE_URL` origin.
2. Secret only: mount one dotenv file read-only at `/run/secrets/frontend.env`, pass no application variables directly, request `/sitemap.xml`, and assert it contains the secret file's `SITE_URL` origin. `HOSTNAME` and `PORT` continue to come from image defaults.
3. Combined precedence: mount a dotenv file with one `SITE_URL` and pass a different `SITE_URL` directly while the other required values come from the file; request `/sitemap.xml` and assert the direct value wins.
4. Missing required configuration: mount no secret and omit application variables, request a dynamic route, and assert it cannot serve successfully and logs the existing `Env. var. <name> is not set` diagnostic. Do not require a particular pre-listen exit timing.

Use the combined-precedence container for the full runtime check. Request `/notizie` and assert HTTP 200 plus its existing empty-state content. Extract one `/_next/static/` URL from the returned HTML and assert it returns HTTP 200. Assert the HTML contains the build-time app version. Start the loopback-network mock described above, then request `/_next/image` for `http://localhost:65101/media/test.png` with an allowed width/quality and an image-capable `Accept` header; assert HTTP 200 and an image content type, then use `/nodejs/bin/node` through `docker exec` to confirm the tmpfs-backed `/app/.next/cache/images` contains a generated entry.

Read the mock request counts after the first `/notizie`, request the same page again, and assert the three CMS endpoint counts do not increase. POST a valid `entry.update` webhook for model `news-item` to `/refresh` using the dummy configured `x-<header-name>` secret; assert HTTP 200 and the returned tags contain `news`. Request `/notizie` again and assert the news endpoint count increases while unrelated cached calendar/document counts do not. This proves existing Cache Components and tag revalidation work under the narrow writable-mount policy. If Next attempts to write outside `/app/.next/cache` or `/tmp`, treat that as a failed invariant and investigate the exact path; do not make `.next/server`, `/app`, or the root filesystem writable and do not add a cache handler without a plan revision.

Finally, inspect the image configuration and run one-off `/nodejs/bin/node -e` checks as the configured image user. Assert the entrypoint is `/nodejs/bin/node`, the user is `nonroot`, the volumes map is empty, `/app/.env` is a symlink to `/run/secrets/frontend.env`, packaged `/app/.next/static` exists, and `/app/server.js` is not writable by the process even without relying solely on the read-only-root flag. Assert `/app/app`, `/app/components`, `/app/next.config.ts`, and `/app/.env.example` are absent. Add `"test:container": "node --test test/container-image.integration.mjs"` to `frontend/package.json`; do not add the integration file to Vitest's unit run and do not alter dependencies.

This milestone is complete when `cd frontend && npm run test:container` passes from a clean Docker state without a prestarted project stack or fixed host port, leaves no task container/network/image/temp artifact, and proves every behavior above. It is an integration test, not a smoke, browser, end-to-end, or deployment test.

### Milestone 3: Refresh contracts and complete canonical validation

Run `mise run be:openapi` followed by `mise run fe:openapi` as required after a frontend change. Review `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`; never hand-edit them. No API shape is intended. Native generation-time `publishedAt.default` timestamp churn may be retained only when structural comparison proves the contract is otherwise unchanged. Do not run `be:types`, start Strapi for a backend test, or change any backend source.

After generation, run one consolidated canonical sequence: `mise run fe:check`, the complete frontend Vitest suite, one production frontend build with explicit dummy values and no CMS running, and the container integration test. The host build must prove only native `.next/standalone/server.js`; Docker image inspection and the integration test prove packaged `.next/static`, the cache mountpoint, and `/app/.env`. Do not add a `postbuild` script or repeat already-passing full gates unless a later change, failure, or unresolved concern justifies it. Then inspect the final repository diff and update every living section of this ExecPlan with exact output counts, image identity/configuration evidence, integration assertions, generated-artifact outcome, and any discovery. Leave task tracking, staging, commit, and push to the coordinator after independent approval.

## Concrete Steps

Run all commands from `/Users/federico.paolillo/src/us-alb` unless a command explicitly changes directory. Record and protect the starting state:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    git diff --check
    mise tasks

Expect `main`, matching revisions `78ac6345eb1c296a625deaaeb77238cad9fcdf3b`, unrelated deletions of `PLAN2.md` and `TODOS2.md`, unrelated untracked `compose.yml`, and task-owned untracked `frontend/Dockerfile` plus this plan. Do not switch branches, restore/delete unrelated files, stage, commit, or push as the Worker.

After implementation, refresh generated API artifacts in the mandated order and review them before running canonical validation:

    cd /Users/federico.paolillo/src/us-alb
    mise run be:openapi
    mise run fe:openapi
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts

Both commands must exit zero. Record whether the diff is empty or generator-native timestamp-only churn. A structural API change is a task failure to diagnose, not authority to edit schemas or generated contracts. Do not run `mise run be:types`.

Run the canonical frontend gates once after generation:

    cd /Users/federico.paolillo/src/us-alb
    mise run fe:check
    cd frontend
    npm test
    cd /Users/federico.paolillo/src/us-alb
    CMS_URL=http://127.0.0.1:65101/api \
      CMS_MEDIA_URL=http://127.0.0.1:65101 \
      CMS_WEBHOOKS_SECRET_HEADER=cms-revalidate \
      CMS_WEBHOOKS_SECRET_HEADER_VALUE=build-validation-placeholder \
      PREVIEW_SECRET=build-validation-placeholder \
      SITE_URL=http://localhost:65100 \
      NEXT_PUBLIC_APP_VERSION=container-validation \
      mise run fe:build
    test -f frontend/.next/standalone/server.js
    cd frontend
    npm run test:container

All commands must exit zero. The host build must complete without connecting to port 65101 and must create `frontend/.next/standalone/server.js`; do not expect it to copy `.next/static`, create the cache mountpoint, or create `.env` inside the standalone directory, and do not add a `postbuild` script. If the host’s default Turbopack worker fails only while binding its internal port, keep the failed evidence and rerun the same command with Next's supported forwarding syntax `mise run fe:build -- -- --webpack`; this changes neither package scripts nor production image behavior. `npm run test:container` owns Docker packaging validation and must prove that the built image contains `/app/.next/static`, `/app/.next/cache`, and the exact `/app/.env -> /run/secrets/frontend.env` symlink. Expect Biome, Next type generation, TypeScript checking, every existing Vitest file, and the focused Node integration suite to pass. The Vitest run starts no process and does not include `test/container-image.integration.mjs`. On integration failure, the test must print enough image/container logs to identify the invariant and still clean its uniquely named Docker resources. Do not run it against `compose.yml` or a prestarted backend/frontend. Record actual test totals and Docker integration duration rather than predicting them, and repeat a full gate only if a later edit or failure invalidates its result.

Finish with scope and artifact checks:

    cd /Users/federico.paolillo/src/us-alb
    rg -n 'output: "standalone"|cacheComponents|partialPrefetching|CMS_MEDIA_URL' frontend/next.config.ts
    rg -n 'node:24.20.0-trixie@sha256|gcr.io/distroless/nodejs24-debian13:nonroot@sha256|USER nonroot|PORT=65100|/run/secrets/frontend.env|/app/.next/cache|CMD' frontend/Dockerfile
    rg -n 'test:container' frontend/package.json
    git diff --exit-code -- backend/src backend/config backend/database backend/types
    git diff --exit-code -- frontend/app frontend/cms frontend/components frontend/config.ts frontend/deps.ts frontend/seo.ts ':(exclude)frontend/cms/schema.json' ':(exclude)frontend/cms/schema.d.ts'
    git diff --exit-code -- frontend/package-lock.json
    git status --short
    git diff --check

The searches must find the intended contracts. The backend and source-only frontend diff guards must be silent: no backend source/schema/type, frontend route/data/presentation/config, lockfile, or application architecture changes are needed. The frontend source guard explicitly excludes `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`, which may differ only because the required generators ran. Final task changes are limited to this ExecPlan, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/next.config.ts`, `frontend/package.json`, `frontend/test/container/mock-cms.mjs`, `frontend/test/container-image.integration.mjs`, and generator-native OpenAPI output if any. Unrelated `PLAN2.md`, `TODOS2.md`, and `compose.yml` remain exactly as found.

## Validation and Acceptance

Acceptance is the following observable behavior:

1. `docker build` uses the exact pinned Node 24 builder and distroless nonroot runtime, installs build dependencies, completes with no reachable CMS, and produces a runtime image whose configured entrypoint is `/nodejs/bin/node`, command is `/app/server.js`, user is `nonroot`, working directory is `/app`, exposed/default listener is `0.0.0.0:65100`, and volumes map is empty.
2. The runtime contains the Next standalone trace plus `.next/static` and conditional `public`, but no frontend source directories, builder tooling, local dotenv/example file, or full development dependency tree. Root owns application files and the configured process cannot write `/app/server.js`.
3. Running with `--read-only` plus explicit writable tmpfs only at `/app/.next/cache` and `/tmp` serves a CMS-backed Partial Prerendered page, a hashed static asset, and an optimized remote image. The cache mount receives the optimized image; no application path outside the two mounts requires a write, and the image declares no `VOLUME` that could create an anonymous persistent volume.
4. `/app/.env` is a symlink to `/run/secrets/frontend.env`. With no mounted target, direct environment configuration works. With a nonroot-readable dotenv secret mounted at the target, native Next.js loading supplies required application variables. With both, a direct variable wins over the file value. No Node env-file flag, wrapper, parser, `_FILE` convention, or runtime placeholder secret exists.
5. `HOSTNAME` and `PORT` work from image defaults and direct overrides only. Putting them in the secret is not part of the contract because standalone `server.js` reads them before Next loads dotenv files.
6. Build arguments default to the three values documented in `frontend/.env.example`. A build-specific version appears in rendered output; the build-specific media origin controls the `next/image` allowlist; runtime server configuration comes from direct env or the secret where rendering is dynamic. Operators are not promised that runtime values can replace build-captured public/static settings.
7. Two identical `/notizie` requests reuse cached empty mock CMS collections. An authenticated news webhook returns the `news` tag, and the following request refetches news without refetching unrelated calendar/document collections. This succeeds on the read-only root with the narrow cache mount and no custom cache handler.
8. Missing required application configuration cannot serve a dynamic application request and retains the existing secret-free named-variable diagnostic. The test does not overstate when route-module validation occurs relative to the listener starting.
9. `npm run test:container` provisions and cleans only task-owned Docker resources, binds the frontend's ephemeral published host port explicitly to `127.0.0.1`, requires no fixed host port or prestarted stack, and uses no browser. The normal Vitest suite remains process-free.
10. `mise run be:openapi`, `mise run fe:openapi`, `mise run fe:check`, the complete `npm test`, the explicit dummy-config `mise run fe:build`, and `npm run test:container` all pass. Any generated API diff is native and structurally unchanged. No backend test, browser test, smoke test, end-to-end test, deployment test, Caddy image, Compose file, HTTPS configuration, content-type change, Strapi upgrade, environment mutation, system change, commit, or push is part of this implementation.

## Risks and Constraints

The main operational risk is confusing build-time and runtime variables. `NEXT_PUBLIC_APP_VERSION` cannot be changed after compilation; `CMS_MEDIA_URL` determines the built optimizer allowlist; and statically emitted metadata routes can capture `SITE_URL`. The Dockerfile comments and integration assertions must make this boundary concrete. Deployments should pass build arguments for the intended media/public origin and use matching runtime values rather than assuming one generic image can safely change every setting.

The main filesystem risk is Next.js attempting to persist a regenerated route outside `.next/cache`. Current route classification and code inspection indicate the immutable Partial Prerender shell plus runtime cached reads should use the permitted cache path, but only the read-only integration test proves this for the pinned version. A failure must identify the attempted path and return for a bounded plan revision; weakening the read-only contract or introducing a new cache architecture is outside current authority.

The secret symlink intentionally allows an absent target. Docker Compose implementations mount secrets as files under `/run/secrets`, commonly root-owned and world-readable. If an operator applies a stricter mode or UID mapping, the file must still be readable by the distroless `nonroot` process. The image must never chmod, copy, log, or rewrite the mounted secret.

The integration test uses Docker and may pull pinned base images, so it requires a working Docker daemon and network access for uncached images. It must use unique resource names and cleanup so concurrent runs do not collide. It must never touch the unrelated empty `compose.yml` or depend on the user's local `.env`.

## Idempotence and Recovery

All source edits are ordinary, repeatable frontend/Docker/test changes. Before resuming, inspect `git status` and this plan's `Progress`; do not recreate files or overwrite newer task work. `npm ci`, Next builds, image builds, tests, and OpenAPI generation are repeatable. Build caches and `.next` are ignored artifacts.

The integration script owns only resources with its unique run identifier. Its `finally` cleanup must use exact container, network, image-tag, and temporary-directory names. On interruption, list Docker resources by that exact identifier before removing only those resources. Never use a broad prune, wildcard removal, repository deletion, `git reset --hard`, or `git checkout --` as recovery.

If image construction fails, fix the task-owned Dockerfile or context exclusions and rebuild. Do not copy local `.env`, `node_modules`, or `.next` into the context to bypass a missing build value. If the secret-only scenario fails, inspect the symlink, mount readability, working directory, and Next logs; do not add a shell or Node env-file flag unless the installed Next behavior has materially changed and this plan is revised.

If required API generation changes the contract structurally, stop and diagnose the generator/environment. Do not hand-edit `schema.json` or `schema.d.ts`, change backend schemas, run `be:types`, or start backend test work. If canonical validation fails, repair only task-owned files, rerun the smallest failing check, then repeat the complete final sequence.

Never alter machine or user environment variables. Use command-scoped dummy variables and repository-local ignored artifacts only. Preserve unrelated `PLAN2.md`, `TODOS2.md`, and `compose.yml` changes throughout.

## Artifacts and Notes

The expected implementation diff is limited to this ExecPlan, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/next.config.ts`, `frontend/package.json`, `frontend/test/container/mock-cms.mjs`, and `frontend/test/container-image.integration.mjs`. `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` may also change only as native outputs of the mandated OpenAPI refresh. `frontend/package-lock.json` should not change because the package script adds no dependency.

During implementation, record concise evidence here: image ID and configuration fields; runtime top-level file inventory; `/app/.env` link target; nonroot/non-writable checks; direct, secret-only, combined-precedence, and missing-config outcomes; `/notizie`, static asset, optimized image, cache-count, and revalidation results; confirmation that no write escaped the two tmpfs mounts; generated-artifact comparison; actual unit/integration counts; final build route classification; and exact cleanup/scope results. Do not paste secrets, complete image logs, complete generated contracts, or large build transcripts.

## Interfaces and Dependencies

The new build interface is:

    docker build \
      --build-arg CMS_MEDIA_URL=<public CMS media origin> \
      --build-arg SITE_URL=<canonical public site origin> \
      --build-arg NEXT_PUBLIC_APP_VERSION=<release identifier> \
      -t <image> frontend

All three arguments have development defaults from `frontend/.env.example`. They are not secret inputs. `CMS_MEDIA_URL` must be a URL accepted by the existing `next.config.ts`; it fixes the optimized-image origin in the compiled Next configuration. `NEXT_PUBLIC_APP_VERSION` is compiled and displayed in the existing footer. `SITE_URL` supplies build-time static metadata and should match the runtime canonical origin.

The new runtime interface is the existing application env contract from `frontend/config.ts`, supplied either directly or through the optional file `/run/secrets/frontend.env`. Direct values take precedence. The image adds these container defaults/interfaces:

    NODE_ENV=production
    HOSTNAME=0.0.0.0
    PORT=65100
    /app/.env -> /run/secrets/frontend.env
    writable ephemeral: /app/.next/cache, /tmp
    entrypoint: /nodejs/bin/node
    command: /app/server.js

The dotenv secret uses ordinary `KEY=value` lines for `CMS_URL`, `CMS_MEDIA_URL`, optional `CMS_API_TOKEN`, `CMS_WEBHOOKS_SECRET_HEADER`, `CMS_WEBHOOKS_SECRET_HEADER_VALUE`, `PREVIEW_SECRET`, and `SITE_URL`. It may contain `NEXT_PUBLIC_APP_VERSION`, but that cannot replace the compiled release identifier and should not be advertised as a runtime override. It must not be used for `HOSTNAME` or `PORT` because startup reads those first. Compose syntax itself is deliberately not added in this task.

The only new developer command is:

    cd frontend && npm run test:container

It uses the installed Node 24 standard library and the Docker CLI/daemon. It adds no runtime or development package dependency. The task-owned mock uses the same pinned Node builder image only as an integration dependency. Production remains Next.js on the pinned distroless Node runtime; Caddy is not built or shipped.

Revision note (2026-10-15, Planner): Created the initial self-contained ExecPlan from the approved design and current `main` baseline. It fixes the standalone image contents, optional native dotenv secret path, build/runtime variable boundary, immutable/writable filesystem split, reproducible container integration test, API refresh, canonical validation, recovery rules, and explicit Caddy/Compose/backend exclusions so implementation does not defer material choices to the Worker.

Revision note (2026-10-15, Planner): Revised the plan after review to keep host `next build` validation limited to native standalone output; move static assets, the cache directory, and env symlink checks to the Docker image; use the inspected `/nodejs/bin/node` entrypoint; omit `VOLUME` declarations in favor of explicit tmpfs mounts; consolidate canonical validation after generation; and constrain the mock to the three endpoints actually reached by sitemap and Notizie rendering.

Revision note (2026-10-15, Worker): Recorded implemented image/test behavior, the bounded loopback mock sidecar needed to retain Next's private-network image protection, timestamp-only generated OpenAPI churn, passing image/unit/frontend-check evidence, and the reproducible host-only Turbopack worker limitation. The supported Webpack host-build variant passed without changing production scripts or configuration; the Linux image continues to validate the default Turbopack path.

Revision note (2026-10-15, Worker): Remediated the independent-review scope-check finding. The documented frontend source guard now excludes only the two allowed generator-owned OpenAPI artifacts, so it remains meaningful while their native timestamp-only changes are present.

Revision note (2026-10-15, Coordinator): Recorded final independent approval, closed review progress, and finalized the outcome with the reviewer-accepted default-argument Docker build and cleanup evidence. One documentation-only remediation resolved the sole review finding; implementation scope and technical decisions are unchanged.

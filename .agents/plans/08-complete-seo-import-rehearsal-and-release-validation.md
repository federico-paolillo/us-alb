# Complete SEO, import rehearsal, and release validation

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A fresh Worker must be able to complete the final queue item using only this file and the current working tree.

## Purpose / Big Picture

After this work, every published U.S. Albatese page has concise Italian search metadata, one exact canonical URL, coherent Open Graph data, and a truthful CMS hero image where the route has one. Search engines receive a published-only sitemap, a robots policy that advertises that sitemap while excluding operational Preview and revalidation handlers, and one site-wide `Organization` JSON-LD record containing only safe identity facts. Draft previews retain the public canonical but explicitly say `noindex, nofollow`; genuine 404 pages remain localized and non-indexable.

The task is also the release-wide proof for the completed queue. A developer can start Strapi against a new empty database, import the approved demonstration archive into a different empty disposable database, run the built backend and production Next frontend on loopback, and inspect every published route at exactly 1600×900 and 412×914. The proof covers metadata, structured data, images and alternative text, internal links and anchors, PDFs, Preview/Draft Mode, webhook revalidation, localized 404 and dependency-error presentation, sitemap/robots, application version, public unauthenticated CMS reads, and the complete requirement surface in root `PLAN.md`.

This task preserves Next.js SSR plus ISR and the established raw Strapi client → mapper → connector → cached data → cache-tag/webhook pipeline. It adds no content type, field, seed record, dependency, `generateStaticParams`, static export, browser test file, backend test, deployment test, stock image, generated photograph, or parallel data path. The only new visual metadata asset is a small code-native SVG application icon derived from the already-approved abstract editorial mark; it is not a historical crest and uses neither `imagegen` nor `imagen`.

## Progress

- [x] (2026-10-08 21:54Z) Read root and frontend `AGENTS.md`, `.agents/docs/PLANS.md`, the complete `implement-task`, `canonical-validation`, and Playwright CLI skills plus session-management, running-code, and element-attribute references, `TODOS.md`, `PLAN.md`, `TYPES.md`, `design/DESIGN.md`, `design/HISTORY.md`, every task-01 through task-07 ExecPlan, and the current implementations they delivered.
- [x] (2026-10-08 21:54Z) Inspected every app route/layout/loading/error/not-found/metadata/Preview/refresh/sitemap/robots file, all page and shared-chrome image/link owners, CMS DTO/data/client/connector/cache-tag/Preview/webhook boundaries, backend Preview/webhook/database/server configuration, the task-02 archive contract, package scripts, Mise tasks, env examples, README/DEBT, and all tracked files for container, Compose, CI, release, image-build, archive-build, and validation configuration.
- [x] (2026-10-08 21:54Z) Attempted the required Context7 Next.js lookup for metadata, canonical, Open Graph, robots, sitemap, JSON-LD, Draft Mode, and request-time behavior; library resolution returned the monthly-quota error, so read the relevant installed official Next.js 16.3.1 documentation and source-backed conventions instead.
- [x] (2026-10-08 21:54Z) Defined the exact metadata copy and fallbacks, canonical paths, CMS Open Graph image ownership, safe Organization JSON-LD fields, sitemap and robots policy, Preview/404 indexing behavior, code-native icon, optional public CMS-token correction, focused test boundary, fresh-start/import/runtime procedure, every-route fixed-viewport audit, release-wide requirement audit, cleanup, and Coordinator-only local-commit/no-push completion duties in this ExecPlan. No implementation file, asset, task tracker, server, browser, index, branch, commit, or remote was changed by the Planner.
- [x] (2026-10-08 22:12Z) Implemented the pure shared SEO policy and seven focused unit cases, all five route-family metadata owners with request-time suspension, Preview robots override, one safe Organization JSON-LD record, encoded article paths, published sitemap/robots policy, code-native icon, and optional trimmed `CMS_API_TOKEN`; `mise run fe:format`, `npm test -- seo.test.ts` (1 file / 7 tests), and `git diff --check` passed.
- [x] (2026-10-08 22:14Z) Passed `be:build`, repeated native `be:openapi`/`fe:openapi`, `fe:check` (99 files), the full Vitest suite (8 files / 63 tests), and `fe:build`; all five CMS page families remain Partial Prerender, sitemap remains Dynamic, icon/robots remain Static, generated API diffs are exactly 68 native timestamp-default replacements in each artifact with no shape change, and every protected-scope/archive/architecture check passed.
- [x] (2026-10-08 22:38Z) Started Strapi from one absent disposable database, then imported the approved archive into a separate absent database: native import reported 55 entities, 112 links, and 43 assets. Archive inspection found 3 JSONL streams, 8 semantic originals, 32 responsive PNG derivatives, 3 PDF 1.4 files, no configuration stream/forbidden entity/credential key, and no match for 10 locally sourced secret-like values. The imported backend exposed the exact 1/1/1/3/6/3 resource counts and relations, all 8 original images and 3 PDFs, six Public `find` permissions, and zero admin/content users, transfer tokens, sessions, or webhooks without Authorization.
- [x] (2026-10-08 22:38Z) Built and started the production frontend with exact loopback origins and an empty CMS token; the isolated build made 0 CMS requests. After remediating Next image optimization for an explicitly configured loopback media host and repeating all canonical validation/builds, one fixed `task-08-release-audit` session passed the sitemap-derived seven routes at 1600×900 and 412×914, metadata/JSON-LD/images/links/PDFs, sitemap/robots/icon, both 404 forms, Preview enable/persist/exit, signed three-model revalidation, and intentional dependency outage/retry.
- [x] (2026-10-08 22:38Z) Walked all 12 Final Requirement Audit items against the actual tree and runtime evidence with no unresolved gap. Protected architecture/content/dependency scopes, archive identity, generated API shape, request-time route classification, and user-owned state remain intact. Runtime restoration/artifact removal is the only remaining Worker action before `WORK_READY`.
- [x] (2026-10-08 22:40Z) Closed only `task-08-release-audit`, stopped the exact frontend and restarted-backend process groups, restored `backend/public/uploads` to its original `.gitkeep`-only tree, and removed the disposable workspace plus all helpers/state/logs/screenshots/databases/import logs and task-created Playwright artifacts. Ports 65100/65101/65180, browser processes/sessions, and task workspaces are absent; ordinary DB inode/size/SHA-256 `4276133` / `1355776` / `d582f824066210afa6a4b8a32622f3155a106bf82407090685029f8a9dfc9986`, archive identity, uploads, ignored env files, lockfiles, index, branch, upstream, and unrelated image-tool directory all remain exact. Ready for independent review as `WORK_READY`.
- [x] (2026-10-08 23:45Z) Remediated independent review with the exact one-property production change `images.maximumRedirects: 0` beside the configured-host loopback exception. Repeated format/7 focused tests, backend build, both generators and shape comparison, 99-file check, all 63 tests, canonical and isolated no-token builds, distinct empty start, archive inspection/import/public API/media proof, direct-versus-redirect optimizer diagnostic, all fourteen exact viewport inspections, SEO/JSON-LD/link/PDF/404/Preview/revalidation/outage recovery, and the 12-item audit without a gap.
- [x] (2026-10-08 23:46Z) Closed only the remediation `task-08-release-audit` browser, stopped exact backend/frontend process groups, restored the original `.gitkeep`-only uploads tree, and removed all second-cycle helpers, state, logs, screenshots, import log, extracted archive, databases, workspace, and Playwright artifacts. Ports 65100/65101/65180 and browser processes are absent; ordinary DB inode/size/SHA-256 `4276133` / `1355776` / `ab2c512cf10c98f110f2032c798eefaad73a088e0b720a35a324658f054aa99c`, uploads, archive, ignored env files, packages/locks, index, branch, upstream, and unrelated image-tool directory remain exact. Remediation cycle 1 is ready for the same Reviewer as `WORK_READY`.
- [x] (2026-10-09 00:06Z) The same independent Reviewer approved remediation with no remaining findings after proving zero image redirects against 20 redirect combinations, direct archive-image optimization, all canonical/generated checks, separate empty/import databases, tokenless production runtime, all 14 exact route/viewport inspections, SEO/trust-boundary/error-recovery behavior, the 12-item final audit, and complete cleanup/source integrity.
- [x] (2026-10-09 00:08Z) Coordinator accepted `APPROVED`/`REVIEW_READY`, checked queue item 08, and prepared only the approved task-owned files for local commit `08 — Complete SEO, import rehearsal, and release validation`. No push is authorized; after the commit the Coordinator will produce the required Session Overview and close the queue/session.

## Surprises & Discoveries

- Observation: branch `main` starts task 08 at local commit `fe8ed36`, seven workflow commits ahead of `origin/main`; the approved commits are `2bcd098`, `4b1b731`, `28fec7a`, `97ae7b4`, `e918fff`, `f02a0f2`, and `fe8ed36`.
  Evidence: `git status --short --branch`, `git rev-list --left-right --count '@{upstream}...HEAD'`, and `git log --oneline -10` show `0 7` and the exact task-01 through task-07 commit sequence. The user explicitly requires no push, so this is not a blocker and grants no role permission to push.
- Observation: the sole unrelated worktree item is pre-existing untracked `.agents/skills/imagen/scripts/`.
  Evidence: initial `git status --short` reports only that directory. Task 08 must not read it as an input, modify it, format it, stage it, clean it, or include it in the commit.
- Observation: Context7 is unavailable before returning a Next.js library id.
  Evidence: `ctx7 library 'Next.js' '<full task-08 metadata question>'` returned `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` A future contributor may run `ctx7 login` or set `CONTEXT7_API_KEY`; this plan uses pinned installed official Next.js 16.3.1 docs, not remembered syntax or a web-search substitute.
- Observation: installed Next.js documentation confirms that static `metadata` and `generateMetadata` are Server Component APIs; `metadataBase` resolves relative canonical/Open Graph URLs; `sitemap.ts` and `robots.ts` are metadata route handlers; JSON-LD should be an ordinary `<script type="application/ld+json">` whose serialized `<` characters are escaped; and `notFound()` injects `noindex`.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, the `generate-metadata`, `sitemap`, `robots`, `not-found`, `io`, `connection`, and Draft Mode references, and `01-app/02-guides/json-ld.md` were read completely where relevant. Under Cache Components, `io()` is the preferred static-shell suspension point in page metadata functions; `connection()` remains correct for `sitemap.ts`, which must wait for a request.
- Observation: final SEO is currently incomplete. Root metadata defines only a title template and version; Home has no page metadata; Chi siamo and Attività have title only; Notizie has title/description only; news detail has title/description only; no route defines a canonical or Open Graph fields; and no JSON-LD exists.
  Evidence: `frontend/app/meta.ts`, all five content page route modules, `frontend/app/layout.tsx`, and repository-wide searches for `canonical`, `openGraph`, and `application/ld+json`.
- Observation: the currently approved CMS contract already supplies every needed Open Graph image. Home, About, Activity, and each article have a required `heroImage`; the Notizie hub can use the same first-featured-or-first lead policy already tested in `frontend/components/notizie/presentation.ts`.
  Evidence: `frontend/cms/model.ts`, mapper validation, page renderers, and task-02’s exact archive manifest. No schema, DTO, mapper, or seed change is needed.
- Observation: metadata must not copy the long-form non-sequiturs or ornate prose from seeded institutional content.
  Evidence: root `PLAN.md` requires concise, unambiguous SEO utility text and forbids ornate prose/non-sequiturs in metadata. Task 08 therefore uses fixed concise route descriptions and CMS data only for article title/summary and hero imagery.
- Observation: the mapper permits an empty image `alternativeText`, but the approved archive gives every one of its eight semantic image records a nonempty, truthful Italian placeholder description, and every current `<Image>` owner passes `image.alt` unchanged.
  Evidence: `frontend/cms/mappers.ts`, every page-specific media wrapper, the shared Blocks renderer, and task-02 archive evidence. This task audits the published payload and render tree; it does not add a second alt-text policy or make a content-model change.
- Observation: dynamic news links currently interpolate raw slugs while Preview already encodes one path segment.
  Evidence: `frontend/components/home/featured-news.tsx`, `frontend/components/notizie/news-section.tsx`, `frontend/app/sitemap.ts`, and `frontend/cms/preview.ts`. Centralizing `newsPath(slug)` prevents future legal-but-non-ASCII or space-containing slugs from producing inconsistent canonical, sitemap, and internal URLs.
- Observation: `CMS_API_TOKEN` is typed and documented as optional, and task 02 deliberately exports the minimum six Public `find` permissions, but `frontend/config.ts` currently calls the required-value reader and rejects an empty token.
  Evidence: `AppConfig.cmsApiToken: string | null`, `frontend/.env.example`, `makeCmsClient(... token: string | null)`, and the archive permission contract. Correcting empty/whitespace to `null` lets the final import rehearsal prove the intended public release path without decrypting or exposing a disposable token.
- Observation: repeated development inspections reported a browser-console 404 for the absent `/favicon.ico`.
  Evidence: task-03 through task-07 ExecPlans. A file-convention `frontend/app/icon.svg` based on the existing original abstract mark removes that error with code-native metadata and no raster generator.
- Observation: the sitemap already calls `await connection()` and lists the four top-level routes plus published news, but it interpolates raw slugs and has no explicit last-modified policy.
  Evidence: `frontend/app/sitemap.ts`. The DTO does not carry `updatedAt`; `editorialDate` is not guaranteed to be the last modification timestamp. The truthful policy is to omit `lastModified` for every entry rather than emit request time or mislabel an editorial date.
- Observation: `robots.ts` is CMS-independent and points to the configured sitemap, but it currently permits the operational `/preview` and `/refresh` handlers.
  Evidence: `frontend/app/robots.ts`. These routes have their own authentication, but they are not indexable content and should be explicitly disallowed while all public routes remain allowed.
- Observation: the repository contains no tracked Dockerfile, Compose file, container image script, CI workflow, deployment manifest, application release-archive task, or aggregate release-validation command.
  Evidence: complete tracked-file and filename/content searches. Do not invent Docker/Compose/image/release assembly merely to create a check. The applicable native release evidence is backend/frontend build, generated API artifacts, frontend tests/checks, fresh Strapi startup, the existing seed archive’s native import, and the required manual production-runtime inspection.
- Observation: the approved archive remains tracked at 636,008 bytes with SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`; ordinary uploads contain only `.gitkeep` before this task.
  Evidence: local `stat`, `sha256sum`, and upload listing. This identity and ordinary upload tree are release invariants.
- Observation: the first isolated production browser load returned HTTP 400 for four `/_next/image` requests even though the configured remote pattern exactly allowed `127.0.0.1:65100`.
  Evidence: Next.js 16.3.1 logged that the upstream hostname resolved to a private IP. `frontend/next.config.ts` allowed local IPs only when `NODE_ENV === "development"`, so the plan-required production `next start` could not render any CMS image from its loopback-only backend. The remote pattern and direct media requests were otherwise valid.
- Observation: the archive stores each asset as one binary plus one JSON metadata sidecar, so a raw non-JSONL file count is 86 while the native import correctly reports 43 assets.
  Evidence: corrected inspection separated 43 binary paths from 43 metadata paths and then reconfirmed 8 semantic originals, 32 responsive derivatives, and 3 PDFs. The initial combined count changed no state and import was not started until the boundary was understood.
- Observation: an early browser helper used stale illustrative article slugs rather than the three URLs emitted by the live sitemap; those requests correctly rendered the localized streamed 404 boundary with HTTP 200.
  Evidence: `/sitemap.xml` authoritatively emitted `atletica-tra-pista-e-sentieri`, `porte-aperte-calcio-giovanile`, and `la-stagione-2026-27-prende-forma`. The Worker discarded the stale-path evidence and repeated the complete desktop/mobile article, link, screenshot, metadata, Preview, and console proof against all three emitted URLs before the final audit.
- Observation: independent review found that the loopback-only `dangerouslyAllowLocalIP` exception remained paired with Next.js 16.3.1's default `images.maximumRedirects: 3`; Next follows those redirects without revalidating their destinations against `remotePatterns`.
  Evidence: Context7 library resolution again returned its monthly-quota error. The pinned installed official `image.md` says redirect destinations need not satisfy `remotePatterns`, documents the default of three, and prescribes `maximumRedirects: 0` to disable following. Installed `image-config.js` defaults to `3`, while `image-optimizer.js` recursively fetches the `Location` URL without another remote-pattern check. The approved archive exposes direct media URLs, so it requires no redirect allowance.
- Observation: the repository host has no standalone `sqlite3` CLI, discovered only after the second empty-start server had already reached readiness and stopped cleanly.
  Evidence: the attempted read-only count returned `sqlite3: command not found`. The Worker used the backend's already-installed `better-sqlite3` driver against that same disposable database, proved zero admin users/webhooks, and removed the empty-start workspace. No package, system configuration, database content, or durable helper changed.
- Observation: the running imported Strapi backend provides a natural same-origin redirect without any test fixture: `/` responds 302 to `/admin`, while archive media URLs are direct.
  Evidence: against the production Next artifact, `/_next/image` returned 200 `image/png` for the direct configured archive PNG and 508 for the matching-origin `/` redirect with `maximumRedirects: 0`. This directly proves the finding is closed without a test-only server, route, mock, or durable diagnostic file.

## Decision Log

- Decision: add one pure cross-cutting module `frontend/seo.ts` and one focused `frontend/seo.test.ts` rather than repeating canonical/Open Graph/JSON-LD/sitemap rules in five routes.
  Rationale: exact route metadata, encoded article paths, structured-data serialization, and sitemap construction are genuinely repeated nonvisual SEO policies. One owner makes them testable without creating a design system or another data pipeline.
  Date/Author: 2026-10-08 / Planner
- Decision: use these exact public titles and descriptions.
  Rationale: they are concise Italian utility copy, include U.S. Albatese and Albate/Como where useful, and contain no seeded non-sequitur.
  Date/Author: 2026-10-08 / Planner

  Home uses the absolute document/Open Graph title `U.S. Albatese (Como) — Calcio, atletica e comunità` and description `Polisportiva dilettantistica di Albate (Como): calcio, atletica e sport di comunità dal 1968.` Chi siamo uses short document title `Chi siamo`, branded Open Graph title `Chi siamo | U.S. Albatese`, and description `Storia, valori, persone e luoghi dell’U.S. Albatese, polisportiva di Albate (Como) dal 1968.` Attività uses `Attività sportive`, branded Open Graph title `Attività sportive | U.S. Albatese`, and description `Calcio, atletica e proposte sportive dell’U.S. Albatese per giovani, adulti e comunità di Albate.` Notizie uses `Notizie e calendario`, branded Open Graph title `Notizie e calendario | U.S. Albatese`, and the already-approved description `Notizie, risultati, appuntamenti e documenti ufficiali dell’U.S. Albatese.` A news detail uses the trimmed CMS title or `Notizia`, the trimmed summary or `Aggiornamento dall’U.S. Albatese.`, and a branded Open Graph title. The root title template remains `%s | U.S. Albatese` for non-Home pages.
- Decision: map canonicals exactly to `/`, `/chi-siamo`, `/attivita`, `/notizie`, and `/notizie/${encodeURIComponent(slug)}`, resolved to absolute URLs by root `metadataBase = config.siteUrl`.
  Rationale: these are the complete published routes. Query strings, fragments, Preview handlers, old English routes, and collection anchors are not independent canonical documents.
  Date/Author: 2026-10-08 / Planner
- Decision: use `type: "website"` for the four top-level Open Graph records and `type: "article"` for news details; every record includes `siteName: "U.S. Albatese"`, locale `it_IT`, exact canonical URL, exact title/description, and the owning CMS hero image when available.
  Rationale: Home/About/Activity own required heroes, Notizie can reuse its tested editorial lead, and article detail owns its required hero. Image metadata carries the absolute mapped URL, intrinsic width/height, MIME type, and truthful alt. If a top-level CMS document/list is genuinely absent, keep the textual fallback and omit rather than fabricate an Open Graph image.
  Date/Author: 2026-10-08 / Planner
- Decision: keep public pages explicitly indexable at root metadata, override them with `noindex, nofollow, nocache` from the `(content)` layout only while Draft Mode is enabled, and retain the same public canonical during Preview.
  Rationale: a Preview cookie is private and cache-bypassing but does not itself promise a robots meta tag. Search crawlers should never index editor state; a canonical back to the same published URL is truthful. Next’s built-in `notFound()` remains the owner of 404 `noindex`.
  Date/Author: 2026-10-08 / Planner
- Decision: render one site-wide `Organization` JSON-LD script in `frontend/app/layout.tsx` with only `@context`, `@type: "Organization"`, stable `@id`, legal name `Unione Sportiva Albatese ASD`, alternate name `U.S. Albatese`, configured site URL, founding date `1968`, the concise site description, and `areaServed` place `Albate, Como`.
  Rationale: those are permitted identity facts. Omit logo, address, email, telephone, coordinates, officers, registration number, social profiles, and `sameAs`: the mark is editorial rather than historical, the archive’s facilities/contacts are fictional, and no verified official URL set exists. Escape `<` during JSON serialization as installed Next.js guidance requires.
  Date/Author: 2026-10-08 / Planner
- Decision: add `frontend/app/icon.svg` by adapting the existing deterministic shield geometry and include a source comment/title that it is an editorial mark, not a documented historical crest.
  Rationale: this resolves the repeated favicon 404 using repo-native vector metadata, without a bitmap, stock asset, dependency, `imagegen`, or `imagen`.
  Date/Author: 2026-10-08 / Planner
- Decision: list exactly the four top-level routes and every published news detail in sitemap order, encode each slug as one segment, preserve the existing change-frequency/priority hints, and omit all `lastModified` fields.
  Rationale: `listNews()` is published-only and already capped by the documented 100-item template boundary. The contract has no modification timestamp, so omitting `lastModified` is more accurate than request time or editorial date. Preview/draft/404/operational routes never enter the sitemap.
  Date/Author: 2026-10-08 / Planner
- Decision: emit robots rules that allow `/`, disallow `/preview` and `/refresh`, and advertise the absolute configured `/sitemap.xml`; do not block assets, CMS media, published content, or article routes.
  Rationale: the two handlers are operational trust boundaries, not search content. Authentication remains their security owner; robots is only crawler guidance.
  Date/Author: 2026-10-08 / Planner
- Decision: make `CMS_API_TOKEN` optional exactly as its existing type, client interface, archive permissions, and env documentation already promise.
  Rationale: trim the environment value and map missing/empty to `null`; retain fail-fast behavior for every genuinely required config value. The production rehearsal then proves all six CMS reads without an Authorization header, which is the archive’s intended release contract.
  Date/Author: 2026-10-08 / Planner
- Decision: allow Next image optimization to fetch a private IP only when `CMS_MEDIA_URL` is explicitly configured with the loopback hostname `127.0.0.1`, `[::1]`, or `localhost`, independent of development versus production mode.
  Rationale: the final release rehearsal must keep both services on loopback and must exercise the real production image optimizer. The configured media origin remains constrained by the existing exact remote pattern; a non-loopback production CMS keeps private-IP fetching disabled. This is the smallest owning-layer correction for the release error and changes no image component, media URL, dependency, or deployment topology.
  Date/Author: 2026-10-08 / Worker
- Decision: set `images.maximumRedirects: 0` unconditionally beside the loopback exception.
  Rationale: the approved CMS/archive media URLs are direct, so redirect following provides no required behavior. Disabling it closes the documented gap where a source matching `remotePatterns` can redirect to a destination that is not checked against those patterns, while preserving successful optimization of the exact configured loopback origin. The complete production diff for this remediation is one added property: `maximumRedirects: 0`.
  Date/Author: 2026-10-09 / Worker remediation cycle 1
- Decision: do not add a strict mapper requirement for nonempty media alt text or another validation layer.
  Rationale: current published content already has truthful alt values and every rendering boundary preserves them. The task will fail its release audit if any rendered meaningful image has an empty or generic alt. A model/mapper rule would be a content-contract change and is unnecessary for this approved payload.
  Date/Author: 2026-10-08 / Planner
- Decision: run `be:openapi` and `fe:openapi` after frontend work, but do not run `be:types` because this task changes no backend schema or generated backend type.
  Rationale: root `AGENTS.md` requires the two API artifact refreshes after frontend changes and `be:types` only when backend types changed. If implementation unexpectedly requires a backend type/schema change, stop as `BLOCKED` rather than expanding this final audit.
  Date/Author: 2026-10-08 / Planner
- Decision: use no Docker or Compose command and create no release container/archive configuration.
  Rationale: none exists or is named by the repository or `PLAN.md`. Native builds, the existing Strapi archive import, production process startup, and browser inspection are the actual applicable release validations.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer never edit `TODOS.md`, stage, commit, push, or change branches. After approval, the Coordinator alone checks item 08, creates local commit `08 — Complete SEO, import rehearsal, and release validation`, and records that no push occurred.
  Rationale: this is the user’s explicit ownership and no-push override. Because item 08 is final, the Coordinator then uses the `session-overview` skill and completes the queue/session without selecting another task.
  Date/Author: 2026-10-08 / Planner

## Outcomes & Retrospective

Milestones 1 through 8 and the first prescribed runtime cleanup completed before review. Independent review then reopened the task for one bounded image-optimizer hardening change: retain the configured-host loopback exception but disable all upstream redirects. The source and complete remediation-cycle validation now pass; only the second prescribed cleanup remains before the next `WORK_READY` handoff.

Remediation-cycle canonical proof passed: formatting changed no file; focused SEO remained 1 file / 7 tests; `be:build`, native `be:openapi`, native `fe:openapi`, `fe:check` over 99 files, full Vitest at 8 files / 63 tests, and canonical `fe:build` all passed. Normalizing only generated datetime defaults leaves both API artifacts byte-identical to `HEAD` structurally. Canonical and exact-origin no-token builds retained the five Partial Prerender page families, Dynamic sitemap, and Static icon/robots; the isolated build made zero CMS request and its emitted server config records `maximumRedirects=0` plus the loopback-only private-IP exception.

The second empty start reached readiness on 127.0.0.1:65180 with zero administrator/webhook. A new, separate absent database imported 55 entities, 112 links, and 43 assets after a 38-schema/55-entity/112-link parse, 730-object forbidden type/key scan with zero hit, 15-value/47-file local secret scan with zero hit, and exact 8-original/32-derivative/3-PDF boundary check. Public reads again returned exact Home 4/4, About 3/3/4/2, Activity 6/6/2/3, News 3, Calendar 6, and Documents 3 counts; all eight PNGs returned correct dimensions, all three PDFs returned PDF 1.4, six public `find` actions remained, and user/session/transfer-token/webhook counts were zero.

The direct security diagnostic used only existing production routes: direct configured PNG optimization returned 200 `image/png`, whereas Strapi's natural matching-origin 302 `/` → `/admin` was rejected by Next optimization with 508. Sitemap again contained exactly seven published routes and no `lastmod`; robots and icon were exact. One named fixed browser session then passed all seven routes at 1600×900 and 412×914: every visible image completed with nonzero intrinsic size, used the Next optimizer, and re-requested as 200; all metadata/Organization JSON-LD/content/navigation/version/alt/overflow/application checks passed; mobile footer clearance remained positive; and all four fresh normal-route console groups returned zero warning/error. Fourteen viewport screenshots plus desktop/mobile boxed snapshots stayed disposable in the task workspace.

The remediation link audit again covered 165 anchors, 34 unique targets, 23 fragments, three valid PDF 1.4 responses, and one safe fictional mailto with zero failure/old route/inert hash. All seven source responses had exactly one page hero/lead preload, proportional candidates, the exact compact Notizie widths, and the exact article hero sizes. Pointer and keyboard header/mobile/in-page/story/return/document/contact/skip interactions passed. Unmatched and streamed dynamic 404 behavior remained localized/noindex with no canonical. Preview remained private/no-store, noindex/nofollow with public canonicals and correct draft policy, POST exit cleared state, signed refresh returned the exact three tag sets, unauthenticated requests returned 401, and the controlled backend outage showed the localized secret-free retry at both viewports; keyboard retry recovered with zero continuing console problem and the final POST exit restored public indexing.

Remediation Final Requirement Audit result: all 12 requirements and acceptance items 1–11 pass again with no unresolved source, security, build, test, import, runtime, browser, or cleanup gap. Item 12 remains correctly reserved for the same independent Reviewer and then the Coordinator. Cleanup proved no listener/browser/task workspace/import log/helper/evidence artifact; byte-identical post-generator ordinary database and original uploads; approved archive SHA-256/size; ignored undisclosed env files; unchanged backend/frontend packages, lockfiles, CMS pipeline, schema/content/archive, `PLAN.md`, `TYPES.md`, `TODOS.md`, index, branch, history, upstream, and remote; and untouched unrelated `.agents/skills/imagen/scripts/`.

Independent remediation review returned `APPROVED` with no actionable findings. The Reviewer separately rejected every tested redirect form without target contact, retained successful direct image optimization, repeated canonical and generated-artifact proof, used distinct empty/import databases and a tokenless production runtime, completed all 14 exact viewport checks plus SEO, links/PDFs, 404, Preview, revalidation, outage recovery, and every final-audit item, then removed its disposable workspace and left source state untouched. Acceptance item 12 is now satisfied through Coordinator bookkeeping and the local no-push commit boundary.

Canonical validation passed after the image correction: `be:build`; native `be:openapi` and `fe:openapi`; `fe:check` over 99 files; focused SEO tests (1 file / 7 tests); full Vitest (8 files / 63 tests); and `fe:build`. Both canonical and isolated-origin builds completed with no CMS request and retained Partial Prerender for the five CMS page families, Dynamic sitemap, and Static robots/icon. Normalizing only native datetime defaults proves both generated API artifacts structurally identical to `HEAD`.

The empty-database Strapi start reached readiness with zero admin user/webhook. The separate import rehearsal retained archive SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633` and size 636008 bytes, imported 55 entities/112 links/43 assets, returned all expected public relations and media without Authorization, and distinguished locally regenerated three admin roles/177 admin permissions/two default tokens from transfer payload; forbidden user/session/transfer-token/webhook counts were zero.

The production audit derived exactly seven URLs from sitemap (four top-level plus three published details), found no `lastmod`, and confirmed the exact robots policy and a 200 SVG icon. At all 14 route/viewport combinations, responses were 200, Italian HTML had one H1, required content/chrome/version was visible, active navigation was correct, all visible images loaded with truthful nonempty alt, decorative SVGs were hidden, horizontal overflow and application errors were absent, and fresh normal-run console listeners captured zero warnings/errors. Mobile showed five untruncated 81 px items, 64 px body reservation, and about 55 px clearance between final footer content and the fixed bar. Metadata included one canonical and the exact complete Open Graph record; all pages carried one JSON-LD record with only `@context`, `@type`, `@id`, name, alternate name, URL, founding date, description, and place. The link audit covered 165 anchors / 34 unique targets / 23 fragments / 3 PDF 1.4 downloads / one fictional `.example` mailto with no failures, old English path, or inert hash. Header, mobile, in-page, story, return, document, contact, and keyboard skip interactions were exercised.

The unmatched 404 returned HTTP 404 and the missing dynamic detail returned the framework's streamed HTTP 200; both showed localized recovery UI, `noindex`, and no canonical. Real Draft Mode produced a visible banner, public canonical, complete Open Graph, `noindex, nofollow, nocache`, and `private, no-cache, no-store` on the seeded detail and hub, then the POST exit cleared the cookie and restored `index, follow`. Signed refresh returned exactly `news, news:la-stagione-2026-27-prende-forma`, `calendar-entries`, and `official-documents`; unauthenticated Preview/refresh returned 401. With Draft Mode bypassing cache, stopping only the imported backend showed the localized, secret-free error and native keyboard-operable `Riprova` at both exact viewports; restarting the same database and activating retry restored the page, and a fresh listener saw zero continuing console problem.

Final Requirement Audit result: items 1–12 and acceptance items 1–11 pass with no authoritative gap. The product route inventory, six CMS types/seven reads/PageSwitch collection exception, raw client→mapper→connector→cache/tag/webhook pipeline, `io()`/`connection()` boundaries, SSR+ISR model, fonts/chrome/design, exact synthetic content, all required page sections, accessible semantics, optional-data branches, localized failures, required validations, scope/safety constraints, and cleanup invariants remain proven. Acceptance item 12 is intentionally reserved for the independent Reviewer and Coordinator: `TODOS.md`, the index, branch, history, upstream, and remote are unchanged by the Worker.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The backend is Strapi 5.52.0 under `backend/`; the frontend is Next.js 16.3.1 under `frontend/` with Cache Components, React 19.2.8, Tailwind CSS 4, typed routes, and local Epilogue/Manrope fonts. `frontend/app/layout.tsx` owns root metadata base and shared chrome. `frontend/app/(content)/layout.tsx` owns the Preview banner for every public content route. Each CMS-backed page calls `await io()` before its read. `frontend/app/sitemap.ts` calls `await connection()` before the published news list. Preserve those request-time boundaries.

The data pipeline is fixed: `frontend/cms/client.ts` makes typed Strapi requests; `mappers.ts` validates them into `model.ts` DTOs; `connector.ts` joins those boundaries; `data.ts` owns status-aware cached reads with `"use cache"`, `cacheLife("days")`, and cache tags; `tags.ts` maps signed webhooks to tags; `frontend/app/refresh/route.ts` performs authenticated revalidation. `frontend/app/preview/route.ts` validates the shared secret and a closed Italian path grammar before enabling or disabling Draft Mode. Task 08 consumes these interfaces and changes none of their semantics.

The single-page routes `/`, `/chi-siamo`, `/attivita`, and `/notizie/[slug]` continue through `PageSwitch`; `/notizie` remains the intentional direct-rendering collection exception. Do not move data reads into page components that do not already own them, add a route, add `generateStaticParams`, or add a static export.

The approved archive is `backend/seed-data/us-albatese-demo.tar.gz`. It contains 55 entity rows, 112 links, 8 semantic original PNGs, 3 original PDFs, and 32 responsive PNG derivatives, for 43 asset binaries. Published document counts are Home 1, About 1, Activity 1, News 3, Calendar 6, and Official documents 3. Its six Public permissions are the `find` actions for those six APIs. The exact published news slugs are `la-stagione-2026-27-prende-forma`, `porte-aperte-calcio-giovanile`, and `atletica-tra-pista-e-sentieri`. The archive contains no `admin::` entity, user, token, session, webhook, configuration stream, or environment file.

## Plan of Work

### Milestone 1: Implement one exact SEO policy and route ownership

Create `frontend/seo.ts` as a pure module with no `server-only`, config, request, or CMS import. Export the exact site-name/title/description constants from the Decision Log; a `newsPath(slug)` helper that returns one encoded `/notizie/<segment>` path; a small `textOrFallback(value, fallback)` that trims meaningful CMS text; `createPageMetadata` for canonical/Open Graph assembly; `createOrganizationJsonLd(siteUrl)`; `serializeJsonLd`; `createSitemap(siteUrl, news)`; and `previewRobotsMetadata(enabled)`. Use existing `Metadata`, `MetadataRoute.Sitemap`, `ImageDto`, and `NewsListItemDto` types only. Do not define a second content DTO.

`createPageMetadata` accepts path, short title, description, optional image, `website | article`, and whether the document title is absolute. It returns document title, description, `alternates.canonical`, and a complete Open Graph record. For non-Home pages, Next’s root title template owns the document suffix while the helper supplies the explicitly branded Open Graph title. Map an image only when supplied, using URL, width, height, alt, and MIME. Do not invent Twitter metadata, article authors, publish timestamps, keywords, social accounts, or fallback images.

Create `frontend/seo.test.ts` at the lowest stable boundary. Tests must prove: exact Home and branded child metadata; canonical/Open Graph URL consistency; CMS image URL/dimensions/type/alt mapping; trimming and news fallbacks; one-segment slug encoding; exact sitemap order, published input use, and absence of every `lastModified`; exact minimal Organization fields and absence of unsafe logo/address/contact/person/social keys; `<` escaping in serialized JSON-LD; and public versus Preview robots metadata. These are unit tests and start no process.

Update `frontend/app/meta.ts` so root defaults contain the exact site title template/default, default description, application name, publisher, Open Graph site/locale/type defaults, explicit public `index, follow`, and the existing visible version metadata. Do not put a root canonical there because it would be inherited incorrectly by child routes.

Update the five content route modules. Home, Chi siamo, Attività, and Notizie export `generateMetadata`; each calls `await io()` before any CMS read so the metadata never turns the backend into a build-time dependency. The three institutional routes use their existing singleton read only to obtain the hero image; Notizie uses `listNews()` plus the already-tested `splitNewsLead` policy for its lead image. News detail keeps its current status-aware `getNewsBySlug`, `notFound()`, title/summary fallbacks, and page flow, adds `await io()` before the metadata read, and delegates all canonical/Open Graph assembly to `frontend/seo.ts`. Page components retain their existing `await io()` calls.

Update `frontend/app/(content)/layout.tsx` with an async `generateMetadata` that reads `draftMode()`. It returns no override for public requests and `previewRobotsMetadata(true)` for Draft Mode. Keep the Preview banner and children unchanged. Draft Mode itself is the request-time suspension point; do not wrap it in a cache.

Update `frontend/app/layout.tsx` to render exactly one Organization JSON-LD native script from the configured site URL. Use `dangerouslySetInnerHTML` only with `serializeJsonLd`, which replaces `<` with `\u003c`. Place it once in the root body before shared page content; do not use `next/script` and do not duplicate it per page.

Update `frontend/app/sitemap.ts` to retain `await connection()`, read published `listNews()`, and return `createSitemap(config.siteUrl, news)`. Update `frontend/app/robots.ts` to use URL construction rather than string concatenation and emit the exact allow/disallow/sitemap policy above. Add `frontend/app/icon.svg` with the existing editorial shield’s gold/graphite geometry, a descriptive title, and no claim of historical authenticity.

Replace raw dynamic article-link interpolation in `frontend/components/home/featured-news.tsx` and both paths in `frontend/components/notizie/news-section.tsx` with `newsPath`. This is the only presentation edit. Do not alter layout, responsive image hints, visible copy, sorting, or navigation ownership.

Milestone acceptance: all five page families own exact metadata, every canonical/news internal/sitemap path shares one encoding policy, Preview is noindex without changing its canonical, Organization JSON-LD is safe and unique, the icon is code-native, and no architecture/content/visual redesign occurred.

### Milestone 2: Correct the optional release token and run focused validation

In `frontend/config.ts`, change only `CMS_API_TOKEN` reading: missing, empty, or whitespace-only becomes `null`; a nonempty value is trimmed and preserved. Every other listed environment value remains fail-fast and nonempty. Keep `AppConfig.cmsApiToken: string | null` and the existing `makeCmsClient` authorization behavior. Do not read or modify either ignored env file.

Run formatting and focused tests:

    cd /home/codex/src/us-alb
    mise run fe:format
    cd frontend && npm test -- seo.test.ts
    cd /home/codex/src/us-alb
    git diff --check

Inspect the exact diff. It may contain `frontend/seo.ts`, its test, the root/content metadata owners, the five page routes, sitemap/robots, icon, two news-link components, `frontend/config.ts`, and this plan. It must not contain page layout styling, CMS pipeline code, backend source/schema/types, archive bytes, dependencies, lockfiles, or `.agents/skills/imagen/scripts/`.

### Milestone 3: Refresh artifacts and pass canonical release commands

From `/home/codex/src/us-alb`, list actual tasks, then run:

    mise tasks
    mise run be:build
    mise run be:openapi
    mise run fe:openapi
    mise run fe:check
    cd frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Do not run `be:types`: no backend schema/type changes. There is no backend test task and policy forbids adding or requesting Strapi tests. There is no `fe:test` task, so `npm test` is the canonical Vitest suite. `fe:check` already owns lint and type checking; separate `fe:lint`/`fe:typecheck` runs would be duplicate evidence. No Docker, Compose, image-build, CI, deployment, or application-release-archive validation exists to run.

Inspect generated `frontend/cms/schema.json` and `schema.d.ts`. Native `publishedAt` defaults may refresh, but normalize only for comparison and prove paths, operations, schemas, and TypeScript shapes unchanged. Never hand-edit generated artifacts or add a timestamp normalizer. Record actual checked-file and test counts and the Next route table. All five CMS routes and sitemap must remain request-capable; production build must complete without a running CMS, proving the new metadata functions also preserve the no-build-time-backend contract.

Run protected-scope checks:

    git diff --check
    git diff --exit-code -- backend/package.json backend/package-lock.json backend/src backend/types/generated backend/seed-data/us-albatese-demo.tar.gz frontend/package-lock.json frontend/cms frontend/components/about frontend/components/activity frontend/components/news-detail frontend/components/layout frontend/components/shared frontend/app/globals.css README.md PLAN.md TYPES.md
    rg -n 'generateStaticParams|output:[[:space:]].*export' frontend --glob '!cms/schema.json' --glob '!cms/schema.d.ts'
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git status --short -- .agents/skills/imagen/scripts/

The protected diff and forbidden-architecture searches are empty; the archive hash is still approved; the unrelated directory remains untracked and untouched.

### Milestone 4: Prove an empty Strapi start and rehearse the archive import

After generators finish, record without printing secrets: branch/status, ignored env presence, ordinary `backend/.tmp/data.db` inode/size/mtime/hash if present, archive hash/size, ordinary upload filename/hash manifest, current `backend/import_*.log` set, `.playwright-cli` file set, and listeners on planned ports.

First create a unique `backend/.tmp/task-08-empty-XXXXXX` directory and relative SQLite filename. Start the built backend on `127.0.0.1:65180` with process-local `DATABASE_FILENAME`, `ADMIN_PASSWORD=`, `ADMIN_PASSWORD_FILE=`, and `WEBHOOKS_NEXTJS_TARGET=`. Wait in bounded one-second polls for `/_health` and a log readiness line, then stop its exact process group cleanly. This database must begin absent, reach successful Strapi startup with all current schemas, and create no project-owned administrator or webhook. Remove only this resolved empty-start workspace after proving its prefix. This is the repository-required backend verification; do not create a backend test.

Create a separate unique `backend/.tmp/task-08-release-XXXXXX` workspace and absent relative database. Resolve `backend/public/uploads`; refuse if missing, symlinked, or outside `backend/public`. Move the complete ordinary uploads directory into the workspace as `uploads-original` and immediately create a new empty `backend/public/uploads`. Install cleanup that always stops exact task processes, closes only the named browser, moves imported uploads aside, and restores the original tree byte-for-byte.

Before import, extract a copy of the tracked archive inside the workspace. Parse every JSONL file, list entity types, require the documented top-level paths and no `configuration/`, and reject `.env`, database, log, absolute host path, `admin::`, content API user, API token, transfer token, session, and webhook/configuration data. Run a temporary local-value scanner that reads secret-like values from `backend/.env` without printing them and reports only variable names plus archive-relative paths on a hit. A clean result reports counts only. Reconfirm 8 semantic PNG originals, 3 original PDF 1.4 files, expected responsive derivatives, and the approved hash/size.

Import natively into the absent release database:

    cd /home/codex/src/us-alb/backend
    mise exec -- env DATABASE_FILENAME=".tmp/<task-08-release-basename>/data.db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file seed-data/us-albatese-demo.tar.gz --force --only content,files

Expect 55 entities, 112 links, and 43 asset binaries. A failed import is never retried in place. Move only newly created `backend/import_<timestamp>.log` files positively identified by this import into the workspace.

Start the imported backend on `127.0.0.1:65100` with the same database and empty project-owned admin/webhook overrides. Without any Authorization header, require HTTP 200 and the exact populated counts/relations on Home, About, Activity, News, Calendar, and Official documents using the frontend-compatible queries from task 02. Require all eight original PNG URLs and all three PDF URLs to return 200 and their correct media types; verify image dimensions and PDF headers from imported files. Confirm exactly six enabled Public `find` permissions and zero admin user, content user, transfer token, session, or webhook. Distinguish Strapi’s locally regenerated built-in admin roles/default tokens from archive payload as task 02 documented.

Milestone acceptance: empty startup and archive import use different absent databases; the archive boundary remains secret-free; every public DTO dependency and media relation survives; no ordinary database/upload/env file changes; and backend remains running only on loopback for the frontend release audit.

### Milestone 5: Start the production frontend and enumerate the release surface

Build a production frontend artifact a second time with the exact isolated origins, no API token, and the existing public app-version value, applying overrides inside a post-Mise child shell so Mise cannot replace them:

    cd /home/codex/src/us-alb/frontend
    mise exec -- sh -c '
      export CMS_URL=http://127.0.0.1:65100/api
      export CMS_MEDIA_URL=http://127.0.0.1:65100
      export CMS_API_TOKEN=
      export SITE_URL=http://127.0.0.1:65101
      exec npm run build
    '

The build must pass with the backend running but must issue no CMS content request; `io()`/`connection()` and cached reads remain request-time. Start that artifact with `next start` on `127.0.0.1:65101` using the same post-Mise overrides and `CMS_API_TOKEN=`. Use `setsid` for backend/frontend, retain exact process-group ids, redirect logs into the task workspace, and use bounded readiness polls. Never bind `0.0.0.0`, use a port outside 65100–65199, use Docker, alter an env file, or place a secret in arguments/logs.

Fetch `/sitemap.xml` and derive the authoritative inspection list. Require exactly the four top-level routes plus the three published archive slugs, no duplicate, draft, old English, operational, or 404 URL, and no `<lastmod>`. Fetch `/robots.txt` and require `Allow: /`, disallows for `/preview` and `/refresh`, and the exact `http://127.0.0.1:65101/sitemap.xml`. Fetch `/icon.svg` and require HTTP 200 with SVG media. Keep the server logs secret-free.

### Milestone 6: Inspect every published route in one fixed browser session

Read the Playwright CLI skill again immediately before browser use. Open exactly one in-memory named session with the fixed installed headless Chromium and no browser/device/profile/config override:

    playwright-cli -s=task-08-release-audit open http://127.0.0.1:65101/

For every URL from the sitemap—`/`, `/chi-siamo`, `/attivita`, `/notizie`, and all three `/notizie/<slug>` paths—perform a complete pass at `resize 1600 900`, then repeat every route at `resize 412 914`. Use snapshots, boxed snapshots, diagnostic `eval`/`run-code`, and viewport screenshots stored only inside the task workspace; do not create a Playwright test or reusable browser script file.

At each route and viewport, require HTTP 200, `html[lang=it]`, exactly one meaningful H1, the expected complete page sections/content from `PLAN.md`, visible shared brand/footer/version, correct active navigation, no `[data-nextjs-error]`, no horizontal overflow, and no normal-run console error or warning. At mobile require the accepted fixed five-item bar, untruncated labels, matching body reservation, positive unobscured footer-content clearance, and no clipped final content. Confirm Home’s split/wide hero and metrics/fixture/news/activity/quote/network; About’s history/timeline/values/fictional-board disclosure/facilities/documents; Activity’s all-program no-filter groups/features/schedules/venues/registration; hub calendar score states/news/documents; and every article’s header, truthful hero, full Blocks body, and return links.

At each route, inspect the document title, nonempty meta description, one exact absolute canonical, `og:site_name`, `og:locale`, `og:type`, `og:title`, `og:description`, `og:url`, and the expected CMS `og:image` URL/dimensions/alt/type. Parse the one Organization JSON-LD script and require its exact safe fields and no forbidden contact/person/logo/social/address keys. Require every rendered meaningful `img` to have nonempty truthful Italian alt text; all archive placeholders must name their intended placeholder subject, and decorative SVG/icons must remain hidden from assistive technology.

Collect every anchor on every route. Deduplicate and request every same-origin path; require a non-error response, and for fragments require an element with the matching id after navigation. Allow the single safe `.example` mailto link and direct CMS PDF links; require each PDF link to return 200 `application/pdf`, mapped filename, and `%PDF-1.4`. Exercise representative header, mobile, in-page, story, return, document, contact, and skip links with pointer and native keyboard focus. Confirm no old `/articles`, `/events`, or `/news` link and no `href="#"` exists.

Use request/source inspection to confirm Next image candidate hints remain proportional, especially task 07’s exact compact widths. Only page hero/lead images preload according to their existing page contracts. Do not modify content or mock requests to manufacture visual branches.

### Milestone 7: Prove indexing, Preview, revalidation, 404, and error recovery

Request `/percorso-inesistente` and `/notizie/articolo-inesistente`. Require localized not-found presentation, valid recovery links, and a robots `noindex` meta tag; require the unmatched route to return HTTP 404 and record the dynamic route’s actual framework status while still requiring `noindex`. Neither URL may appear in sitemap or canonical link inventory.

Create a temporary mode-0600 Draft Mode storage state using the proven task-07 in-memory helper pattern: read `PREVIEW_SECRET` only from the Mise-loaded process environment, request the seeded article Preview URL with redirects manual, capture only the expected bypass cookie into the task file, and print no URL, secret, header, cookie, or JSON. Load it into the same named browser session. On the article and `/notizie`, require the visible Italian Preview banner, the public canonical, `noindex, nofollow` robots metadata, private/no-store response caching, correct draft-aware content policy (published news, draft-aware calendar/documents), and valid Open Graph fields. Exit via the real POST form, require redirect `/`, cleared cookie, absent banner, and restored public index/follow metadata.

Create a temporary signed revalidation helper using the task-07 pattern. Read secret header name/value only from the Mise-loaded environment and POST valid news, calendar, and official-document update payloads to `/refresh`. Require exact returned tags `news, news:<slug>`, `calendar-entries`, and `official-documents`, print no secret, then reload hub/detail successfully. Also require unauthenticated/invalid requests to Preview and refresh to fail without leaking configuration.

For controlled dependency-error evidence, re-enable the mode-0600 Draft Mode state so caches are bypassed, stop only the imported backend process group, and navigate to one institutional page at each exact viewport. Require the accepted Italian error presentation, a keyboard-operable `Riprova`, visible shared/version context as appropriate, and no rendered exception, URL containing a secret, or credential. Restart the same backend/database on loopback, activate retry, and require the page to recover. This is manual failure-path inspection, not an automated smoke/E2E test. Source inspection plus build covers global-error ownership; do not introduce a test-only crash route.

Close the Preview cookie through the real exit flow before cleanup. The normal-route console must be clean; separately record only the expected network error caused during the intentional backend outage and prove recovery produces no continuing application error.

### Milestone 8: Complete the final requirement audit and clean everything

Before `WORK_READY`, walk `Final Requirement Audit` line by line against the actual tree and recorded runtime evidence. Earlier approvals are useful history but not substitutes. Resolve every source, build, test, startup, import, HTTP, browser, metadata, link, alt, console, overflow, Preview, revalidation, 404, or cleanup error in its owning layer. After any source correction, repeat formatting, focused SEO tests, required generators, `fe:check`, full Vitest, `fe:build`, affected empty/import proof, and both complete viewport passes as proportionate; a release-wide route or metadata change requires the full browser pass again.

Close only `task-08-release-audit`, stop exact frontend/backend process groups, and wait for exit. Move imported uploads aside and restore `uploads-original` byte-for-byte. Remove only positively identified task import logs, `.playwright-cli` artifacts created after the baseline, and resolved `task-08-empty-*`/`task-08-release-*` workspaces after prefix checks. Never broadly remove `backend/.tmp`, `backend/public`, `.playwright-cli`, or the repository root.

Final proof requires no listener on 65100, 65101, or 65180; no named browser; ordinary database identity unchanged from the post-generator baseline; restored upload manifest unchanged; archive hash/size unchanged; no helper, secret scan, storage state, downloaded PDF, screenshot, log, extracted archive, or disposable database remains; ignored env files are untracked and undisclosed; package lockfiles are unchanged; and `.agents/skills/imagen/scripts/` remains the sole unrelated untracked item.

Update every living section of this plan with exact commands, counts, route evidence, errors/remediations, cleanup, and remaining work, then hand off `WORK_READY` without editing `TODOS.md`, staging, committing, pushing, or changing branches.

## Concrete Steps

All commands run from `/home/codex/src/us-alb` unless a step explicitly changes directory. Begin safely:

    git branch --show-current
    git status --short --branch
    for commit in 2bcd098 4b1b731 28fec7a 97ae7b4 e918fff f02a0f2 fe8ed36; do git merge-base --is-ancestor "$commit" HEAD; done
    git rev-list --left-right --count '@{upstream}...HEAD'
    test -f backend/.env
    test -f frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    mise current
    mise tasks
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    stat -c '%s' backend/seed-data/us-albatese-demo.tar.gz

Expect `main`, all ancestor checks successful, upstream `0 7`, Node 24.20.0, ignored local env files, archive hash `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`, and size `636008`. Never run `env`, `printenv`, `set`, or display an env file.

Use `apply_patch` for every text/SVG/helper edit. Implement Milestones 1 and 2, run focused validation, then Milestone 3 exactly. Create temporary workspaces only with `mktemp -d -p backend/.tmp` and explicit `task-08-empty-` or `task-08-release-` prefixes. Use process groups for servers, bounded readiness polling, one named browser, and the exact cleanup rules above.

A successful Worker handoff records: exact changed files; SEO unit cases; generator structural comparison; canonical commands and actual counts; build route classifications; empty-start readiness; archive type/entity/asset/permission/secret-scan/import evidence; unauthenticated API/media proof; sitemap/robots/icon results; all fourteen route/viewport inspections; exact canonical/Open Graph/JSON-LD evidence; link/anchor/alt/version/overflow/console results; PDF, Preview/noindex/exit, signed revalidation, 404, and dependency-error/retry evidence; requirement-audit outcome; archive/database/upload/env/browser/process cleanup; and final Git status.

## Final Requirement Audit

The Worker and Reviewer must explicitly audit these requirements rather than infer them from passing builds.

1. Product routes are exactly `/`, `/chi-siamo`, `/attivita`, `/notizie`, and published `/notizie/[slug]`; template English routes are absent, contact remains `#contatti`, and one responsive tree serves both viewports.
2. All six Strapi types, DTOs, seven reads, `PageSwitch` variants, collection exception, Draft Mode status policy, raw-client/mapper/connector/cache/tag/webhook chain, and request-time `io()`/`connection()` boundaries remain intact; no static export or `generateStaticParams` exists.
3. Fonts, palette, original non-historical mark, desktop/mobile chrome, contact footer, fixed mobile navigation, focus/semantic behavior, and visible `NEXT_PUBLIC_APP_VERSION` remain complete.
4. The approved archive still contains the exact safe synthetic 2026/27 content, eight honest placeholder images, three PDFs, allowed identity facts, fictional people/contacts/fixtures/results/board, and no secret/admin/token/webhook configuration payload.
5. Home visibly contains hero, metrics, next fixture, featured news, activity overview, quote, and community strip with truthful sparse-data behavior.
6. Chi siamo visibly contains introduction, hero, history, timeline, values, explicitly fictional portrait-free board, facilities, and document introduction.
7. Attività visibly contains all grouped programs, Open and athletics features, schedules, venues, registration sequence, and honest anchor navigation with no hidden client filter.
8. Notizie visibly contains upcoming matches, complete/unavailable result states, events, editorial lead/latest ordering, every story, and ordered usable official-document downloads; article detail remains through `PageSwitch`, renders all Blocks, and previews correctly.
9. `<html lang="it">`, exact page metadata/canonicals/Open Graph, truthful alt text, one safe Organization JSON-LD record, published-only sitemap, canonical robots policy, semantic HTML, native controls, focus, clear labels, and index/noindex behavior all match this plan.
10. Optional data and collections degrade cleanly by source inspection; dependency failures use localized secret-free errors; genuine missing content uses localized noindex 404 behavior.
11. Required validation passes: backend build, required OpenAPI/frontend generation, frontend check, production build, full Vitest, new empty Strapi startup, fresh archive import, public API/media verification, and exact-view manual inspection. `be:types` is absent because no backend type changed; backend/browser/E2E/smoke/deployment test suites remain absent.
12. Scope and safety hold: no dependency/lockfile/schema/data/archive/CMS-pipeline change, no Strapi upgrade, no machine/user env change, no external or non-loopback listener, no Docker/Compose invention, no bitmap generator, no leaked secret, no residual runtime/browser artifact, no ordinary data/upload damage, and no touch to unrelated `.agents/skills/imagen/scripts/`.

## Validation and Acceptance

Acceptance requires all observable behavior below:

1. SEO unit tests pass and every public route emits the exact title, description, canonical, Open Graph type/site/locale/title/description/URL, and expected CMS hero image described here. Dynamic slugs are encoded consistently across links, canonicals, and sitemap.
2. Exactly one valid Organization JSON-LD record appears site-wide with only the safe fields in the Decision Log; serialization is XSS-safe for `<`. The code-native SVG icon returns 200 and the normal browser console has no favicon or application error.
3. Public responses are index/follow; Draft Mode responses are noindex/nofollow/private/no-store while preserving the public canonical; 404 responses are localized and noindex. Sitemap contains exactly four top-level plus all three published archive articles and no `lastModified`; robots allows public content, disallows only Preview/refresh, and names the exact sitemap.
4. Every meaningful rendered image at both viewports has nonempty truthful alt text and correct proportional source-selection metadata. Decorative icons/mark geometry remain hidden or labelled appropriately. No image is generated or replaced.
5. Every hard-coded and current CMS internal link/anchor resolves; all three PDF links retrieve valid PDFs; no old English route, inert hash, missing fragment, unsafe external claim, or broken URL remains.
6. Empty-token configuration starts the production frontend and all six CMS resources render through unauthenticated public reads. Required settings still fail fast. No token is decrypted, logged, stored, or sent.
7. `be:build`, `be:openapi`, `fe:openapi`, `fe:check`, full Vitest, and both canonical and isolated-origin production builds pass. Generated API shape is unchanged and every CMS-backed route/metadata route remains request-time rather than a build-time CMS dependency.
8. A distinct empty database starts Strapi successfully. A second absent database imports the archive with 55 entities, 112 links, and 43 binaries; all documented records/relations/media/permissions survive, forbidden payload types/secrets remain absent, and ordinary state remains untouched.
9. In one named fixed Playwright CLI session, every published route passes at exactly 1600×900 and 412×914 with complete PLAN content, correct responsive transformation, no overflow/clipping, accessible navigation/focus, visible version, and no normal-run console/application error.
10. Real Preview enable/persist/exit and exact signed news/calendar/document invalidation tags work without content mutation or secret exposure. Controlled backend unavailability shows the localized error and retry recovers after restart.
11. The final requirement audit has no unresolved error or authoritative gap. Cleanup proves stopped ports/processes, closed browser, deleted task evidence, byte-identical archive/uploads/ordinary database, ignored untracked env files, unchanged lockfiles, and untouched unrelated image-tool directory.
12. Worker and Reviewer leave `TODOS.md`, index, branch, history, upstream, and remote unchanged. Only after `APPROVED` and `REVIEW_READY` may the Coordinator finalize review bookkeeping, check item 08, stage only task-owned files plus this plan/tracker, verify staged exclusion of `.agents/skills/imagen/scripts/`, and create local commit `08 — Complete SEO, import rehearsal, and release validation`. The Coordinator performs no push, then produces the final Session Overview and ends `SESSION_COMPLETE` under the explicit no-push override.

## Idempotence and Recovery

SEO/source edits, focused tests, formatting, generators, checks, and builds are repeatable. Native OpenAPI generation is structurally but not byte-idempotent because publication defaults contain generation times. Keep final native output, prove structural equivalence, and never hand-normalize it.

If metadata data is absent, use only the exact fallback/omission policy here; do not edit the archive or fabricate an image. If a generated API shape differs, stop and locate the unintended source change. If implementation appears to require a backend type/schema/content/dependency change, stop `BLOCKED` because this plan found no such requirement.

Both SQLite paths must be absent before use. A failed empty start preserves its exact workspace for diagnosis. A failed import is never retried in place; restore ordinary uploads first, retain evidence, and create a new `task-08-release-*` workspace. `--force` is authorized only for the positively identified disposable database.

Upload isolation is mandatory. Move the original directory; never merge over it. Stop Strapi before swapping directories. If restoration cannot be proven byte-for-byte, retain evidence and report `BLOCKED` rather than cleaning or claiming completion.

Preview/revalidation helpers read secrets only from Mise-loaded process memory. Storage state is mode 0600 and temporary. The frontend uses no API token. Never print a token, secret-header name/value, cookie, env contents, or secret-bearing URL. On failure, close the named browser, stop exact process groups, restore uploads, and retain the unique workspace until the cause is understood.

Use session-specific Playwright close and exact process-group signals, never `close-all`, `kill-all`, or broad deletion. Screenshots/logs are temporary evidence, not golden tests. Delete them only after factual outcomes are recorded in this plan.

## Artifacts and Notes

Expected durable files are:

    .agents/plans/08-complete-seo-import-rehearsal-and-release-validation.md
    frontend/seo.ts
    frontend/seo.test.ts
    frontend/config.ts
    frontend/app/meta.ts
    frontend/app/layout.tsx
    frontend/app/(content)/layout.tsx
    frontend/app/(content)/page.tsx
    frontend/app/(content)/chi-siamo/page.tsx
    frontend/app/(content)/attivita/page.tsx
    frontend/app/(content)/notizie/page.tsx
    frontend/app/(content)/notizie/[slug]/page.tsx
    frontend/app/sitemap.ts
    frontend/app/robots.ts
    frontend/app/icon.svg
    frontend/components/home/featured-news.tsx
    frontend/components/notizie/news-section.tsx
    frontend/next.config.ts

Required generators may update `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` only with native output. No other CMS file, backend source/type/schema, archive, package/lockfile, README, image, screenshot, test fixture, browser test, release document, container file, or asset directory is expected.

Temporary artifacts belong only below resolved `backend/.tmp/task-08-empty-XXXXXX/` and `backend/.tmp/task-08-release-XXXXXX/`: disposable databases, extracted archive inspection, imported uploads while isolated, temporary secret scanner/Preview/revalidation helpers, mode-0600 browser state, server/build logs, snapshots/screenshots, and downloaded media proofs. All are removed after successful evidence capture and ordinary state restoration.

## Interfaces and Dependencies

Use only pinned Next.js 16.3.1, React 19.2.8, Tailwind CSS 4, TypeScript, Vitest, Strapi 5.52.0, Node 24.20.0, and system inspection tools already present. Add no npm, system, browser, image, date, schema, JSON-LD, sitemap, or testing dependency.

`frontend/seo.ts` remains pure. Its page metadata input uses existing `ImageDto`; sitemap input uses existing `NewsListItemDto`; Organization output is an ordinary frozen serializable object. Route modules pass `config.siteUrl` only where an absolute site URL is required. The root layout remains a Server Component.

Keep these existing data interfaces unchanged:

    getHomePage(): Promise<HomePageDto | null>
    getAboutPage(): Promise<AboutPageDto | null>
    getActivityPage(): Promise<ActivityPageDto | null>
    getNewsBySlug(slug: string): Promise<NewsDto | null>
    listNews(): Promise<NewsListItemDto[]>
    listCalendarEntries(): Promise<CalendarEntryDto[]>
    listOfficialDocuments(): Promise<OfficialDocumentDto[]>

Keep cache tags `home-page`, `about-page`, `activity-page`, `news`, `news:<slug>`, `calendar-entries`, and `official-documents` unchanged. Keep public/draft status selection unchanged. Keep page dispatch and route signatures unchanged.

Revision note (2026-10-08 / Planner): Created the initial self-contained final task ExecPlan after complete governing-file, skill/reference, task-01 through task-07 plan/implementation, route/error/metadata, CMS/cache/Preview/revalidation, archive, configuration, repository-validation, and release-surface inspection. Recorded the Context7 quota failure and pinned-doc fallback; fixed exact metadata/canonical/Open Graph/Organization/sitemap/robots/Preview/404 policies; identified the optional-token and favicon release gaps; prescribed focused tests, canonical commands, empty startup, fresh import, public API/media proof, one-session all-route exact-viewport audit, error recovery, requirement-by-requirement final audit, complete cleanup, independent review, Coordinator-only local commit, final Session Overview, and explicit no-push override. No implementation file, tracker, asset, runtime, branch, index, commit, or remote was changed.

Revision note (2026-10-08 / Worker): Implemented the approved SEO/config surface, remediated the production loopback image-optimizer failure in its configuration owner, repeated canonical and isolated builds, completed separate empty-start/import/public-read and one-session exact-viewport release rehearsals, discarded stale-slug evidence and repeated it from the authoritative sitemap, passed the complete final audit, restored byte-identical ordinary state, and removed all task runtime/browser evidence. Left `TODOS.md`, staging, commits, pushes, branch, history, upstream, remote, content/schema/dependencies, and unrelated `.agents/skills/imagen/scripts/` untouched for Reviewer/Coordinator ownership.

Revision note (2026-10-08 / Worker remediation cycle 1): Addressed `CHANGES_REQUESTED` by adding only `images.maximumRedirects: 0` beside the approved configured-loopback exception, as installed Next.js documents that redirect destinations bypass `remotePatterns`. Repeated every user-mandated canonical, empty/import, isolated production, direct/rejected-redirect optimizer, fourteen-route exact-viewport, SEO/link/PDF/404/Preview/revalidation/outage, final-audit, and cleanup proof. Returned ordinary state exactly and left all Reviewer/Coordinator-owned and unrelated state untouched for renewed independent review.

Revision note (2026-10-09 / Coordinator): Recorded the same Reviewer’s final `APPROVED`/`REVIEW_READY` result after independent redirect-boundary, canonical, import/runtime, exact-viewport, trust-boundary, error-recovery, audit, and cleanup proof. Checked the final queue item and finalized outcomes for the Coordinator-owned local commit, Session Overview, and session completion. The unrelated image-tool directory remains excluded, and no push is authorized or performed.

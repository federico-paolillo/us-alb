# Replace the template domain with the U.S. Albatese CMS pipeline

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this work, editors can manage the U.S. Albatese home, institutional, activity, news, calendar, and official-document content in Strapi, preview unpublished institutional pages and news in Next.js Draft Mode, and publish content that appears on the Italian routes `/`, `/chi-siamo`, `/attivita`, `/notizie`, and `/notizie/[slug]`. The template-only Article and Event concepts and the English `/articles`, `/events`, and `/news` routes will no longer exist. A visitor can open each Italian route and see a deliberately plain but complete semantic rendering of the CMS data; later queue items will supply imagery, seeded content, shared chrome, and high-fidelity presentation.

The observable proof is a Strapi start against a new empty SQLite database, regenerated Strapi and OpenAPI types that contain the new content surface and no Article/Event surface, a successful Next.js build, and passing frontend unit tests for the mapper, query, preview-path, and webhook-tag trust boundaries.

## Progress

- [x] (2026-10-08 08:39Z) Read the governing instructions, queue item, repository plan, design system, history, all eight desktop/mobile reference HTML files, and the current backend/frontend implementation; confirmed `main` at `15e956a34c8ff75da9efe86d4aa8e3da12424693` equals `origin/main` and the sole pre-existing change is unrelated untracked `.agents/skills/imagen/scripts/`.
- [x] (2026-10-08 08:39Z) Define the final Strapi component/content-type contract, DTO/read surface, preview behavior, Italian route topology, cache invalidation ownership, bounded test scope, and validation order in this ExecPlan.
- [x] (2026-10-08 09:15Z) Planning round 2 incorporated Coordinator-provided runtime, dependency, environment, Content-Type Builder, script, baseline-validation, generated-artifact, README, mapper, and aggregate-preview evidence; no implementation file was changed by the Planner.
- [x] (2026-10-08 09:29Z) Pinned project-owned Mise Node to 24.20.0, repaired the two task-blocking package scripts without changing versions or lockfiles, verified the existing ignored local env files without overwriting or printing them, ran `npm ci` in both packages, loaded pinned `better-sqlite3`, and read the relevant installed Next.js documentation completely.
- [x] (2026-10-08 09:42Z) Started Strapi development against task-owned `.tmp/task-01-authoring-3qWwiw/data.db` on `127.0.0.1:65100`; used authenticated official Content-Type Builder create/update/delete routes through named Playwright CLI session `task-01-strapi-schema` to persist all components and six content types and remove Article/Event plus obsolete shared components; verified the final model in the builder UI, closed the session, and stopped Strapi without any direct schema edit.
- [x] (2026-10-08 09:57Z) Finished all six builder-persisted Strapi APIs and native Preview mappings, documented the full content contract in `TYPES.md`, and limited README changes to the approved Preview and pipeline corrections.
- [x] (2026-10-08 09:57Z) Regenerated backend and OpenAPI/frontend types, then implemented the exact raw client, strict/draft-aware mappers, connector, status-keyed cached reads, cache tags, webhook mappings, and focused unit coverage.
- [x] (2026-10-08 09:57Z) Removed the generic English route/component surface and delivered request-rendered `/`, `/chi-siamo`, `/attivita`, `/notizie`, and `/notizie/[slug]` routes with the four approved `PageSwitch` variants, discovery, Italian navigation, and semantic minimal renderers.
- [x] (2026-10-08 09:57Z) Completed every command and structural check in `Validation and Acceptance`: fresh empty-database startup succeeded and was cleaned exactly; all generators, builds, checks, and 41 frontend tests passed; lockfiles/env/session/scope checks were clean.
- [x] (2026-10-08 10:35Z) Independent review cycle 1 returned `CHANGES_REQUESTED` for empty-string date acceptance, incomplete enum/group/loading presentation, omitted authoring limits in `TYPES.md`, and missing executable evidence for draft repeatable normalization.
- [x] (2026-10-08 10:42Z) Remediated all cycle-1 findings: empty editorial/calendar dates now fail with dedicated regressions; draft repeatable arrays have focused coverage; calendar entries render in Italian kind groups; sport enums render with Italian labels; all four new route surfaces have loading modules; every enforced schema limit is documented; regenerated OpenAPI artifacts, frontend checks/build, and 44/44 tests pass.
- [x] (2026-10-08 11:32Z) Independent Reviewer approved remediation cycle 1 after isolated backend type/build/OpenAPI and frontend OpenAPI/check/build generation, 44/44 Vitest tests, generated-artifact comparison, and structural checks; only expected OpenAPI timestamps differed.
- [x] (2026-10-08 11:34Z) Left Planner, Worker, and Reviewer changes uncommitted for the Coordinator; the Coordinator isolated the task-01 files for one local commit and intentionally skipped pushing under the user's override.

## Surprises & Discoveries

- Observation: `BRIEF.md`, although named by `PLAN.md` and the planning request, does not exist in the repository at this commit.
  Evidence: `find . -name BRIEF.md -o -name 'BRIEF*'` returned no paths. The selected task prompt and `PLAN.md` repeat the needed authorization and scope, including explicit authorization for content-type changes, so planning can proceed without fabricating absent brief text.
- Observation: the working tree begins clean except for unrelated untracked `.agents/skills/imagen/scripts/`.
  Evidence: the initial `git status --short --branch` reported `## main...origin/main` and only `?? .agents/skills/imagen/scripts/`. The current status additionally contains the plan and Coordinator-produced provisional changes to `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`; no step may modify, stage, or include the unrelated `imagen/scripts/` directory.
- Observation: both `node_modules` trees were initially absent, so the installed Next.js documentation required by `frontend/AGENTS.md` was initially unavailable. The Coordinator subsequently installed both trees with Mise Node 24.20.0.
  Evidence: lockfile-only `npm ci` succeeded for the frontend. Backend `npm ci` under project Node 26 failed because pinned `better-sqlite3@12.8.0` declares Node `20.x || 22.x || 23.x || 24.x || 25.x`, has no Node 26 prebuild, and the host has no `make`; no system package or dependency upgrade is permitted. With Mise Node 24.20.0, both installs succeeded and `require('./backend/node_modules/better-sqlite3')` loaded.
- Observation: installed Next.js 16.3.1 documentation is now present under `frontend/node_modules/next/dist/docs/`.
  Evidence: the relevant App Router pages include `01-app/02-guides/draft-mode.md`, `01-app/03-api-reference/01-directives/use-cache.md`, the `cacheLife.md`, `cacheTag.md`, `revalidateTag.md`, `draft-mode.md`, `io.md`, and `connection.md` function references, and the sitemap file-convention reference. The Worker must read these completely before frontend edits.
- Observation: the mandatory Context7 Strapi lookup was attempted but refused by quota.
  Evidence: `ctx7 library Strapi ...` reported `Monthly quota exceeded`. The installed pinned source and official builder UI supply the required implementation evidence. If a new library-specific question arises, retry Context7 after `ctx7 login` or after supplying `CONTEXT7_API_KEY`; do not silently substitute remembered API details.
- Observation: the current architecture already has native Strapi Preview, a secret-checked Next preview route, explicit bracket query serialization, mapper validation, cache tags, and webhook revalidation.
  Evidence: `backend/config/admin.ts`, `frontend/app/preview/route.ts`, and `frontend/cms/{client,mappers,data,tags,webhook}.ts` provide the extension points. This is a domain replacement, not an architectural rewrite.
- Observation: the installed Strapi Content-Type Builder can author this model through official authenticated development routes and persists schema/factory files into the worktree.
  Evidence: `backend/node_modules/@strapi/content-type-builder/dist/server/routes/admin.js` defines authenticated POST/PUT/DELETE routes for `/content-types` and `/components`; `is-development-mode.js` permits mutations only while `strapi develop` has auto-reload enabled. Browser-driven schema authoring through the admin is therefore the required first path, not a browser test.
- Observation: two repository scripts are currently incompatible with canonical validation.
  Evidence: `backend/package.json` calls nonexistent `strapi ts:generate-type`, while the installed pinned CLI exposes working `strapi ts:generate-types`. `frontend/package.json` formats only `cms/schema.d.ts`; native `be:openapi` also rewrites `cms/schema.json` in formatting rejected by `fe:check`.
- Observation: ignored project-local `backend/.env` and `frontend/.env.development` now exist for this worktree and were created by the Coordinator.
  Evidence: presence checks succeed without reading their secret values. They use dummy non-production credentials, bind services only to `127.0.0.1`, assign backend 65100 and frontend/site/preview 65101, and must never be staged or printed.
- Observation: the Coordinator's baseline native OpenAPI run changed only generated `publishedAt` defaults in `frontend/cms/schema.json` and `schema.d.ts`; those changes are provisional.
  Evidence: current diffs show baseline dates replaced with generation-time dates. The Worker must overwrite both artifacts after the final Strapi model and retain the final native output rather than restoring these provisional versions.
- Observation: the corrected baseline toolchain is healthy before implementation.
  Evidence: with local env, Node 24.20.0, and generated-schema formatting, frontend tests passed 34/34, `fe:check` and `fe:build` passed with only two existing unused-import warnings in routes this task deletes, backend build/OpenAPI generation passed, and an empty SQLite start reached `Strapi started successfully`, shut down cleanly, and removed its exact temporary database.
- Observation: `backend/config/database.ts` joins `DATABASE_FILENAME` beneath the backend directory, so an absolute temporary filename does not select the intended `/tmp` file.
  Evidence: its SQLite configuration uses `path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db'))`. Empty-database validation must therefore create a unique relative directory beneath `backend/.tmp/`.
- Observation: Content-Type Builder caps `string.maxLength` at 255, while `text.maxLength` supports the required 280-character summaries.
  Evidence: authenticated builder attempts returned `component.attributes.url.maxLength must be less than or equal to 255` for a 2048-character string URL and the same constraint for a 280-character string summary. The final builder-owned model uses a conservative 255-character call-to-action URL and `text` with `maxLength: 280` for news/calendar summaries; both persisted through successful builder operations.
- Observation: deleting Article caused the still-running development compiler to reject the old Article preview UID until the planned final preview handler was installed.
  Evidence: after the authenticated builder deletion, TypeScript reported that `api::article.article` was no longer a `ContentType`. Updating `backend/config/admin.ts` to the approved six-type Italian preview map restored hot reload, after which the same authoring database and named session completed the remaining builder deletions.

## Decision Log

- Decision: represent page dispatch with the exact discriminants `home`, `about`, `activity`, and `news-detail`; render `/notizie` directly rather than adding a list variant to `PageSwitch`.
  Rationale: this makes the requested four single-document variants explicit while preserving the repository's intentional collection-list exception.
  Date/Author: 2026-10-08 / Planner
- Decision: all six editorial content types use Strapi Draft & Publish. The three institutional single types preview at their own routes, news previews at `/notizie/[slug]`, and calendar/document entries preview only through the containing `/notizie` aggregate route.
  Rationale: editors need the requested Draft Mode workflow without inventing standalone calendar or document detail routes. The activity aggregate is embedded in and previewed through the activity single type.
  Date/Author: 2026-10-08 / Planner
- Decision: keep `news-item` and its Strapi `/news` REST endpoint, but replace its fields and expose it only through Italian frontend URLs.
  Rationale: news is part of the target domain; only Article/Event are generic domains to remove. Frontend route language does not need to mirror Strapi's internal endpoint name.
  Date/Author: 2026-10-08 / Planner
- Decision: author content types and components through the official Strapi Content-Type Builder UI/admin API while `strapi develop` runs against a task-owned database, using the fixed Playwright CLI workflow.
  Rationale: root `AGENTS.md` requires Strapi APIs or admin UI where possible, and the installed builder demonstrably persists schemas and factory APIs into the worktree. Direct JSON editing is allowed only when a specific required constraint cannot be represented by the builder; the Worker must first record the attempted UI/API path, observed limitation, affected field, and smallest necessary direct edit in `Surprises & Discoveries` and `Decision Log`.
  Date/Author: 2026-10-08 / Planner
- Decision: change `mise.toml` from Node 26 to exact Node 24.20.0 and run both `npm ci` commands before implementation.
  Rationale: this is the task-owned runtime correction proven compatible with pinned `better-sqlite3@12.8.0`; installing build tools, upgrading a dependency, bypassing engine checks, or changing lockfiles would expand scope and reduce reproducibility.
  Date/Author: 2026-10-08 / Planner
- Decision: repair only the backend type-generation script and frontend OpenAPI formatting script.
  Rationale: `strapi ts:generate-types` is the installed CLI command, and formatting both generated JSON and declarations makes the canonical `fe:openapi` followed by `fe:check` sequence reliable. Package versions and lockfiles remain unchanged.
  Date/Author: 2026-10-08 / Planner
- Decision: use ignored project-local env files with loopback-only ports and dummy matching secrets; never overwrite an existing env file, print its secrets, or stage it.
  Rationale: Strapi admin/preview and Next configuration fail fast without these values, while repository policy prohibits machine/user environment changes and exposed credentials.
  Date/Author: 2026-10-08 / Planner
- Decision: exported data reads determine Draft Mode outside private cached functions, then pass `draft` or `published` into a status-keyed function containing `"use cache"`, `cacheLife`, and `cacheTag`.
  Rationale: request state stays outside the cache scope while draft and published representations receive distinct cache keys and share webhook invalidation tags.
  Date/Author: 2026-10-08 / Planner
- Decision: at `/notizie`, Draft Mode affects only `listCalendarEntries` and `listOfficialDocuments`; `listNews` remains published-only.
  Rationale: unpublished news is previewed through `/notizie/[slug]`, the sitemap consumes the same published-only list, and calendar/document entries have no standalone route. The aggregate never enables draft status for all three reads.
  Date/Author: 2026-10-08 / Planner
- Decision: retain final native OpenAPI output even though its generation-time `publishedAt` defaults make reruns non-byte-identical.
  Rationale: those defaults are emitted by the pinned generator. Formatting through `fe:openapi` is required, but adding a normalizer or hand-editing generated files would stop them being faithful native artifacts.
  Date/Author: 2026-10-08 / Planner
- Decision: authorize minimal README corrections only in the Preview paragraph and the adding-a-content-type checklist.
  Rationale: this task directly invalidates the `Article and News Preview` statement and the nonexistent `cms/cache.ts` checklist entry. No other README content is in scope.
  Date/Author: 2026-10-08 / Planner
- Decision: keep rendering intentionally semantic and plain, reusing the existing block/image primitives where useful, and update only labels/links in the current chrome.
  Rationale: task 01 must demonstrate every data path but must not consume tasks 02 through 07, which own media, seed data, the visual foundation, and page-specific high-fidelity composition.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer must neither commit nor push. After Reviewer approval, the Coordinator alone creates the isolated local task commit and intentionally records zero pushes before continuing the queue.
  Rationale: this is the user's direct workflow override. It changes ownership and queue progression only, not technical scope or acceptance.
  Date/Author: 2026-10-08 / Planner
- Decision: store news and calendar summaries as Strapi `text` fields capped at 280 characters, and cap the call-to-action string URL at 255 characters.
  Rationale: the official builder rejects string lengths above 255, while `text` preserves the exact required 280-character editorial boundary and the conservative 255-character URL cap satisfies the plan's supported-limit rule without a direct schema exception.
  Date/Author: 2026-10-08 / Worker
- Decision: preserve stable English enum identifiers in CMS/DTO contracts while translating them at the owning page renderer; render calendar entries beneath the Italian groups `Partite`, `Risultati`, and `Eventi`.
  Rationale: stored identifiers remain stable integration values, while public presentation is Italian and visibly reflects the reference page's distinct calendar sections without creating a parallel model.
  Date/Author: 2026-10-08 / Worker

## Outcomes & Retrospective

Task 01 is complete and independently approved. The official Content-Type Builder produced the final six-type, 13-content-component domain; native backend/OpenAPI/frontend declarations were regenerated; the strict CMS pipeline, Draft Mode previews, cache invalidation, Italian routes, sitemap, navigation, and minimal renderers are implemented. The fresh SQLite proof reached `Strapi started successfully` and was removed after clean shutdown. Cycle-1 review identified four bounded gaps, all resolved: date validators reject empty values; unit tests prove scalar, block, and repeatable draft normalization plus required-media failures; calendar and sport enums have grouped Italian presentation with four scoped loading modules; and `TYPES.md` records every enforced length/range constraint. Independent isolated review passed backend type/build/OpenAPI generation, frontend OpenAPI/check/build, 44/44 Vitest tests, generated-artifact comparison, and structural checks; only expected OpenAPI timestamps differed. The Article/Event APIs and English route/component trees are absent, generated/static-export violations are absent, lockfiles are unchanged, ignored env files remain untracked, and no Playwright session is open. No backend/browser tests, seed/media/styling work, push, or branch switch was performed. The Coordinator recorded the queue item and prepared the approved task for one isolated local commit; the user-directed no-push override remains in force. The unrelated `.agents/skills/imagen/scripts/` remains excluded and untouched.

## Context and Orientation

The backend is Strapi 5.52.0 under `backend/`. A content type is an editor-managed document schema under `backend/src/api/<name>/content-types/<name>/schema.json`; reusable nested field groups are Strapi components under `backend/src/components/`. The official Content-Type Builder, reached through the authenticated development admin while `strapi develop` runs, writes these schemas and conventional factory controller, route, and service modules into the worktree. `backend/types/generated/{components,contentTypes}.d.ts` are generated, not handwritten. `backend/config/admin.ts` owns native Strapi Preview URL generation. `backend/src/bootstrap/webhook.ts` provisions the Next.js revalidation webhook. Do not upgrade Strapi.

The frontend is Next.js 16.3.1 under `frontend/` with cache components enabled. Its pipeline is deliberately layered: `frontend/cms/client.ts` makes raw Strapi requests using generated OpenAPI types; `frontend/cms/mappers.ts` validates and maps raw responses into stable DTOs from `frontend/cms/model.ts`; `frontend/cms/connector.ts` composes client and mapper calls; `frontend/cms/data.ts` exposes cached reads; `frontend/cms/tags.ts` translates webhook models into cache tags; and `frontend/app/refresh/route.ts` invalidates those tags after secret validation. Preserve that order. Draft Mode is a signed Next.js cookie enabled by `frontend/app/preview/route.ts`; it selects Strapi's draft or published document status but does not form a second content pipeline.

`PageSwitch` in `frontend/components/page-switch.tsx` is the only dispatcher for single-document pages. Collection pages render their list component directly. Every CMS-backed page component must call `await io()` from `next/cache` before reading data so a missing backend never becomes a build-time dependency. `frontend/app/sitemap.ts` must call `await connection()` from `next/server` before CMS reads for the same reason. Do not add `generateStaticParams`, static export, a parallel fetch layer, or a new UI dependency.

The reference pages establish content needs but not implementation styling for this task. Home needs editorial copy, metrics, a quote, and activity teasers. Chi siamo needs history, timeline, values, board, facilities, and an introduction to documents. Attività needs grouped programs, schedules, venues, open-team and athletics features, and registration steps. Notizie combines news, match/result/event entries, and PDFs. The target DTOs must carry all of this data now so later visual tasks do not require another schema migration.

Project runtime is owned by `mise.toml`; this task must pin exact Node 24.20.0 before dependency installation. `backend/.env` and `frontend/.env.development` are ignored local files, not deliverables. The backend authoring server binds `127.0.0.1:65100`; the frontend, `SITE_URL`, webhook target, and preview client use `http://127.0.0.1:65101`. The backend authoring database is a uniquely named file beneath `backend/.tmp/`, never the normal development database.

## Invariants and Scope Boundaries

Keep Strapi 5, Next.js SSR plus ISR, `"use cache"`, on-demand `revalidateTag`, and the raw client-to-mapper-to-connector-to-data flow intact. Every added CMS route is request-rendered with `io()`. The sitemap remains request-rendered with `connection()`. The only frontend content routes after this task are `/`, `/chi-siamo`, `/attivita`, `/notizie`, and `/notizie/[slug]`; `/articles`, `/events`, and `/news` are removed without redirects.

Do not create seed content, media placeholders, PDFs, archives, a custom theme, fonts, a crest, responsive high-fidelity sections, browser tests, backend tests, redirects, `generateStaticParams`, or static export. Using Playwright CLI to author schemas in the official admin is implementation, not an automated browser test. README changes are limited to correcting the Preview paragraph and replacing its nonexistent `cms/cache.ts` checklist entry with the actual `cms/data.ts`/`cms/tags.ts` ownership. Preserve unrelated worktree changes. Do not expose actual people or contacts: this task supplies schemas and fixtures only, and any fixture names remain obviously synthetic. Keep `NEXT_PUBLIC_APP_VERSION` visible in the existing footer while changing its navigation labels.

Do not install system packages, alter machine/user environment variables, change dependency versions, or modify either lockfile. Do not print or stage `backend/.env` or `frontend/.env.development`. The Coordinator's current `frontend/cms/schema.json` and `schema.d.ts` modifications are task-related but provisional and must be overwritten by final generation; `.agents/skills/imagen/scripts/` remains unrelated and untouched.

Content-type changes are explicitly pre-authorized by the task prompt and `PLAN.md`. The missing `BRIEF.md` is not a request for the implementer to create a replacement.

## Content Model and Public Interfaces

Update `backend/src/components/identity/slug.json` so `slug` is a required unique string of 3 to 120 characters and `title` is a required string of at most 160 characters. Remove obsolete `backend/src/components/shared/hero.json` and `backend/src/components/shared/section.json` after no schema references them.

Use the Content-Type Builder to create one component for each cohesive nested model below and confirm that it persists the named file. Names in parentheses are fields; strings are required unless marked optional. Text means multi-line Strapi text, blocks means Strapi rich-content blocks, image means one image media item, and file means one file media item.

- `backend/src/components/content/metric.json`: `value` and `label`.
- `backend/src/components/content/institutional-quote.json`: `text`, `attribution`, and optional `role`.
- `backend/src/components/content/activity-teaser.json`: optional `eyebrow`, required `title`, required `summary`, and optional image.
- `backend/src/components/content/timeline-entry.json`: `year`, `title`, and `body` text.
- `backend/src/components/content/value.json`: `title` and `body` text.
- `backend/src/components/content/board-member.json`: `name`, `role`, `bio` text, and optional portrait image.
- `backend/src/components/content/facility.json`: `name`, `summary` text, `address`, and optional image.
- `backend/src/components/content/sport-program.json`: `group` enum (`youth-football`, `competitive-football`, `athletics`, `community`), `title`, optional `audience`, `summary` text, and optional image.
- `backend/src/components/content/schedule.json`: `title`, `days`, `time`, and `venue`.
- `backend/src/components/content/venue.json`: `name`, `address`, and `details` text.
- `backend/src/components/content/feature.json`: optional `eyebrow`, `title`, `body` text, and optional image.
- `backend/src/components/content/registration-step.json`: required integer `order` with minimum 1, `title`, `body` text, and optional `note`.
- `backend/src/components/content/call-to-action.json`: `label` and `url`.

Use conservative maximum lengths on label/title/URL fields where Strapi supports them, but do not shorten the editorial text. Every repeatable field described as required below has a minimum of one item. Component display names should be clear English developer names; all end-user content and route labels are Italian.

Replace or create these content types, their factory controller/route/service files, and no low-level custom endpoints:

- `home-page` is a Draft & Publish single type with required `eyebrow`, `headline`, `introduction` text, required hero image, one required institutional quote, and required repeatable metrics and activity teasers with at least one entry each.
- `about-page` is a Draft & Publish single type with required `eyebrow`, `headline`, `introduction` text, required hero image, required `history` blocks, required repeatable timeline entries, values, board members, and facilities, plus required `documentEyebrow`, `documentTitle`, and `documentIntroduction` text.
- `activity-page` is a Draft & Publish single type with required `eyebrow`, `headline`, `introduction` text, required hero image, required repeatable programs, schedules, venues, one required `openTeamFeature`, one required `athleticsFeature`, required `registrationIntroduction` text, and required repeatable registration steps. Programs carry the grouping enum; do not create a second activity collection.
- `news-item` remains a Draft & Publish collection type with required identity, category, summary of at most 280 characters, editorial date, hero image, blocks content, and required `featured` boolean defaulting to false.
- `calendar-entry` is a Draft & Publish collection type with required `kind` enum (`match`, `result`, `event`), required `startsAt` datetime, competition, title, venue, summary of at most 280 characters, optional home/away team strings, optional non-negative integer home/away scores, and one optional call to action.
- `official-document` is a Draft & Publish collection type with required title, category, season, one required file media item, and required non-negative integer `displayOrder` defaulting to zero. The editorial contract is PDF-only. Strapi's `files` media category cannot express one MIME subtype, so validate `application/pdf` again at the frontend mapper trust boundary.

Delete all of `backend/src/api/article/` and `backend/src/api/event/`. Update the existing home and news APIs in place; add `about-page`, `activity-page`, `calendar-entry`, and `official-document`. Do not retain aliases or migration shims because no dataset belongs to this task.

Create root `TYPES.md` as the human-readable content contract. It must document every content type and reusable component above, including cardinality, required/optional status, enums, Draft & Publish behavior, image/file restrictions, route/read consumers, and the frontend DTO/read names. It must state that calendar and official-document previews render through `/notizie`, and that presentation/media/seed details belong to later tasks. Do not turn `TYPES.md` into implementation narration or duplicate generated TypeScript declarations.

In `frontend/cms/model.ts`, retain the reusable rich-text and media DTOs, add a generic uploaded `FileDto` with required `url`, `name`, and `mime` plus optional `ext` string and `size` number, and define immutable-by-convention DTO shapes corresponding one-for-one to the components. The required top-level interfaces and discriminants are:

    interface HomePageDto { pageType: "home"; eyebrow: string; headline: string; introduction: string; heroImage: ImageDto; metrics: MetricDto[]; institutionalQuote: InstitutionalQuoteDto; activityTeasers: ActivityTeaserDto[] }
    interface AboutPageDto { pageType: "about"; eyebrow: string; headline: string; introduction: string; heroImage: ImageDto; history: BlocksDto; timeline: TimelineEntryDto[]; values: ValueDto[]; boardMembers: BoardMemberDto[]; facilities: FacilityDto[]; documentEyebrow: string; documentTitle: string; documentIntroduction: string }
    interface ActivityPageDto { pageType: "activity"; eyebrow: string; headline: string; introduction: string; heroImage: ImageDto; programs: SportProgramDto[]; schedules: ScheduleDto[]; venues: VenueDto[]; openTeamFeature: FeatureDto; athleticsFeature: FeatureDto; registrationIntroduction: string; registrationSteps: RegistrationStepDto[] }
    interface NewsDto { pageType: "news-detail"; identity: IdentityDto; category: string; summary: string; editorialDate: string; heroImage: ImageDto; content: BlocksDto; featured: boolean }
    interface NewsListItemDto { identity: IdentityDto; category: string; summary: string; editorialDate: string; heroImage: ImageDto; featured: boolean }
    interface CalendarEntryDto { kind: "match" | "result" | "event"; startsAt: string; competition: string; title: string; homeTeam?: string; awayTeam?: string; homeScore?: number; awayScore?: number; venue: string; summary: string; callToAction?: CallToActionDto }
    interface OfficialDocumentDto { title: string; category: string; season: string; file: FileDto; displayOrder: number }
    type CmsPageDto = HomePageDto | AboutPageDto | ActivityPageDto | NewsDto

The public cached reads in `frontend/cms/data.ts` must be named exactly `getHomePage`, `getAboutPage`, `getActivityPage`, `getNewsBySlug`, `listNews`, `listCalendarEntries`, and `listOfficialDocuments`. Matching methods exist on `CmsClient` and `CmsConnector`. The three singleton reads and news detail receive an explicit `ContentStatus` at those lower layers. Calendar and document lists also receive status because their Draft Mode previews render through `/notizie`. `listNews` is always published: unpublished news is previewed at its detail route, and the sitemap must never include drafts. Lists have deterministic queries: news by `editorialDate:desc`, calendar by `startsAt:asc`, and documents by `displayOrder:asc` then `title:asc`, all with page size 100 and the media/component population needed by their mapper. Detail queries populate every nested component and media field explicitly. Continue using the existing bracket serializer and narrow `deepQuery` type escape because generated OpenAPI cannot describe Strapi's nested query language.

Use these cache tags consistently: `home-page`, `about-page`, `activity-page`, `news`, `news:<slug>`, `calendar-entries`, and `official-documents`. `frontend/cms/tags.ts` is the sole model-to-tag policy: home/about/activity map to their single tag; news maps to collection plus item tag when identity slug exists; calendar and document map to their collection tags. Routes can combine cached reads; do not add downstream duplicate tag policy.

## Risks and Mitigations

The highest implementation risk is contract drift among Content-Type Builder output, generated declarations, raw query aliases, and handwritten mappers. Control it by finishing the model through the official builder first, inspecting its persisted worktree output, generating types before client edits, never hand-editing generated files, and running generation again in final validation. If the builder demonstrably cannot express one required constraint, document evidence before the smallest direct schema edit.

Draft content could leak into published cache entries if request state is read inside one cache scope or omitted from a private cached function's arguments. For singleton/detail and calendar/document reads, keep `draftMode()` in the public wrapper and pass `ContentStatus` into the cached worker so Next includes it in the cache key. Keep `listNews` explicitly published for both the hub and sitemap. Webhooks deliberately invalidate all representations by shared tags.

Deep Strapi populate/filter parameters are not represented precisely by OpenAPI. Keep the existing single `deepQuery` cast and prove emitted URLs in `client.test.ts`; do not spread unchecked casts through the client.

An empty database contains no pages, so frontend routes would correctly return not found or empty sections if manually opened. Task 01 proves frontend behavior with typed fixtures and a production build; populated visual verification belongs to task 02 and later page tasks. Do not seed temporary content merely to make this task look complete.

Previewing a calendar entry or PDF at `/notizie` intentionally selects draft status for only the calendar and official-document lists. News remains published-only in the same aggregate. This lets an authenticated editor review the two collections that lack detail routes without ever admitting draft news into the hub or sitemap.

The task-owned admin database and browser session are stateful authoring tools. Use one uniquely named database beneath `backend/.tmp/`, one semantic Playwright session name, and the same running Strapi process until the model is saved. Cleanly close the browser and stop Strapi before deleting only the exact authoring database. Browser interaction here changes the schema through official Strapi mechanisms; it is not an automated browser acceptance test.

Native OpenAPI generation changes `publishedAt` defaults on each run, so byte equality is not an idempotence criterion. The criterion is that the final native schema describes the final model, `fe:openapi` formats both generated files, and all downstream checks pass without a custom normalizer.

## Plan of Work

### Milestone 0: Establish the reproducible runtime and local environment

First edit only task-owned tooling: set `[tools] node = "24.20.0"` in `mise.toml`; change backend's `types` script to `strapi ts:generate-types`; and change frontend's `openapi` script so the existing type generation is followed by `biome format --write cms/schema.json cms/schema.d.ts`. Do not change a package version or either lockfile. Run `mise install`, verify Node reports `v24.20.0`, then run lockfile-only `npm ci` in `backend/` and `frontend/`. Verify `better-sqlite3` loads under the configured runtime.

Before any frontend edit, read `frontend/AGENTS.md` and the complete installed Next.js documents for Draft Mode, `use cache`, `cacheLife`, `cacheTag`, `revalidateTag`, `io`, `connection`, and sitemap listed in `Concrete Steps`. These local pages match pinned Next.js 16.3.1 and take precedence over remembered behavior.

Verify `backend/.env` and `frontend/.env.development` exist without printing them. They are already present in this worktree. If either is absent, copy only its `.env.example` counterpart after an existence check, fill it with dummy non-production values, and never overwrite an existing file. Bind backend to `127.0.0.1:65100`; configure its database beneath `.tmp/`, its Next webhook target and Preview client URL to `http://127.0.0.1:65101`, and matching local preview/webhook secrets. Bind frontend to `127.0.0.1:65101`, point CMS URLs at backend 65100, and use site URL `http://127.0.0.1:65101`. Keep both files ignored, secret-free from logs, and unstaged.

This milestone is complete when canonical Mise commands use Node 24.20.0, both clean installs succeed, the native module loads, local env presence is confirmed without disclosure, package lockfiles are unchanged, and the Worker has read every required local Next.js page.

### Milestone 1: Establish the final Strapi contract through Content-Type Builder

Read the `playwright-cli` skill and its session-management reference completely before browser use. Create a unique authoring directory under `backend/.tmp/`, point the ignored backend env at its relative SQLite filename or use a process-local override for that one run, and start `mise run be:dev` on `127.0.0.1:65100`. Wait for `Strapi started successfully`; keep this development process running because Content-Type Builder mutations require auto-reload.

Open `http://127.0.0.1:65100/admin` with the fixed Playwright CLI configuration in a named, in-memory session such as `task-01-strapi-schema`:

    playwright-cli -s=task-01-strapi-schema open http://127.0.0.1:65100/admin

Use snapshots and their element references to authenticate with the dummy local admin defined by `backend/.env`, without copying credentials into the plan, evidence, or chat. Use the Content-Type Builder UI for component/content-type create, update, and delete operations. Its authenticated development-only admin routes persist the schemas and factory APIs. Create reusable components before content types that reference them; then create/update the six target content types, inspect their advanced validation settings, and delete Article and Event. Allow each auto-reload to settle before the next snapshot. Inspect `git status` and the affected `backend/src/` files after saves to prove persistence.

Direct schema JSON edits are not the default. If and only if the official builder cannot express a required constraint, capture the attempted UI path and snapshot/response symptom, identify the exact missing constraint and file, add an entry to this plan's `Surprises & Discoveries` and `Decision Log`, and make only the smallest direct edit. Do not use direct edits merely because they are faster. End schema authoring with:

    playwright-cli -s=task-01-strapi-schema close

Confirm `playwright-cli list` no longer shows that session, stop Strapi cleanly, and preserve the authoring database until persisted schemas have been built and inspected. Browser use ends here; no browser test or visual validation is added.

After the builder output exists, update `backend/config/admin.ts` so native Preview accepts the three institutional UIDs, `news-item`, `calendar-entry`, and `official-document`. Return `/`, `/chi-siamo`, and `/attivita` for the single types; look up and validate the populated identity slug only for news and return `/notizie/<encoded slug>`; return `/notizie` for calendar and official-document. Continue requiring an absolute `PREVIEW_CLIENT_URL`, a nonempty shared secret, a recognized draft/published status, and a document id. Unknown UIDs or malformed entries return `null` without leaking content.

Write `TYPES.md` while the model is fresh. In `README.md`, change only the Preview paragraph to describe institutional/news detail previews plus aggregate calendar/document preview, and correct the adding-a-content-type checklist so cached reads/tags refer to the real `cms/data.ts` and `cms/tags.ts` files rather than nonexistent `cms/cache.ts`. Then run backend type generation and build. Inspect generated declarations to ensure new component/content UIDs exist and Article/Event UIDs do not. There are deliberately no Strapi tests.

This milestone is complete when the builder-authored model and factory APIs are persisted, the browser session and development server are closed, backend generation/build succeeds, generated types match the model, the narrowly authorized docs are accurate, and no legacy Article/Event source remains.

### Milestone 2: Regenerate API contracts and replace the frontend data pipeline

Generate `frontend/cms/schema.json` from the final Strapi model, overwriting the Coordinator's provisional baseline output, then run `fe:openapi` to generate `frontend/cms/schema.d.ts` and format both files before rewriting imports against new paths. Treat both as generated artifacts. Update `frontend/cms/client.ts` with raw aliases and seven methods, explicit populate trees, status parameters, deterministic sorts, and not-found behavior for the news slug query. Remove Article/Event methods and types.

Refactor `frontend/cms/mappers.ts` rather than layering new code over the template model. Retain the existing small record/array/scalar/rich-text/media parsing primitives and deep freezing. Add parsers for every new component and top-level DTO, and normalize image/file URLs against `CMS_MEDIA_URL`. Validate `editorialDate` as a real calendar date in exact `YYYY-MM-DD` form, including month/day validity, and `startsAt` as a valid ISO datetime with an explicit time and offset or `Z`; reject impossible or unparsable values. Validate enum values, numeric fields, and official-document MIME `application/pdf`. Draft leniency may normalize absent required scalar text to empty strings and absent blocks/repeatables to empty arrays, but it must not fabricate an `ImageDto` or `FileDto`. Required hero media and PDFs remain required at mapping time under the exact non-optional DTO interfaces in this plan. Keep published validation strict and do not invent broader domain validation.

Update `frontend/cms/connector.ts` with one mapping path per client result. In `frontend/cms/data.ts`, make singleton/detail and calendar/document public reads inspect `draftMode()` outside their private cached worker; pass the resulting status as an argument so draft and published values are different cache entries. `listNews` calls a published-only cached worker and is therefore safe for both `/notizie` and the sitemap. Every private worker contains `"use cache"`, `cacheLife("days")`, and the applicable tags. Preserve current not-found-to-null for singleton/detail reads, not-found-to-empty-list for lists, and cause-preserving errors for unavailable or invalid upstream data.

Update webhook payload typing only as far as the generated identity type requires, and update `frontend/cms/tags.ts` with the authoritative mapping above. Keep `frontend/app/refresh/route.ts` secret checks, accepted events, and `revalidateTag(tag, "days")` behavior unchanged unless generated typing forces a mechanical adjustment.

Rewrite the stable boundary tests rather than preserving obsolete assertions. `frontend/cms/client.test.ts` proves nested bracket serialization, each endpoint path, draft/published status, slug filtering, population of representative nested media/components, and the three deterministic list sorts. `frontend/cms/mappers.test.ts` proves one fully nested institutional mapping with normalized media URLs; strict rejection of malformed published data, invalid/impossible editorial dates, and invalid ISO datetimes; permitted draft normalization for missing scalars/blocks/repeatables; rejection of missing required draft image/file media; calendar enum/optional score handling; and PDF file mapping/rejection. `frontend/cms/tags.test.ts` proves every known model mapping, the news item tag, missing-slug behavior, and unknown-model behavior. Keep `frontend/cms/webhook.test.ts` focused on payload shape rather than duplicating tag tests.

This milestone is complete when both provisional generated files have been overwritten and formatted, the seven reads compile solely against the final generated types, the date/media mapper boundaries are covered, and the focused Vitest suite passes without Article/Event fixtures or methods.

### Milestone 3: Install secure Italian preview paths

Replace `frontend/cms/preview.ts`'s English path grammar with a closed union of `/`, `/chi-siamo`, `/attivita`, `/notizie`, and `/notizie/<one encoded slug segment>`. Static paths must match exactly. The news path must retain the current defenses against absolute/protocol-relative URLs, query strings, fragments, extra segments, malformed percent escapes, dot segments, encoded slash, and encoded backslash. `frontend/app/preview/route.ts` continues to validate the shared secret, enable or disable Draft Mode from `status`, and redirect only to the parser's canonical result. Exiting preview continues to disable the cookie and redirect to `/`.

Update `frontend/cms/preview.test.ts` to cover every allowed static route, a news slug containing a space, published mode, invalid credentials/status, the old English routes, and the unsafe targets above. Do not add separate preview endpoints.

This milestone is complete when native Strapi preview targets only Italian routes and the parser tests demonstrate that no open redirect or extra route is accepted.

### Milestone 4: Replace frontend routes and add minimal renderers

Remove `frontend/app/(content)/articles/`, `events/`, and `news/` and the obsolete `frontend/components/articles/` and `events/` modules. Rehome news presentation under `frontend/components/news-detail/page.tsx` for a single article and `frontend/components/notizie/list-page.tsx` for the aggregate. Add minimal page modules under `frontend/components/about/page.tsx` and `frontend/components/activity/page.tsx`; replace the home renderer to accept the new DTO. Keep each module server-renderable. Use headings, lists, `next/image` where media is present, and the existing `Blocks` renderer; no page needs client JavaScript in this task.

Each institutional renderer should expose every major DTO section with uncomplicated semantic markup so absent later styling cannot hide mapping errors. Collections and optional images/fields must degrade to omitted elements or an Italian empty message. The Notizie list renderer receives all three arrays in one props object, groups calendar entries by kind, links news to `/notizie/<slug>`, and links PDFs to their normalized file URL. It remains a direct list render and never passes through `PageSwitch`.

Update `frontend/components/page-switch.tsx` to exhaustively dispatch `home`, `about`, `activity`, and `news-detail`. Add routes `frontend/app/(content)/chi-siamo/page.tsx`, `attivita/page.tsx`, `notizie/page.tsx`, and `notizie/[slug]/page.tsx`, plus restrained loading modules where the deleted routes had them. Every page component calls `await io()` before its CMS read. The aggregate uses `Promise.all` for news, calendar, and documents. The detail returns `notFound()` for a missing slug. Export basic static Italian `Metadata` for the three institutional routes and the aggregate so metadata cannot introduce a build-time CMS read; news detail metadata may use its already dynamic slug read. Leave complete canonical/Open Graph/structured-data work to task 08.

Update `frontend/app/sitemap.ts` to call `await connection()` and return the four top-level URLs plus every published news detail URL. Remove Article/Event entries. Keep `frontend/app/robots.ts` canonical and CMS-independent. Set `<html lang="it">` and replace template metadata with restrained U.S. Albatese defaults. Update only the names and targets in `frontend/components/layout/site-nav.tsx`, `site-header.tsx`, and `site-footer.tsx` to point at Home, Chi siamo, Attività, Notizie, and `#contatti`; add `id="contatti"` to the existing footer, and retain its layout styling and visible `NEXT_PUBLIC_APP_VERSION` because task 03 owns the final chrome.

This milestone is complete when the frontend has no old route directory or old PageSwitch case, every CMS page opts into request-time rendering, the aggregate is the sole list exception, and a production build completes without requiring a live CMS at build time.

### Milestone 5: Validate, review, and hand off for the Coordinator's local commit

Run the exact validation sequence below from a cleanly understood worktree, fixing failures in the owning layer. Record command results and any meaningful discoveries in this file. Confirm the final diff contains the plan, model, generated artifacts, pipeline, routes, minimal renderers, and tests only; it must exclude `.agents/skills/imagen/scripts/` and all later-task work.

Planner, Worker, and Reviewer do not commit or push. After independent approval, the Coordinator updates only permitted bookkeeping, stages task 01 files and the plan while excluding unrelated changes, creates the isolated local commit titled `01 — Replace the template domain with the U.S. Albatese CMS pipeline`, records that pushing was intentionally skipped, and may continue to task 02.

## Concrete Steps

Work from `/home/codex/src/us-alb`. Before edits, run:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main

Expect `main` at `15e956a34c8ff75da9efe86d4aa8e3da12424693`, equal to `origin/main`. Current task-related state includes this untracked plan and provisional Coordinator-generated modifications to `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`; unrelated untracked `.agents/skills/imagen/scripts/` remains untouched. Preserve any newer unrelated changes and stop only if they overlap files in this plan.

Apply the runtime and script corrections first: set exact Node 24.20.0 in `mise.toml`, replace only `ts:generate-type` with `ts:generate-types` in `backend/package.json`, and make the frontend `openapi` script format both `cms/schema.json` and `cms/schema.d.ts`. Then run:

    mise install
    mise exec -- node --version
    cd /home/codex/src/us-alb/backend && mise exec -- npm ci
    cd /home/codex/src/us-alb/frontend && mise exec -- npm ci
    cd /home/codex/src/us-alb
    mise exec -- node -e "require('./backend/node_modules/better-sqlite3'); console.log('better-sqlite3 loaded')"
    git diff --exit-code -- backend/package-lock.json frontend/package-lock.json

Expect `v24.20.0`, the native-module confirmation, and no lockfile diff. Do not install `make`, bypass engines, or change dependency versions.

Verify the ignored local env files without printing their contents:

    cd /home/codex/src/us-alb
    test -e backend/.env || cp backend/.env.example backend/.env
    test -e frontend/.env.development || cp frontend/.env.example frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    test -z "$(git ls-files -- backend/.env frontend/.env.development)"

If a copy was necessary, edit that new ignored file locally to meet Milestone 0: dummy non-production secrets; matching preview/webhook values; backend host/port `127.0.0.1:65100`; frontend host/port and `SITE_URL` `127.0.0.1:65101`; CMS URLs pointing at 65100; and backend preview/webhook targets pointing at 65101. Never overwrite an existing env file, show it with `cat`/`sed`, echo secret values, or add it to Git.

Before frontend edits, read these pinned Next.js documents completely rather than relying on training data:

    cd /home/codex/src/us-alb
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/02-guides/draft-mode.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/draft-mode.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md
    sed -n '1,9999p' frontend/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md

For schema authoring, first read `/home/codex/.agents/skills/playwright-cli/SKILL.md` and its `references/session-management.md` completely. Create the task-owned authoring database directory:

    cd /home/codex/src/us-alb
    mkdir -p backend/.tmp
    authoring_dir="$(mktemp -d -p backend/.tmp task-01-authoring-XXXXXX)"
    authoring_db="${authoring_dir#backend/}/data.db"

In terminal A, start Strapi development and leave it running:

    DATABASE_FILENAME="$authoring_db" mise run be:dev

After `Strapi started successfully`, use terminal B and the named session for every browser command:

    cd /home/codex/src/us-alb
    playwright-cli -s=task-01-strapi-schema open http://127.0.0.1:65100/admin
    playwright-cli -s=task-01-strapi-schema snapshot

Authenticate with the ignored dummy admin values without putting their expanded values in recorded commands or evidence. In terminal B, disable shell tracing, export the ignored file's values with `set -a; . backend/.env; set +a`, derive the login as `${ADMIN_USER}@${ADMIN_DOMAIN}`, and pass only the literal shell-variable references to snapshot-ref `fill` commands; do not echo either value, capture a secret-bearing trace, or store the credentials in the plan. Unset the three admin variables after login. Use fresh snapshot refs to operate Content-Type Builder, checking the worktree after saves. When the full model and legacy deletions are persisted, close and verify cleanup:

    playwright-cli -s=task-01-strapi-schema close
    playwright-cli list

Stop terminal A with Ctrl-C. If the named session remains, close it explicitly; use `kill-all` only for a genuinely unresponsive leftover. Do not delete the authoring database until backend generation/build proves the persisted model. If a builder limitation requires direct JSON, first update this living plan with the evidence and decision required by Milestone 1.

After schema authoring, preview configuration, `TYPES.md`, and the two narrow README fixes, generate and build:

    cd /home/codex/src/us-alb
    mise run be:types
    mise run be:build
    mise run be:openapi
    mise run fe:openapi

These commands overwrite both provisional generated frontend schema files. Do not restore their baseline timestamp-only diff. Implement the frontend pipeline, routes, renderers, and tests against this final formatted contract.

For final empty-database validation, create a second relative directory and run the canonical development task:

    cd /home/codex/src/us-alb
    validation_dir="$(mktemp -d -p backend/.tmp task-01-empty-validation-XXXXXX)"
    validation_db="${validation_dir#backend/}/data.db"
    DATABASE_FILENAME="$validation_db" mise run be:dev

Wait for `Strapi started successfully` without schema/bootstrap errors, then stop with Ctrl-C and confirm the exact database exists. Resolve each cleanup target with `realpath`; remove it only when it begins with `/home/codex/src/us-alb/backend/.tmp/task-01-empty-validation-` or `/home/codex/src/us-alb/backend/.tmp/task-01-authoring-`, respectively. Never delete `backend/.tmp` broadly. Record readiness and cleanup, not secret-bearing output.

Run the final validation sequence from `/home/codex/src/us-alb`:

    mise run be:types
    mise run be:build
    mise run be:openapi
    mise run fe:openapi
    mise run fe:check
    mise run fe:build
    cd frontend && npm test

Return to the repository root and perform focused structural checks:

    test ! -e backend/src/api/article
    test ! -e backend/src/api/event
    test ! -e frontend/app/'(content)'/articles
    test ! -e frontend/app/'(content)'/events
    test ! -e frontend/app/'(content)'/news
    test ! -e frontend/components/articles
    test ! -e frontend/components/events
    test ! -e frontend/components/news
    rg -n 'generateStaticParams' frontend --glob '!cms/schema.json' --glob '!cms/schema.d.ts'
    rg -n 'output:[[:space:]].*export' frontend/next.config.ts
    rg -n 'Article and News Preview|cms/cache\.ts' README.md
    git diff --exit-code -- backend/package-lock.json frontend/package-lock.json
    git check-ignore backend/.env frontend/.env.development
    test -z "$(git ls-files -- backend/.env frontend/.env.development)"
    playwright-cli list
    git status --short
    git diff --check

The first eight `test ! -e` commands and both env checks must exit zero. All three `rg` commands must produce no matches. The lockfiles must have no diff. `playwright-cli list` must show no `task-01-strapi-schema` session. `git status` must still show `.agents/skills/imagen/scripts/` as unrelated and untracked; it must show the intended task changes, including `mise.toml`, the two package scripts, this plan, final generated artifacts, schema/API/pipeline/route/test changes, `TYPES.md`, and only the two authorized README sections. It must not show either ignored env file. `git diff --check` must print nothing.

## Validation and Acceptance

Acceptance is behavioral and contract-based:

1. `mise.toml` selects exact Node 24.20.0; clean `npm ci` succeeds in both packages; pinned `better-sqlite3@12.8.0` loads; no system package, dependency version, or lockfile changes were introduced. `backend/package.json` uses `strapi ts:generate-types`, and frontend `openapi` formats both generated schema files.
2. `backend/.env` and `frontend/.env.development` remain ignored, untracked, unprinted, and loopback-only with backend 65100 and frontend/site/preview 65101. Existing files were not overwritten. The final diff contains no secret value.
3. Worktree evidence shows the schemas and factory APIs were persisted by authenticated Content-Type Builder create/update/delete operations while Strapi ran in development mode. The Worker read the Playwright skill, used and closed named session `task-01-strapi-schema`, and added no browser test. Any direct JSON exception has specific builder-failure evidence and a recorded decision; absent such evidence, there is no direct schema authoring.
4. Starting Strapi 5.52.0 against a second brand-new SQLite database on `127.0.0.1:65100` reaches `Strapi started successfully` with all six target content types and no schema/bootstrap error, then shuts down and removes only its exact temporary database. No backend test suite is added or run.
5. `mise run be:types`, `mise run be:build`, and `mise run be:openapi` succeed. Generated backend and OpenAPI artifacts expose home, about, activity, news, calendar, and official-document schemas/endpoints and expose no Article or Event content type/endpoint.
6. `mise run fe:openapi`, `mise run fe:check`, and `mise run fe:build` succeed. Both provisional Coordinator-generated schema files have been overwritten by final native output and formatted. Generation-time `publishedAt` defaults may differ from earlier runs and are accepted; there is no normalizer or manual generated-file edit. The build does not contact a live Strapi instance, demonstrating that every CMS-backed static-looking route uses `io()` and the sitemap uses `connection()`.
7. `cd frontend && npm test` passes all Vitest unit tests. The test names/count may change from the 34/34 baseline; record the actual final count. Coverage includes mapper validation, query serialization/population/status, preview path security, webhook parsing, and model-to-cache-tag mapping, with no visual assertions or external processes. Mapper tests prove real `YYYY-MM-DD` and ISO-datetime validation, allowed draft scalar/block/repeatable normalization, and rejection rather than fabrication of missing required draft images/PDFs.
8. Source inspection shows exactly the Italian route surface. `/notizie` directly renders the aggregate list, `/notizie/[slug]` renders through `PageSwitch`, and the three institutional pages render through `PageSwitch`. No route, redirect, sitemap URL, navigation link, or preview target remains for `/articles`, `/events`, or frontend `/news`.
9. The exported DTOs and cached read methods have the exact names and discriminants in `Content Model and Public Interfaces`. Draft Mode can address all three institutional pages and news details. At `/notizie`, it selects draft status only for calendar and official-document lists; `listNews` remains published-only for the hub and sitemap. Status-aware published and draft reads do not share a cache key, and webhook changes invalidate the owning collection/singleton tags.
10. `TYPES.md` is complete enough for task 02 to create valid content without inspecting JSON schemas. `README.md` changes only its now-false Preview statement and nonexistent `cms/cache.ts` checklist reference. Later visual tasks can render all reference sections without another content-model change.
11. The renderers are visibly minimal and semantic. They do not include generated media, sample PDFs, synthetic season data, Epilogue/Manrope installation, design tokens, responsive reference matching, or new UI packages.
12. The final diff preserves the existing stack, the visible footer version, all unrelated user changes, and especially untracked `.agents/skills/imagen/scripts/`. It excludes both ignored env files and contains no lockfile change.

## Idempotence and Recovery

Content-Type Builder operations, generators, checks, and tests are repeatable at the model level, but native OpenAPI output is not byte-idempotent: it embeds generation-time `publishedAt` defaults (26 such defaults in the baseline). Always keep the final native `be:openapi` output and run `fe:openapi` to format both JSON and declarations. Do not add a timestamp normalizer, restore an earlier generated file, or hand-edit generated output. If a generator fails, fix its source model, script, or local env input and rerun it.

The authoring and empty-validation databases use distinct `mktemp -d -p backend/.tmp` directories and port 65100. They never point at the ordinary development database. If Content-Type Builder auto-reload interrupts the UI, keep the named browser session, wait for Strapi readiness, reload, and continue from a fresh snapshot. If browser state becomes stale, close only `task-01-strapi-schema` and reopen it; use `kill-all` only for an unresponsive daemon. Stop Strapi before resolving and removing only a directory with the exact task prefix. If startup is interrupted, preserve that directory for diagnosis or make a new validation directory; never delete `backend/.tmp` broadly.

If an env file is missing, copying its example is recoverable because the existence guard prevents overwrite. Populate only dummy local values, keep the file ignored, and never disclose it. If either file already exists but lacks a required value, edit that existing ignored file narrowly; do not replace it wholesale. Before handoff, `git check-ignore` and `git ls-files` must prove both remain ignored and untracked.

If Node 26 is accidentally used, do not retry backend install with engine bypasses or compilation flags. Confirm `mise.toml` is at 24.20.0, run `mise install`, and repeat `npm ci` under `mise exec`. If either lockfile changes, restore only that accidental lockfile delta with a non-destructive patch after verifying no intended dependency change exists.

If the builder cannot express a required field constraint, do not abandon the official workflow wholesale. Preserve the builder-produced model, record exact evidence in this plan, make the minimum direct schema correction, then prove it with type generation, build, a fresh empty database, and generated API artifacts. Without that evidence, direct JSON is out of scope.

Deleting the legacy APIs and routes is intentional but should occur only after the new schemas and typed pipeline are in place or in one clearly reviewable change. Recovery is by restoring the deleted files from Git while preserving new files, never by resetting the worktree. No content migration is needed because seed/archive work belongs to task 02.

Do not stage, commit, push, switch branches, or update `TODOS.md` while acting as Planner, Worker, or Reviewer. The Coordinator alone performs the approved isolated local commit and tracker bookkeeping. No role pushes this task under the user override.

## Artifacts and Notes

The authoritative generated artifacts are `backend/types/generated/components.d.ts`, `backend/types/generated/contentTypes.d.ts`, `frontend/cms/schema.json`, and `frontend/cms/schema.d.ts`. They must be included in the eventual task commit because they document the API surface consumed by the frontend. The current frontend schema modifications are provisional baseline output and are not evidence of the final model; final generation overwrites them.

Use `design/reference/home*/code.html`, `chi_siamo*/code.html`, `attivit_squadre*/code.html`, and `notizie_calendario*/code.html` only to confirm content coverage in this task. Do not copy their external images, CDN scripts, hard-coded real-person claims, old dates, or contradictory addresses into production fixtures.

The context lookup quota failure is an environment limitation, not permission to upgrade dependencies or guess a new API. The pinned code already demonstrates the project-approved Strapi Preview handler, Document Service, Next Draft Mode, cache, `io()`, `connection()`, and revalidation forms. If implementation reveals an API question those examples cannot answer, report the Context7 quota and request `ctx7 login` or `CONTEXT7_API_KEY` rather than silently relying on stale documentation.

## Interfaces and Dependencies

Use exact Mise Node 24.20.0 with the pinned dependencies already present: Strapi 5.52.0, `better-sqlite3` 12.8.0, Next.js 16.3.1, React 19.2.8, `openapi-fetch`, `openapi-typescript`, Tailwind CSS 4, Biome, TypeScript, and Vitest. Add no package and change no lockfile. The official Content-Type Builder owns schema/factory authoring while Strapi development runs on `127.0.0.1:65100`; its persisted factory modules continue to use `factories.createCoreController`, `createCoreRouter`, and `createCoreService` with each new UID. The fixed Playwright CLI browser at `~/.local/bin/uchromium/152` is used only through the skill-prescribed named session and unchanged headless configuration. The frontend continues to construct one frozen `CmsClient` and one frozen `CmsConnector` in `frontend/deps.ts`.

The task-owned tooling interface is exact: `mise.toml` contains `node = "24.20.0"`; backend's `types` package script invokes `strapi ts:generate-types`; and frontend's `openapi` package script retains `openapi-typescript cms/schema.json -o cms/schema.d.ts` and then formats both `cms/schema.json` and `cms/schema.d.ts`. These are script-only repairs. Dependency declarations and both lockfiles remain byte-unchanged.

The local runtime interface is also fixed. Ignored `backend/.env` supplies loopback host/port 65100, the unique relative SQLite filename or its process-local override, dummy Strapi/admin secrets, a webhook target on frontend port 65101, `PREVIEW_CLIENT_URL=http://127.0.0.1:65101`, and its matching preview secret. Ignored `frontend/.env.development` supplies nonempty dummy values for every variable required by `frontend/config.ts`, CMS API/media URLs on backend port 65100, matching webhook/preview values, and `SITE_URL=http://127.0.0.1:65101`; any frontend development process binds to `127.0.0.1:65101`. Neither file is a source artifact or may be printed or staged.

At the end of implementation, `CmsClient` and `CmsConnector` expose these signatures, with raw generated types on the client and DTO types on the connector:

    getHomePage(status: ContentStatus)
    getAboutPage(status: ContentStatus)
    getActivityPage(status: ContentStatus)
    getNewsBySlug(slug: string, status: ContentStatus)
    listNews()
    listCalendarEntries(status: ContentStatus)
    listOfficialDocuments(status: ContentStatus)

At the page-facing boundary, `frontend/cms/data.ts` exposes:

    getHomePage(): Promise<HomePageDto | null>
    getAboutPage(): Promise<AboutPageDto | null>
    getActivityPage(): Promise<ActivityPageDto | null>
    getNewsBySlug(slug: string): Promise<NewsDto | null>
    listNews(): Promise<NewsListItemDto[]>
    listCalendarEntries(): Promise<CalendarEntryDto[]>
    listOfficialDocuments(): Promise<OfficialDocumentDto[]>

Keep the current `Result<T>` error model and the `mapSingle`/`mapList` connector behavior. Invalid payloads are validation failures, missing singleton/detail data becomes `null`, missing lists become empty arrays, and dependency unavailability throws an error with the structured problem retained as its cause.

At the mapper interface, `editorialDate` is accepted only when an exact `YYYY-MM-DD` string round-trips to a real Gregorian calendar date, and `startsAt` only when it is a parseable ISO datetime containing a time and explicit `Z` or numeric offset. Draft mapping may supply empty scalar text, blocks, and repeatable arrays where authoring is incomplete, but the non-optional `heroImage: ImageDto` and `file: FileDto` contracts never receive fabricated placeholder objects. Missing or malformed required image/PDF media remains a mapping validation failure in both statuses, and official-document files must map with MIME `application/pdf`.

Revision note (2026-10-08 / Planner): Created the initial self-contained task-01 ExecPlan after full repository and design inspection. Recorded the absent `BRIEF.md`, Context7 quota limitation, pre-existing untracked directory, final CMS/DTO contracts, preview and caching decisions, exact validation, and the user's local-commit/no-push ownership override.

Revision note (2026-10-08 / Planner, planning round 2): Replaced direct-first schema editing with official Content-Type Builder authoring through a named Playwright CLI session; added the proven Node 24.20.0/npm-ci/local-env prerequisites and script repairs; incorporated provisional generated-file and passing baseline evidence; corrected aggregate Draft Mode and mapper media/date boundaries; documented native OpenAPI timestamp non-idempotence; authorized only the two contradictory README corrections; and propagated these changes through progress, decisions, scope, milestones, commands, acceptance, recovery, dependencies, and handoff ownership.

Revision note (2026-10-08 / Worker): Completed Milestone 0 exactly as planned and recorded the verified Node, clean-install, native-module, ignored-env, lockfile, Playwright-skill, reference-HTML, and pinned Next.js documentation prerequisites before schema or frontend implementation.

Revision note (2026-10-08 / Worker): Completed official Content-Type Builder authoring and legacy deletion through the required named Playwright session, documented the builder's 255-character string limit and the resulting supported field choices, recorded the transient preview-type compile dependency, and confirmed no direct schema edit or browser test was used.

Revision note (2026-10-08 / Worker): Completed the typed frontend pipeline, Draft Mode/cache boundaries, Italian route and renderer replacement, content contract, native artifact generation, fresh-database proof, canonical validation, structural checks, and task-owned temporary-artifact cleanup; left independent review and Coordinator-only bookkeeping/commit pending.

Revision note (2026-10-08 / Worker, remediation cycle 1): Recorded the first independent review result and remediated all four findings by closing empty-date validation holes, adding repeatable-draft regression coverage, grouping and translating enum presentation, restoring the four planned loading modules, documenting every schema authoring limit, and rerunning proportionate canonical validation; independent re-review remains pending.

Revision note (2026-10-08 / Coordinator): Recorded independent Reviewer approval after remediation cycle 1, finalized Progress and Outcomes with the verified isolated validation evidence, and prepared the approved task for its Coordinator-owned local commit without a push under the user's explicit override.

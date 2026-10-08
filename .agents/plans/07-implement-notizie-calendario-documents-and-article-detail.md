# Implement Notizie, calendario, documenti e dettaglio articolo

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A fresh Worker must be able to implement and validate task 07 using only this file and the current working tree.

## Purpose / Big Picture

After this work, `/notizie` is the complete information hub for U.S. Albatese rather than a minimum data renderer. A visitor can scan upcoming matches, completed results, club events, published stories, and official PDF documents in one calm editorial page. Complete scores are unmistakable, incomplete result records say that the score is unavailable rather than showing a misleading half-score, every collection has a useful empty state, and every article or document link has a real destination.

The detail route `/notizie/[slug]` remains a single-document page dispatched through `PageSwitch`. It gains a high-fidelity article header, truthful hero image, rich Strapi Blocks body, useful return navigation, dynamic title/description metadata, and the established Strapi Preview to Next.js Draft Mode flow. Editors can preview a news draft at its encoded detail URL and can preview draft calendar/document collections through the aggregate hub. Published visitors continue to receive cached content that is invalidated by the existing signed webhook route.

At exactly 1600×900, the hub uses the accepted 1200px shell, an airy editorial introduction, three semantic calendar columns, a large lead story with a latest-news rail, and a restrained three-column document archive. At exactly 412×914, the same server-rendered tree becomes wrapped jump links, stacked match/result/event cards, one lead story followed by compact stories, and full-width document rows above the fixed shared navigation. The detail route becomes a wide editorial article at desktop and a single readable column at mobile.

This is a frontend route/presentation task. Inspection proves the approved schemas, archive content, DTOs, raw client, mappers, connector, cached reads, cache tags, webhook mapping, Preview handler, and Draft Mode route already express every required behavior. Do not change those contracts, the seeded archive, backend content types, or generated media. Do not call `imagegen` or `imagen`.

## Progress

- [x] (2026-10-08 19:59Z) Read root and frontend `AGENTS.md`, `.agents/docs/PLANS.md`, the complete `implement-task`, `canonical-validation`, and Playwright CLI skills plus relevant session-management, running-code, storage-state, and request-mocking references, `TODOS.md`, `PLAN.md`, `TYPES.md`, `design/DESIGN.md`, `design/HISTORY.md`, both Notizie/calendario reference HTML files, the complete task-02 archive/content plan, task-03 shared-chrome plan, task-04 through task-06 ownership plans and implementations, and the current Notizie/news-detail routes, metadata, Preview/Draft Mode, CMS pipeline, cache tags, webhook route, shared Blocks renderer, schemas, and tests.
- [x] (2026-10-08 19:59Z) Inspected branch/worktree state, the six approved local commits through `f02a0f2`, the sole unrelated untracked `.agents/skills/imagen/scripts/`, the approved archive identity, pinned Next.js/React/Tailwind versions, current Mise tasks, and installed official Next.js metadata, Draft Mode, `io()`, and image documentation.
- [x] (2026-10-08 19:59Z) Attempted the required Context7 Next.js lookup for dynamic metadata, Cache Components, `io()`, Draft Mode, and responsive image behavior; library resolution failed with the monthly-quota error, so this plan uses repository-pinned official Next.js 16.3.1 documentation rather than remembered syntax or web-search substitutes.
- [x] (2026-10-08 19:59Z) Resolved the exact authoritative grouping/order, score states, news lead/latest policy, direct PDF semantics, rich Blocks reuse, metadata fallbacks, preview behavior, cache-invalidation proof, responsive composition, accessibility/media behavior, sparse-draft/empty behavior, test boundary, artifact refresh, isolated runtime, cleanup, and Coordinator-only local-commit/no-push boundary in this ExecPlan. No implementation file, tracker, asset, server, branch, index, commit, or remote was changed by the Planner.
- [x] (2026-10-08 20:16Z) Implemented the pure calendar grouping, result-score, and featured-lead policies with exactly six focused Vitest cases; the focused run passed 1 file / 6 tests, including frozen-input non-mutation and the `0–0` score case.
- [x] (2026-10-08 20:20Z) Replaced the minimum `/notizie` renderer with the four-part responsive hub, preserved the direct collection route and tested presentation ownership, added truthful direct document links/empty states, and updated only its specified static metadata.
- [x] (2026-10-08 20:20Z) Replaced the news-detail renderer with the page-private hero/body composition, reused shared Blocks unchanged, preserved the `PageSwitch` signature and route flow, and added the approved incomplete-draft metadata fallbacks; focused tests and the first full frontend check passed.
- [x] (2026-10-08 20:21Z) Refreshed `be:openapi` and `fe:openapi`; normalized comparison proved both generated artifacts differ only in 34 native publication-default timestamps. Canonical `fe:check`, 7-file/56-test Vitest, and `fe:build` passed, with `/notizie` and `/notizie/[slug]` still classified as Partial Prerender routes; protected-file, whitespace, archive, and unrelated-tool checks passed.
- [x] (2026-10-08 20:26Z) Imported the approved archive into unique database `.tmp/task-07-preview-pfFSkc/data.db` with 55 entities, 43 assets, and 112 links; ran the hub/detail at exact 1600×900 and 412×914, proved the direct PDF, real Preview enable/persist/exit, and exact signed revalidation tags, then closed the named browser, stopped both recorded process groups, restored ordinary uploads/database state, and removed every task runtime/browser artifact.
- [x] (2026-10-08 20:57Z) Independent Reviewer returned `CHANGES_REQUESTED`: compact secondary-news images render at 112px on the 412px viewport but advertise a 372px mobile `sizes` slot, and the reproducible final-footer-content-to-fixed-bar clearances are 54.75px on the hub and 55.5px on detail rather than the Worker's recorded 64.5px.
- [x] (2026-10-08 21:12Z) Remediated only `frontend/components/notizie/news-section.tsx` by replacing the compact secondary-image mobile `sizes` fallback with the accurate fixed `112px` slot while preserving the existing 160px `sm` and 136px `lg` slots, layout, loading, and shared chrome.
- [x] (2026-10-08 21:14Z) Re-ran formatting, the focused six-test policy file, both artifact generators, `fe:check`, the full 7-file/56-test suite, `fe:build`, and all scope/integrity checks. Every command passed; the generated artifacts remain exactly 34 native publication-default timestamp replacements each and no contract shape changed.
- [x] (2026-10-08 21:18Z) Re-ran archive-backed inspection of hub and detail at exactly 1600×900 and 412×914, proved 136px/256w desktop and 112px/128w mobile compact-image behavior, measured positive unobscured 54.75px hub and 55.5px detail footer-content clearances, repeated PDF/Preview/revalidation proof, and completed ordinary-state restoration plus runtime/browser cleanup.
- [x] (2026-10-08 21:30Z) Independent Reviewer approved remediation with no remaining findings after separate generator/canonical/build validation and archive-backed proof of corrected desktop/mobile image candidates, shared-shell clearance, PDF delivery, Preview enable/persist/exit, signed revalidation, and cleanup integrity.
- [x] (2026-10-08 21:32Z) Coordinator accepted the independent approval, checked queue item 07, and prepared only the approved task-owned files for local commit `07 — Implement Notizie, calendario, documents, and article detail`; the explicit no-push override remains in force.

## Surprises & Discoveries

- Observation: branch `main` starts task 07 at local commit `f02a0f2`, six commits ahead of `origin/main`; commits `2bcd098`, `4b1b731`, `28fec7a`, `97ae7b4`, `e918fff`, and `f02a0f2` are the approved queue items 01–06 and were intentionally not pushed.
  Evidence: `git status --short --branch` reports `main...origin/main [ahead 6]`, `git rev-list --left-right --count '@{upstream}...HEAD'` reports `0 6`, and `git log --oneline -8` shows the six named commits above `origin/main`.
- Observation: the sole unrelated worktree item is the pre-existing untracked `.agents/skills/imagen/scripts/` directory.
  Evidence: initial `git status --short` reports only `?? .agents/skills/imagen/scripts/`. Task 07 neither uses nor modifies that path and must exclude it from formatting, staging, cleanup, and the eventual commit.
- Observation: the approved demonstration archive is tracked, is 636,008 bytes, and has SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.
  Evidence: `sha256sum backend/seed-data/us-albatese-demo.tar.gz` and the approved task-02 plan. Task 07 must leave the archive byte-identical.
- Observation: the current CMS contract already supplies every selected-task field and ordering rule. No existing-contract correction is necessary or authorized.
  Evidence: `frontend/cms/client.ts` requests published news by `editorialDate:desc`, calendar entries by `startsAt:asc`, and documents by `displayOrder:asc` then `title:asc`, each with page size 100 and required population. `model.ts`, `mappers.ts`, `connector.ts`, and `data.ts` expose the complete DTOs and cache behavior without a parallel path.
- Observation: `/notizie` is intentionally the only collection-page exception to `PageSwitch`, while `/notizie/[slug]` already dispatches `pageType: "news-detail"` through `PageSwitch`.
  Evidence: `frontend/app/(content)/notizie/page.tsx`, `frontend/app/(content)/notizie/[slug]/page.tsx`, `frontend/components/page-switch.tsx`, root `AGENTS.md`, and `PLAN.md`. Preserve this exact ownership split.
- Observation: calendar `kind` is the authoritative presentation grouping; time alone must not silently turn a `match` into a `result` or an `event` into a match. Scores are independently optional at schema/DTO level.
  Evidence: `TYPES.md`, the calendar schema, and `CalendarEntryDto`. The client’s ascending order remains authoritative inside each kind group; presentation must not re-sort or infer kinds from the current clock.
- Observation: the seed archive has two results dated September 27 and October 4, two matches dated October 11 and October 17, and two events dated October 24 and November 7, all in 2026 and with explicit Europe/Rome offsets. Only results have complete scores; only events have calls to action.
  Evidence: the exact task-02 content manifest and its import proof. The planned browser checks can therefore distinguish ordering, all three kinds, score/no-score behavior, and CTA anchors without altering data.
- Observation: published news arrives newest-first, but the archive’s sole featured story is the oldest of the three seeded articles.
  Evidence: the task-02 manifest dates the featured story September 5 and the other stories September 12 and September 20. A true editorial lead must select the first flagged story, while the remaining “latest” rail must retain September 20 then September 12 from the client order.
- Observation: direct CMS media URLs are on a different origin from the frontend during local validation. The HTML `download` attribute expresses download intent but browsers may ignore it cross-origin and display a PDF inline.
  Evidence: frontend runs on port 65171 and Strapi media on 65170. Do not add a proxy route or falsely promise a forced save dialog. Render an honest direct PDF link with filename/type metadata and verify that the exact URL returns HTTP 200, `application/pdf`, and `%PDF-1.4` bytes.
- Observation: the shared `Blocks` renderer already supports paragraphs, headings, ordered/unordered nested lists, quotes, code, inline marks/links, CMS images, captions, and truthful alt text.
  Evidence: `frontend/components/shared/content.tsx` and the mapper’s block/inline validation. News detail must reuse it unchanged instead of creating a second rich-text interpreter.
- Observation: Draft Mode and cache invalidation are already complete cross-boundary protocols.
  Evidence: the signed Strapi Preview handler targets `/notizie/[encoded-slug]` for news and `/notizie` for calendar/documents; `frontend/app/preview/route.ts` enables/disables Draft Mode only after closed-path secret validation; `data.ts` selects draft status for detail/calendar/documents while `listNews()` stays published-only; `tags.ts` maps news to `news` plus `news:<slug>` and the other collections to their collection tags; `/refresh` validates the webhook secret before `revalidateTag`.
- Observation: existing unit coverage already proves query serialization/sorts/status, date/media/PDF mapper validation, preview-path safety, webhook payload parsing, and all model-to-tag mappings.
  Evidence: the current baseline is 6 Vitest files / 50 tests. Task 07 needs one focused pure-policy test file for grouping, lead selection, and score-state semantics; duplicating mapper/query/tag tests is unnecessary.
- Observation: Context7 failed before returning a library id.
  Evidence: `ctx7 library 'Next.js' 'For a Next.js 16.3.1 App Router project with cacheComponents enabled, how should ...'` returned `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` A future contributor may run `ctx7 login` or set `CONTEXT7_API_KEY`; until then, use the installed official docs and do not guess or upgrade Next.js.
- Observation: installed Next.js 16.3.1 docs confirm that dynamic metadata belongs in the Server Component `generateMetadata`, `notFound()` is valid there, Draft Mode bypasses `'use cache'` and ISR caches, `io()` excludes following page work from the static shell, and responsive `fill` images need a positioned parent plus accurate `sizes`; `priority` is deprecated in favor of `preload`.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, `02-guides/draft-mode.md`, and the `generate-metadata`, `draft-mode`, `io`, and `image` API references.
- Observation: the compact secondary-news frame is exactly `7rem` (112px) below the `sm` breakpoint, but its initial `sizes` fallback was `calc(100vw - 40px)`, which advertises 372px at the required 412px viewport.
  Evidence: `frontend/components/notizie/news-section.tsx` uses `grid-cols-[7rem_minmax(0,1fr)]`, changes to 160px at `sm` and 136px at `lg`, while the reviewed `sizes` string selects the 372px fallback below 640px. The mobile fallback must be `112px`; this is a task-local image-selection hint correction and requires no layout change.
- Observation: the Worker's recorded 64.5px final clearance was not reproducible. Independent review measured 54.75px from the hub's final footer content to the fixed bar and 55.5px on detail, with the footer content fully visible and unobscured.
  Evidence: task 03 deliberately makes the mobile bar 4rem high, reserves that bar with `.mobile-shell-clearance { padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px)); }`, and gives the footer container `py-14`, or 56px nominal bottom padding. The 64px value is the reserved fixed-bar height, not a promised minimum gap from the final footer line to the bar; the reviewed fractional measurements are consistent with that nominal footer padding.
- Observation: the remediation rerun selected candidates proportionate to the compact frames at both required breakpoints.
  Evidence: at 1600×900 both secondary frames measured 136px and selected Next Image 256w candidates; at 412×914 both measured 112px and selected 128w candidates, smaller than the 412px viewport. In both cases the DOM exposed the exact `(min-width: 1024px) 136px, (min-width: 640px) 160px, 112px` hint, retaining the intermediate 160px source branch without changing layout.
- Observation: the remediation rerun independently reproduced the positive shared-shell clearance instead of relying on the prior record.
  Evidence: on both mobile routes the navigation track measured 64px, the body computed a 64px bottom reservation, the fixed shell's one-pixel border made its outer box 65px, and horizontal overflow was zero. The final visible footer row ended 54.75px above the fixed shell on the hub and 55.5px above it on detail; `finalFooterContentObscured` was false for both.
- Observation: task 08, not task 07, owns final canonicals, Open Graph completion, Organization JSON-LD, sitemap/robots audit, and release-wide SEO.
  Evidence: `TODOS.md` and `PLAN.md`. Task 07 supplies accurate hub and article title/description metadata only; it must not preempt task 08 with final canonical or structured-data work.
- Observation: the only console error during the initial development-mode inspection was a request for the already-absent `/favicon.ico`; no route, React, CMS, image, or application error occurred. Draft Mode emitted Next.js's expected development-only cache-bypass warning and zero errors.
  Evidence: Playwright console inspection reported one HTTP 404 for `/favicon.ico` during the normal session, then the documented `cache-bypass-in-dev` warning while Draft Mode disabled server caches. All inspected pages had zero `[data-nextjs-error]` elements. Adding a favicon belongs to task 08 rather than this scoped presentation task.
- Observation: Playwright CLI's `run-code` evaluation does not expose Node's `process` global, so it cannot write an `APIResponse` body through `node:fs` directly.
  Evidence: the first safe PDF-body attempt stopped at `ReferenceError: process is not defined` before writing a file. The successful proof still fetched the exact URL with `page.request`, transferred those 866 response bytes through a temporary in-page Blob download, saved the Playwright download under the task workspace, and proved HTTP 200, `application/pdf`, `%PDF-1.4`, the mapped filename, and the anchor attributes. Both the CLI-created download and saved proof were removed in cleanup.

## Decision Log

- Decision: preserve the current schemas, seed archive, DTO/client/mapper/connector/data/cache/tag/webhook/Preview implementation exactly.
  Rationale: inspection found no missing field or failed contract. Scoped presentation and route metadata complete the task; changing an approved cross-boundary contract would add risk without user value.
  Date/Author: 2026-10-08 / Planner
- Decision: group calendar entries in presentation order `match`, `result`, `event`, labelled `Prossime gare`, `Risultati`, and `Eventi`, while preserving the client’s ascending source order within every group.
  Rationale: explicit `kind` owns meaning, the references lead with upcoming fixtures, and `startsAt:asc` is the approved authoritative query. Re-sorting results newest-first would contradict that contract.
  Date/Author: 2026-10-08 / Planner
- Decision: expose a result score only when both `homeScore` and `awayScore` are present; show `Risultato non disponibile` when either side is absent. Ignore score fields for `match` and `event` presentation.
  Rationale: a half-score is misleading, zero is a valid score, and kind-specific display prevents accidental score data from changing editorial meaning.
  Date/Author: 2026-10-08 / Planner
- Decision: use the entry title as every calendar card heading. Add a team-versus layout only when both team names exist; otherwise retain the complete title rather than inventing em dashes, anonymous teams, or crests.
  Rationale: teams are optional and the required title is the safe fallback. Presentation should omit absent optional information, not fabricate it.
  Date/Author: 2026-10-08 / Planner
- Decision: make the first `featured: true` news item the lead; if no item is featured, use the first newest item. Remove that one item from the secondary list while preserving the remaining client order, and render every article rather than imposing a reference-only cap.
  Rationale: this honors the editorial flag and still keeps the “latest” rail chronologically authoritative. `/notizie` is the archive, so hiding later records would be incorrect.
  Date/Author: 2026-10-08 / Planner
- Decision: use native same-page jump links for the always-present `#calendario`, `#notizie`, and `#documenti` sections instead of reproducing the mobile mockup’s JavaScript tabs.
  Rationale: the desktop reference presents a combined hub, all three datasets are small, and native anchors keep every server-rendered item or explicit collection-empty state discoverable and keyboard accessible without a Client Component or inconsistent hidden content.
  Date/Author: 2026-10-08 / Planner
- Decision: render official documents in the already-authoritative client order with direct anchors to `file.url`, `download={file.name}`, `type="application/pdf"`, the visible `PDF` type, category, season, and safe accessible download labels.
  Rationale: the CMS owns order and file identity. Direct links avoid a parallel proxy/download service. Because the media origin may be cross-origin, acceptance proves retrievability and PDF bytes rather than promising a browser save dialog.
  Date/Author: 2026-10-08 / Planner
- Decision: keep `frontend/components/notizie/list-page.tsx` as the direct-rendering hub composition root and confine its new modules to `frontend/components/notizie/`; keep news-detail modules under `frontend/components/news-detail/` and preserve the existing `NewsDetailPage` public signature.
  Rationale: this follows tasks 04–06 page ownership, keeps route and dispatch roots small, and avoids a generalized design system or cross-page private imports.
  Date/Author: 2026-10-08 / Planner
- Decision: reuse the shared `Blocks` component unchanged for the article body and add no duplicate rich-text renderer.
  Rationale: Blocks interpretation is already an approved shared trust boundary. Task 07 owns the article’s outer editorial composition, not block parsing.
  Date/Author: 2026-10-08 / Planner
- Decision: set `/notizie` metadata to an Italian page title and concise description, and retain dynamic detail metadata from the mapped article with truthful fallbacks `Notizia` and `Aggiornamento dall’U.S. Albatese.` for incomplete drafts. Do not add task-08 canonicals, final Open Graph, Twitter, or structured data.
  Rationale: task 07 explicitly owns usable page/article metadata, while task 08 owns the final SEO surface. Dynamic params and `getNewsBySlug()`’s `draftMode()` request API already make detail metadata request-aware; no extra `io()` or `generateStaticParams` belongs there.
  Date/Author: 2026-10-08 / Planner
- Decision: add one pure `presentation.ts` module and exactly six focused Vitest cases for grouping/order/non-mutation, complete/incomplete/non-result score states, and featured/fallback lead selection.
  Rationale: these are stable nonvisual policies not proved by current tests. Styling, responsive layout, PDF navigation, and framework wiring are better proved by build and manual inspection.
  Date/Author: 2026-10-08 / Planner
- Decision: prove Preview and revalidation through the real isolated runtime without mutating CMS content. A task-only helper creates a short-lived Playwright storage-state file from the preview response in memory, and another sends three signed webhook requests and asserts only safe returned tag arrays.
  Rationale: the published archive already contains draft companions suitable for Preview. Signed route behavior and cache-tag ownership can be exercised without changing seeded or ordinary data, printing secrets, or inventing browser test files.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer do not edit `TODOS.md`, stage, commit, push, change branches, or begin task 08. After independent approval, Coordinator alone checks task 07 and creates local commit `07 — Implement Notizie, calendario, documents, and article detail`; no push occurs.
  Rationale: this is the explicit role ownership and no-push override supplied by the user. It supersedes the normal implement-task push gate without expanding technical scope.
  Date/Author: 2026-10-08 / Planner
- Decision: save the `page.request` PDF response through a short-lived browser Blob download after the CLI evaluation proved it has no Node filesystem global.
  Rationale: this retains the required real `page.request` retrieval and byte proof without creating a test/script file, printing response bytes, adding a helper dependency, or weakening the cross-origin direct-link acceptance. The task-owned download was positively identified and removed with the rest of the named session artifacts.
  Date/Author: 2026-10-08 / Worker
- Decision: correct the compact secondary-news `sizes` hint to `(min-width: 1024px) 136px, (min-width: 640px) 160px, 112px` and make no other production change during this remediation.
  Rationale: those three values match the existing `lg`, `sm`, and base grid-column widths exactly. The defect is resource selection metadata, not rendered geometry, so changing the task-owned hint is sufficient and preserves the accepted responsive composition.
  Date/Author: 2026-10-08 / Planner
- Decision: replace task 07's self-imposed “at least 64px final content gap” criterion with the actual architectural contract: task 03's 64px mobile-shell reservation must keep the fixed bar from covering the footer, the footer's accepted 56px nominal bottom padding must leave its final content visibly separated from the bar, and both required routes must show a positive measured content-to-bar clearance with no clipping or overlap.
  Rationale: the original task requires responsive hub/detail behavior and preservation of shared chrome, not a numeric 64px content gap. Review reproduced 54.75px and 55.5px clearances with fully unobscured content. Editing `frontend/app/globals.css`, `frontend/app/layout.tsx`, or `frontend/components/layout/` merely to satisfy the mistaken threshold would violate task 07's explicit scope and disturb task 03's already-approved shell. A shared-chrome change is therefore neither required nor authorized.
  Date/Author: 2026-10-08 / Planner

## Outcomes & Retrospective

Worker remediation and the complete revised-plan validation are complete and independently approved. `/notizie` now composes the editorial hero, semantic match/result/event center, featured lead plus stable latest-news rail, and ordered direct-PDF archive from the unchanged CMS pipeline. `/notizie/[slug]` remains dispatched through byte-unchanged `PageSwitch`, presents its truthful header/media/Blocks body and return navigation, and uses nonblank draft-safe metadata fallbacks. The compact secondary-image hint is exactly `(min-width: 1024px) 136px, (min-width: 640px) 160px, 112px`; no other production behavior changed. The repeated pure policy suite passed all six required grouping, score, and lead-selection cases and the repeated full suite passed 7 files / 56 tests.

Required `be:openapi` and `fe:openapi` generation passed. The resulting 68-line changes in each generated artifact are exactly 34 generation-time `publishedAt` default replacements; normalization against `HEAD` proved all paths, operations, schemas, and TypeScript shapes unchanged. `fe:check` passed over 97 files and `fe:build` passed with `/notizie` and `/notizie/[slug]` still reported as Partial Prerender output. Protected-file, package/lockfile, cache/Preview/webhook, shared-component, other-page, archive, whitespace, and unrelated image-tool checks passed.

The remediation archive run again imported 55 entities, 43 assets, and 112 links. At 1600×900, the hub retained six calendar cards, three news stories, three documents, zero horizontal overflow, and both compact 136px frames selected 256w candidates from the corrected exact hint; article title, description, H1, hero, and content remained intact. At 412×914, the same hub counts and article presentation remained intact with zero horizontal overflow; both compact frames measured exactly 112px and selected 128w optimized candidates rather than viewport-width candidates. The fixed navigation track measured 64px and the body reservation computed to 64px on both routes. Measured separately, the final visible footer content ended 54.75px above the bar on the hub and 55.5px above it on detail, with no overlap or clipping. These are the truthful positive unobscured clearances; 64px is the shell reservation, not the content gap.

The first direct document returned HTTP 200, `application/pdf`, 866 bytes beginning `%PDF-1.4`, with `download="calendario-sportivo-2026-27.pdf"` and `type="application/pdf"`. A mode-0600 storage state created from the real signed Preview response made the `Anteprima bozza` banner visible on detail and hub, preserved three published news plus six draft-aware calendar entries and three draft-aware documents, and the existing POST exit redirected to `/`, removed the banner, and cleared the bypass cookie. Signed refresh requests returned exactly `news,news:la-stagione-2026-27-prende-forma`, `calendar-entries`, and `official-documents`; hub and detail reloaded afterward without application errors.

Initial-run cleanup remains complete. The remediation run used unique workspace `.tmp/task-07-preview-hjH7zV`, then closed only browser `task-07-notizie`, stopped both recorded process groups, restored uploads, and removed the workspace, helpers, mode-0600 state, PDF, screenshots, logs, disposable database, imported uploads, downloads, and `.playwright-cli`. Ports 65170/65171 are clear and the browser list is empty. The fresh post-generator ordinary baseline was retained exactly: `backend/.tmp/data.db` inode/size/mtime `4276133 1355776 1791493929` and SHA-256 `68e3b0960d3d6bda94a5b2f98ea87c1e6577e806e201ee253c10f53fccd4589d`; restored uploads contain only `.gitkeep` with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; the archive retains approved SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. The independent re-review repeated the material proofs in an external disposable copy and returned `APPROVED`; branch/index/history remained unchanged through review, and the unrelated untracked image-tool directory remains excluded. Task 07 is ready for its Coordinator-owned local commit and intentional no-push handoff.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0. `frontend/` is Next.js 16.3.1 with React 19.2.8, Tailwind CSS 4, typed routes, and Cache Components enabled. “SSR + ISR” here means the route renders against request state on the server, while CMS reads are cached for reuse and invalidated by signed Strapi webhooks. “Draft Mode” is a signed Next.js cookie that bypasses caches for the editor’s browser and selects Strapi draft documents through the same data pipeline.

`frontend/app/(content)/notizie/page.tsx` is the intentional collection-page exception. It calls `await io()`, reads news, calendar, and documents in parallel, and directly renders `NotizieListPage`. Keep this direct route. `frontend/app/(content)/notizie/[slug]/page.tsx` reads one article and sends its `NewsDto` to `PageSwitch`; `frontend/components/page-switch.tsx` dispatches `pageType: "news-detail"` to `NewsDetailPage`. Keep that dispatch route and do not add `generateStaticParams` or static export.

The CMS pipeline is fixed. `frontend/cms/client.ts` serializes Strapi queries and owns list sorting; `mappers.ts` validates raw dates, scores, media, Blocks, and PDFs into DTOs from `model.ts`; `connector.ts` composes client and mapper; `data.ts` exposes cached reads with `"use cache"`, `cacheLife("days")`, and tags; `tags.ts` maps webhook models to those tags; `webhook.ts` validates payload shape; and `frontend/app/refresh/route.ts` authenticates the webhook before calling `revalidateTag`. Task 07 consumes these boundaries and changes none of them.

The hub receives three arrays. `NewsListItemDto` supplies identity slug/title, category, summary, plain `YYYY-MM-DD` editorial date, required hero image, and featured flag. `CalendarEntryDto` supplies kind, offset-aware datetime, competition, title, optional teams, optional independent scores, venue, summary, and optional CTA. `OfficialDocumentDto` supplies title, category, season, required PDF `FileDto`, and display order. `NewsDto` adds `pageType: "news-detail"` and validated rich Blocks.

Draft behavior is deliberately asymmetric. `listNews()` always reads published items so drafts never enter the hub or sitemap; an unpublished news item previews only at its own detail route. `listCalendarEntries()` and `listOfficialDocuments()` read draft status when Draft Mode is enabled, so their aggregate preview is `/notizie`. Detail metadata and page content both call the same status-aware `getNewsBySlug()` cached read.

Task 02’s archive seeds three news articles, six calendar entries, and three documents. The featured article is `la-stagione-2026-27-prende-forma`; use it for detail inspection because its body includes one heading and four paragraphs. Its hero is an honest magenta placeholder, and its alternative text and visible dimension label must remain truthful. The three PDFs are real one-page PDF 1.4 assets. Do not alter, hide, regenerate, or cosmetically disguise any seed media.

Task 03 owns fonts, tokens, `.site-container`, shared header/navigation/footer, fixed mobile bar, focus treatment, Preview banner, loading/error/not-found/empty states, and visible version. Its accepted mobile shell uses a 4rem fixed bar, an equal `mobile-shell-clearance` reservation on the body, and `py-14` on the footer container; the bar-height reservation prevents overlap, while the footer's nominal 56px bottom padding supplies visible separation from its final content. Tasks 04–06 own only Home, About, and Activity directories. Task 07 consumes these foundations without refactoring them. `design/DESIGN.md` is authoritative for palette, type, radii, shadows, whitespace, and 1200px layout; the two Notizie reference files are authoritative for broad hierarchy and responsive transformation, but their fabricated season facts, officers, newsletter form, sharing button, fake links, and JavaScript tabs are not product requirements.

## Plan of Work

### Milestone 1: Add the pure hub presentation policy

Create `frontend/components/notizie/presentation.ts`. Export three small pure policies typed with existing DTOs:

    export function groupCalendarEntries(
      entries: readonly CalendarEntryDto[],
    ): Readonly<{
      matches: CalendarEntryDto[];
      results: CalendarEntryDto[];
      events: CalendarEntryDto[];
    }>

    export type ResultScoreState =
      | { kind: "not-applicable" }
      | { kind: "unavailable" }
      | { kind: "complete"; home: number; away: number };

    export function getResultScoreState(
      entry: CalendarEntryDto,
    ): ResultScoreState

    export function splitNewsLead(
      news: readonly NewsListItemDto[],
    ): Readonly<{
      lead: NewsListItemDto | undefined;
      remaining: NewsListItemDto[];
    }>

`groupCalendarEntries` performs stable filters only. It does not sort, mutate, compare with `new Date()`, or infer a kind. `getResultScoreState` returns `not-applicable` unless kind is `result`, returns `complete` only when both score values are defined (including zero), and otherwise returns `unavailable`. `splitNewsLead` returns `undefined` plus an empty list for empty input; otherwise it selects the first featured item or index zero, removes exactly that element, preserves every other item in source order, and never mutates the input.

Create `frontend/components/notizie/presentation.test.ts` with exactly six tests:

1. Group an interleaved frozen calendar array and prove matches/results/events preserve source order and the input is unchanged.
2. Prove a complete result, including a `0–0` score, returns `complete`.
3. Prove a result missing either or both scores returns `unavailable` and never exposes a half-score.
4. Prove score values on match/event records are `not-applicable`.
5. Prove the first flagged article becomes lead and the remaining newest-first order is stable/non-mutating.
6. Prove no-feature fallback, a one-item list, and an empty list behave exactly as specified.

Use minimal literal DTO fixtures. Do not reproduce date validation, Strapi query sorting, mapper behavior, cache-tag mapping, React rendering, or CSS assertions. Run:

    cd /home/codex/src/us-alb/frontend
    npm test -- components/notizie/presentation.test.ts

Expect one file and six tests to pass. The existing full-suite baseline is 6 files / 50 tests, so the unchanged baseline plus this file should produce 7 files / 56 tests; record the actual result rather than hiding a discrepancy.

Milestone acceptance: all new ordering/score/lead rules are proved at a pure nonvisual boundary, frozen inputs remain unchanged, and no CMS or React module is involved.

### Milestone 2: Build the responsive combined hub

Create `frontend/components/notizie/notizie-media.tsx` as a Notizie-private wrapper around `next/image`. It accepts `image: ImageDto`, `sizes: string`, optional `className`, and optional `preload`. Use `fill`, `object-cover`, and the mapped `image.alt`; the calling component supplies a positioned frame. Only the lead news image may preload. Do not use deprecated `priority`, a custom loader, client callbacks, or image tooling.

Create `frontend/components/notizie/hero.tsx`. Render an editorial opening with static utility copy only: overline `Notiziario e calendario`, H1 `Cronache di campo, appuntamenti e vita del club.`, and a concise sentence describing results, future fixtures, club stories, and official documents. Render native anchors to the three always-present sections `#calendario`, `#notizie`, and `#documenti`; let them wrap like restrained chips on mobile. Do not add a season/weekend value, newsletter, tabs, filter state, or a Client Component.

Create `frontend/components/notizie/calendar-section.tsx`. It accepts the grouped entries and always renders `id="calendario"`, overline `Match center`, and H2 `Gare, risultati ed eventi`. When every group is empty, render the shared `EmptyState` titled `Nessun appuntamento pubblicato` with the existing concise calendar-empty copy and no empty grid. Otherwise render the nonempty groups in `match`, `result`, `event` order. At desktop, use up to three balanced columns; at mobile, stack them. Each group is a labelled section with a semantic list.

Each calendar card always renders a semantic `<time dateTime={entry.startsAt}>` formatted in Italian with `Europe/Rome`, the required card heading from `entry.title` or the kind fallback `Partita`, `Risultato`, or `Evento` for an incomplete draft, and any nonempty competition, venue, and summary. If both teams exist, render them in a balanced team layout. Matches use `VS` and never scores. Results use the pure score state: complete pairs render large tabular numbers, while incomplete pairs render the exact text `Risultato non disponibile`. Events use title/body treatment and no team/score shell unless both teams were actually supplied. Render a CTA only when both its trimmed label and URL are nonempty; use an ordinary anchor because the CMS field can represent an internal anchor or a future external URL. Do not invent team marks, standings, scorer names, maps, or “live” state.

Create `frontend/components/notizie/news-section.tsx`. Accept the lead and remaining arrays. If no lead exists, render the section heading plus the shared `EmptyState` titled `Nessuna notizia pubblicata`; do not render an empty grid. Otherwise render `id="notizie"`, overline `Dal club`, H2 `Articoli e approfondimenti`, a seven/five desktop grid, and a one-column mobile flow. The lead article uses a 16:10 image, featured marker only when true, category, Italian `Europe/Rome` editorial `<time>`, title, summary, and one block-level `next/link` to `/notizie/<slug>`. The remaining items preserve source order and use compact article rows/cards with their own image, metadata, title, summary, and real link. Their image column is 112px at the base viewport, 160px from `sm`, and 136px from `lg`, so their `NotizieMedia` call must use the exact matching hint `sizes="(min-width: 1024px) 136px, (min-width: 640px) 160px, 112px"`; do not advertise the full 372px mobile content width for this compact frame. Render every remaining item; do not hide stories at mobile or add share buttons.

Reviewer remediation is deliberately limited to that compact-image `sizes` string. Preserve `grid-cols-[7rem_minmax(0,1fr)]`, `sm:grid-cols-[10rem_1fr]`, `lg:grid-cols-[8.5rem_1fr]`, all content and interaction, the lead image hint, and every shared layout/CSS/chrome file.

Create `frontend/components/notizie/documents-section.tsx`. Always give the section `id="documenti"` so shared/footer/calendar links remain valid. Render overline `Documenti e trasparenza`, H2 `Bollettini e modulistica ufficiale`, and documents in the received order. Each semantic list item is one direct PDF anchor with `href={document.file.url}`, `download={document.file.name}`, `type="application/pdf"`, an accessible label `Scarica <title-or-filename> (PDF)`, and visible title-or-filename, category, season, `PDF`, and the mapped filename. Do not infer byte units from the optional `size`, create an API proxy, add a viewer dependency, or claim a forced browser save. When empty, render the existing localized document `EmptyState` inside the named section.

Replace `frontend/components/notizie/list-page.tsx` with a small Server Component composition root. Keep its public prop names and the route’s direct-rendering contract. Compute grouped calendar entries and split news with the pure helpers, then render exactly:

    NotizieHero
    CalendarSection
    NewsSection
    DocumentsSection

All three sections remain present when their collection is empty and own an explicit localized `EmptyState`; absent calendar kinds alone leave no empty subgroup column. This preserves useful navigation and the stable `/notizie#documenti` target even with sparse content. Use one `<main>`, existing tokens and `.site-container`, alternating lowest/pale surfaces, one H1, H2 for top-level sections, H3/H4 for group/cards, semantic sections/lists/articles/figures/times, visible focus, tabular scores, and decorative arrows/rules marked `aria-hidden`. Add no header/footer/Preview banner, data read, state, effect, animation, carousel, icon font, or dependency.

Update only the static metadata export in `frontend/app/(content)/notizie/page.tsx` to:

    title: "Notizie e calendario"
    description: "Notizie, risultati, appuntamenti e documenti ufficiali dell’U.S. Albatese."

Keep `await io()`, the existing `Promise.all`, all three cached reads, and direct `NotizieListPage` rendering unchanged. Do not call `PageSwitch` for the collection route.

Incomplete and empty behavior is exact. An empty calendar/news/document collection retains its named section and a localized shared state; absent calendar kinds leave no empty subgroup column. Calendar draft strings render only when meaningful, title uses the kind fallback, optional team layout requires both teams, incomplete result scores use the explicit unavailable state, and incomplete CTA fields render no link. Published news is strict. A draft document may have empty title/category/season but still requires a PDF, so filename becomes its honest visible fallback and empty metadata spans disappear. Dependency or validation failures propagate to the accepted route error boundary; do not catch them as empty data.

Run formatting after all intended hub files exist and inspect only the task diff:

    cd /home/codex/src/us-alb
    mise run fe:format
    git diff --check
    git diff -- frontend/app/'(content)'/notizie/page.tsx frontend/components/notizie

Milestone acceptance: the hub maps every DTO field once, ordering and score rules come only from the pure policy, anchor targets exist, empty states are useful, desktop/mobile composition follows the references without mock-only behavior, and no CMS/backend/shared/other-page file changes.

### Milestone 3: Build the PageSwitch article detail and metadata behavior

Create `frontend/components/news-detail/news-detail-media.tsx` as a detail-private `next/image` wrapper with the same `ImageDto`, `sizes`, optional class, and optional preload interface used by the accepted page-specific pattern. Use `fill`, mapped alt, and `object-cover`; only the article hero preloads.

Create `frontend/components/news-detail/hero.tsx`. Accept a `NewsDto` and render a small breadcrumb navigation back to `/notizie`, the nonempty category, featured marker only when true, Italian editorial `<time>`, one H1 from the trimmed CMS title or fallback `Notizia`, optional summary, and the required hero image in a responsive 16:10 frame. At desktop, use generous whitespace inside a readable maximum width with the image spanning a wider editorial measure; at mobile, use the 36px-class heading rhythm and full 372px content width. Preserve the placeholder alt and do not render a fake author, reading time, share button, or social icons.

Create `frontend/components/news-detail/article-body.tsx`. Accept `BlocksDto`. When nonempty, render the unchanged shared `<Blocks blocks={content} />` in a semantic `<article>`/readable prose column. When empty, render `EmptyState` with `Articolo in preparazione` and editor-oriented neutral copy so an incomplete draft remains understandable. Add one bottom `next/link` labelled `Torna a tutte le notizie` to `/notizie`. Do not flatten, rewrite, sanitize a second time, or duplicate any block type.

Replace `frontend/components/news-detail/page.tsx` with a small composition root retaining exactly:

    export function NewsDetailPage({ page }: { page: NewsDto })

Render one `<main>`, `NewsDetailHero`, then `ArticleBody`. It performs no CMS read and contains no `io()`, metadata, header/footer, or Preview logic. `PageSwitch` remains byte-unchanged and remains the sole detail dispatcher.

Update `generateMetadata` in `frontend/app/(content)/notizie/[slug]/page.tsx` without changing the route flow. Continue awaiting `params`, reading `getNewsBySlug(slug)`, and calling `notFound()` when absent. Return the trimmed mapped title or `Notizia`, and the trimmed summary or `Aggiornamento dall’U.S. Albatese.`. Do not add `generateStaticParams`, `dynamic`, static export, canonical, final Open Graph/Twitter values, or JSON-LD. Keep the page component’s `await io()`, `getNewsBySlug`, `notFound()`, and `<PageSwitch page={page} />` exactly as the architectural path.

The metadata read is Draft Mode aware because `getNewsBySlug()` calls the existing request-time `draftMode()` status selector. It may execute for metadata and page, but both calls share the same tagged cached function for normal published requests and Draft Mode bypasses cache for preview. Do not add React cache or another data layer.

Run format/diff checks:

    cd /home/codex/src/us-alb
    mise run fe:format
    git diff --check
    git diff -- frontend/app/'(content)'/notizie/'[slug]'/page.tsx frontend/components/news-detail frontend/components/page-switch.tsx frontend/components/shared/content.tsx

The expected diff changes the route metadata fallback and news-detail files only; `page-switch.tsx` and shared `content.tsx` must show no diff.

Milestone acceptance: a published article renders every header/body field through `PageSwitch`, an incomplete draft remains truthful and navigable, rich Blocks retain their approved semantics, metadata has no blank title/description, and no task-08 SEO surface is introduced.

### Milestone 4: Refresh artifacts and run canonical validation

From `/home/codex/src/us-alb`, list the actual tasks and run the artifact refresh required after a frontend change:

    mise tasks
    mise run be:openapi
    mise run fe:openapi

Do not run `be:types`; no backend schema or backend TypeScript changes. Inspect `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`. Native generation-time `publishedAt` defaults may refresh, as tasks 01–06 recorded, but endpoint paths, operations, schema keys, and TypeScript shapes must remain unchanged. Keep only generator-produced output. A structural API change is a blocker, not authority to edit schemas, DTOs, mappers, cached reads, or generated declarations by hand.

Run all applicable canonical frontend validation:

    mise run fe:check
    cd /home/codex/src/us-alb/frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Expect Biome, generated route types, TypeScript, 7 Vitest files / 56 tests, and the production build to pass. Record actual counts. The build route table must continue to classify `/notizie` and `/notizie/[slug]` as request-capable Partial Prerender output, not fully static CMS snapshots. There is no `fe:test` Mise task; `npm test` is the repository’s frontend suite. Do not add or run a backend test, Playwright test file, browser E2E suite, smoke test, or deployment test.

Run focused scope and integrity checks:

    git diff --check
    git diff --exit-code -- TODOS.md PLAN.md TYPES.md README.md mise.toml backend/package.json backend/package-lock.json backend/src backend/types/generated backend/seed-data/us-albatese-demo.tar.gz frontend/package.json frontend/package-lock.json frontend/app/globals.css frontend/app/layout.tsx frontend/app/preview frontend/app/refresh frontend/components/page-switch.tsx frontend/components/home frontend/components/about frontend/components/activity frontend/components/layout frontend/components/shared frontend/cms ':(exclude)frontend/cms/schema.json' ':(exclude)frontend/cms/schema.d.ts'
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git status --short -- .agents/skills/imagen/scripts/

The protected-file diff is empty. The generated-artifact diff is empty or only native publication-default timestamps, proven by normalizing those exact defaults and comparing paths, operations, schema structure, and TypeScript shapes. The archive hash remains `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Package/lockfiles and the unrelated image-tool directory remain unchanged.

Milestone acceptance: focused and full tests pass, both generators and every applicable canonical frontend command pass, both routes retain request rendering, the API shape/archive/cache pipeline are unchanged, and durable implementation scope contains only the two Notizie page directories, two route files, generated timestamp refreshes if any, and this plan.

### Milestone 5: Run the isolated archive-backed runtime and exact browser proof

Manual verification uses only the committed archive and task-owned temporary state. Confirm `backend/.env` and `frontend/.env.development` exist and are ignored without displaying them. After artifact generation, record the ordinary `backend/.tmp/data.db` inode/size/mtime/hash if present, archive hash, and a filename/hash manifest for `backend/public/uploads`. Also record the pre-run `.playwright-cli` file list so only task-created browser artifacts are moved/removed later.

Create a unique workspace and absent relative SQLite path:

    mkdir -p backend/.tmp
    task07_preview_dir="$(mktemp -d -p backend/.tmp task-07-preview-XXXXXX)"
    task07_preview_base="$(basename "$task07_preview_dir")"
    task07_preview_rel=".tmp/${task07_preview_base}"
    task07_preview_db=".tmp/${task07_preview_base}/data.db"
    test ! -e "backend/$task07_preview_db"

Resolve the workspace and `backend/public/uploads` with `realpath`. Refuse to continue if uploads is missing, is a symlink, or resolves outside `/home/codex/src/us-alb/backend/public`. Move the entire ordinary uploads directory to `$task07_preview_dir/uploads-original`, immediately create a new empty `backend/public/uploads`, and install cleanup that closes only the named browser, stops exact task process groups, moves imported uploads aside, restores `uploads-original` byte-for-byte, and preserves failure evidence until understood.

From `backend`, import only into the disposable database:

    mise exec -- env DATABASE_FILENAME="$task07_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file seed-data/us-albatese-demo.tar.gz --force --only content,files

Expect 55 entities, 112 links, and 43 asset binaries. Record import logs before/after; move only new `backend/import_<timestamp>.log` files positively identified by this task into the workspace. Never retry a failed import against the same partial database.

Use `apply_patch` to create temporary `backend/$task07_preview_rel/read-demo-token.mjs`, following the task-04–06 proven helper. Load installed CommonJS `@strapi/core` through `createRequire`, compile/load the disposable app without a port, call `app.admin.services["api-token-content-api"].getByName("Read Only", { includeDecryptedKey: true })`, require a nonempty `accessKey`, write only that key to already-open descriptor 3, and destroy Strapi in `finally`. Capture descriptor 3 only into shell memory; never print/write the token or put it in process arguments.

Start Strapi on `127.0.0.1:65170` and Next.js on `127.0.0.1:65171` in one monitored terminal session. Stage the token under `TASK07_CMS_TOKEN`, then assign `CMS_API_TOKEN` only inside a post-Mise child shell so project env loading cannot replace the disposable token. Use `setsid` for each server and record its exact process-group leader; cleanup sends SIGINT to those groups rather than only npm wrapper PIDs. The essential shape is:

    task07_cms_token="$(
      mise exec -- env DATABASE_FILENAME="$task07_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= node "$task07_preview_rel/read-demo-token.mjs" 3>&1 1>>"$task07_preview_rel/token-helper.log" 2>&1
    )"
    test -n "$task07_cms_token"
    export TASK07_CMS_TOKEN="$task07_cms_token"
    unset task07_cms_token

    setsid mise exec -- env HOST=127.0.0.1 PORT=65170 DATABASE_FILENAME="$task07_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start >"$task07_preview_rel/backend.log" 2>&1 &
    task07_backend_pgid="$!"

    (
      cd ../frontend
      exec setsid mise exec -- sh -c '
        export CMS_URL=http://127.0.0.1:65170/api
        export CMS_MEDIA_URL=http://127.0.0.1:65170
        export CMS_API_TOKEN="$TASK07_CMS_TOKEN"
        export SITE_URL=http://127.0.0.1:65171
        unset TASK07_CMS_TOKEN
        exec npm run dev -- --hostname 127.0.0.1 --port 65171
      '
    ) >"$task07_preview_rel/frontend.log" 2>&1 &
    task07_frontend_pgid="$!"
    unset TASK07_CMS_TOKEN

Poll backend `/_health` and frontend `/notizie` in bounded one-second loops for at most 60 seconds each. Never bind `0.0.0.0`, use Docker, alter env files or machine/user environment, expose other ports, or start the ordinary stack.

Use exactly one Playwright CLI session named `task-07-notizie` with the installed fixed headless Chromium configuration. Do not pass a browser, device, executable, profile, or config override, and do not create a Playwright test/script file:

    playwright-cli -s=task-07-notizie open http://127.0.0.1:65171/notizie
    playwright-cli -s=task-07-notizie resize 1600 900
    ...desktop hub and detail inspection...
    playwright-cli -s=task-07-notizie resize 412 914
    ...mobile hub and detail inspection...
    ...Preview/revalidation proof in the same session...
    playwright-cli -s=task-07-notizie close

At 1600×900, inspect hub top/calendar, news, and documents with semantic/boxed snapshots plus a small number of viewport screenshots stored only in the workspace. Confirm the 1200px shell, one H1, three real jump links, group order matches/results/events, two chronologically ascending entries in each group, match cards show `VS`, result cards show `2–1` and `1–1`, event CTAs target `/attivita` and `/notizie#documenti`, and no missing value appears as `undefined`, `null`, or a half-score. Confirm the lead is the flagged September 5 story and the secondary latest order is September 20 then September 12. Confirm three document rows remain in display-order 0/10/20 order and expose the exact filenames. Check Epilogue/Manrope, sticky header, hidden mobile bar, semantic lists/times, focus styling, zero horizontal overflow, and zero application console errors.

Open `/notizie/la-stagione-2026-27-prende-forma` at 1600×900. Confirm Notizie stays active in shared navigation, the breadcrumb/return links work, document title becomes `La stagione 2026/27 prende forma insieme | U.S. Albatese`, meta description equals the CMS summary, one page H1 exists, category/date/featured marker and honest hero alt are present, and the Blocks body contains `Un patto che riparte` plus all four paragraphs. Exercise one hub story link and the return link with pointer input and one with native keyboard focus.

At 412×914, repeat the full hub and the same detail route. Confirm jump links wrap, all six calendar cards remain readable in one column, team/score layouts do not clip, news becomes one lead plus compact stacked stories without content loss, document anchors remain full-width and labelled, article image/body fit 372px content width, shared mobile labels are untruncated, and `scrollWidth === clientWidth === 412`. For both routes, measure the fixed bar height, computed body bottom reservation, and the distance from the final visible footer content border box to the fixed bar's top edge separately. Require the accepted 64px bar and matching shell reservation, a positive final-content-to-bar distance, and no clipping, coverage, or overlap; review reproduced 54.75px on the hub and 55.5px on detail. Do not reinterpret the 64px bar reservation as a 64px minimum content gap or edit shared CSS/layout to manufacture one. The development-only `<nextjs-portal>` may be removed from only the current inspection DOM if it intercepts the fixed bottom navigation; record the diagnostic and do not change source/CSS/configuration.

On the mobile hub, inspect the two compact secondary-news images after remediation. Confirm each rendered frame is 112px wide and the image's responsive source-selection contract advertises the 112px base slot rather than 372px, while the 160px `sm` and 136px `lg` branches remain present in source. At 1600×900, confirm the compact rail remains visually unchanged. This is responsive image evidence, not authority to edit the frame geometry.

For one document, obtain the anchor href through Playwright without printing secrets, request it through `page.request`, and save its response body under the task workspace. Require status 200, `content-type` beginning `application/pdf`, the first bytes `%PDF-1.4`, and the expected mapped filename/anchor `download` attribute. This proves usable direct retrieval without assuming that Chromium will force a save dialog for a cross-origin PDF. Delete the downloaded proof during cleanup.

Source review plus the six pure tests prove missing-score and empty/partial branches; do not mutate the CMS, intercept requests, or alter browser storage to manufacture visual empty states. Screenshots are temporary evidence, not golden tests.

### Milestone 6: Prove Preview/Draft Mode and cache invalidation without exposing secrets

While the same isolated servers and browser session are running, use `apply_patch` to create temporary `backend/$task07_preview_rel/prepare-draft-state.mjs`. The helper reads `PREVIEW_SECRET` only from the Mise-loaded process environment and the safe `TASK07_FRONTEND_ORIGIN`; it fails if either is absent. It builds the URL in memory for:

    /preview?url=/notizie/la-stagione-2026-27-prende-forma&status=draft&secret=<in-memory>

Call `fetch` with `redirect: "manual"`, require the redirect status and a `Set-Cookie` containing only the expected `__prerender_bypass` cookie, convert that cookie to Playwright storage-state JSON for domain `127.0.0.1` and path `/`, write it with mode `0600` to a workspace path supplied through `TASK07_DRAFT_STATE`, and print only `draft state prepared`. Never print the URL, secret, cookie, header, or JSON. Run it through Mise so the ignored project env supplies the secret:

    mise exec -- env TASK07_FRONTEND_ORIGIN=http://127.0.0.1:65171 TASK07_DRAFT_STATE="$task07_preview_rel/draft-state.json" node "$task07_preview_rel/prepare-draft-state.mjs"

Load that file into the already-open named browser with `playwright-cli -s=task-07-notizie state-load ...`, then navigate to the detail URL. Confirm the visible `Anteprima bozza` banner, correct draft article, and no application error. Navigate to `/notizie` in the same session and confirm the banner persists while published news plus draft-aware calendar/documents render. Activate `Esci dall’anteprima`; it must POST to `/preview`, redirect to `/`, clear the bypass cookie, and remove the banner on a subsequent detail navigation. A `run-code` diagnostic may return only the boolean presence/absence of the named cookie; never return its value. Delete the state file during cleanup, in accordance with the Playwright skill’s storage-state security guidance.

Create temporary `backend/$task07_preview_rel/verify-revalidation.mjs`. It reads `CMS_WEBHOOKS_SECRET_HEADER` and `CMS_WEBHOOKS_SECRET_HEADER_VALUE` only from the Mise-loaded process environment, builds the required `x-<configured-name>` header in memory, and POSTs valid `entry.update` payloads to the safe task origin for:

    news-item with identity.slug = la-stagione-2026-27-prende-forma
    calendar-entry
    official-document

Require HTTP 200 and exact JSON tag arrays `['news', 'news:la-stagione-2026-27-prende-forma']`, `['calendar-entries']`, and `['official-documents']`. Print only model names/status/tag names, never the configured header name/value or any env value. Warm the hub and detail before this helper, run it, then reload both routes successfully afterward. This proves the signed route reaches every cache owner relevant to task 07 without modifying CMS content. Existing `tags.test.ts`, `webhook.test.ts`, and route source inspection remain the lowest stable automated proof of mapping and authentication behavior; do not add a duplicate integration test or change tags.

Run the helper through Mise so the ignored backend env supplies the webhook settings without placing either value in the command line:

    mise exec -- env TASK07_FRONTEND_ORIGIN=http://127.0.0.1:65171 node "$task07_preview_rel/verify-revalidation.mjs"

Milestone acceptance: one real draft cookie makes detail and aggregate preview visible, the POST exit clears it, all three signed webhook requests return the exact cache tags, normal pages still load afterward, and no secret/cookie value appears in a command argument, terminal output, screenshot, plan, or durable file.

### Milestone 7: Restore ordinary state, remove evidence, and hand off

Close `task-07-notizie` even if inspection fails. Stop only the recorded task process groups with SIGINT and wait for exit. Escalate only after identifying an exact remaining task process. Move imported uploads aside and restore `uploads-original` exactly. Positively identify/remove only this task’s import logs and the resolved `task-07-preview-*` workspace after verifying its prefix. Compare the pre/post `.playwright-cli` listings, move only task-created files into the task workspace before deletion, and never use `close-all`, `kill-all`, or broad recursive deletion.

Prove all of the following:

    no listener remains on 127.0.0.1:65170 or 127.0.0.1:65171
    playwright-cli list contains no task-07-notizie session
    ordinary database inode/size/mtime/hash matches the post-generator baseline
    restored upload filename/hash manifest matches the baseline
    archive SHA-256 remains approved
    no task-07-preview-* directory, helper, storage state, PDF proof, screenshot, log, or task browser artifact remains
    .agents/skills/imagen/scripts/ remains untouched and untracked

The Reviewer-required `sizes` correction is an implementation change after validation, so remediation must run the complete sequence rather than relying on the earlier evidence:

    cd /home/codex/src/us-alb
    mise run fe:format
    cd frontend && npm test -- components/notizie/presentation.test.ts
    cd /home/codex/src/us-alb && mise run be:openapi
    mise run fe:openapi
    mise run fe:check
    cd frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Then repeat the scope/integrity checks in Milestone 4 and the complete isolated archive-backed flow at exactly 1600×900 and 412×914, including the focused responsive-image evidence, corrected clearance measurements, PDF retrieval, Preview enable/persist/exit, exact revalidation tags, and cleanup audit. If any further source changes are needed, rerun this entire remediation sequence again. Update all living sections of this plan with actual results before ending `WORK_READY`.

## Concrete Steps

All commands run from `/home/codex/src/us-alb` unless a step explicitly changes directory. Begin with safe prerequisites:

    git branch --show-current
    git status --short --branch
    git merge-base --is-ancestor 2bcd098 HEAD
    git merge-base --is-ancestor 4b1b731 HEAD
    git merge-base --is-ancestor 28fec7a HEAD
    git merge-base --is-ancestor 97ae7b4 HEAD
    git merge-base --is-ancestor e918fff HEAD
    git merge-base --is-ancestor f02a0f2 HEAD
    git rev-list --left-right --count '@{upstream}...HEAD'
    test -f backend/.env
    test -f frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    mise current
    mise tasks
    sha256sum backend/seed-data/us-albatese-demo.tar.gz

Expected evidence is branch `main`, all six ancestor checks succeeding, upstream count `0 6`, both ignored local env files present, Node 24.20.0, current Mise tasks, and the approved archive hash. Never run `env`, `printenv`, `set`, or display either env file.

Use `apply_patch` for every text edit, including temporary helper modules. Do not download or generate an asset. Implement in milestone order: pure policy/test, hub, detail, format, focused test, generated-artifact refresh, canonical validation, ordinary-state baseline, isolated import/runtime, desktop hub/detail, mobile hub/detail, PDF proof, Preview proof, revalidation proof, cleanup, and final scope checks.

Do not edit `TODOS.md`, stage, commit, push, switch branches, use `imagegen`/`imagen`, touch the untracked image-tool directory, or begin task 08. A successful Worker handoff records exact changed files, all policy cases, generated-artifact characterization, canonical command results/test counts/build classifications, desktop/mobile observations and exercised targets, PDF response proof, Preview enable/exit proof, exact revalidation tag responses, console/overflow/accessibility evidence, archive/upload/database integrity, stopped ports, closed session, removed temporary state, and final Git status. It ends with `WORK_READY` and does not claim Reviewer approval.

## Validation and Acceptance

Acceptance is behavioral and bounded to task 07:

1. `/notizie` renders one combined hub with all published news, all current-status calendar entries, and all current-status official documents from the existing three cached reads. The route still calls `await io()` and renders the collection component directly rather than through `PageSwitch`.
2. Calendar grouping is `match`, `result`, `event`; each group preserves `startsAt:asc` client order. No client-side current-time reclassification or sort exists. The seeded browser proof shows October 11/17 matches, September 27/October 4 results, and October 24/November 7 events in their expected group order.
3. Matches show `VS` without scores. Results show both score values only as a complete pair; zero is valid. Missing one or both scores shows `Risultato non disponibile`. Events do not receive fabricated team/score UI. Missing teams retain the required title without fake placeholders.
4. The first featured story is the lead. If none is featured, the newest first item is the lead. Every remaining article stays in received descending-date order and renders once at both viewports; no mobile-only content loss or query exists.
5. Documents remain in display-order/title order from the client. Every row exposes a real direct PDF URL, mapped filename, category, season, `PDF` label, accessible download name, `type`, and download hint. At least one URL returns HTTP 200 `application/pdf` and `%PDF-1.4`; no proxy/viewer/dependency is added.
6. Empty calendar, news, and document collections retain their stable section targets and show the accepted localized states; missing calendar kinds remove only their subgroup. Partial draft strings/CTAs omit blank elements, incomplete result scores are explicit, and a draft document title falls back to its mapped filename. CMS/mapper failures continue to the route error boundary.
7. The hub has one H1, orderly H2/H3/H4 hierarchy, real anchor targets, semantic nav/sections/lists/articles/figures/times, keyboard-operable links, visible focus, truthful image alt, tabular scores, sufficient contrast, and no horizontal overflow. It adds no newsletter, share control, fake link, contact form, inert tab, or unsafe reference fact.
8. `/notizie/[slug]` still renders through `PageSwitch`. The article displays breadcrumb/return links, category/date/featured state, one H1 with draft fallback, optional summary, required truthful hero image, and every validated Blocks node through the unchanged shared renderer. Empty draft Blocks show a useful preparation state.
9. Hub metadata is the specified Italian title/description. Detail metadata uses the CMS title/summary, `notFound()` for an absent slug, and nonblank fallbacks for incomplete drafts. Task 07 adds no `generateStaticParams`, static export, final canonical/Open Graph/Twitter/JSON-LD, sitemap, or robots change.
10. Draft Mode preview of the seeded article visibly enables the shared banner, uses the draft-aware detail read, persists to the aggregate where calendar/documents are draft-aware and news remains published-only, and exits through the existing POST flow with the cookie cleared. The closed preview-path and secret-validation implementation is unchanged.
11. A signed runtime request for news returns `news` plus `news:<slug>`; calendar and documents return their collection tags. Hub/detail reload after invalidation. No CMS record, archive, ordinary data, tag mapping, webhook contract, or secret is changed/exposed.
12. At 1600×900 the hub shows the airy opening, three calendar columns, lead-plus-rail news, and three-column documents inside the accepted shell; detail uses a spacious readable article measure. At 412×914 both routes become one-column narratives with wrapped navigation and preserve task 03's accepted 64px fixed bar plus matching mobile-shell reservation. The final footer content remains fully visible with a positive measured distance to the bar and no clipping, overlap, or overflow; the previously recorded 64.5px content-gap claim is not an acceptance criterion.
13. Only the lead hub image and detail hero preload. Every CMS image uses `next/image`, a positioned frame, accurate `sizes`, `object-cover`, and mapped alt. Lower images remain lazy. The compact secondary-news images use the exact existing frame widths in their hint: 112px below `sm`, 160px from `sm`, and 136px from `lg`. No image is generated, downloaded, recolored, hidden, or replaced.
14. No backend schema/source/type, content/archive, DTO/client/mapper/connector/data/cache/tag/webhook/Preview path, `PageSwitch`, shared Blocks/chrome/global CSS, Home/About/Activity renderer, dependency, lockfile, README, PLAN, TYPES, task tracker, or asset change occurs.
15. The focused 6-test policy suite and full expected 7-file/56-test frontend suite pass. `be:openapi`, `fe:openapi`, `fe:check`, and `fe:build` pass; generated API shape is unchanged; both routes remain Partial Prerender. No backend/browser/component/E2E/smoke/deployment test file is added or run.
16. Manual proof uses only named session `task-07-notizie`, exact 1600×900 and 412×914 viewports, archive-backed disposable state, ports 65170/65171 bound to `127.0.0.1`, and the fixed Playwright CLI setup. Session/processes/ports close, secrets remain hidden, temporary evidence is removed, ordinary uploads/database stay unchanged from the post-generator baseline, and archive identity remains approved.
17. Worker and Reviewer leave `TODOS.md`, branch, index, Git history, upstream, and task 08 unchanged. After `APPROVED` and `REVIEW_READY`, Coordinator alone performs permitted plan/review bookkeeping, checks item 07, stages only task-owned route/component/generated/plan/tracker files while excluding `.agents/skills/imagen/scripts/`, creates local commit `07 — Implement Notizie, calendario, documents, and article detail`, and intentionally does not push.

## Idempotence and Recovery

Source edits and pure tests are idempotent. Policy helpers create new arrays and never mutate frozen DTO input. Formatting, generators, tests, and builds can be repeated. If generated artifacts differ only in native timestamp defaults, retain and document generator output; if any endpoint/type shape changes, stop and locate the unintended contract change rather than editing schemas or generated files manually.

Do not repair a visual gap by editing the archive, ordinary database, schema, DTO, mapper, query, cache, webhook, or reference. If implementation discovers an objective contract blocker, stop with `BLOCKED` and identify the exact missing field/invariant; planning found none.

Archive import is destructive only to its explicit disposable target. Prove the unique database file absent before `--force`; never retry a failed import in place. Restore ordinary uploads before a second attempt, preserve failure evidence, and use a new `task-07-preview-*` directory. Never recursively remove all of `backend/.tmp`, `backend/public`, `.playwright-cli`, the workspace root, or another session’s files.

Token, preview-state, and revalidation helpers are temporary runtime machinery. The API token stays on descriptor/shell/process memory. The preview secret and webhook secret stay in Mise-loaded process memory. The short-lived Draft Mode cookie exists only in the mode-0600 task storage-state file and named browser session, then is explicitly cleared/deleted. On failure, unset task variables, close the named session, stop exact process groups, restore uploads, and retain the unique workspace until diagnosis. Never print a token, secret, configured secret-header value, or cookie.

Browser inspection can repeat in the same named session during one remediation pass, but close it before handoff. Use only session-specific close, never `close-all` or `kill-all`. Screenshots, saved PDF proof, logs, helpers, and storage state stay inside the unique workspace and are removed only after findings are summarized. Upload/database restoration failure is a blocker: keep evidence and do not claim completion.

## Artifacts and Notes

Expected durable implementation files are:

    frontend/app/(content)/notizie/page.tsx
    frontend/app/(content)/notizie/[slug]/page.tsx
    frontend/components/notizie/list-page.tsx
    frontend/components/notizie/notizie-media.tsx
    frontend/components/notizie/hero.tsx
    frontend/components/notizie/calendar-section.tsx
    frontend/components/notizie/news-section.tsx
    frontend/components/notizie/documents-section.tsx
    frontend/components/notizie/presentation.ts
    frontend/components/notizie/presentation.test.ts
    frontend/components/news-detail/page.tsx
    frontend/components/news-detail/news-detail-media.tsx
    frontend/components/news-detail/hero.tsx
    frontend/components/news-detail/article-body.tsx

Required generators may update:

    frontend/cms/schema.json
    frontend/cms/schema.d.ts

The durable planning artifact is `.agents/plans/07-implement-notizie-calendario-documents-and-article-detail.md`. No standalone design note, content manifest, source/generated image, browser test, screenshot, fixture, CSS file, README, or dependency is needed.

Temporary evidence belongs only below `backend/.tmp/task-07-preview-XXXXXX/`: disposable SQLite data, preserved/imported uploads during the run, token/Preview/revalidation helper source and logs, runtime logs, Draft Mode storage state, screenshots/snapshots, and one retrieved PDF proof. Ordinary uploads return to `backend/public/uploads`; task browser artifacts are moved into this workspace; the workspace is removed only after successful proof.

## Interfaces and Dependencies

Use only existing Next.js 16.3.1, React 19.2.8, Tailwind CSS 4, TypeScript, and Vitest. Add no package. Every new hub/detail production module is a Server Component with no `"use client"` directive.

The hub composition retains:

    export function NotizieListPage(props: {
      news: NewsListItemDto[];
      calendar: CalendarEntryDto[];
      documents: OfficialDocumentDto[];
    })

The detail composition retains:

    export function NewsDetailPage({ page }: { page: NewsDto })

The pure policy signatures are fixed in Milestone 1. Other prop types remain private to their owning directory and use existing DTOs from `@cmsjs/cms/model`; do not define transport/domain duplicates or a cross-page view model.

Use `next/link` for known internal article/archive links, native anchors for same-page jumps, calendar CTA strings, and direct PDF media URLs, and `next/image` only through the two page-private wrappers or the existing shared Blocks renderer. Use `Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ... })` for calendar timestamps and article dates; construct plain editorial dates at midday UTC before formatting so a date-only value cannot shift a day. Add no date, icon, download, markdown, or UI library.

Keep these existing data interfaces unchanged:

    listNews(): Promise<NewsListItemDto[]>
    listCalendarEntries(): Promise<CalendarEntryDto[]>
    listOfficialDocuments(): Promise<OfficialDocumentDto[]>
    getNewsBySlug(slug: string): Promise<NewsDto | null>

Keep these cache tags unchanged:

    news
    news:<slug>
    calendar-entries
    official-documents

Revision note (2026-10-08 / Planner): Created the initial self-contained task-07 ExecPlan after complete governing-file, skill/reference, design/history, Notizie desktop/mobile reference, CMS pipeline/route/metadata/Preview/cache inspection, exact task-02 content/archive review, task-03 shared chrome, task-04–06 ownership patterns, pinned-documentation fallback, repository-state, and validation inspection. Recorded the Context7 quota failure; fixed every ordering/grouping/score/download/article/metadata/preview/cache/empty/responsive/accessibility decision; prescribed focused tests, artifact refresh, canonical commands, isolated Playwright/PDF/Draft Mode/revalidation proof, complete cleanup, Coordinator-only local commit, and explicit no-push override. No implementation file, task tracker, asset, runtime, branch, index, commit, or remote was changed.

Revision note (2026-10-08 / Worker): Recorded completion of the pure Notizie presentation-policy milestone and its passing exact six-test focused run before beginning the hub implementation.

Revision note (2026-10-08 / Worker): Recorded completion of the hub, article-detail, and metadata implementation milestones after formatting, the repeated six-test focused run, and an initial passing `fe:check`; artifact refresh and full canonical/runtime proof remain.

Revision note (2026-10-08 / Worker): Recorded the required artifact refresh, timestamp-only generated diff proof, full canonical frontend results, retained Partial Prerender classifications, and passing scope/integrity checks before isolated runtime validation.

Revision note (2026-10-08 / Worker): Recorded the completed archive-backed desktop/mobile, PDF, Preview/Draft Mode, signed revalidation, media-loading, accessibility/console, and navigation proof; documented the CLI filesystem limitation and safe PDF fallback; and captured byte-exact ordinary-state restoration plus complete task-artifact cleanup. Worker execution is complete and ready for independent review.

Revision note (2026-10-08 / Planner, after independent review): Recorded `CHANGES_REQUESTED` and revised the living plan for a one-line task-local compact-image `sizes` correction, mandatory focused/full validation and exact viewport rerun, and complete cleanup/re-review. Replaced the self-imposed 64px content-gap threshold and inaccurate 64.5px evidence with the actual accepted shared-shell contract and Reviewer-reproduced 54.75px hub / 55.5px detail clearances. Shared chrome/global CSS remain explicitly unchanged; Coordinator-only commit ownership, no push, and the task-08 boundary remain intact.

Revision note (2026-10-08 / Coordinator): Recorded the independent Reviewer’s final `APPROVED`/`REVIEW_READY` result after the scoped image-hint remediation and its separate canonical, runtime, Preview, revalidation, and cleanup audit. Checked queue item 07 and finalized outcomes for the Coordinator-owned local commit. The unrelated image-tool directory remains excluded, and no push is authorized or performed.

Revision note (2026-10-08 / Worker, remediation cycle 1): Recorded the exact one-line `sizes` correction, repeated format/focused/generator/canonical/full/build/scope proof, archive-backed 136px/256w desktop and 112px/128w mobile candidate evidence, separately measured 64px shell reservation and positive 54.75px/55.5px footer-content clearances, repeated PDF/Preview/signed-revalidation proof, and complete byte-exact restoration and cleanup. No other production behavior, shared chrome, task-08 surface, tracker, index, branch, commit, or remote changed; the task is ready for independent re-review.

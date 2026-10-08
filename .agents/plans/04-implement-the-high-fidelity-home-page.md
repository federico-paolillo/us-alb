# Implement the high-fidelity Home page

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A fresh Worker must be able to implement and validate task 04 using only this file and the current working tree.

## Purpose / Big Picture

After this work, `/` is the complete editorial entry point for U.S. Albatese rather than the task-01 minimum renderer. At 1600×900 it presents the spacious split hero, four-metric heritage strip, next future fixture, three editorial news cards, four activity teasers, institutional quotation, and a restrained territorial-network strip. At 412×914 the same semantic content tree becomes a compact narrative: the hero image changes from portrait framing to a wide crop, metrics become a two-column grid, fixture details stack, the two leading news stories become card surfaces, and the later sections remain readable above the existing fixed mobile navigation.

The page continues to render from Strapi at request time and to reuse the existing tagged caches. Home singleton content comes from the existing `HomePageDto`; fixture and news presentation comes from the existing `listCalendarEntries()` and `listNews()` reads. No backend schema, seed content, DTO, raw client, connector, mapper, cache tag, webhook, route, `PageSwitch`, shared chrome, or archive change is needed. Empty optional aggregates and draft-mode empty repeatable components remove only their own sections without leaving empty headings, broken anchors, or blank cards.

The result is observable by importing `backend/seed-data/us-albatese-demo.tar.gz` into a disposable database, starting Strapi and Next.js on loopback-only ports, and opening `/` with the one named Playwright CLI session at exactly 1600×900 and 412×914. The ordinary database, uploads, local env files, browser data, and unrelated untracked image tool remain untouched.

## Progress

- [x] (2026-10-08 16:29Z) Read root `AGENTS.md`, `frontend/AGENTS.md`, `.agents/docs/PLANS.md`, the `implement-task`, `canonical-validation`, and `playwright-cli` skills plus relevant browser-session, custom-code, and element-inspection references, `TODOS.md`, `PLAN.md`, `TYPES.md`, `design/DESIGN.md`, `design/HISTORY.md`, both Home reference HTML files, the task-02 dataset/archive plan, the task-03 shared-chrome implementation and ExecPlan, and the current task-01 CMS DTO/client/mapper/connector/cache/dispatch implementation.
- [x] (2026-10-08 16:29Z) Attempted the required Context7 resolution for the Next.js 16 Cache Components, `io()`, cached-read composition, current-time, and responsive-image questions; Context7 returned the monthly-quota error, so inspected the repository-pinned Next.js 16.3.1 `io`, Cache Components, and `next/image` documentation instead.
- [x] (2026-10-08 16:29Z) Resolved every Home section against the existing contract, including aggregate ownership, fixture/news selection, the non-sponsor territorial strip, responsive behavior, empty degradation, links, accessibility, artifact refresh, canonical validation, and isolated manual-verification procedure. No implementation file, `TODOS.md`, asset, runtime, branch, index, commit, or remote was changed by the Planner.
- [x] (2026-10-08 16:47Z) Implemented and unit-tested the Home-only aggregate selection policy; the focused Vitest run passed 1 file and 6 tests.
- [x] (2026-10-08 16:51Z) Replaced the minimum Home renderer with the exact Home-only Server Component composition; all production changes are confined to `frontend/components/home/`.
- [x] (2026-10-08 16:51Z) Refreshed both generated API artifacts and passed `fe:check`, the full 6-file/50-test frontend suite, and `fe:build`; `/` remains Partial Prerender output.
- [x] (2026-10-08 17:00Z) Completed archive-backed Playwright inspection at 1600×900 and 412×914 with the one `task-04-home-page` session, verified all required content, transforms, links, focus, fonts, overflow, and chrome behavior, then restored and proved all ordinary state.
- [x] (2026-10-08 17:04Z) Corrected metric `DT`/`DD` semantic order and repeated generators, canonical validation, exact desktop/mobile archive-backed inspection, and complete cleanup without changing the visual composition.
- [x] (2026-10-08 17:19Z) Independent Reviewer approved the Home composition, aggregate policies, canonical and generator evidence, exact responsive/browser behavior, semantic correction, scope boundaries, and complete runtime cleanup with no actionable finding.
- [x] (2026-10-08 17:22Z) Coordinator recorded approval, checked queue item 04, isolated only task-owned Home/generated/plan/tracker files for one local commit, and intentionally skipped pushing under the explicit user override.

## Surprises & Discoveries

- Observation: branch `main` begins task 04 at local commit `28fec7a`, three commits ahead of `origin/main`; task commits `2bcd098`, `4b1b731`, and `28fec7a` are deliberately unpushed.
  Evidence: `git status --short --branch` reports `main...origin/main [ahead 3]`, and `git rev-list --left-right --count '@{upstream}...HEAD'` reports `0 3`. The user explicitly overrides the normal push requirement for this queue.
- Observation: the only unrelated worktree item is the pre-existing untracked `.agents/skills/imagen/scripts/` directory.
  Evidence: initial `git status --short` reports only `?? .agents/skills/imagen/scripts/`. Task 04 does not use or modify built-in `imagegen` or repository `imagen`.
- Observation: `HomePageDto` directly supplies hero copy/media, metrics, one quote, and activity teasers, but intentionally contains neither calendar entries, news, nor partners.
  Evidence: `frontend/cms/model.ts`, `TYPES.md`, and the task-01 pipeline. The already-public cached reads `listCalendarEntries()` and `listNews()` own the missing aggregate data, so fixture/news do not justify a schema or DTO expansion.
- Observation: the content contract has no partner or sponsor entity, and task 02 contains no sponsor records.
  Evidence: all six backend content types, `TYPES.md`, and the task-02 exact dataset. The required visual strip can truthfully express the already-authorized network around the club—CSI, FIDAL, Albate, families, and volunteers—without naming businesses, claiming sponsorship, adding links, or creating editorial data ownership.
- Observation: `listCalendarEntries()` is Draft Mode aware while `listNews()` is deliberately published-only.
  Evidence: `frontend/cms/data.ts`, `frontend/cms/client.ts`, and `TYPES.md`. Home preview therefore may show a draft Home singleton and draft calendar entry, but featured news stays published-only. Preserve that existing policy.
- Observation: the seeded calendar is already returned in ascending `startsAt` order, and news in descending `editorialDate` order.
  Evidence: the existing client queries specify `startsAt:asc` and `editorialDate:desc`. Home selection should consume those authoritative orders, not issue another query or duplicate CMS sorting.
- Observation: draft mapping may normalize missing Home metrics and activity teasers to empty arrays even though published content requires them.
  Evidence: `toHomePageDto` and its existing mapper test. The renderer must treat these arrays as optional presentation sections and remain useful during incomplete preview.
- Observation: the required Context7 request failed before returning a library id.
  Evidence: `ctx7 library Next.js "For this Next.js 16 App Router project ..."` returned `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` A future contributor may run `ctx7 login` or set `CONTEXT7_API_KEY`; this plan uses installed official documentation rather than remembered framework behavior.
- Observation: the pinned Next.js 16.3.1 docs require `await io()` before reading `new Date()` when Cache Components is enabled, unless another request-time API already provides the suspension point.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md`. Although `frontend/app/(content)/page.tsx` already calls `await io()`, Home will call it immediately before its own current-time read so the component remains safe if its composition changes later.
- Observation: pinned `next/image` requires a positioned parent for `fill`, recommends an accurate `sizes` expression for responsive images, and deprecates `priority` in Next.js 16.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`. Use one `preload` on the single hero image and lazy defaults for every lower image.
- Observation: the approved demonstration archive is tracked, is 636,008 bytes, and has SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.
  Evidence: local file inspection and the approved task-02 plan. It must remain byte-identical.
- Observation: a disposable archive import creates its own encrypted `Read Only` content API token; the ordinary frontend token belongs to another database, and an empty token violates current configuration.
  Evidence: the approved task-03 runtime inspection. Task 04 therefore recovers the disposable token through the installed Strapi service into shell memory only, never prints or writes it, passes it to the frontend child process, and unsets the shell variable immediately after launch.
- Observation: there is no `fe:test` Mise task.
  Evidence: `mise tasks` lists `fe:check`, `fe:build`, and the OpenAPI tasks but not `fe:test`. Run the existing `npm test` script from `frontend` as required by `PLAN.md` and the canonical-validation skill.
- Observation: the focused selection policy is independent of React and Next.js and accepts frozen input arrays without mutation.
  Evidence: `npm test -- components/home/selection.test.ts` passed all 6 cases, including future-match filtering, stable featured-news ordering, limits, and frozen inputs.
- Observation: the required OpenAPI refresh changed only native generation-time `publishedAt` defaults.
  Evidence: JSON comparison after normalizing every generated datetime default and TypeScript comparison after removing only generated `@default` timestamp lines both exited zero; endpoint paths, operations, schema keys, and TypeScript shapes are unchanged.
- Observation: the complete Home composition remains request-capable with Cache Components enabled.
  Evidence: `mise run fe:build` completed successfully and classified `/` as `◐` Partial Prerender output; the composition calls `await io()` before `new Date()` and uses only `listCalendarEntries()` and `listNews()`.
- Observation: Mise project environment loading overrides same-named variables exported before `mise exec`, so the Planner's initial frontend launch ordering selected ordinary ports 65100/65101 instead of the task ports.
  Evidence: the first disposable browser request reached the existing error boundary, the backend received no API request, and secret-free `/proc` inspection showed ordinary `CMS_URL`, `CMS_MEDIA_URL`, and `SITE_URL` values. The failed browser session and both task-owned processes were closed before the corrected run; no source or ordinary state changed.
- Observation: the secure corrected launch can retain the token only in process environments while still applying frontend overrides after Mise.
  Evidence: the final run exported the token under task-only `TASK04_CMS_TOKEN`, invoked a post-Mise shell containing only the literal variable reference, assigned `CMS_API_TOKEN` inside that shell, and unset the staging name before `npm`. Process arguments contained no token, the frontend saw ports 65140/65141, and Strapi served the singleton plus both cached aggregate queries.
- Observation: the final archive import and exact-viewport inspection matched the planned dataset and responsive behavior.
  Evidence: import reported 55 entities, 112 links, and 43 assets. Desktop diagnostics showed a 1200px centered container, 422.656×528.312px 4:5 hero, one H1, four metrics, the October 11 fixture, three visible news cards with the featured story first, four activities, five network items, Epilogue/Manrope, sticky header, hidden mobile bar, and 1600/1600 scroll/client width. Mobile diagnostics showed a 372×232.5px 16:10 hero, 36px/44px H1 rhythm, two metric columns containing four items, details stacked below fixture teams, two visible news cards, four single-column activities, fixed unclipped navigation labels, 64px footer clearance, and 412/412 scroll/client width.
- Observation: cleanup restored every ordinary artifact exactly.
  Evidence: the final required `be:openapi` rerun updated native Strapi bookkeeping in the ordinary database before the last isolated browser pass, establishing inode 4276133, size 1355776, mtime `2026-10-08 19:01:46.945340261 +0200`, and SHA-256 `0dbd8968d7f98157a515dfdfb524c4fa2f4f27c9e4dfde1928ec290ce5193a05`; the final task-owned import/runtime used only its explicit disposable path and left that mtime unchanged. Uploads again contain only `.gitkeep` with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; the archive retained its approved hash; no task directory, import log, browser artifact, named session, or listener on 65140/65141 remains.
- Observation: the semantic metric structure required one final correction without a visual change.
  Evidence: each definition group now contains `DT` then `DD` in DOM order while CSS order keeps the value above its label. The post-correction generators, `fe:check`, 6-file/50-test suite, and `fe:build` all passed; the build still classifies `/` as Partial Prerender. Final 1600×900 and 412×914 diagnostics showed four `DT`/`DD` groups, unchanged four-column/two-column visual positions, exact viewport widths without overflow, two visible mobile news cards, 64px mobile bottom clearance, and zero application console errors.

## Decision Log

- Decision: make `frontend/components/home/page.tsx` an async Server Component that calls the existing `listCalendarEntries()` and `listNews()` cached reads in parallel, then passes selected data into Home-only presentational sections.
  Rationale: Home is the presentation owner for its aggregate modules, while `frontend/cms/data.ts` remains the sole data/cache owner. This keeps `frontend/app/(content)/page.tsx` and `frontend/components/page-switch.tsx` unchanged and avoids a parallel pipeline or a cross-page view model.
  Date/Author: 2026-10-08 / Planner
- Decision: define a small pure selection module with `selectNextFixture` and `selectFeaturedNews`, and cover only those non-visual policies with Vitest.
  Rationale: choosing the first future match and prioritizing flagged news are stable server-side behaviors worth proving. Visual class lists, spacing, and responsive grids are better proven through build and manual inspection than a DOM test seam.
  Date/Author: 2026-10-08 / Planner
- Decision: select the first entry whose `kind` is `match` and whose parsed `startsAt` is strictly later than the request-time `now`; do not display a past match as “next.”
  Rationale: the aggregate query already sorts chronologically. If there is no future match, omitting the fixture section is more truthful than relabeling a result or stale fixture.
  Date/Author: 2026-10-08 / Planner
- Decision: choose up to three news items by placing `featured: true` items first while preserving existing order within featured and non-featured groups; if none is flagged, use the newest published items.
  Rationale: this honors the editorial flag without losing the client query’s descending date order. Desktop presents all three; mobile presents the first two to match the two-card reference, with `/notizie` exposing the full archive.
  Date/Author: 2026-10-08 / Planner
- Decision: render the partner-strip visual as a non-linked “Rete e comunità” list containing `CSI`, `FIDAL`, `Albate`, `Famiglie`, and `Volontari`.
  Rationale: these are authorized identity/community facts, not fabricated sponsors. This satisfies the named visual section without creating false endorsements or a new editorial contract.
  Date/Author: 2026-10-08 / Planner
- Decision: keep every new production component under `frontend/components/home/`, reuse task-03 global tokens and `.site-container`, and make no shared CSS or chrome change.
  Rationale: task 04 owns only Home presentation. Tailwind 4 utilities and the accepted token foundation already express the necessary layout, typography, surfaces, borders, radii, shadows, and focus behavior.
  Date/Author: 2026-10-08 / Planner
- Decision: render all four seeded metrics and all four activity teasers rather than copying the references’ incidental three-item examples.
  Rationale: the CMS owns those repeatable values. Responsive two-column/four-column transformations preserve all current content without hard-coded truncation.
  Date/Author: 2026-10-08 / Planner
- Decision: omit an optional section when its source collection is empty, omit an individual teaser image when absent while retaining its text, and let dependency/validation failures continue to the existing route error boundary.
  Rationale: empty editorial data and dependency unavailability are distinct. Silent exception swallowing would disguise a broken CMS; clean empty degradation should not.
  Date/Author: 2026-10-08 / Planner
- Decision: add no browser, snapshot, component, accessibility, smoke, or end-to-end test file.
  Rationale: repository policy limits automated tests to unit and integration tests, and this task’s only new stable logic is pure selection. Canonical build plus the required fixed Playwright CLI inspection proves framework wiring and visual behavior.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer do not edit `TODOS.md`, stage, commit, push, or change branches. After Reviewer approval, Coordinator alone checks task 04 and creates local commit `04 — Implement the high-fidelity Home page`; no push occurs.
  Rationale: this is the explicit role ownership and no-push override supplied by the user. It supersedes the normal implement-task push gate without expanding any technical scope.
  Date/Author: 2026-10-08 / Planner
- Decision: pass the disposable API token through a task-only staging environment name, then assign `CMS_API_TOKEN` inside a post-Mise child shell and unset the staging name before launching Next.js.
  Rationale: repository Mise environment loading overrides same-named pre-Mise exports, while passing the secret through `env NAME=value` after Mise would expose it briefly in process arguments. The staging name preserves process-local precedence and keeps the decrypted token out of files, logs, tool results, and command arguments.
  Date/Author: 2026-10-08 / Worker

## Outcomes & Retrospective

Planning is complete. Implementation, canonical validation, archive-backed visual evidence, independent review, and Coordinator bookkeeping remain open. Update this section after each material milestone and at final approval, comparing the finished Home at both required viewports against the purpose above.

Milestone 1 is complete: the pure aggregate-selection policy now chooses only the first future match, stably prioritizes featured news, and is covered by six focused unit tests. Home presentation, full validation, visual inspection, review, and Coordinator bookkeeping remain open.

Milestones 2 and 3 are complete: the minimum Home renderer is now the seven-section responsive editorial page, generated artifacts retain the existing API shape, `fe:check` passes, all 50 tests in 6 files pass, and the production build retains Partial Prerender behavior. Archive-backed visual inspection, independent review, and Coordinator bookkeeping remain open.

Milestone 4 is complete: the final secure archive-backed runtime used only loopback ports 65140/65141 and one fixed named browser session. Desktop and mobile screenshots plus semantic diagnostics confirmed the intended editorial composition and responsive transforms; pointer and keyboard activation reached `#prossimo-incontro`, `/chi-siamo`, `/notizie`, `/notizie/la-stagione-2026-27-prende-forma`, and `/attivita`; the final console contained zero application errors. All temporary evidence was removed after recording these observations, and ordinary database/uploads/archive state was restored exactly. The Worker implementation is ready for independent review; Reviewer approval and Coordinator-only bookkeeping/commit remain open.

After the final semantic definition-list correction, the required generators and complete canonical frontend validation passed again with the same 6 files and 50 tests and the same Partial Prerender route classification. A final archive-backed exact-viewport pass confirmed the corrected `DT`/`DD` DOM order with unchanged presentation at 1600×900 and 412×914, then repeated complete restoration and artifact cleanup. Independent review reproduced the selection, canonical, generated-contract, semantic, responsive, link, focus, and cleanup evidence and approved the task without findings. The Coordinator recorded the queue item and prepared one isolated local commit; no push is performed.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0. `frontend/` is Next.js 16.3.1 with React 19.2.8, Tailwind CSS 4, typed routes, and Cache Components enabled. “SSR + ISR” here means the route renders against request-time state on the server, while individual CMS reads are cached for reuse and invalidated through Strapi webhooks. `frontend/app/(content)/page.tsx` establishes request rendering with `await io()`, reads the Home singleton, and delegates the returned discriminated DTO to `PageSwitch`. `PageSwitch` dispatches `pageType: "home"` to `frontend/components/home/page.tsx` and must remain the dispatch boundary.

The CMS path is fixed: `frontend/cms/client.ts` serializes Strapi REST queries; `mappers.ts` validates raw responses into DTOs declared in `model.ts`; `connector.ts` composes those layers; and `data.ts` exposes cached reads with `"use cache"`, `cacheLife("days")`, and `cacheTag`. Home uses `getHomePage()` through the route as today. The enhanced Home renderer additionally calls `listCalendarEntries()` and `listNews()` from `data.ts`; it never imports the raw client or connector.

`HomePageDto` contains `eyebrow`, `headline`, `introduction`, required `heroImage`, `metrics`, required `institutionalQuote`, and `activityTeasers`. Each teaser image is optional. `CalendarEntryDto` contains `kind`, offset-aware `startsAt`, competition, title, optional home/away teams and scores, venue, summary, and an optional call to action. `NewsListItemDto` contains identity slug/title, category, summary, editorial date, required hero image, and `featured`. Mapper validation already owns media URLs, valid dates, enum values, and required published fields; Home must not revalidate them.

Task 02’s archive seeds four metrics, four activity teasers, one quote, two future match records as of 2026-10-08, and three published news items with one featured. Its images are deliberately magenta placeholders whose alternative text states their semantic purpose and dimensions. Do not hide that fact, substitute imagery, edit the archive, or generate an asset.

Task 03 already owns the self-hosted Epilogue/Manrope fonts, gold/graphite/pale token system, 1200px `.site-container`, sticky desktop/compact mobile header, fixed mobile bottom navigation, footer/contact block, visible app version, skip link, and global state presentation. Home composes inside that accepted shell. The desktop Home reference is authoritative for section order and airy editorial balance; the mobile Home reference is authoritative for wide hero cropping, compact metrics, stacked fixture, and two leading news cards. `design/DESIGN.md` resolves incidental disagreements such as excessive reference radii or obsolete colors.

## Plan of Work

### Milestone 1: Add the aggregate selection policy

Create `frontend/components/home/selection.ts`. Export:

    selectNextFixture(
      entries: readonly CalendarEntryDto[],
      now: Date,
    ): CalendarEntryDto | undefined

    selectFeaturedNews(
      news: readonly NewsListItemDto[],
      limit?: number,
    ): NewsListItemDto[]

`selectNextFixture` walks the already ascending input and returns the first `match` whose `Date.parse(startsAt)` is greater than `now.getTime()`. It does not sort, mutate, accept results/events, or invent a fallback. Mapper validation guarantees an offset-aware valid timestamp, so do not duplicate error policy here.

`selectFeaturedNews` defaults `limit` to three, returns an empty array for a non-positive limit or empty input, keeps relative input order, puts all flagged items before unflagged items, takes at most the requested count, and never mutates the frozen DTO array.

Create `frontend/components/home/selection.test.ts`. Prove that fixture selection skips past matches, results, and events; returns the first future match; returns `undefined` when none qualifies; puts flagged news first without disturbing relative order; falls back to newest input order when no item is flagged; respects the limit; and leaves inputs unchanged. Use small literal DTO fixtures with valid ISO offsets and image fields only where the news type requires them. Do not duplicate mapper, query serialization, rendering, or date-format tests.

Run the focused unit test before continuing:

    cd /home/codex/src/us-alb/frontend
    npm test -- components/home/selection.test.ts

Milestone acceptance: the pure policy passes, has no dependency on React/Next, and changes no CMS file.

### Milestone 2: Build Home-only presentational sections

Create `frontend/components/home/home-media.tsx` as a small pure wrapper around `next/image`. It accepts an `ImageDto`, an accurate `sizes` string, optional `preload`, and presentation classes. It renders `fill`, preserves the DTO alternative text, uses `object-cover`, and relies on a positioned parent supplied by its section. Do not render the generic seed caption on every repeated card, add another image loader, or use deprecated `priority`. Only the hero passes `preload`.

Create these one-purpose Server Components:

- `frontend/components/home/hero.tsx` maps `eyebrow`, `headline`, `introduction`, and `heroImage`. Mobile uses approximately the reference’s 36px display rhythm and a 16:10 image; desktop uses a seven/five text-image grid, a 56px display, and a 4:5 portrait image. It accepts `fixtureHref`, which is `#prossimo-incontro` when a fixture exists and `/notizie` otherwise. The primary label is `Prossimi impegni`; the secondary `La nostra storia` links to `/chi-siamo`. Preserve the honest CMS alt text and use the one preloaded responsive image.
- `frontend/components/home/metrics-strip.tsx` accepts the full metrics array and returns `null` for an empty array. Render a semantic `<dl>` in source order, two columns on mobile and four at desktop, with tabular values, restrained dividers, and no hard-coded metric values.
- `frontend/components/home/next-fixture.tsx` accepts one optional selected entry and returns `null` when absent. Its section id is `prossimo-incontro`. Render the competition eyebrow, `Prossimo incontro`, an offset-aware Italian `<time>` formatted in `Europe/Rome`, optional home/away teams in a balanced `vs` layout, the entry title when either team is absent, venue, and summary. Link `Calendario completo` to `/notizie`. Do not show scores for a future match, derive fake crests/initials, link the fictional venue to a real map, or promote the entry’s optional call to action over the calendar link.
- `frontend/components/home/featured-news.tsx` accepts the selected news array and returns `null` when empty. Its id is `notizie-in-evidenza`. Render a heading plus `/notizie` archive link, category, an Italian `Europe/Rome` editorial `<time>`, image, title, summary, and one block-level internal link per card to `/notizie/${item.identity.slug}`. Use three columns at desktop. At widths below `md`, render only the first two selected cards, matching the mobile reference; do not issue a different query.
- `frontend/components/home/activity-overview.tsx` accepts every `activityTeaser` and returns `null` for an empty array. Its id is `attivita-home`. Render four equal editorial cards at desktop and a single stacked column on mobile. Optional images occupy a 16:10 frame; absent images remove the media frame entirely without altering text hierarchy. The section-level link `Scopri tutte le attività` targets `/attivita`; do not create teaser detail routes.
- `frontend/components/home/institutional-quote.tsx` accepts the quote and returns `null` if trimmed quote text or attribution is empty in an incomplete draft. Its id is `comunita`. Render a semantic `<blockquote>`, `<footer>`, optional role, centered max-width typography, and quiet gold rule. Do not add a second unsourced history paragraph.
- `frontend/components/home/partner-strip.tsx` has no CMS props. Its id is `rete-territorio`. Render the label `Rete e comunità` and the five non-linked text items `CSI`, `FIDAL`, `Albate`, `Famiglie`, `Volontari`. Style them as a subtle wrapping strip rather than logo marks and do not call them sponsors.

Use semantic `section`, `article`, `figure`, `dl`, `blockquote`, `time`, heading, and link elements. Give every section heading a stable id and connect it with `aria-labelledby` where useful. Keep one H1, use H2 for top-level Home sections and H3 for cards, retain global focus treatment, never use clickable `div` elements, and mark decorative arrows/rules hidden from assistive technology. Avoid client components, local state, effects, animation, carousel behavior, horizontal card scrollers, Material Symbols, and new dependencies.

Replace `frontend/components/home/page.tsx` with the composition root. Keep the exported component name and `HomePageDto` prop so `PageSwitch` remains byte-unchanged. Make it async, call `await io()` before reading `new Date()`, fetch `listCalendarEntries()` and `listNews()` concurrently with `Promise.all`, select the current fixture/news with the pure helpers, and render sections in this exact order:

    Hero
    MetricsStrip
    NextFixture
    FeaturedNews
    ActivityOverview
    InstitutionalQuote
    PartnerStrip

Wrap each section only once; individual components own their surface/border/spacing. Alternate white and pale surfaces in the restrained desktop reference rhythm, use `.site-container` for the accepted 1200px alignment, and keep section padding compact on mobile but generous from `md` upward. Do not add another `<SiteHeader>`, `<SiteFooter>`, mobile nav, page metadata, loading UI, or top-level data provider.

The `Promise.all` failure path deliberately propagates to `frontend/app/(content)/error.tsx`. An empty list is not a failure: missing fixture/news removes that section, missing metrics/teasers removes theirs, and absent teaser media produces a text-only card. The always-valid hero and partner strip leave the Home meaningful even in a sparse draft.

Run formatting and inspect the exact diff:

    cd /home/codex/src/us-alb
    mise run fe:format
    git diff --check
    git diff -- frontend/components/home

Milestone acceptance: every new production file is below `frontend/components/home/`; `frontend/app/(content)/page.tsx`, `frontend/components/page-switch.tsx`, `frontend/cms/`, shared chrome, backend source, schemas, DTOs, dependencies, archive, and task queue are unchanged.

### Milestone 3: Refresh generated artifacts and run canonical validation

From `/home/codex/src/us-alb`, list tasks and perform the artifact refresh mandated after a frontend change:

    mise tasks
    mise run be:openapi
    mise run fe:openapi

Do not run `be:types`; no backend type or schema changed. Inspect `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`. The generators may refresh native generation-time `publishedAt` defaults, as tasks 01–03 recorded, but endpoint paths, operations, schema structure, and TypeScript shapes must remain unchanged. Keep only generator-produced output and treat any structural API change as a task blocker rather than editing the CMS contract.

Run all applicable canonical frontend validation:

    mise run fe:check
    cd /home/codex/src/us-alb/frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Expect Biome, generated route types, and TypeScript to exit zero; all Vitest files to pass; and the production build to complete without a live Strapi process. Record the actual test file/test counts. The build route table must continue to show `/` as request-capable Partial Prerender output rather than a fully static CMS snapshot. The route still calls `await io()`, and the three data functions retain their existing `"use cache"`, `cacheLife`, and cache tags.

Then run focused scope and integrity checks:

    git diff --check
    git diff --exit-code -- TODOS.md PLAN.md TYPES.md README.md mise.toml backend/package.json backend/package-lock.json backend/src backend/types/generated backend/seed-data/us-albatese-demo.tar.gz frontend/package.json frontend/package-lock.json frontend/app frontend/components/page-switch.tsx frontend/components/layout frontend/components/shared frontend/components/about frontend/components/activity frontend/components/news-detail frontend/components/notizie frontend/cms ':(exclude)frontend/cms/schema.json' ':(exclude)frontend/cms/schema.d.ts'
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git status --short -- .agents/skills/imagen/scripts/

The protected-file diff is empty. The separate generated-artifact diff is either empty or generation-time-default-only; prove this by comparing paths, operations, schema keys, and TypeScript shapes rather than accepting an unexplained textual change. The archive hash remains `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Package/lock files do not change. The unrelated image-tool directory remains untracked and untouched.

Milestone acceptance: required artifacts are refreshed, focused and aggregate tests pass, the production build preserves request rendering and caches, API shape is unchanged, and the implementation diff contains only Home files, this plan, and native generated timestamp refreshes if any.

### Milestone 4: Inspect the archive-backed Home at both exact viewports

Manual inspection uses only the committed demonstration archive and task-owned temporary state. Confirm `backend/.env` and `frontend/.env.development` exist and are ignored without displaying them. Record the ordinary `backend/.tmp/data.db` inode/size/mtime/hash if it exists, the archive hash, and a filename/hash manifest of `backend/public/uploads`.

Create a unique workspace and relative database path:

    mkdir -p backend/.tmp
    task04_preview_dir="$(mktemp -d -p backend/.tmp task-04-preview-XXXXXX)"
    task04_preview_base="$(basename "$task04_preview_dir")"
    task04_preview_rel=".tmp/${task04_preview_base}"
    task04_preview_db=".tmp/${task04_preview_base}/data.db"
    test ! -e "backend/$task04_preview_db"

Resolve the workspace and `backend/public/uploads` with `realpath`. Refuse to proceed if uploads is missing, is a symlink, or resolves outside `/home/codex/src/us-alb/backend/public`. Move the entire ordinary upload directory into the workspace as `uploads-original`, immediately create a new empty `backend/public/uploads`, and establish cleanup that always closes the one browser session, stops only task-owned server processes, moves imported uploads aside, and restores `uploads-original` exactly.

Import and prepare the disposable database from `backend` with process-local overrides only:

    mise exec -- env DATABASE_FILENAME="$task04_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file seed-data/us-albatese-demo.tar.gz --force --only content,files

Expect 55 entities, 112 links, and 43 asset binaries as recorded by task 02. Record `backend/import_<timestamp>.log` files before and after import, and move only newly created task-owned logs into the workspace. A failed import is not retried against the same database.

Use `apply_patch` to create temporary `$task04_preview_dir/read-demo-token.mjs`. It loads the installed CommonJS `@strapi/core` with Node `createRequire`, compiles and loads the application against the disposable database without opening a port, calls:

    app.admin.services["api-token-content-api"].getByName(
      "Read Only",
      { includeDecryptedKey: true },
    )

It requires a nonempty `accessKey`, writes only that key to already-open file descriptor 3 with `writeSync`, and destroys Strapi in `finally`. Capture descriptor 3 into a shell variable while redirecting ordinary stdout/stderr into a task log; never print the value, write it to a file, place it on a command line, or retain it after launch. This uses the installed official token service and the disposable database’s encryption configuration.

The temporary module is equivalent to this outline:

    import { writeSync } from "node:fs";
    import { createRequire } from "node:module";

    const require = createRequire(import.meta.url);
    const { compileStrapi, createStrapi } = require("@strapi/core");
    let app;
    try {
      const context = await compileStrapi();
      app = await createStrapi(context).load();
      const token = await app.admin.services[
        "api-token-content-api"
      ].getByName("Read Only", { includeDecryptedKey: true });
      if (!token || typeof token.accessKey !== "string" || !token.accessKey) {
        throw new Error("Disposable Read Only token is unavailable");
      }
      writeSync(3, token.accessKey);
    } finally {
      await app?.destroy();
    }

Start Strapi and Next.js on loopback-only ports 65140 and 65141 in one monitored terminal session, so the token never crosses a tool result or file boundary. The compound shell below captures only descriptor 3, validates presence without echoing the value, and then launches both servers. Run it from `backend`, substituting the recorded task basename:

    task04_preview_base="<recorded task-04-preview basename>"
    task04_preview_rel=".tmp/${task04_preview_base}"
    task04_preview_db=".tmp/${task04_preview_base}/data.db"
    task04_cms_token="$(
      mise exec -- env DATABASE_FILENAME="$task04_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= node "$task04_preview_rel/read-demo-token.mjs" 3>&1 1>>"$task04_preview_rel/token-helper.log" 2>&1
    )"
    test -n "$task04_cms_token"
    export TASK04_CMS_TOKEN="$task04_cms_token"
    unset task04_cms_token

    task04_backend_pid=""
    task04_frontend_pid=""
    stop_task04_servers() {
      for task04_pid in "$task04_frontend_pid" "$task04_backend_pid"; do
        if test -n "$task04_pid" && kill -0 "$task04_pid" 2>/dev/null; then
          kill -INT "$task04_pid"
        fi
      done
      test -z "$task04_frontend_pid" || wait "$task04_frontend_pid" || true
      test -z "$task04_backend_pid" || wait "$task04_backend_pid" || true
    }
    trap stop_task04_servers EXIT INT TERM

    mise exec -- env HOST=127.0.0.1 PORT=65140 DATABASE_FILENAME="$task04_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start >"$task04_preview_rel/backend.log" 2>&1 &
    task04_backend_pid="$!"
    for task04_attempt in $(seq 1 60); do
      curl --fail --silent http://127.0.0.1:65140/_health >/dev/null && break
      test "$task04_attempt" -lt 60 || exit 1
      sleep 1
    done

    (
      cd ../frontend
      exec mise exec -- sh -c '
        export CMS_URL=http://127.0.0.1:65140/api
        export CMS_MEDIA_URL=http://127.0.0.1:65140
        export CMS_API_TOKEN="$TASK04_CMS_TOKEN"
        export SITE_URL=http://127.0.0.1:65141
        unset TASK04_CMS_TOKEN
        exec npm run dev -- --hostname 127.0.0.1 --port 65141
      '
    ) >"$task04_preview_rel/frontend.log" 2>&1 &
    task04_frontend_pid="$!"
    unset TASK04_CMS_TOKEN
    for task04_attempt in $(seq 1 60); do
      curl --fail --silent http://127.0.0.1:65141/ >/dev/null && break
      test "$task04_attempt" -lt 60 || exit 1
      sleep 1
    done
    wait -n "$task04_backend_pid" "$task04_frontend_pid"
    exit 1

Record the returned monitored terminal session id and use it only to poll or send Ctrl-C after browser inspection. The one-second readiness waits are bounded, not long blocking sleeps. Never bind `0.0.0.0`, use Docker, change an env file, alter machine/user environment variables, or start the ordinary stack.

Use exactly one named Playwright CLI session and the installed fixed headless Chromium setup. Do not pass a browser, device, executable, profile, or config override; do not create a Playwright test or script file:

    playwright-cli -s=task-04-home-page open http://127.0.0.1:65141/
    playwright-cli -s=task-04-home-page resize 1600 900
    ...desktop inspection...
    playwright-cli -s=task-04-home-page resize 412 914
    ...mobile inspection...
    playwright-cli -s=task-04-home-page close

At 1600×900, capture a snapshot with boxes and viewport screenshots at the hero/metrics, fixture/news, and activities/quote/network positions, saving evidence only in the task workspace. Confirm the 1200px alignment, 7/5 hero, 4:5 crop, one H1, four metrics, future October 11 fixture, three news cards with the flagged story first, four activity cards, quote attribution, and five-item network strip. Confirm Epilogue/Manrope computed families, no horizontal overflow, the shared header remains sticky, the mobile bar is hidden, placeholder alt text is present, and the console contains no application error. Click `Prossimi impegni`, `La nostra storia`, `Calendario completo`, `Archivio notizie`, one news card, and `Scopri tutte le attività`, using back navigation where necessary, and verify the exact targets `#prossimo-incontro`, `/chi-siamo`, `/notizie`, `/notizie/<slug>`, and `/attivita`.

At 412×914, capture corresponding viewport screenshots while scrolling through the whole Home. Confirm the 16:10 hero crop, 36px-class display rhythm, two-column metric grid with all four values, stacked fixture, only the first two selected news cards visible, text/image activity cards in one column, readable quote/network strip, fixed mobile bar clearance, no covered final content, untruncated shared-navigation labels, and zero horizontal overflow. Exercise the Home-specific anchor and at least one card link with keyboard focus as well as pointer input. The development-only `<nextjs-portal>` may be removed from the current inspection page through `playwright-cli eval` if it intercepts the fixed bottom navigation; record that diagnostic and do not change application CSS or browser configuration.

Use semantic snapshots and small diagnostic `eval` calls for viewport size, `scrollWidth`, computed font, section count, visible-card count, positions, and link destinations. Screenshots are visual evidence, not golden snapshots. Do not mutate the CMS, route network responses, cookies, storage, or browser profile to simulate empty data.

Close the named browser session even when inspection fails. Send Ctrl-C only to the recorded runtime terminal session; its trap stops both task child processes, after which poll until the session exits. Escalate only after confirming an exact remaining task process identity. Remove only the temporary token helper, screenshots, logs, imported database, and imported uploads after evidence has been recorded and after their resolved paths match the exact `task-04-preview-*` prefix. Restore `backend/public/uploads` byte-for-byte, remove only positively identified task import logs, and prove:

    no listener remains on 127.0.0.1:65140 or 127.0.0.1:65141
    playwright-cli list contains no task-04-home-page session
    the ordinary database metadata/hash is unchanged
    the restored upload filename/hash manifest is unchanged
    the archive SHA-256 is unchanged
    no task-04-preview-* directory or browser artifact remains

If visual remediation changes source, rerun the focused test, required generators, canonical frontend commands, and both viewport inspections. Update `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` with actual commands and observations before handing off `WORK_READY`.

## Concrete Steps

All commands run from `/home/codex/src/us-alb` unless a step explicitly changes directory. Begin by recording safe prerequisites:

    git branch --show-current
    git status --short --branch
    git merge-base --is-ancestor 2bcd098 HEAD
    git merge-base --is-ancestor 4b1b731 HEAD
    git merge-base --is-ancestor 28fec7a HEAD
    git rev-list --left-right --count '@{upstream}...HEAD'
    test -f backend/.env
    test -f frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    mise current
    mise tasks
    sha256sum backend/seed-data/us-albatese-demo.tar.gz

Expected evidence is branch `main`, all ancestor checks succeeding, upstream count `0 3`, both ignored env files present, Node 24.20.0, the current Mise task list, and the approved archive hash. Never run `env`, `printenv`, `set`, or display either env file.

Implement text files only with `apply_patch`. Do not download or generate an asset. Format only after the intended Home files exist, inspect the formatter diff, and keep frequent file-scoped status checks so the unrelated untracked image tool is never touched.

Execute milestones in order: focused unit test, Home implementation, format, required artifact refresh, aggregate frontend validation, production build, isolated archive import/runtime, desktop inspection, mobile inspection, cleanup, and final scope checks. Do not update `TODOS.md`, stage, commit, push, switch branches, or begin task 05.

A `WORK_READY` handoff records the exact changed files, selection-test cases, generator diff characterization, check/build/test outcomes and actual counts, build route classification, both viewport observations and clicked targets, console/overflow evidence, archive hash, upload/database restoration, stopped ports, closed named session, and final Git status. It does not claim Reviewer approval.

## Validation and Acceptance

Acceptance is behavioral and bounded to task 04:

1. `/` renders the Home DTO headline, introduction, honest hero placeholder, all four metrics, quote, and all four activity teasers, plus the next future match and selected published news from the existing cached aggregate reads.
2. At 1600×900, section order and composition match the desktop reference intent: airy split hero, heritage strip, balanced fixture, three editorial news cards, activity overview, centered quote, and subtle territorial strip within the accepted 1200px shell.
3. At 412×914, the same component tree uses the mobile reference transformations: wide hero, compact two-column metrics, stacked fixture, two leading news cards, single-column later sections, and enough bottom clearance for the accepted fixed navigation.
4. The hero links resolve conditionally and truthfully; calendar/archive/activity/story/news links reach only `#prossimo-incontro`, `/notizie`, `/attivita`, `/chi-siamo`, or an existing `/notizie/[slug]`. No `href="#"`, external map, sponsor URL, missing route, new route, or contact form is introduced.
5. Empty calendar/news lists and empty draft metrics/teasers omit only their sections. A missing teaser image yields a complete text card. Empty draft quote text/attribution omits the quote. CMS/network/validation failures still reach the existing error boundary.
6. The network strip names no business and makes no sponsorship claim. It displays only CSI, FIDAL, Albate, families, and volunteers as plain text and links nowhere.
7. The page has one H1, ordered H2/H3 hierarchy, semantic lists/cards/figure/time/quote markup, truthful alt text, keyboard-reachable links, visible global focus, sufficient contrast, tabular metric values, and no horizontal overflow.
8. `frontend/app/(content)/page.tsx` retains `await io()` and `PageSwitch`; `frontend/components/page-switch.tsx` remains the single dispatch owner. Home’s current-time read also follows `await io()`. Existing cached reads, cache lifetimes, tags, Draft Mode policy, and webhook invalidation are unchanged.
9. No backend schema/source/type, content, archive, DTO, CMS client/mapper/connector/data module, shared chrome, global design token, other page renderer, route, metadata, dependency, lockfile, README, PLAN, TYPES, or task queue change is introduced.
10. Focused selection tests and the full frontend Vitest suite pass. `be:openapi`, `fe:openapi`, `fe:check`, and `fe:build` pass. Generated API shape does not change, and `/` remains request-capable Partial Prerender output. No backend or browser/E2E/smoke/deployment test is added or run.
11. Manual validation uses only `task-04-home-page`, exact 1600×900 and 412×914 viewports, archive-backed disposable state, ports 65140/65141 bound to `127.0.0.1`, and the fixed Playwright CLI configuration. The session closes, processes stop, ports close, temporary evidence is removed, ordinary uploads/database stay unchanged, and the archive hash remains approved.
12. Worker and Reviewer leave `TODOS.md`, branch, Git history, index, upstream, and task 05 unchanged. After `APPROVED` and `REVIEW_READY`, Coordinator alone performs permitted plan/review bookkeeping, checks task 04, stages only task-owned files while excluding `.agents/skills/imagen/scripts/`, creates local commit `04 — Implement the high-fidelity Home page`, and intentionally does not push.

## Idempotence and Recovery

The source edits and unit tests are idempotent. Selection helpers never mutate frozen DTO inputs. Formatting and canonical commands can be rerun. If generated OpenAPI files change only native timestamps, keep and document the generator result; if structure changes, stop and find the unintended contract change rather than normalizing it away by hand.

The page uses existing data only. Do not repair a missing section by editing the archive, local database, schema, mapper, or DTO. If the existing contract objectively cannot render a newly discovered required section, stop with `BLOCKED` and identify the exact field/behavior conflict; the current research found no such conflict.

Archive import is destructive only to its target, so prove the unique database file is absent before `--force`. A failed import is never retried in place. Preserve failure evidence, restore ordinary uploads first, then create a new `task-04-preview-*` workspace if a retry is justified. Never delete all of `backend/.tmp`, `backend/public`, `.playwright-cli`, or the repository root.

The token helper uses the disposable database and holds the decrypted token only in process/shell memory. On failure, unset the variable, destroy the temporary Strapi app, stop child processes, and remove the helper after diagnosis. Never print the token, include it in a screenshot/log/plan, or reuse an ordinary token.

Browser inspection is repeatable in the same named session during one remediation pass, but the session must be closed before handoff. Use only session-specific `close`; do not use `close-all` or `kill-all`. Screenshots/logs stay under the unique workspace and are removed only after findings are summarized. Restoration failure is a blocker: do not clean away evidence or claim completion until uploads and ordinary database identity are proven.

## Artifacts and Notes

Expected durable implementation files are:

    frontend/components/home/page.tsx
    frontend/components/home/home-media.tsx
    frontend/components/home/hero.tsx
    frontend/components/home/metrics-strip.tsx
    frontend/components/home/next-fixture.tsx
    frontend/components/home/featured-news.tsx
    frontend/components/home/activity-overview.tsx
    frontend/components/home/institutional-quote.tsx
    frontend/components/home/partner-strip.tsx
    frontend/components/home/selection.ts
    frontend/components/home/selection.test.ts

The required generators may update:

    frontend/cms/schema.json
    frontend/cms/schema.d.ts

The durable planning artifact is `.agents/plans/04-implement-the-high-fidelity-home-page.md`. No standalone design note, screenshot, fixture, manifest, image, browser test, or README is needed.

Temporary artifacts belong only below `backend/.tmp/task-04-preview-XXXXXX/`: the disposable database, preserved/imported uploads during the run, token-helper source/log, server logs, and browser screenshots. The original uploads return to `backend/public/uploads` before handoff, and the task workspace is removed after successful proof.

## Interfaces and Dependencies

Use only existing Next.js 16.3.1, React 19.2.8, Tailwind CSS 4, TypeScript, and Vitest. Add no package. New Home files are Server Components and must not contain `"use client"`.

The composition imports only these existing data boundaries:

    import { listCalendarEntries, listNews } from "@cmsjs/cms/data";
    import { io } from "next/cache";

`frontend/components/home/page.tsx` retains the public interface:

    export async function HomePage({ page }: { page: HomePageDto })

The selection module exposes the two pure signatures recorded in Milestone 1. All other component interfaces are local and typed with the existing `HomePageDto`, `MetricDto`, `InstitutionalQuoteDto`, `ActivityTeaserDto`, `CalendarEntryDto`, `NewsListItemDto`, and `ImageDto` models. Do not define a duplicate DTO or fetch shape.

Use `next/link` for internal routes and `next/image` for CMS media. Dynamic news links follow the established typed-route pattern already used by `frontend/components/notizie/list-page.tsx`. Use `Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ... })` locally in the owning fixture/news modules and semantic `<time dateTime={...}>` elements. Do not add a date library.

Revision note (2026-10-08 / Planner): Created the initial self-contained task-04 ExecPlan after complete governing-file, skill, design/history, Home desktop/mobile reference, CMS pipeline, dataset-plan, shared-chrome implementation/plan, pinned-documentation, repository-state, and validation inspection. Recorded the Context7 quota failure; fixed Home-owned aggregate composition, current-time and selection semantics, section/file map, responsive/accessibility behavior, truthful empty degradation, non-sponsor network strip, link targets, generated-artifact policy, canonical commands, isolated Playwright runtime, complete cleanup, Coordinator-only local commit, and explicit no-push override. No implementation file, tracker, asset, runtime, branch, index, commit, or remote was changed.

Revision note (2026-10-08 / Planner): Tightened the initial plan’s self-contained runtime procedure after the conformance pass: added the exact disposable-token helper and descriptor-only capture, combined both loopback servers under one trapped monitored session so no token crosses a tool result, made generated-artifact exclusions explicit in scope validation, and retained the same implementation scope and decisions.

Revision note (2026-10-08 / Worker): Recorded completion of Milestone 1, its focused 1-file/6-test Vitest evidence, and the verified non-mutating selection behavior; no implementation scope or decision changed.

Revision note (2026-10-08 / Worker): Recorded completion of the Home composition and canonical frontend validation, including exact test counts, Partial Prerender classification, and normalized proof that generated API changes are timestamp-only; no implementation scope or decision changed.

Revision note (2026-10-08 / Worker): Recorded completed exact-viewport browser evidence and cleanup proof, corrected the self-contained runtime command so Mise precedence is handled without exposing the disposable token through process arguments, and marked the Worker implementation ready for independent review; no product or implementation scope changed.

Revision note (2026-10-08 / Worker): Recorded the final metric definition-list semantic correction, repeated generator/canonical/browser evidence, and clarified that the mandated generator—not the isolated browser runtime—updated native bookkeeping in the ordinary database before the final preserved baseline; no product scope changed.

Revision note (2026-10-08 / Coordinator): Recorded independent Reviewer approval with no findings, finalized Progress and Outcomes with the reproduced validation and cleanup evidence, and prepared the approved task for its Coordinator-owned local commit without a push.

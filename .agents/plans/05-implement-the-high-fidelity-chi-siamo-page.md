# Implement the high-fidelity Chi siamo page

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A fresh Worker must be able to implement and validate task 05 using only this file and the current working tree.

## Purpose / Big Picture

After this work, `/chi-siamo` is a complete editorial account of U.S. Albatese rather than the task-01 minimum renderer. At 1600×900 it presents a spacious institutional introduction, panoramic community image, CMS Blocks history, a horizontal chronology, values, an explicitly fictional and portrait-free seeded board, two facility cards, and a clear introduction to the official-document archive. At 412×914 the same semantic component tree becomes a compact narrative with a wide hero crop, wrapped in-page navigation, a vertical timeline, one-column cards, and enough clearance above the accepted fixed mobile navigation.

Every user-visible editorial value comes from the existing `AboutPageDto`. The only static copy added by presentation is concise section/navigation language, a narrowly scoped disclosure that the seeded board profiles are fictional, and the link label leading to the existing `/notizie#documenti` archive. The page does not repeat unsafe registration numbers, addresses, current people, statistics, or institutional claims from the reference HTML or `design/HISTORY.md`.

The existing Strapi raw client → mapper → connector → cached data → cache-tag/webhook path, `PageSwitch`, Draft Mode, request-rendered SSR plus ISR behavior, shared chrome, demonstration archive, and content contract remain unchanged. No backend schema, seed data, DTO, CMS query, route, shared component, global token, dependency, image, or document is added or changed.

The result is observable by importing `backend/seed-data/us-albatese-demo.tar.gz` into a disposable database, starting Strapi and Next.js on loopback-only ports, and inspecting `/chi-siamo` with one named Playwright CLI session at exactly 1600×900 and 412×914. Ordinary database/upload state, local env files, browser data, and the unrelated untracked image-tool directory remain untouched.

## Progress

- [x] (2026-10-08 17:31Z) Read root `AGENTS.md`, `frontend/AGENTS.md`, `.agents/docs/PLANS.md`, the `implement-task`, `canonical-validation`, and `playwright-cli` skills plus relevant session-management, custom-code, and element-attribute references, `TODOS.md`, `PLAN.md`, `TYPES.md`, `design/DESIGN.md`, `design/HISTORY.md`, both Chi siamo reference HTML files, the complete task-02 dataset/archive plan, the task-03 shared-design/chrome plan and implementation, the task-04 Home plan and implementation boundaries, and the current About DTO/client/mapper/connector/cache/dispatch/route implementation.
- [x] (2026-10-08 17:31Z) Attempted the required Context7 resolution for Next.js 16 request rendering and responsive image behavior; Context7 returned the monthly-quota error, so inspected the repository-pinned Next.js 16.3.1 `io()` and `next/image` documentation instead.
- [x] (2026-10-08 17:31Z) Resolved the exact About-only file map, every `AboutPageDto` field, block/media semantics, fictional-board treatment, conditional anchors, responsive transformations, incomplete-draft behavior, artifact refresh, canonical validation, isolated archive-backed runtime, exact Playwright checks, cleanup, and Coordinator-only local-commit/no-push boundary in this ExecPlan. No implementation file, tracker, asset, runtime, branch, index, commit, or remote was changed by the Planner.
- [x] (2026-10-08 17:53Z) Implemented the About-only media and seven-section presentation under `frontend/components/about/`, formatted it with `mise run fe:format`, and confirmed the production diff is confined to the approved About directory.
- [x] (2026-10-08 17:54Z) Refreshed generated API artifacts with `mise run be:openapi` and `mise run fe:openapi`; timestamp-normalized diffs proved no API shape change. Passed `mise run fe:check`, all 50 existing Vitest tests in 6 files, and `mise run fe:build`; `/chi-siamo` remains Partial Prerender output and protected-boundary diffs are empty.
- [x] (2026-10-08 18:00Z) Imported the approved archive into isolated task state, inspected the complete `/chi-siamo` page at exactly 1600×900 and 412×914 with only named session `task-05-about-page`, exercised local/document/shared navigation, closed the browser and task-owned servers, and proved ordinary database/uploads/archive state was restored unchanged.
- [x] (2026-10-08 18:18Z) Independent Reviewer approved the About-only implementation, complete DTO coverage, fictional-board safeguards, canonical/generator evidence, exact responsive/browser behavior, scope boundaries, and complete isolated-runtime cleanup with no actionable finding.
- [x] (2026-10-08 18:21Z) Coordinator recorded approval, checked queue item 05, isolated only task-owned About/generated/plan/tracker files for one local commit, and intentionally skipped pushing under the explicit user override.

## Surprises & Discoveries

- Observation: branch `main` begins task 05 at local commit `97ae7b4`, four commits ahead of `origin/main`; task commits `2bcd098`, `4b1b731`, `28fec7a`, and `97ae7b4` are deliberately unpushed.
  Evidence: `git status --short --branch` reports `main...origin/main [ahead 4]`, and `git log --oneline -5` shows those four queue commits above `origin/main`. The user explicitly overrides the normal push requirement for this queue.
- Observation: the only unrelated worktree item is pre-existing untracked `.agents/skills/imagen/scripts/`.
  Evidence: initial `git status --short` reports only `?? .agents/skills/imagen/scripts/`. Task 05 must not use, modify, stage, chmod, relocate, or commit it. Built-in `imagegen` and repository `imagen` are both out of scope.
- Observation: at Worker start, the Coordinator-approved ExecPlan itself was also untracked, as expected for the active workflow artifact.
  Evidence: `git status --short --branch` reported `?? .agents/plans/05-implement-the-high-fidelity-chi-siamo-page.md` and the pre-existing `?? .agents/skills/imagen/scripts/`; no tracked implementation change predated Worker edits.
- Observation: the existing About route already preserves request rendering and dispatch ownership.
  Evidence: `frontend/app/(content)/chi-siamo/page.tsx` calls `await io()`, reads `getAboutPage()`, handles `null` with `notFound()`, and passes the DTO to `PageSwitch`; `frontend/components/page-switch.tsx` dispatches `pageType: "about"` to `AboutPage`. Neither file needs an edit.
- Observation: `AboutPageDto` already contains every content source needed by the selected task, but it contains neither institutional identity metrics nor official-document records.
  Evidence: `frontend/cms/model.ts` exposes hero copy/image, Blocks history, timeline, values, board members, facilities, and three document-introduction strings. The renderer must not copy matricola numbers, affiliation dates, opening schedules, named competitions, or document titles from the references. It links to the existing document collection instead of adding `listOfficialDocuments()` or expanding the DTO.
- Observation: Draft Mode intentionally normalizes missing required scalar values to empty strings and missing repeatable components/Blocks to empty arrays, while required hero media is never fabricated.
  Evidence: `toAboutPageDto()` passes the current `status` to `requiredString`, `entries`, and `blocks`; those helpers return empty draft values/arrays, while `image(node.heroImage, ...)` remains mandatory. Presentation therefore needs local empty guards but no mapper change.
- Observation: optional board portraits and facility images are already populated and mapped when supplied, but the approved archive contains no board portraits.
  Evidence: `aboutPopulate` populates `boardMembers.portrait` and `facilities.image`; `BoardMemberDto.portrait` and `FacilityDto.image` are optional; task 02 deliberately seeds four fictional board members without portraits and two facilities with images.
- Observation: the reference desktop invents real-looking officers, registration numbers, claims, portraits, and exact facilities, while the mobile reference invents different registration and affiliation facts and omits the board altogether.
  Evidence: `design/reference/chi_siamo/code.html`, `design/reference/chi_siamo_mobile/code.html`, `PLAN.md`, and the task-02 exact dataset. The binding visual intent is layout and hierarchy, not those unsafe incidental facts. Task 05 uses the CMS values and includes the board at both viewports because the queue explicitly requires it.
- Observation: the shared `Blocks` renderer already preserves all validated block types, inline marks, links, nested lists, code, quotes, CMS images, captions, and alternative text.
  Evidence: `frontend/components/shared/content.tsx`. The About history should reuse it rather than flattening Blocks or creating a second rich-text interpreter; this task changes only its page-specific outer composition.
- Observation: task 03 already owns the self-hosted Epilogue/Manrope fonts, gold/graphite/pale tokens, 1200px `.site-container`, focus treatment, sticky header, mobile bar, footer, version, skip link, and shared states.
  Evidence: `frontend/app/globals.css`, `frontend/app/layout.tsx`, and `frontend/components/layout/`. Task 05 composes inside those accepted boundaries and changes none of them.
- Observation: the required Context7 request failed before returning a library id.
  Evidence: `ctx7 library Next.js "For this Next.js 16.3.1 App Router project ..."` returned `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` A future contributor may run `ctx7 login` or set `CONTEXT7_API_KEY`; this plan uses installed official documentation rather than remembered framework behavior.
- Observation: the pinned Next.js documentation confirms the current route contract and image rules.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md` says `await io()` excludes following work from the static shell under Cache Components; `.../02-components/image.md` says `fill` needs a positioned parent, responsive fill images need accurate `sizes`, `alt` must replace the image meaning, lazy loading is the default, and Next.js 16 uses `preload` rather than deprecated `priority`.
- Observation: the approved archive is tracked at `backend/seed-data/us-albatese-demo.tar.gz`, is 636,008 bytes, and has SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.
  Evidence: local file inspection and approved task-02 review. Task 05 must leave its bytes and semantics unchanged.
- Observation: the current canonical task list has no `fe:test` aggregate.
  Evidence: `mise.toml` defines `fe:check`, `fe:build`, and OpenAPI tasks but no frontend test task. Run `npm test` from `frontend` as required by `PLAN.md` and the canonical-validation skill.
- Observation: archive-backed manual runs require a token from the disposable database, and Mise project env loading can override same-named values assigned before `mise exec`.
  Evidence: task-03 and task-04 validated runtime records. Recover the disposable `Read Only` token only in process memory, stage it under a task-unique environment name, and assign `CMS_API_TOKEN` inside a post-Mise child shell without printing or writing it.
- Observation: the mandated generators changed exactly 34 native `publishedAt` defaults in each generated artifact and nothing structural.
  Evidence: each of `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` has 34 insertions and 34 deletions; replacing generated ISO datetime defaults with a stable marker makes both generated files byte-identical to `HEAD`.
- Observation: the canonical frontend suite remains green after the About implementation.
  Evidence: `fe:check` checked 81 files with no fixes, Vitest passed 6 files and 50 tests, and `fe:build` compiled and type-checked successfully while classifying `/chi-siamo` as `◐` Partial Prerender output.
- Observation: the first development navigation caused Chromium to request the repository's absent `/favicon.ico`, which produced one resource-level 404 but no application exception; subsequent final-page console inspection reported zero errors and zero warnings.
  Evidence: the initial console entry was only `Failed to load resource ... /favicon.ico`; after the exact-viewport route inspections, `playwright-cli ... console` reported two development info/log messages and `Errors: 0, Warnings: 0`. Adding a favicon belongs outside this task's About-only boundary.
- Observation: Next.js's development portal overlapped the fixed mobile Home navigation item at 412×914.
  Evidence: the portal's dev-tools button occupied `x=22..54, y=860..892` while Home occupied `x=4..85, y=850..914`. As explicitly permitted by this plan, the Worker removed only the current inspection page's `<nextjs-portal>` through `playwright-cli eval`; no application CSS, source, browser configuration, or profile changed.
- Observation: the archive-backed page fits both exact viewports without horizontal overflow and preserves the intended responsive transformations.
  Evidence: at 1600×900 the document client/scroll widths were both 1600, the accepted shell was 1200px, the hero frame was 1104×441.6px, and the three timeline, three value, four board, and two facility records formed desktop grids. At 412×914 the client/scroll widths were both 412, the hero was 372×223.2px, the timeline rail was a visible 1px vertical rule, and values, board, and facilities each computed to one 372px column.

## Decision Log

- Decision: confine production edits to `frontend/components/about/` and keep `frontend/app/(content)/chi-siamo/page.tsx`, `frontend/components/page-switch.tsx`, `frontend/cms/`, global styles, shared chrome, and shared Blocks byte-unchanged.
  Rationale: the route, dispatch, data, cache, and visual-foundation owners already satisfy the architecture. Task 05 owns only About presentation.
  Date/Author: 2026-10-08 / Planner
- Decision: create one small About-specific responsive-image wrapper and seven section modules, with `page.tsx` as the composition root.
  Rationale: hero, history, timeline, values, board, facilities, and document introduction are cohesive independent presentation concerns. One module per concern keeps the root readable without creating a generalized design system.
  Date/Author: 2026-10-08 / Planner
- Decision: reuse `frontend/components/shared/content.tsx` `Blocks` for `page.history` and style only the surrounding About section.
  Rationale: the shared renderer is the authoritative block/inline/media interpreter. Duplicating it under About would create inconsistent link, mark, image, list, and accessibility behavior.
  Date/Author: 2026-10-08 / Planner
- Decision: use a conditional in-page navigation in the hero with only anchors whose sections will render: `#storia`, `#cronologia`, `#valori`, `#direttivo`, `#impianti`, and `#documenti`.
  Rationale: this replaces the unsafe identity card in the desktop mockup with useful structure, gives the explicit link/anchor contract a single owner, and prevents dead links in incomplete drafts.
  Date/Author: 2026-10-08 / Planner
- Decision: render the board as typographic cards and never synthesize a face, initials avatar, silhouette, stock image, or placeholder portrait. If a CMS portrait exists in a future editorial record, render only that actual `ImageDto`; when absent, remove the media frame completely.
  Rationale: task 02 intentionally omitted portraits and the user explicitly forbids representing generated or placeholder people as real officers. Optional media should degrade without a deceptive substitute.
  Date/Author: 2026-10-08 / Planner
- Decision: add the visible section-level disclosure `Profili narrativi con nomi di fantasia; non indicano le cariche ufficiali in essere.` before the board cards.
  Rationale: names and roles in the archive are fictional. A narrow disclosure attached to those cards prevents misrepresentation without adding a site-wide demonstration banner or changing CMS content.
  Date/Author: 2026-10-08 / Planner
- Decision: the document section renders only `documentEyebrow`, `documentTitle`, and `documentIntroduction`, followed by one static link labelled `Consulta i documenti ufficiali` to `/notizie#documenti`.
  Rationale: About owns the introduction, while task 07 owns the document collection. Inventing filenames or fetching the aggregate here would cross both the DTO and task boundary.
  Date/Author: 2026-10-08 / Planner
- Decision: use local presentation guards for empty draft values and arrays, without a helper module or new unit-test seam.
  Rationale: the behavior is simple visual omission: all-empty repeatable rows are filtered, empty collections remove their section, optional media removes only its frame, and partial textual records render only their meaningful fields. A separate policy abstraction would be more complex than the branches it proves.
  Date/Author: 2026-10-08 / Planner
- Decision: add no automated component, browser, snapshot, accessibility, smoke, or end-to-end test.
  Rationale: the task changes visual Server Components only and introduces no non-visual algorithm or trust-boundary logic. Existing mapper/query tests remain authoritative; `fe:check`, the full Vitest suite, production build, source review, and fixed Playwright CLI inspection prove the relevant behavior.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer do not edit `TODOS.md`, stage, commit, push, or change branches. After Reviewer approval, Coordinator alone checks task 05 and creates local commit `05 — Implement the high-fidelity Chi siamo page`; no push occurs.
  Rationale: this is the explicit role ownership and no-push override supplied by the user. It supersedes the normal implement-task push gate without expanding technical scope.
  Date/Author: 2026-10-08 / Planner

## Outcomes & Retrospective

Task 05 is complete and independently approved. Nine cohesive Server Component modules now own the hero, shared-Blocks history, timeline, values, explicitly fictional board, facilities, and document introduction with conditional draft degradation and no synthetic person media. Required API generation produced timestamp-only drift, all 50 existing frontend tests pass, and the production build preserves request-capable Partial Prerendering. The archive-backed page showed all six local targets, six history blocks, three chronological entries, three values, four text-only fictional board profiles with the visible disclosure, two imaged facility cards with addresses, and all three document-introduction strings at both exact viewports. Independent review reproduced the canonical, generated-contract, complete DTO, semantic, responsive, navigation, media, and cleanup evidence and approved without findings. The Coordinator recorded the queue item and prepared one isolated local commit; no push is performed.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0. `frontend/` is Next.js 16.3.1 with React 19.2.8, Tailwind CSS 4, typed routes, and Cache Components enabled. “SSR + ISR” here means the route renders against request-time state on the server, while individual CMS reads are cached for reuse and invalidated through Strapi webhooks.

`frontend/app/(content)/chi-siamo/page.tsx` is the route. It calls `await io()` so the static shell does not capture CMS content at build time, obtains the singleton through `getAboutPage()`, and delegates through `PageSwitch`. `frontend/components/page-switch.tsx` is the single cross-page dispatch owner. Do not import CMS data into a new route or bypass either file.

The CMS pipeline is fixed. `frontend/cms/client.ts` serializes the populated Strapi request; `mappers.ts` validates it into `AboutPageDto`; `connector.ts` joins raw data and mapping; and `data.ts` exposes `getAboutPage()` through a days-long tagged cache whose `about-page` tag is revalidated by the existing webhook path. Task 05 consumes the already-mapped DTO only.

The current `frontend/components/about/page.tsx` is a one-file minimum renderer. Replace its markup but preserve the public signature:

    export function AboutPage({ page }: { page: AboutPageDto })

`AboutPageDto` has exactly these top-level fields and all must have an explicit presentation owner:

- `pageType` remains the `PageSwitch` discriminant and is not displayed.
- `eyebrow`, `headline`, `introduction`, and required `heroImage` belong to `hero.tsx`.
- `history` belongs to `history.tsx` and is passed unchanged to the shared `Blocks` renderer.
- `timeline` belongs to `timeline.tsx`; each row maps `year`, `title`, and `body`.
- `values` belongs to `values.tsx`; each card maps `title` and `body`.
- `boardMembers` belongs to `board.tsx`; each card maps `name`, `role`, `bio`, and the optional `portrait` without inventing a fallback.
- `facilities` belongs to `facilities.tsx`; each card maps `name`, `summary`, `address`, and optional `image`.
- `documentEyebrow`, `documentTitle`, and `documentIntroduction` belong to `documents-intro.tsx`.

Task 02’s archive seeds a community placeholder as the required hero; six text history blocks; three timeline entries; three values; four fictional board members with no portraits; two fictional facilities with honest facility placeholder images; and the three document-introduction strings. The visible pixels and image alternative text deliberately say the media is placeholder content. Preserve that truth. Do not replace, hide, regenerate, or cosmetically disguise the placeholder images.

Task 03 owns the root layout, fonts, colors, `.site-container`, shared header/navigation/footer, app version, bottom-bar clearance, and global state views. Task 04 owns only `frontend/components/home/`. Task 05 may read those implementations for patterns but must not refactor, reuse a Home-private component, or change another page to make About work.

The desktop Chi siamo HTML is authoritative for the broad order and editorial air: introduction, panoramic visual, historical narrative, chronology, people, facilities, and documents. The mobile HTML is authoritative for compact spacing, wide image crops, vertical chronology, and one-column cards. `design/DESIGN.md` resolves incidental conflicts. The real implementation additionally includes values and the board at both sizes because the content contract and queue item explicitly require them.

## Plan of Work

### Milestone 1: Build the About media primitive and composition root

Create `frontend/components/about/about-media.tsx` as a pure wrapper around `next/image`. It accepts an `ImageDto`, accurate `sizes`, optional `preload`, and optional presentation classes. It uses `fill`, preserves `image.alt` verbatim, applies `object-cover`, and depends on a positioned parent owned by the calling section. Only the hero uses `preload`; board and facility media keep the lazy default. Do not use deprecated `priority`, custom loaders, client callbacks, or image-generation tooling.

Replace `frontend/components/about/page.tsx` with a small Server Component composition root. It imports the seven local sections, computes presentation-only filtered arrays without mutating the DTO, and renders in this exact order:

    Hero
    HistorySection
    TimelineSection
    ValuesSection
    BoardSection
    FacilitiesSection
    DocumentsIntro

Use a private `hasText(value: string)` guard in `page.tsx`. Filter only records whose complete visible payload is empty: timeline entries with no year/title/body; values with no title/body; board members with no name/role/bio/portrait; facilities with no name/summary/address/image. Preserve source order and pass partially filled records through. Derive the hero’s in-page link list from the sections that will actually render. `history.length > 0` controls `#storia`; each filtered collection controls its corresponding anchor; the document target exists when title or introduction has meaningful text. Do not sort, cap, or invent CMS items.

The root returns one `<main>` and no header/footer/preview banner. It does not call a CMS read, `io()`, or a browser API. `await io()` remains solely in the route where it already establishes request rendering.

Milestone acceptance: `page.tsx` is an obvious section dispatcher, `about-media.tsx` is the only new image primitive, `PageSwitch` still calls the same public `AboutPage` signature, and no file outside `frontend/components/about/` has changed.

### Milestone 2: Implement the editorial hero and CMS Blocks history

Create `frontend/components/about/hero.tsx`. It accepts the four hero fields plus a readonly list of rendered-section links. Render `eyebrow` only when nonempty. Render exactly one H1 using `headline`; when an incomplete draft has an empty headline, use the stable route label `Chi siamo` rather than an empty heading. Render `introduction` only when nonempty. On desktop, use an eight/four grid for copy and a pale `In questa pagina` navigation card; on mobile, stack the same content and let those anchor links wrap naturally instead of creating a horizontal scroller. Every link is a native anchor whose `href` is one of the six local ids and whose label names the actual section.

Below that grid, render the required hero image in a `<figure>` with a roughly 5:3 mobile crop and 5:2 panoramic desktop crop capped near the reference’s 460px height. Use `AboutMedia` with `preload` and an accurate sizes expression based on the accepted 1200px shell. Do not render the generic seed caption over the image, invent an archival date, or label it as a real historical photograph. The CMS alternative text remains the accessible truth.

Create `frontend/components/about/history.tsx`. Return `null` for an empty `BlocksDto`. Otherwise render `id="storia"` as a named section with the static overline `Storia e missione`, a restrained editorial rule, and the existing `<Blocks blocks={history} />` inside a readable prose width. Do not map Blocks to strings, modify their heading levels, strip inline links/marks, or duplicate shared block logic. The shared renderer continues to own nested lists, quotes, code, images, captions, and alt text if future editors use them.

Use `bg-surface-lowest` for the hero and a pale surface for history. At desktop, preserve intentional whitespace rather than filling the missing unsafe “identity card” with hard-coded statistics. At mobile, use the design’s 36px-class display rhythm, 1.25rem canvas padding supplied by `.site-container`, and compact but distinct section spacing.

Milestone acceptance: hero copy/image maps all four DTO fields, every local hero link reaches a rendered id, there is one H1, history renders through the shared block contract, and no unsafe fact from the reference/history source appears.

### Milestone 3: Implement chronology, values, fictional board, facilities, and documents

Create `frontend/components/about/timeline.tsx`. Return `null` for no meaningful entries. Render `id="cronologia"`, overline `Memoria e tappe`, heading `La nostra storia nel tempo`, and the entries as a semantic ordered list. At mobile, use a vertical rule and visible nodes with one card per row. At `md`/desktop, remove the vertical rail and use a responsive grid that naturally shows the seeded three items in three columns. Each item conditionally renders its year, title, and body; do not hard-code four historical eras from the mockup. Years use tabular numerals where applicable.

Create `frontend/components/about/values.tsx`. Return `null` for no meaningful values. Render `id="valori"`, overline `I nostri principi`, heading `L’anima giallonera`, and every value in source order as a semantic list of cards. Use a one-column mobile and three-column desktop grid for the seeded content. A small ordinal or geometric rule may be decorative and `aria-hidden`; do not add Material Symbols, unsourced value copy, or interactive controls.

Create `frontend/components/about/board.tsx`. Return `null` for no meaningful members. Render `id="direttivo"`, overline `Organizzazione associativa`, heading `Il consiglio nel racconto editoriale`, and the exact visible fictional-profile disclosure from the Decision Log. Render every member in a semantic list: optional CMS portrait in a positioned 4:5 frame, role, name, and bio, with each text omitted only when blank. With the approved archive, cards are intentionally text-only and contain no `<img>` in this section. Use one column at 412px, two at medium widths, and four at desktop. Do not claim that a term is current, use “in carica,” infer credentials, or reuse people from `design/HISTORY.md`/the HTML.

Create `frontend/components/about/facilities.tsx`. Return `null` for no meaningful facilities. Render `id="impianti"`, overline `I luoghi dell’Albatese`, heading `Campi, incontro e comunità`, and every facility in a semantic list of articles. Optional CMS image uses a 16:9 frame and the About media wrapper; absent media removes the frame. Render the name as the card heading, summary as body copy, and address in `<address className="not-italic">`. Use one column at mobile and two at desktop. Do not add opening times, field specifications, map links, external navigation, or real addresses from the mockups.

Create `frontend/components/about/documents-intro.tsx`. Return `null` when both title and introduction are empty; an eyebrow alone does not create a section. Render `id="documenti"` on a pale section containing one elevated card. Render the eyebrow only when nonempty, the CMS title as H2 when present or the stable fallback `Documenti` when only the introduction is present, and the introduction only when nonempty. Add one ordinary `next/link` to `/notizie#documenti` labelled `Consulta i documenti ufficiali`, with a decorative arrow hidden from assistive technology. Do not display seeded PDF names, categories, seasons, or download links here.

Across all sections, use existing Tailwind tokens and `.site-container`; alternate lowest, canvas, and pale surfaces in the reference rhythm; use Epilogue/Manrope through the global font ownership; keep one H1 and H2 top-level section headings; connect regions with `aria-labelledby` where the section has a heading; use native links and lists; preserve visible global focus; mark decorative rules/ordinals hidden; and add no Client Component, state, effect, carousel, animation, or package.

Incomplete-draft behavior is exact. Empty repeated collections remove their heading, spacing, and hero anchor. An all-empty repeated record is not rendered. Partial repeated records show only truthful nonempty fields. A missing portrait or facility image removes only that frame. Empty eyebrow/introduction strings do not leave empty elements. The mandatory hero image is always present because mapper validation rejects its absence. CMS/network/validation errors continue to propagate to the accepted route error boundary; do not catch them as empty content.

Run formatting only after the intended files exist, then inspect the exact task diff:

    cd /home/codex/src/us-alb
    mise run fe:format
    git diff --check
    git diff -- frontend/components/about

Milestone acceptance: all About fields and nested fields have the owner described above; 1600px structure matches the desktop hierarchy; 412px structure matches the mobile narrative; fictional people cannot be mistaken for documented officers; and production changes remain entirely under `frontend/components/about/`.

### Milestone 4: Refresh generated artifacts and run canonical validation

From `/home/codex/src/us-alb`, list the tasks and perform the artifact refresh mandated after a frontend change:

    mise tasks
    mise run be:openapi
    mise run fe:openapi

Do not run `be:types`; no backend type or schema changes. Inspect `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`. The generators may refresh Strapi’s native generation-time `publishedAt` defaults, as tasks 01–04 recorded, but endpoint paths, operations, schema keys, and TypeScript shapes must remain unchanged. Keep only generator-produced output. A structural API change is a task blocker, not authority to edit the schema/DTO/pipeline or manually disguise the generated diff.

Run every applicable canonical frontend command:

    mise run fe:check
    cd /home/codex/src/us-alb/frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Expect Biome, generated route types, TypeScript, all existing Vitest files, and the production build to pass. Record actual file/test counts. The build route table must continue to classify `/chi-siamo` as request-capable Partial Prerender output, not a fully static CMS snapshot. The route still calls `await io()` and the cached read retains `"use cache"`, `cacheLife("days")`, and `cacheTag("about-page")`.

Run focused scope and integrity checks:

    git diff --check
    git diff --exit-code -- TODOS.md PLAN.md TYPES.md README.md mise.toml backend/package.json backend/package-lock.json backend/src backend/types/generated backend/seed-data/us-albatese-demo.tar.gz frontend/package.json frontend/package-lock.json frontend/app frontend/components/page-switch.tsx frontend/components/home frontend/components/activity frontend/components/news-detail frontend/components/notizie frontend/components/layout frontend/components/shared frontend/cms ':(exclude)frontend/cms/schema.json' ':(exclude)frontend/cms/schema.d.ts'
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git status --short -- .agents/skills/imagen/scripts/

The protected-file diff is empty. The separate generated-artifact diff is empty or native generation-time-default-only, proven by comparing paths, operations, schema structure, and TypeScript shapes rather than accepting an unexplained textual diff. The archive hash remains `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Package/lock files do not change. The image-tool directory remains the same unrelated untracked path.

Milestone acceptance: both required generators and every applicable canonical frontend command pass, `/chi-siamo` retains request rendering, the API shape and archive are unchanged, and the durable implementation diff contains only About files, this plan, and native generated timestamp refreshes if any.

### Milestone 5: Inspect the archive-backed page at both exact viewports and clean up

Manual inspection uses only the committed demonstration archive and task-owned temporary state. Confirm `backend/.env` and `frontend/.env.development` exist and are ignored without displaying them. After artifact refresh has completed, record the ordinary `backend/.tmp/data.db` inode/size/mtime/hash if it exists, the approved archive hash, and a filename/hash manifest of `backend/public/uploads`. This establishes the baseline from which the manual runtime must produce no ordinary-data change.

Create a unique workspace and relative database path:

    mkdir -p backend/.tmp
    task05_preview_dir="$(mktemp -d -p backend/.tmp task-05-preview-XXXXXX)"
    task05_preview_base="$(basename "$task05_preview_dir")"
    task05_preview_rel=".tmp/${task05_preview_base}"
    task05_preview_db=".tmp/${task05_preview_base}/data.db"
    test ! -e "backend/$task05_preview_db"

Resolve the workspace and `backend/public/uploads` with `realpath`. Refuse to proceed if uploads is missing, is a symlink, or resolves outside `/home/codex/src/us-alb/backend/public`. Move the entire ordinary uploads directory into the workspace as `uploads-original`, immediately create a new empty `backend/public/uploads`, and establish cleanup that always closes the named browser, stops only task-owned processes, moves imported uploads aside, and restores `uploads-original` exactly. Never copy over, delete, or import into ordinary data.

From `backend`, import the archive with post-Mise process-local overrides:

    mise exec -- env DATABASE_FILENAME="$task05_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file seed-data/us-albatese-demo.tar.gz --force --only content,files

Expect the task-02 counts: 55 entities, 112 links, and 43 asset binaries. Record `backend/import_<timestamp>.log` files before and after import; move only newly created logs whose timestamps identify this task into the workspace. Never retry a failed import against the partial database.

Use `apply_patch` to create temporary `backend/$task05_preview_rel/read-demo-token.mjs`. It loads installed CommonJS `@strapi/core` via `createRequire`, compiles/loads Strapi against the disposable database without opening a port, calls the installed admin token service for `Read Only` with `{ includeDecryptedKey: true }`, requires a nonempty `accessKey`, writes only that value to already-open descriptor 3 with `writeSync`, and destroys Strapi in `finally`. It is temporary runtime machinery, not a product file. Never print the token, put it in arguments, write it to a normal file, or include it in evidence.

Start Strapi and Next.js on `127.0.0.1:65150` and `127.0.0.1:65151` in one monitored terminal session. The shell captures descriptor 3, stages the token under a unique name that Mise does not overwrite, assigns the real frontend variable only after Mise has loaded project env, and removes the staging name before `npm` starts:

    task05_preview_base="<recorded task-05-preview basename>"
    task05_preview_rel=".tmp/${task05_preview_base}"
    task05_preview_db=".tmp/${task05_preview_base}/data.db"
    task05_cms_token="$(
      mise exec -- env DATABASE_FILENAME="$task05_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= node "$task05_preview_rel/read-demo-token.mjs" 3>&1 1>>"$task05_preview_rel/token-helper.log" 2>&1
    )"
    test -n "$task05_cms_token"
    export TASK05_CMS_TOKEN="$task05_cms_token"
    unset task05_cms_token

    task05_backend_pid=""
    task05_frontend_pid=""
    stop_task05_servers() {
      for task05_pid in "$task05_frontend_pid" "$task05_backend_pid"; do
        if test -n "$task05_pid" && kill -0 "$task05_pid" 2>/dev/null; then
          kill -INT "$task05_pid"
        fi
      done
      test -z "$task05_frontend_pid" || wait "$task05_frontend_pid" || true
      test -z "$task05_backend_pid" || wait "$task05_backend_pid" || true
    }
    trap stop_task05_servers EXIT INT TERM

    mise exec -- env HOST=127.0.0.1 PORT=65150 DATABASE_FILENAME="$task05_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start >"$task05_preview_rel/backend.log" 2>&1 &
    task05_backend_pid="$!"
    for task05_attempt in $(seq 1 60); do
      curl --fail --silent http://127.0.0.1:65150/_health >/dev/null && break
      test "$task05_attempt" -lt 60 || exit 1
      sleep 1
    done

    (
      cd ../frontend
      exec mise exec -- sh -c '
        export CMS_URL=http://127.0.0.1:65150/api
        export CMS_MEDIA_URL=http://127.0.0.1:65150
        export CMS_API_TOKEN="$TASK05_CMS_TOKEN"
        export SITE_URL=http://127.0.0.1:65151
        unset TASK05_CMS_TOKEN
        exec npm run dev -- --hostname 127.0.0.1 --port 65151
      '
    ) >"$task05_preview_rel/frontend.log" 2>&1 &
    task05_frontend_pid="$!"
    unset TASK05_CMS_TOKEN
    for task05_attempt in $(seq 1 60); do
      curl --fail --silent http://127.0.0.1:65151/chi-siamo >/dev/null && break
      test "$task05_attempt" -lt 60 || exit 1
      sleep 1
    done
    wait -n "$task05_backend_pid" "$task05_frontend_pid"
    exit 1

Use only the returned monitored terminal session to poll or send Ctrl-C after browser inspection. The readiness waits are bounded one-second polls. Never bind `0.0.0.0`, use Docker, alter an env file, alter machine/user environment variables, or start the ordinary project stack.

Manual browser inspection must use exactly one named session and the installed fixed headless Chromium setup. Do not pass a browser, device, executable, profile, or config override, and do not create a Playwright test/script file:

    playwright-cli -s=task-05-about-page open http://127.0.0.1:65151/chi-siamo
    playwright-cli -s=task-05-about-page resize 1600 900
    ...desktop inspection...
    playwright-cli -s=task-05-about-page resize 412 914
    ...mobile inspection...
    playwright-cli -s=task-05-about-page close

At 1600×900, use semantic snapshots, boxed snapshots, and a small set of viewport screenshots saved only in the task workspace. Inspect the top, history/timeline, values/board, facilities, and document regions. Confirm the accepted 1200px shell, one H1, panoramic hero crop, six conditional local anchors, full six-block history, three chronological entries, three values, four fictional board members, zero board portraits with the seeded data, the visible fictional-profile disclosure, two facility images/cards/addresses, and the three CMS document-introduction strings. Confirm Epilogue/Manrope computed families, the sticky shared header, hidden mobile nav, honest placeholder alt text, semantic `ol`/list/address structure, no horizontal overflow, and no application console error.

At 412×914, scroll the complete page and confirm the compact header, wide hero crop, wrapped local navigation, vertical chronology rail, one-column values/board/facilities, readable document card, fixed five-item shared navigation, at least 64px final-content clearance, untruncated navigation labels, and zero horizontal overflow. The board must remain present and text-only at mobile even though the incidental mobile mockup omits it.

Exercise `#storia`, `#impianti`, and `#documenti` with pointer input and one local anchor with keyboard focus. Click `Consulta i documenti ufficiali` and confirm the final URL is `/notizie#documenti`; use back navigation and confirm the shared Home and Società navigation targets remain real. Check that every hero `href` resolves to an existing section id. The development-only `<nextjs-portal>` may be removed from the current inspection page through `playwright-cli eval` only if it intercepts the fixed mobile bar; record that diagnostic and do not change application CSS or browser configuration.

Screenshots are temporary comparison evidence, not golden files. Do not mutate CMS content, route network responses, cookies, storage, or browser profile to simulate empty drafts. Source inspection proves empty degradation; the archive-backed run proves the complete published behavior.

Close the named browser even on failure. Send Ctrl-C only to the recorded runtime session; its trap stops both child processes. Preserve failure evidence until understood. After successful proof, restore `backend/public/uploads` byte-for-byte, positively identify and remove only this task’s import logs and resolved `task-05-preview-*` workspace, and verify:

    no listener remains on 127.0.0.1:65150 or 127.0.0.1:65151
    playwright-cli list contains no task-05-about-page session
    the ordinary database inode/size/mtime/hash matches the post-generator baseline
    the restored upload filename/hash manifest matches the baseline
    the archive SHA-256 remains approved
    no task-05-preview-* directory, token helper, screenshot, log, or task browser artifact remains

If visual remediation changes source, rerun formatting, both required generators, all canonical frontend commands, and both exact viewport inspections. Update all living sections of this plan with actual commands, counts, observations, decisions, and cleanup evidence before handing off `WORK_READY`.

## Concrete Steps

All commands run from `/home/codex/src/us-alb` unless a step explicitly changes directory. Begin by recording safe prerequisites:

    git branch --show-current
    git status --short --branch
    git merge-base --is-ancestor 2bcd098 HEAD
    git merge-base --is-ancestor 4b1b731 HEAD
    git merge-base --is-ancestor 28fec7a HEAD
    git merge-base --is-ancestor 97ae7b4 HEAD
    git rev-list --left-right --count '@{upstream}...HEAD'
    test -f backend/.env
    test -f frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    mise current
    mise tasks
    sha256sum backend/seed-data/us-albatese-demo.tar.gz

Expected evidence is branch `main`, all ancestor checks succeeding, upstream count `0 4`, both ignored project-local env files present, Node 24.20.0, the current Mise task list, and archive hash `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Never run `env`, `printenv`, `set`, or display either env file.

Use `apply_patch` for every text edit, including the temporary token helper. Do not download or generate any asset. Implement the exact About files in the milestone order, format after edits, inspect file-scoped diffs, refresh artifacts, validate, build, establish the ordinary-state baseline, import the archive, run the isolated servers, inspect desktop, inspect mobile, close/stop, restore, and perform final scope checks.

Do not update `TODOS.md`, stage, commit, push, switch branches, or begin task 06. A successful Worker handoff records exact changed files, empty-draft policy, generated-artifact diff characterization, canonical command outcomes and actual test counts, build route classification, both viewport observations and clicked targets, console/overflow/semantic evidence, archive hash, upload/database restoration, stopped ports, closed named session, and final Git status. It ends with `WORK_READY` and does not claim Reviewer approval.

## Validation and Acceptance

Acceptance is behavioral and bounded to task 05:

1. `/chi-siamo` renders all supplied About fields: eyebrow, headline, introduction, required hero image, all history Blocks, timeline, values, board member names/roles/bios/optional portraits, facility names/summaries/addresses/optional images, and the three document-introduction values.
2. At 1600×900, composition matches the desktop reference intent: airy institutional introduction, panoramic hero, editorial history, horizontal chronology, balanced values and board grids, paired facility cards, and an elevated document introduction inside the accepted shared shell.
3. At 412×914, the same semantic tree matches the mobile reference intent: compact type/spacing, wide hero crop, wrapped page links, vertical chronology, single-column cards, readable document callout, and sufficient clearance above the fixed mobile navigation.
4. The board’s seeded four people are visibly identified as fictional narrative profiles and have no generated, stock, placeholder, initials, silhouette, or fabricated portrait. Optional actual CMS portrait media is rendered only when present and always uses its mapped alt text.
5. Every image uses `next/image`, a positioned frame, accurate responsive `sizes`, `object-cover`, and the mapped truthful alt. Only the hero preloads. Missing optional portrait/facility media removes its frame without removing truthful text.
6. History uses the existing Blocks renderer and preserves headings, paragraphs, lists, quotes, code, inline marks/links, CMS images, captions, and alternative text. Task 05 neither reinterprets nor changes the DTO/pipeline/shared renderer.
7. Local links target only rendered ids. The document CTA reaches `/notizie#documenti`. There is no `href="#"`, external map, invented person/facility/document detail, new route, contact form, unsafe registration/current-person claim, or copied real-looking reference data.
8. Empty draft arrays/Blocks omit their whole sections and hero anchors; all-empty repeated records disappear; partial records show only meaningful fields; empty optional strings create no blank elements; an empty headline uses only the truthful route-label fallback. CMS/network/validation failures continue to the existing error boundary.
9. The page has one H1, orderly section/card headings, semantic sections/lists/articles/figure/address/link elements, named regions, keyboard-reachable visible focus, decorative elements hidden from assistive technology, sufficient contrast, and no horizontal overflow.
10. `frontend/app/(content)/chi-siamo/page.tsx` retains `await io()`, `getAboutPage()`, `notFound()`, and `PageSwitch`; `PageSwitch` remains the dispatch owner. The client/mapper/connector/data/cache/tag/webhook/preview implementations and content model remain unchanged.
11. No backend schema/source/type, content/archive, frontend DTO/CMS pipeline, app route, shared chrome/state/block renderer, Home/Activity/Notizie/news-detail renderer, global CSS/token, dependency, lockfile, README, PLAN, TYPES, task tracker, or asset change occurs.
12. `be:openapi`, `fe:openapi`, `fe:check`, the existing frontend Vitest suite, and `fe:build` pass. Generated API shape is unchanged, and `/chi-siamo` remains request-capable Partial Prerender output. No backend or browser/component/E2E/smoke/deployment test is added or run.
13. Manual validation uses only named session `task-05-about-page`, exact 1600×900 and 412×914 viewports, archive-backed disposable state, ports 65150/65151 bound to `127.0.0.1`, and the installed fixed Playwright CLI configuration. The session closes, processes stop, ports close, temporary evidence is removed, ordinary uploads/database remain unchanged from the post-generator baseline, and the archive hash remains approved.
14. Worker and Reviewer leave `TODOS.md`, branch, Git history, index, upstream, and task 06 unchanged. After `APPROVED` and `REVIEW_READY`, Coordinator alone performs permitted plan/review bookkeeping, checks task 05, stages only task-owned About/generated/plan/tracker files while excluding `.agents/skills/imagen/scripts/`, creates local commit `05 — Implement the high-fidelity Chi siamo page`, and intentionally does not push.

## Idempotence and Recovery

The About source edits are idempotent. The presentation filters create new arrays and never mutate the frozen DTO. Formatting, generators, validation, and builds can be repeated. If generated artifacts differ only in native timestamp defaults, retain/document generator output; if any endpoint or type shape changes, stop and find the unintended contract change rather than editing schemas or generated files manually.

Do not repair missing presentation by editing the archive, local database, schema, mapper, DTO, or reference. If the existing contract objectively cannot express a required section, stop with `BLOCKED` and name the exact missing field. Current inspection found no such conflict.

Archive import is destructive only to its explicit target, so prove the unique database file is absent before `--force`. Never retry a failed import in place. Restore ordinary uploads before beginning any second attempt, preserve failure evidence, and use a new `task-05-preview-*` directory. Never recursively remove all of `backend/.tmp`, `backend/public`, `.playwright-cli`, or the repository root.

The token helper holds a disposable secret only in descriptor/shell/process memory. On failure, unset task token variables, destroy the temporary Strapi app, stop exact child processes, and remove the helper only after diagnosis. Never print the token or expose it through arguments, logs, screenshots, plan text, or tool output.

Browser inspection can be repeated in the same named session during one remediation pass, but close it before handoff. Use only session-specific close; do not use `close-all` or `kill-all`. Keep screenshots/logs inside the unique workspace and remove them only after findings are summarized. Upload or ordinary-database restoration failure is a blocker: retain evidence and do not claim completion.

## Artifacts and Notes

Expected durable implementation files are:

    frontend/components/about/page.tsx
    frontend/components/about/about-media.tsx
    frontend/components/about/hero.tsx
    frontend/components/about/history.tsx
    frontend/components/about/timeline.tsx
    frontend/components/about/values.tsx
    frontend/components/about/board.tsx
    frontend/components/about/facilities.tsx
    frontend/components/about/documents-intro.tsx

The required generators may update:

    frontend/cms/schema.json
    frontend/cms/schema.d.ts

The durable planning artifact is `.agents/plans/05-implement-the-high-fidelity-chi-siamo-page.md`. No standalone design note, content manifest, source image, generated asset, browser test, screenshot, fixture, README, or dependency is needed.

Temporary evidence belongs only below `backend/.tmp/task-05-preview-XXXXXX/`: disposable SQLite data, preserved/imported uploads during the run, token-helper source/log, server logs, and browser screenshots. Ordinary uploads return to `backend/public/uploads` before handoff, and the task workspace is removed only after successful proof.

## Interfaces and Dependencies

Use only existing Next.js 16.3.1, React 19.2.8, Tailwind CSS 4, TypeScript, and Vitest. Add no package. Every new About module is a Server Component and contains no `"use client"`.

The composition consumes only `AboutPageDto` and its existing nested DTOs from `@cmsjs/cms/model`; it does not define duplicate transport/domain types. Keep this public signature:

    export function AboutPage({ page }: { page: AboutPageDto })

`about-media.tsx` has this local intent-revealing interface:

    export function AboutMedia(props: {
      image: ImageDto;
      sizes: string;
      className?: string;
      preload?: boolean;
    })

`hero.tsx` accepts the four hero values and readonly link descriptors whose targets are the six literal local ids. The remaining section modules accept readonly existing DTO arrays or the exact three document strings. Keep those types local to About when they describe presentation; do not export a cross-page view model.

Use `next/link` for `/notizie#documenti`, native `href="#..."` anchors for same-page movement, `next/image` only through the About media wrapper or existing shared Blocks renderer, and no date/icon/UI library. The shared stylesheet already provides tokens, fonts, safe-area behavior, and focus treatment; use Tailwind utilities rather than changing global CSS.

Revision note (2026-10-08 / Planner): Created the initial self-contained task-05 ExecPlan after complete governing-file, skill/reference, design/history, Chi siamo desktop/mobile reference, CMS/About pipeline, task-02 archive/dataset, task-03 shared-chrome, task-04 boundary, pinned-documentation, repository-state, and validation inspection. Recorded the Context7 quota failure; fixed every DTO-field owner, About-only file map, shared Blocks reuse, fictional-board disclosure and portrait policy, responsive structure, conditional anchors, empty-draft behavior, generated-artifact policy, canonical commands, isolated Playwright runtime, complete cleanup, Coordinator-only local commit, and explicit no-push override. No implementation file, tracker, asset, runtime, branch, index, commit, or remote was changed.

Revision note (2026-10-08 / Worker): Recorded completion of the formatted About-only implementation milestone, the Worker-start status of the untracked approved plan, and the remaining validation and review work. No tracker, schema, DTO, pipeline, shared component, asset, branch, index, commit, or remote was changed.

Revision note (2026-10-08 / Worker): Recorded successful required artifact generation, timestamp-normalized no-shape-drift proof, the complete canonical frontend results, protected-boundary integrity, and the remaining archive-backed browser validation. Generated files retain only native generation-time default refreshes.

Revision note (2026-10-08 / Worker): Recorded the successful isolated archive import (55 entities, 112 links, 43 asset binaries), exact desktop/mobile semantic and visual observations, pointer and keyboard navigation results, development-portal diagnostic, console characterization, cleanup, and ordinary-state integrity proof. Implementation and Worker validation are complete; review and Coordinator-owned bookkeeping remain open.

Revision note (2026-10-08 / Coordinator): Recorded independent Reviewer approval with no findings, finalized Progress and Outcomes with reproduced canonical/browser/cleanup evidence, and prepared the approved task for its Coordinator-owned local commit without a push.

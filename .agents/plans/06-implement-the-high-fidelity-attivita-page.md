# Implement the high-fidelity Attività page

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A fresh Worker must be able to execute the task using only this file and the current working tree.

## Purpose / Big Picture

After this work, a visitor to `/attivita` can understand every U.S. Albatese sporting proposal without reading a generic data dump. The page will introduce the season and its philosophy, present all six CMS programs in four clearly labelled groups, give the Open team and athletics their own editorial features, show every training schedule and venue, and explain the ordered registration path. The same server-rendered content will become an airy editorial composition at exactly 1600×900 and a clear one-column narrative at exactly 412×914.

The visual result is observable against the committed demonstration archive. At desktop, the page uses the accepted 1200px shell, a balanced copy/image hero, grouped program cards, alternating feature splits, a schedule-and-venue composition, and three registration cards. At mobile, the same semantic tree uses a wide hero crop, wrapped category jump links, stacked cards and features, compact schedule/venue modules, and a vertical registration sequence above the fixed shared navigation.

This is a presentation-only task. It preserves the current Strapi raw-client → mapper → connector → cached-read → cache-tag/webhook pipeline, `PageSwitch`, Draft Mode, request-rendered SSR plus ISR, shared chrome, DTOs, archive, and all other pages. It changes no schema, data, generated media, dependency, or route. It deliberately adds no client-side filter: six programs are short enough to scan, the desktop reference’s controls do not filter content, and accessible in-page category links preserve the reference’s navigation intent while keeping every CMS item in the initial server-rendered HTML.

## Progress

- [x] (2026-10-08 18:33Z) Read root `AGENTS.md`, `frontend/AGENTS.md`, `.agents/docs/PLANS.md`, the `implement-task`, `canonical-validation`, and Playwright CLI skills plus session-management/running-code references, `TODOS.md`, `PLAN.md`, `TYPES.md`, `design/DESIGN.md`, `design/HISTORY.md`, both Attività reference HTML files, the shared chrome, current Activity DTO/CMS pipeline, task-02 dataset/archive plan, task-03 shared-chrome plan/implementation, and task-04/05 page plans and ownership patterns.
- [x] (2026-10-08 18:33Z) Inspected branch/worktree state, the five approved local commits, the archive identity, the pinned Next.js/React/Tailwind versions, official installed Next.js image and Server/Client Component documentation, and the repository’s canonical Mise tasks.
- [x] (2026-10-08 18:33Z) Attempted the required Context7 Next.js lookup; it failed at library resolution with the monthly-quota error, so the plan uses pinned installed official Next.js 16.3.1 documentation instead.
- [x] (2026-10-08 18:33Z) Defined the exact Activity-only file map, every DTO-field owner, grouping and label policy, no-filter decision, responsive/accessibility behavior, incomplete-draft degradation, artifact refresh, canonical validation, isolated archive-backed Playwright procedure, cleanup, and Coordinator-only local commit/no-push boundary in this ExecPlan.
- [x] (2026-10-08 18:56Z) Worker implemented and formatted the exact seven planned `frontend/components/activity/` presentation files: server-rendered composition/filtering, Activity-local image wrapper, responsive hero/category anchors, deterministic grouped programs, two reusable editorial features, schedules/venues, and ordered registration.
- [x] (2026-10-08 18:56Z) Early `mise run fe:check` passed after one local TypeScript inference correction; Biome checked 87 files, route types generated, and `tsc --noEmit` completed without errors. Canonical post-generator validation remains pending.
- [x] (2026-10-08 18:57Z) Worker ran `mise run be:openapi` and `mise run fe:openapi`; both generated artifacts contain exactly 34 generation-time `publishedAt` default replacements apiece and no structural JSON or TypeScript change after defaults were normalized away.
- [x] (2026-10-08 18:57Z) Canonical validation passed: `mise run fe:check` checked 87 files and completed route generation/TypeScript; `npm test` passed 6 files and 50 tests; `mise run fe:build` compiled and retained `/attivita` as `◐` Partial Prerender output. Protected-file, whitespace, cache/route, archive-hash, package/lock, and unrelated-directory checks passed.
- [x] (2026-10-08 19:07Z) Worker imported the approved archive into unique disposable database `.tmp/task-06-preview-PshMth/data.db` with 55 entities, 112 links, and 43 asset binaries; started only loopback runtimes on 65160/65161; and inspected the archive-backed page in the sole named Playwright CLI session `task-06-activity-page` at exact 1600×900 and 412×914.
- [x] (2026-10-08 19:07Z) Desktop proof found the 1200px shell, one H1, 7/5 16:10 hero, five category anchors/four valid group targets, all six source-ordered visible program cards, both features, six schedules, two addressed venues, and three ordered registration steps. Epilogue/Manrope, sticky header, hidden mobile nav, semantics, zero overflow, and zero final application-console errors were confirmed; every category pointer click preserved all six programs, one category and the contact CTA were keyboard-activated, and the CTA reached `/#contatti` by keyboard and pointer.
- [x] (2026-10-08 19:07Z) Mobile proof found a 412×914 viewport, exact 1.6 hero ratio, category anchors wrapped over three rows with 44px targets, six 372px one-column programs, media-first Open/athletics features, six readable three-pair definition lists, two venues, three 372px registration cards with notes, a fixed five-item 65px mobile nav with untruncated labels, 64px body/final clearance, identical content counts, and `scrollWidth === clientWidth === 412`. The development-only Next portal overlapped the fixed Home target and was removed from only the current inspection DOM as explicitly permitted.
- [x] (2026-10-08 19:07Z) Worker closed the named browser, stopped the exact task process groups, restored the ordinary upload manifest byte-for-byte, and proved the ordinary database inode/size/mtime/hash still match the post-generator baseline. Ports and browser sessions are closed, the archive hash remains approved, and the 16 task-created Playwright artifacts have been isolated under the disposable workspace for final deletion.
- [x] (2026-10-08 19:08Z) Worker deleted only the validated `.tmp/task-06-preview-PshMth` workspace (90 disposable files, including imported data/uploads, task import log, token helper/log, runtime logs, screenshots/snapshots, and isolated browser artifacts). Final audit found no task workspace/helper/evidence artifact, listener on 65160/65161, or named browser; ordinary database metadata/hash and the sole `.gitkeep` upload manifest still match baseline exactly.
- [x] (2026-10-08 19:10Z) Final evidence audit detected that the first attempted category-keyboard proof had started from document-body focus. Worker repeated the approved archive import in fresh disposable workspace `.tmp/task-06-preview-VeEflr`, reopened only the same named browser session at 1600×900, used eight native `Tab` presses from `<body>` to focus `Tutte le attività`, and activated it with `Enter`; the resulting hash was `#programmi` with all six programs still rendered and zero hidden. The browser, exact process groups, workspace, three new browser artifacts, ports, uploads, and ordinary database were fully cleaned/restored again.
- [x] (2026-10-08 19:38Z) Independent Reviewer approved the implementation with no actionable findings after full source/scope review, isolated generator-equivalence proof, canonical frontend validation, archive-backed interaction and visual inspection at both exact viewports, and complete runtime/browser/data cleanup verification.
- [x] (2026-10-08 19:40Z) Coordinator accepted the independent approval, checked queue item 06, and prepared only the approved task files for local commit `06 — Implement the high-fidelity Attività page`; the explicit no-push override remains in force.

## Surprises & Discoveries

- Observation: the branch is `main`, five commits ahead of `origin/main`, with queue items 01–05 locally committed at `2bcd098`, `4b1b731`, `28fec7a`, `97ae7b4`, and `e918fff`.
  Evidence: `git log --oneline -7` shows those five commits directly above `origin/main`, and `git status --short --branch` reports `main...origin/main [ahead 5]`. The lack of push is the user’s explicit override, not a Planner or Worker blocker and not authority for either role to push.
- Observation: the sole unrelated worktree item is the pre-existing untracked `.agents/skills/imagen/scripts/` directory.
  Evidence: initial `git status --short` reports only `?? .agents/skills/imagen/scripts/`. This task neither uses nor modifies that directory and must exclude it from formatting, staging, cleanup, and commits.
- Observation: Context7 is unavailable before it can return a valid Next.js library id.
  Evidence: `ctx7 library 'Next.js' 'For Next.js 16.3.1 App Router with Cache Components, how should ...'` returned `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` A future contributor may use `ctx7 login` or `CONTEXT7_API_KEY`; until then, do not guess current APIs or silently substitute web results.
- Observation: pinned official Next.js 16.3.1 documentation confirms that layouts/components are Server Components by default, Client Components are for state/event/browser behavior, and a client boundary should be as narrow as possible because its imports join the client bundle.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`. This supports keeping all Activity modules server-rendered because category jump links need no state or event handler.
- Observation: pinned official image documentation requires a positioned parent for `fill`, recommends `sizes` for responsive `fill` images, and deprecates `priority` in favor of `preload` in Next.js 16.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`. The Activity media wrapper follows the already-approved Home/About pattern and only the hero preloads.
- Observation: `ActivityPageDto` already expresses every required section. It contains required hero copy/image, programs, schedules, venues, Open and athletics features, registration introduction, and registration steps; only program audience/image, feature eyebrow/image, and registration note are optional.
  Evidence: `frontend/cms/model.ts` and `frontend/cms/mappers.ts` lines 742–878. No schema, DTO, mapper, or parallel data path is needed.
- Observation: the approved archive seeds six programs in source order across all four allowed groups, six matching schedules, two fictional venues, both feature records, and three explicitly ordered registration steps.
  Evidence: `.agents/plans/02-generate-placeholder-media-and-build-the-importable-demonstration-dataset.md` under `Exact demonstration content / Activity page`. The required archive remains 636,008 bytes with SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.
- Observation: the desktop reference shows category controls that only change their selected styling, while the mobile reference actually hides cards. Applying that inconsistent mock behavior to only the program grid would leave feature, schedule, and venue sections apparently unfiltered and would conceal useful content behind JavaScript.
  Evidence: the script in `design/reference/attivit_squadre/code.html` only toggles button classes; the script in `design/reference/attivit_squadre_mobile/code.html` changes `.team-card` display. The production page instead uses honest category anchors and renders all content.
- Observation: task 03 owns fonts, tokens, the `.site-container`, header, mobile bar, footer, focus states, and application version; task 04 owns `frontend/components/home/`; task 05 owns `frontend/components/about/`.
  Evidence: the accepted implementation and ExecPlans for tasks 03–05. Activity must consume those foundations without refactoring or importing a page-private Home/About media component.
- Observation: required native OpenAPI generation can refresh generation-time `publishedAt` defaults even when no API shape changes.
  Evidence: tasks 01–05 record this Strapi generator behavior. The Worker must run the required generators, then distinguish timestamp-only output from structural drift rather than editing generated files by hand.
- Observation: an inline mutable-looking group-link literal widened its `group` and `href` values to `string` before `.filter`, despite the typed destination variable.
  Evidence: the first early `mise run fe:check` reported TS2322 in `components/activity/page.tsx`. Declaring the source with `as const satisfies readonly ActivityGroupLink[]` preserved the literal union through filtering; the immediate rerun passed all lint, route-generation, and TypeScript checks.
- Observation: the required Strapi/OpenAPI refresh changed only volatile publication defaults, exactly as anticipated.
  Evidence: `git diff --numstat` reports 34 additions and 34 deletions in each generated file; removing JSON `default` keys and generated `@default` timestamp lines made both HEAD-to-worktree comparisons byte-identical. Endpoint paths, operations, schema structure, and TypeScript shapes are unchanged.
- Observation: the first browser navigation reported one missing `/favicon.ico` resource, not an application exception; subsequent direct Activity navigation and the final desktop/mobile console checks reported zero errors. Scrolling a lazy feature image into the viewport produced Next's development-only LCP suggestion for that now-visible image.
  Evidence: `playwright-cli console error` after the final desktop and mobile Activity navigations returned zero messages. The warning named the lazy Open image; source inspection proves only the hero uses `preload`, as the plan requires.
- Observation: stopping only the background npm wrapper PIDs with SIGINT left their process-group children alive and the shell waiting.
  Evidence: the exact recorded groups remained on 65160/65161 until SIGINT was sent to process groups 823062 and 823140; all four task processes then exited, the monitored shell resumed, both ports closed, and ordinary uploads were restored by the installed cleanup function.
- Observation: pointer activation did not leave the category anchor focused in the first interaction sequence, so pressing `Enter` from the document body was not valid keyboard evidence.
  Evidence: the final audit caught `document.activeElement === document.body`. A fresh isolated rerun tabbed from `<body>` through the visible focus order; the eighth `Tab` produced `{ tag: "A", text: "Tutte le attività", href: "#programmi" }`, and `Enter` produced `#programmi` while counts remained `{ programs: 6, hidden: 0 }`.

## Decision Log

- Decision: do not implement client-side filtering in task 06.
  Rationale: the page has only six programs, and rendering them all is more useful, more accessible, and faithful to the complete CMS payload. The two references disagree about filter behavior; category anchor links styled as restrained chips preserve discovery and grouping without hydration, hidden content, dependency additions, or inconsistent filtering of downstream features and schedules.
  Date/Author: 2026-10-08 / Planner
- Decision: group programs in the stable enum order `youth-football`, `competitive-football`, `athletics`, `community`, while preserving CMS source order inside each group.
  Rationale: this matches the page’s narrative from youth formation through competition, athletics, and community. It gives each category one authoritative Italian presentation label without sorting or mutating editorial items.
  Date/Author: 2026-10-08 / Planner
- Decision: use the presentation labels `Scuola calcio`, `Calcio agonistico`, `Atletica FIDAL`, and `Corsi comunitari`, with group headings `Primi passi e settore giovanile`, `Squadre giovanili e Open`, `Pista, corsa e coordinazione`, and `Movimento aperto al quartiere`.
  Rationale: these labels reconcile the two references and the four exact DTO enum values. They add navigation language, not CMS facts, and do not alter or replace program titles, audiences, or summaries.
  Date/Author: 2026-10-08 / Planner
- Decision: render the required hero image at both viewports in a responsive copy/image split, rather than hiding it on desktop to copy the incidental desktop mockup literally.
  Rationale: the mobile reference treats the activity image as an important opening visual and the DTO makes it required. A seven/five desktop split retains the desktop reference’s editorial copy hierarchy while truthfully presenting every field.
  Date/Author: 2026-10-08 / Planner
- Decision: keep one Activity-private `next/image` wrapper and six section modules under `frontend/components/activity/`.
  Rationale: this follows the accepted Home/About ownership pattern, avoids importing another page’s private media primitive, and keeps the composition root small. Repeated feature layout belongs in one cohesive private Activity module rather than duplicated Open/athletics files.
  Date/Author: 2026-10-08 / Planner
- Decision: combine schedules and venues in one `SchedulesAndVenues` section.
  Rationale: schedules already name venues, and the references present time/place details as one decision surface. A combined desktop grid and stacked mobile flow maps every field without creating two thin, repetitive sections.
  Date/Author: 2026-10-08 / Planner
- Decision: sort a copied registration-step array by numeric `order`, preserving source order for equal values.
  Rationale: `order` is an explicit editorial sequencing field. Sorting a copy makes its meaning visible without mutating the DTO; the number shown to users remains the CMS value rather than a derived array index.
  Date/Author: 2026-10-08 / Planner
- Decision: add no new unit test or browser test file.
  Rationale: implementation is presentational; grouping is a direct four-value projection and stable sorting uses the platform’s non-mutating `toSorted`. Source inspection, TypeScript, production build, the full existing Vitest suite, and manual semantic/visual inspection cover the material risks without a test seam more complex than the behavior.
  Date/Author: 2026-10-08 / Planner
- Decision: use only the task-02 archive imported into a unique disposable database and isolated upload directory for manual validation.
  Rationale: the page needs real mapped CMS content and placeholder media for meaningful inspection, while ordinary developer data and uploads must remain untouched. This task-level check does not replace task 08’s final release rehearsal.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer do not edit `TODOS.md`, stage, commit, push, or change branches. Coordinator alone creates local commit `06 — Implement the high-fidelity Attività page` after approval and performs no push.
  Rationale: this is the explicit role ownership and no-push override for this queue. It supersedes the normal implement-task push gate without changing implementation scope.
  Date/Author: 2026-10-08 / Planner

## Outcomes & Retrospective

The seven-file Activity presentation is implemented, formatted, canonically validated, independently approved, and proven against the committed archive at both exact target viewports. It maps every `ActivityPageDto` field, resolves the mockups’ inconsistent filtering with server-rendered grouped content and anchor navigation, preserves optional-media and sparse-draft behavior, passes 87 checked files plus 6 Vitest files/50 tests, retains `/attivita` as request-capable Partial Prerender output, and has only timestamp-default generated changes. Both Worker and Reviewer stopped their runtimes and named browser, restored ordinary database/uploads byte-for-byte, and removed all task runtime/browser evidence. Final scope contains only the exact seven Activity files, two native generated timestamp artifacts, this living ExecPlan, the queue checkbox, and the untouched unrelated untracked image-tool directory. Independent review returned `APPROVED` with no actionable findings, so task 06 is ready for its Coordinator-owned local commit and intentional no-push handoff.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0. `frontend/` is Next.js 16.3.1 with React 19.2.8, Tailwind CSS 4, typed routes, and Cache Components enabled. “SSR + ISR” here means the route renders against request-time state on the server, while the Activity singleton read is cached for reuse and invalidated through the existing Strapi webhook.

`frontend/app/(content)/attivita/page.tsx` is already correct and out of scope. It calls `await io()` to prevent the CMS response from being baked into a build-time static shell, calls `getActivityPage()`, handles absence with `notFound()`, and passes the DTO to `PageSwitch`. `frontend/components/page-switch.tsx` dispatches `pageType: "activity"` to `frontend/components/activity/page.tsx`. Keep both files byte-unchanged.

The CMS pipeline is also out of scope. `frontend/cms/client.ts` requests the populated Activity singleton; `mappers.ts` validates it into `ActivityPageDto`; `connector.ts` composes those boundaries; `data.ts` owns the days-long `"use cache"` read and `cacheTag("activity-page")`; `tags.ts` maps Activity webhooks to that tag. The page consumes the mapped DTO only. Do not import the raw client, fetch, remap, or add another cache.

Every DTO field has one presentation owner:

- `pageType` remains the `PageSwitch` discriminant and is not displayed.
- `eyebrow`, `headline`, `introduction`, and required `heroImage` belong to `hero.tsx`.
- `programs` belongs to `programs.tsx`; every item maps `group`, `title`, `summary`, optional `audience`, and optional `image`.
- `openTeamFeature` and `athleticsFeature` belong to `feature.tsx`; each maps optional `eyebrow`, `title`, `body`, and optional `image`.
- `schedules` and `venues` belong to `schedules-and-venues.tsx`; every schedule maps `title`, `days`, `time`, and `venue`, and every venue maps `name`, `address`, and `details`.
- `registrationIntroduction` and `registrationSteps` belong to `registration.tsx`; every step maps `order`, `title`, `body`, and optional `note`.

Task 02’s committed archive supplies the published 2026/27 page. Its magenta media is deliberately synthetic and its alternative text says so. Preserve the mapped alternative text exactly; do not hide, replace, recolor, regenerate, or cosmetically disguise the placeholder pixels. The Open and athletics feature images intentionally reuse the corresponding program media.

Task 03’s shared shell already supplies self-hosted Epilogue/Manrope fonts, the gold/graphite/pale token palette, `.site-container`, sticky desktop/compact mobile header, fixed mobile bottom navigation, footer/contact anchor, visible app version, skip link, global focus treatment, and route states. Task 06 renders inside that shell and must not duplicate or change it.

The desktop Attività HTML establishes this hierarchy: editorial opening, category navigation, youth/program cards, a large Open-team split, a large athletics split, and a registration sequence. The mobile HTML establishes the wide opening image, compact chips, one-column cards, readable time/place modules, and vertical registration flow. `design/DESIGN.md` controls palette, type, restrained radii/shadows, and spacing when mock details disagree. The CMS contract controls item counts and content; do not invent the reference’s third youth card, historical competition statistics, medical claims, affiliations/certifications, secretariat hours, or real-looking contact data.

## Plan of Work

### Milestone 1: Build the Activity media primitive, hero, and composition root

Create `frontend/components/activity/activity-media.tsx` as a pure wrapper around `next/image`. It accepts `image: ImageDto`, `sizes: string`, optional `className`, and optional `preload`. Render `fill`, `object-cover`, the mapped `image.alt`, and no client callbacks. The caller supplies a positioned crop frame. Only the hero passes `preload`; program and feature images remain lazy. Do not render the generic seed caption repeatedly, use deprecated `priority`, add a loader, or introduce image tooling.

Create `frontend/components/activity/hero.tsx`. It accepts the four hero values and a readonly list of available program-group anchor links. Render one H1, using the trimmed CMS headline or the route-label fallback `Attività` for an incomplete draft. Render eyebrow and introduction only when nonempty. At 1600px use `.site-container`, a seven/five grid, approximately 56px display type, and a 16:10 hero frame with restrained border/shadow. At 412px stack copy above a wide 16:10 frame and use the 36px-class display rhythm. Preserve the hero alt and preload this sole likely largest-content image.

Below the hero grid, render a labelled native navigation region styled like the references’ category controls. Include `Tutte le attività` pointing to `#programmi` when any program exists, then only the group links that have visible programs. Each link targets `#programmi-youth-football`, `#programmi-competitive-football`, `#programmi-athletics`, or `#programmi-community`. Let links wrap on narrow screens; do not use buttons, selected state, `aria-pressed`, a horizontal trap, or JavaScript. Clicking a link updates the hash and moves to content without removing any item.

Replace `frontend/components/activity/page.tsx` with a small Server Component composition root while retaining the exact public signature:

    export function ActivityPage({ page }: { page: ActivityPageDto })

Add a private `hasText` helper. Derive visible programs, schedules, venues, and registration steps by removing only records whose entire display payload is empty; preserve partial truthful records. Derive available group links from the visible programs. Treat a feature as visible when at least one of title, body, eyebrow, or image is present. Sort a copied registration array by `order` using `toSorted`; do not mutate `page.registrationSteps`.

Render in this exact order:

    ActivityHero
    ProgramsSection
    FeatureSection for openTeamFeature
    FeatureSection for athleticsFeature
    SchedulesAndVenues
    RegistrationSection

The root supplies ids and alternating feature orientation but no extra section wrapper. It renders one `<main>`, performs no data read, and contains no header, footer, metadata, `io()`, state, effect, or browser API.

Milestone acceptance: the public Activity interface remains unchanged, the hero owns every opening field, category controls are honest anchor navigation, the composition root is an obvious dispatcher, and no file outside `frontend/components/activity/` has changed.

### Milestone 2: Implement grouped programs and the two editorial features

Create `frontend/components/activity/programs.tsx`. Define one readonly presentation map for the four exact `SportProgramGroup` values and one fixed group-order array. The labels/headings are those recorded in the Decision Log. Group with `filter` into new arrays; never mutate or sort the CMS programs. Return `null` when no visible program exists.

Render an outer section with `id="programmi"`, static overline `Proposte 2026/27`, H2 `Sport per ogni passo`, and a short neutral presentation sentence that does not invent a club fact. For each nonempty group, render a nested labelled section with its exact `programmi-<group>` id, an ordinal/category overline, and an H3. Render every program in a semantic list of articles. Each card conditionally renders its optional image in a 16:10 positioned frame, its optional audience as concise metadata, title as H4 when present, and summary with `whitespace-pre-line` when present. A missing image removes only the frame; a text-only card remains balanced. At desktop use two columns for seeded youth/competitive pairs and let one-item athletics/community groups occupy a readable width rather than stretching copy across the whole canvas. At 412px use one column and compact padding. Keep the full CMS source order inside every group.

Create `frontend/components/activity/feature.tsx`. Export one `FeatureSection` used twice with local props for `feature`, literal `id`, an accessible fallback label, and `mediaPosition: "start" | "end"`. Return `null` only when eyebrow, title, body, and image are all absent. Render the CMS title as H2 or the supplied truthful fallback (`Squadra Open` or `Atletica`) when other content exists but the title is blank. Render eyebrow/body only when meaningful and optional image only when present.

At 1600px use a balanced twelve-column split. `openTeamFeature` uses `id="squadra-open"`, a pale full-width band, image first, copy second, and a roughly 8:7/near-square crop consistent with the Open placeholder. `athleticsFeature` uses `id="atletica-in-evidenza"`, a lowest-surface editorial card, copy first, image second, and a near-square crop. At 412px both become one column with media first in reading order and text below, regardless of desktop orientation. Do not add the references’ unsourced founding year, trophy edition, league, certification, venue, or training claims; the feature component displays only its DTO plus static section role labels.

All imagery uses `ActivityMedia`, preserves alt text, supplies accurate sizes, and lives inside semantic `<figure>` elements. Use CSS transitions only for subtle pointer decoration if desired and respect the global reduced-motion rule. Do not add a Client Component, carousel, icon font, filters, animation library, or click handler.

Milestone acceptance: all six seeded programs appear exactly once in the grouped program section, both required feature DTOs appear once in their dedicated editorial sections, all optional nested fields degrade without blank frames/elements, and the desktop/mobile structures express the reference intent without copied unsafe facts.

### Milestone 3: Implement schedules, venues, and registration

Create `frontend/components/activity/schedules-and-venues.tsx`. Return `null` only when both filtered arrays are empty. Render `id="orari"`, overline `Allenamenti e spazi`, H2 `Orari e luoghi`, and a responsive desktop grid with schedules taking roughly eight columns and venues four. At mobile stack schedules first and venues second.

When schedules exist, render a named subsection and semantic list. Each schedule article maps title, days, time, and venue without concatenating them into ambiguous prose. Use a small `<dl>` whose labels are `Giorni`, `Orario`, and `Sede`; conditionally omit only empty pairs. Use tabular numerals for time strings. Do not parse the editorial strings into dates, infer a relation to a venue record, or add calendar/download behavior.

When venues exist, render a named subsection and semantic list of compact cards. Each maps name, address in `<address className="not-italic">`, and details. Do not add maps, links, coordinates, opening times, images, or real addresses from the references. If only one of schedules/venues exists, it uses the available width cleanly and no empty column/heading remains.

Create `frontend/components/activity/registration.tsx`. Return `null` when both the trimmed introduction and visible ordered steps are absent. Render `id="iscrizioni"`, overline `Informazioni e accoglienza`, H2 `Guida alle iscrizioni`, the CMS introduction when present, and an ordered list of steps. Each step displays the zero-padded CMS `order`, title, body, and optional note; it does not renumber by array position. At desktop the seeded three steps form three equal cards joined only by visual rhythm. At mobile they become a clear vertical sequence. Mark numeric decoration appropriately without hiding the actual ordered-list semantics.

Add one ordinary `next/link` after the sequence, labelled `Contatta la segreteria`, pointing to the existing `/#contatti` shared-footer anchor. Do not add a form, phone number, email, hours, medical advice, document requirement, or registration success state.

Across milestones 1–3, use the accepted Tailwind tokens, `.site-container`, Epilogue/Manrope, restrained radii/shadows, generous desktop and compact mobile spacing, and the global focus style. Keep one H1, H2 for top-level Activity sections/features, H3 for grouped/subsections/step headings as appropriate, and H4 for cards nested below an H3. Use native section/nav/list/article/figure/address/link semantics, `aria-labelledby` for named regions, and `aria-hidden` only for decoration. Ensure the fixed mobile bar never covers the final registration/contact content.

Incomplete-draft behavior is exact. Empty collections remove their section, spacing, and hero link. Completely empty repeated records disappear; partial records display only truthful populated fields. Missing optional media removes only its frame. Empty eyebrow/audience/note fields create no blank element. The required hero image remains unconditional because mapper validation rejects its absence. CMS unavailability or invalid published data still reaches the existing route error boundary; do not catch it as empty content.

Run formatting only after all intended Activity files exist, then inspect the exact diff:

    cd /home/codex/src/us-alb
    mise run fe:format
    git diff --check
    git diff -- frontend/components/activity

Milestone acceptance: every top-level and nested `ActivityPageDto` field has the owner specified here, responsive behavior matches both target canvases, optional content has no broken shell, and the production source diff remains exclusively under `frontend/components/activity/`.

### Milestone 4: Refresh generated artifacts and run canonical validation

From `/home/codex/src/us-alb`, list the actual tasks and perform the artifact refresh required after a frontend change:

    mise tasks
    mise run be:openapi
    mise run fe:openapi

Do not run `be:types`; no backend schema or backend TypeScript changed. Inspect `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`. Native generation-time `publishedAt` defaults may refresh, but endpoint paths, operations, schema keys, and TypeScript shapes must remain unchanged. Keep only generator-produced output. A structural API change is a blocker, not permission to edit schema, DTO, mapper, cache, or generated output manually.

Run every applicable canonical frontend command:

    mise run fe:check
    cd /home/codex/src/us-alb/frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Expect Biome, route type generation, TypeScript, the complete existing Vitest suite, and the production build to pass. Record the actual file/test counts. The build route table must continue to classify `/attivita` as request-capable Partial Prerender output rather than a fully static CMS snapshot. The route retains `await io()`, and `getActivityPage()` retains `"use cache"`, `cacheLife("days")`, and `cacheTag("activity-page")`.

Run focused scope and integrity checks:

    git diff --check
    git diff --exit-code -- TODOS.md PLAN.md TYPES.md README.md mise.toml backend/package.json backend/package-lock.json backend/src backend/types/generated backend/seed-data/us-albatese-demo.tar.gz frontend/package.json frontend/package-lock.json frontend/app frontend/components/page-switch.tsx frontend/components/home frontend/components/about frontend/components/layout frontend/components/shared frontend/components/news-detail frontend/components/notizie frontend/cms ':(exclude)frontend/cms/schema.json' ':(exclude)frontend/cms/schema.d.ts'
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git status --short -- .agents/skills/imagen/scripts/

The protected-file diff is empty. The generated-artifact diff is empty or native timestamp-default-only, proven by comparing endpoint paths, operations, schema structure, and TypeScript shapes. The archive hash remains `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Package/lock files remain unchanged. The unrelated image-tool directory remains only the same untracked path.

Milestone acceptance: required artifact refresh and every applicable canonical frontend command pass, `/attivita` retains request rendering, API shape/archive/dependencies are unchanged, and the durable implementation diff contains only Activity files, this plan, and native generated timestamp refreshes if any.

### Milestone 5: Inspect the archive-backed page at both exact viewports and clean up

Manual inspection uses only the committed demonstration archive and task-owned temporary state. Confirm `backend/.env` and `frontend/.env.development` exist and are ignored without displaying them. After artifact generation, record the ordinary `backend/.tmp/data.db` inode/size/mtime/hash if present, the archive hash, and a filename/hash manifest of `backend/public/uploads`. This is the no-ordinary-data baseline.

Create a unique workspace and absent relative SQLite path:

    mkdir -p backend/.tmp
    task06_preview_dir="$(mktemp -d -p backend/.tmp task-06-preview-XXXXXX)"
    task06_preview_base="$(basename "$task06_preview_dir")"
    task06_preview_rel=".tmp/${task06_preview_base}"
    task06_preview_db=".tmp/${task06_preview_base}/data.db"
    test ! -e "backend/$task06_preview_db"

Resolve the workspace and `backend/public/uploads` with `realpath`. Refuse to continue if uploads is missing, is a symlink, or resolves outside `/home/codex/src/us-alb/backend/public`. Move the complete ordinary uploads directory to `$task06_preview_dir/uploads-original`, immediately create a new empty `backend/public/uploads`, and install cleanup that always closes the one named browser, stops exact task processes, moves imported uploads aside, and restores `uploads-original` byte-for-byte. Never import into, copy over, or delete ordinary data.

From `backend`, import only into the disposable database with process-local overrides:

    mise exec -- env DATABASE_FILENAME="$task06_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file seed-data/us-albatese-demo.tar.gz --force --only content,files

Expect the approved counts: 55 entities, 112 links, and 43 asset binaries. Record `backend/import_<timestamp>.log` files before/after and move only new logs positively identified by this task’s import time into the workspace. Never retry a failed import against the partial database.

Use `apply_patch` to create temporary `backend/$task06_preview_rel/read-demo-token.mjs`. It loads installed CommonJS `@strapi/core` with `createRequire`, compiles/loads Strapi against the disposable database without opening a port, requests the bootstrap-created `Read Only` token through `app.admin.services["api-token-content-api"].getByName("Read Only", { includeDecryptedKey: true })`, requires a nonempty `accessKey`, writes only that key to already-open file descriptor 3 with `writeSync`, and destroys Strapi in `finally`. Capture descriptor 3 only into shell/process memory. Never print the token, put it in an argument, write it to a normal file, or include it in evidence.

Start Strapi and Next.js in one monitored terminal session on loopback-only ports 65160 and 65161. Use the task-04/05 proven staging-variable pattern so Mise cannot replace the disposable token with the project env value:

    task06_cms_token="$(
      mise exec -- env DATABASE_FILENAME="$task06_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= node "$task06_preview_rel/read-demo-token.mjs" 3>&1 1>>"$task06_preview_rel/token-helper.log" 2>&1
    )"
    test -n "$task06_cms_token"
    export TASK06_CMS_TOKEN="$task06_cms_token"
    unset task06_cms_token

    task06_backend_pid=""
    task06_frontend_pid=""
    stop_task06_servers() {
      for task06_pid in "$task06_frontend_pid" "$task06_backend_pid"; do
        if test -n "$task06_pid" && kill -0 "$task06_pid" 2>/dev/null; then
          kill -INT "$task06_pid"
        fi
      done
      test -z "$task06_frontend_pid" || wait "$task06_frontend_pid" || true
      test -z "$task06_backend_pid" || wait "$task06_backend_pid" || true
    }
    trap stop_task06_servers EXIT INT TERM

    mise exec -- env HOST=127.0.0.1 PORT=65160 DATABASE_FILENAME="$task06_preview_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start >"$task06_preview_rel/backend.log" 2>&1 &
    task06_backend_pid="$!"
    for task06_attempt in $(seq 1 60); do
      curl --fail --silent http://127.0.0.1:65160/_health >/dev/null && break
      test "$task06_attempt" -lt 60 || exit 1
      sleep 1
    done

    (
      cd ../frontend
      exec mise exec -- sh -c '
        export CMS_URL=http://127.0.0.1:65160/api
        export CMS_MEDIA_URL=http://127.0.0.1:65160
        export CMS_API_TOKEN="$TASK06_CMS_TOKEN"
        export SITE_URL=http://127.0.0.1:65161
        unset TASK06_CMS_TOKEN
        exec npm run dev -- --hostname 127.0.0.1 --port 65161
      '
    ) >"$task06_preview_rel/frontend.log" 2>&1 &
    task06_frontend_pid="$!"
    unset TASK06_CMS_TOKEN
    for task06_attempt in $(seq 1 60); do
      curl --fail --silent http://127.0.0.1:65161/attivita >/dev/null && break
      test "$task06_attempt" -lt 60 || exit 1
      sleep 1
    done
    wait -n "$task06_backend_pid" "$task06_frontend_pid"
    exit 1

Use only the returned monitored terminal session to poll or send Ctrl-C after inspection. The one-second readiness loops are bounded. Never bind `0.0.0.0`, use Docker, alter an env file or machine/user environment, expose another port, or start the ordinary stack.

Use exactly one Playwright CLI session named `task-06-activity-page` with the installed fixed headless Chromium configuration. Do not pass a browser, device, executable, profile, or config override, and do not create a Playwright test or script file:

    playwright-cli -s=task-06-activity-page open http://127.0.0.1:65161/attivita
    playwright-cli -s=task-06-activity-page resize 1600 900
    ...desktop inspection...
    playwright-cli -s=task-06-activity-page resize 412 914
    ...mobile inspection...
    playwright-cli -s=task-06-activity-page close

At 1600×900, use semantic/boxed snapshots and a small set of viewport screenshots saved only under the task workspace. Inspect the hero/category navigation, every program group, Open feature, athletics feature, schedules/venues, and registration. Confirm the 1200px alignment, one H1, seven/five hero with honest placeholder alt, four available group links, all six programs in the correct groups/source order, every audience/summary/optional image, both complete feature records, six schedules, two venue cards/addresses/details, and three registration steps in numeric order with notes. Confirm Epilogue/Manrope computed families, sticky shared header, hidden mobile bar, meaningful section/list/article/figure/address structure, no horizontal overflow, and no application console error.

Click `Tutte le attività` and all four category links. Confirm each hash targets an existing section and all six program cards remain rendered; there must be no filter button or hidden category content. Click `Contatta la segreteria` and confirm the final URL is `/#contatti`, then navigate back. Exercise one category anchor and the contact link with keyboard focus as well as pointer input.

At 412×914, scroll the complete page and capture corresponding temporary viewport screenshots. Confirm compact type/spacing, 16:10 hero crop, wrapped and keyboard-reachable category links, one-column program groups, media-first feature stacking, readable schedule `<dl>` rows, venues and registration sequence, optional notes, fixed five-item mobile navigation, at least 64px final-content clearance, untruncated shared-nav labels, and zero page-level horizontal overflow. Content count and text must match desktop; responsive CSS must not discard programs, schedules, venues, features, or steps.

Use `playwright-cli eval`/`run-code` only for diagnostics such as viewport dimensions, scroll width, computed fonts/positions, heading/list counts, image alt text, link targets, and visible card counts. Screenshots are comparison evidence, not committed golden files. Do not mock requests, mutate CMS content, cookies, storage, or browser profile to simulate empty data. Source inspection and type checks prove optional/empty degradation; the archive proves complete published behavior. The development-only `<nextjs-portal>` may be removed from the current inspection page only if it intercepts the fixed mobile bar; record that diagnostic and do not change application CSS or browser configuration.

Close the named browser even on failure. Send Ctrl-C only to the recorded runtime session so its trap stops both exact child processes. Preserve failure evidence until understood. After successful proof, move imported uploads aside, restore `backend/public/uploads` exactly, remove only positively identified task import logs and the resolved `task-06-preview-*` workspace after verifying its prefix, and prove:

    no listener remains on 127.0.0.1:65160 or 127.0.0.1:65161
    playwright-cli list contains no task-06-activity-page session
    the ordinary database inode/size/mtime/hash matches the post-generator baseline
    the restored upload filename/hash manifest matches the baseline
    the archive SHA-256 remains approved
    no task-06-preview-* directory, token helper, screenshot, log, or task browser artifact remains

If implementation changes after validation, rerun formatting, required generators, every canonical frontend command, and both viewport inspections. Update `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` with actual commands, counts, observations, and cleanup evidence before handing off `WORK_READY`.

## Concrete Steps

All commands run from `/home/codex/src/us-alb` unless a step explicitly changes directory. Begin with safe prerequisites:

    git branch --show-current
    git status --short --branch
    git merge-base --is-ancestor 2bcd098 HEAD
    git merge-base --is-ancestor 4b1b731 HEAD
    git merge-base --is-ancestor 28fec7a HEAD
    git merge-base --is-ancestor 97ae7b4 HEAD
    git merge-base --is-ancestor e918fff HEAD
    git rev-list --left-right --count '@{upstream}...HEAD'
    test -f backend/.env
    test -f frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    mise current
    mise tasks
    sha256sum backend/seed-data/us-albatese-demo.tar.gz

Expected evidence is branch `main`, all five ancestor checks succeeding, upstream count `0 5`, both ignored local env files present, Node 24.20.0, the current task list, and archive hash `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Never run `env`, `printenv`, `set`, or display either env file.

Use `apply_patch` for every text edit, including the temporary token helper. Do not download or generate an asset. Implement the exact seven Activity files in milestone order, format, inspect file-scoped diffs, refresh artifacts, run canonical validation, establish the post-generator ordinary-state baseline, import the archive, run the isolated servers, inspect both exact viewports, close/stop, restore, clean, and perform final scope checks.

Do not edit `TODOS.md`, stage, commit, push, switch branches, touch `.agents/skills/imagen/scripts/`, use `imagegen`/`imagen`, or begin task 07. A successful Worker handoff records exact changed files, grouping/no-filter/empty-state behavior, generator diff characterization, canonical command results and actual test counts, `/attivita` build classification, both viewport observations and clicked targets, console/overflow/semantic evidence, archive hash, upload/database restoration, stopped ports, closed session, and final Git status. It ends with `WORK_READY` and does not claim Reviewer approval.

## Validation and Acceptance

Acceptance is behavioral and bounded to task 06:

1. `/attivita` renders all supplied `ActivityPageDto` fields: eyebrow, headline, introduction, required hero image, every program group/title/audience/summary/optional image, both feature eyebrow/title/body/optional image records, every schedule title/days/time/venue, every venue name/address/details, registration introduction, and every ordered step title/body/optional note.
2. At 1600×900, composition matches the desktop reference intent inside the accepted shell: airy copy/image opening, category navigation, grouped editorial program cards, large Open and athletics splits, a legible schedule/venue area, and a three-card registration sequence.
3. At 412×914, the same semantic tree matches the mobile reference intent: compact copy and wide hero crop, wrapped category links, single-column cards, media-first feature blocks, readable time/place modules, vertical registration flow, and sufficient clearance above fixed navigation.
4. Program grouping is deterministic in youth/competitive/athletics/community order and preserves CMS item order inside each group. The four Italian labels are presentation metadata; no program field is overwritten or omitted.
5. Category controls are native anchors, not filters. They target only rendered ids, work with keyboard and pointer, require no hydration, and never hide content. No Client Component, state, effect, button-only selected style, dependency, or duplicated server/client dataset is introduced.
6. Every CMS image uses `next/image` through `ActivityMedia`, a positioned crop frame, accurate responsive `sizes`, `object-cover`, and mapped truthful alt text. Only the hero preloads. Missing optional program/feature media removes only its frame.
7. Empty collections omit their complete sections and hero links; entirely empty repeated records disappear; partial records display only meaningful fields; an empty feature disappears only when all of its content is absent; an empty registration introduction does not suppress valid steps; an empty headline uses the route-label fallback. CMS failures still reach the existing error boundary.
8. The page has one H1, orderly H2/H3/H4 hierarchy, labelled sections/nav, semantic lists/articles/figures/definition lists/addresses/links, visible focus, decorative elements hidden appropriately, sufficient contrast, tabular order/time styling, and no page-level horizontal overflow.
9. `frontend/app/(content)/attivita/page.tsx` retains `await io()`, `getActivityPage()`, `notFound()`, and `PageSwitch`; `PageSwitch` remains the dispatcher. Client/mapper/connector/data/cache/tag/webhook/preview behavior and `ActivityPageDto` remain unchanged.
10. No backend schema/source/type, content/archive, frontend CMS pipeline/generated shape, app route, shared chrome/global CSS, Home/About/Notizie/news-detail code, dependency, lockfile, README, PLAN, TYPES, task tracker, or asset changes occur.
11. `be:openapi`, `fe:openapi`, `fe:check`, the full existing frontend Vitest suite, and `fe:build` pass. Generated API shape is unchanged, and `/attivita` remains request-capable Partial Prerender output. No backend or browser/component/E2E/smoke/deployment test is added or run.
12. Manual validation uses only named session `task-06-activity-page`, exact 1600×900 and 412×914 viewports, archive-backed disposable state, ports 65160/65161 bound to `127.0.0.1`, and the installed fixed Playwright CLI configuration. The session closes, processes stop, ports close, temporary evidence is removed, ordinary uploads/database remain unchanged from the post-generator baseline, and the archive hash remains approved.
13. Worker and Reviewer leave `TODOS.md`, branch, Git history, index, upstream, and task 07 unchanged. After `APPROVED` and `REVIEW_READY`, Coordinator alone performs permitted plan/review bookkeeping, checks task 06, stages only Activity/generated/plan/tracker files while excluding `.agents/skills/imagen/scripts/`, creates local commit `06 — Implement the high-fidelity Attività page`, and intentionally does not push.

## Idempotence and Recovery

The Activity source edits are idempotent. Presentation filters/grouping create new arrays and never mutate the DTO; `toSorted` returns a new registration array. Formatting, generators, tests, and builds can be rerun. If generated artifacts differ only in native timestamp defaults, retain and document them; if any endpoint or type shape changes, stop and find the unintended contract change rather than editing schemas/generated files manually.

Do not repair missing presentation by editing the archive, database, schema, mapper, DTO, or reference. If the current contract objectively cannot express a required section, stop with `BLOCKED` and identify the exact missing field. Current inspection found no such conflict.

Archive import is destructive only to its explicit target, so prove the unique database file absent before `--force`. Never retry a failed import in place. Restore ordinary uploads before a second attempt, preserve failure evidence, and use a new `task-06-preview-*` workspace. Never recursively remove all of `backend/.tmp`, `backend/public`, `.playwright-cli`, the workspace root, or another session’s files.

The token helper holds the disposable secret only in descriptor/shell/process memory. On failure, unset task token variables, destroy the temporary Strapi application, stop exact task processes, and remove the helper only after diagnosis. Never print the token or expose it through arguments, logs, screenshots, plan text, or tool output.

Browser inspection can be repeated in the same named session during one remediation pass, but close it before handoff. Use session-specific `close`, never `close-all` or `kill-all`. Keep screenshots/logs inside the unique workspace and remove them only after findings are summarized. Upload or ordinary-database restoration failure is a blocker: retain evidence and do not claim completion.

## Artifacts and Notes

Expected durable implementation files are exactly:

    frontend/components/activity/page.tsx
    frontend/components/activity/activity-media.tsx
    frontend/components/activity/hero.tsx
    frontend/components/activity/programs.tsx
    frontend/components/activity/feature.tsx
    frontend/components/activity/schedules-and-venues.tsx
    frontend/components/activity/registration.tsx

Required generators may update:

    frontend/cms/schema.json
    frontend/cms/schema.d.ts

The durable planning artifact is `.agents/plans/06-implement-the-high-fidelity-attivita-page.md`. No standalone design note, content manifest, source/generated image, browser test, screenshot, fixture, README, CSS file, helper package, or dependency is needed.

Temporary evidence belongs only below `backend/.tmp/task-06-preview-XXXXXX/`: disposable SQLite data, preserved/imported uploads during the run, token-helper source/log, server logs, and browser screenshots/snapshots. Ordinary uploads return to `backend/public/uploads` before handoff, and the workspace is removed only after successful proof.

## Interfaces and Dependencies

Use only existing Next.js 16.3.1, React 19.2.8, Tailwind CSS 4, TypeScript, and Vitest. Add no package. Every Activity module is a Server Component and contains no `"use client"` directive.

The composition consumes only existing DTOs from `@cmsjs/cms/model` and defines no duplicate transport/domain type. Keep this public signature:

    export function ActivityPage({ page }: { page: ActivityPageDto })

`activity-media.tsx` has this local interface:

    export function ActivityMedia(props: {
      image: ImageDto;
      sizes: string;
      className?: string;
      preload?: boolean;
    })

`hero.tsx` accepts the four opening values and readonly literal group-link descriptors. `programs.tsx` accepts `readonly SportProgramDto[]`. `feature.tsx` accepts one `FeatureDto`, a literal section id, fallback label, and media position. `schedules-and-venues.tsx` accepts readonly `ScheduleDto[]` and `VenueDto[]`. `registration.tsx` accepts the introduction and already filtered/sorted readonly `RegistrationStepDto[]`. Keep presentation types private to Activity unless shared by two Activity files; do not export a cross-page view model.

Use native anchors for same-page group navigation, `next/link` only for `/#contatti`, and `next/image` only through the Activity media wrapper. Use no icon/date/UI library. The shared stylesheet already owns tokens, fonts, focus, reduced motion, safe-area behavior, and container width; consume Tailwind utilities without changing global CSS.

Revision note (2026-10-08 / Planner): Created the initial self-contained task-06 ExecPlan after complete governing-file, skill/reference, design/history, Attività desktop/mobile reference, CMS/Activity pipeline, task-02 dataset/archive, task-03 shared chrome, task-04/05 ownership-pattern, pinned-documentation, repository-state, and validation inspection. Recorded the Context7 quota failure; fixed every DTO-field owner, exact Activity-only file map, grouping/label and no-client-filter decisions, responsive/accessibility/media semantics, optional/empty behavior, artifact refresh, canonical commands, isolated Playwright runtime, complete cleanup, Coordinator-only local commit, and explicit no-push override. No implementation file, tracker, asset, runtime, branch, index, commit, or remote was changed.

Revision note (2026-10-08 / Worker): Recorded completion of the seven planned Activity modules, the early formatter/check evidence, and the sole TypeScript literal-inference discovery and correction. Updated Outcomes to distinguish completed implementation from still-pending generator, canonical, browser, cleanup, review, and Coordinator work; no implementation scope or governing decision changed.

Revision note (2026-10-08 / Worker): Recorded the successful required OpenAPI refresh, normalized shape-equivalence proof, canonical frontend results and exact file/test counts, protected-scope/archive/cache checks, and the retained `/attivita` Partial Prerender classification. Browser inspection and cleanup remain pending; no implementation decision changed.

Revision note (2026-10-08 / Worker): Recorded the archive import counts, exact desktop/mobile semantic, responsive, interaction, console, overflow, typography, content-count, and screenshot observations; documented the permitted inspection-only Next portal removal, transient favicon/development warning, exact process-group stop recovery, browser/port closure, and ordinary-state restoration. Only final disposable evidence deletion and final scope proof remain before `WORK_READY`; no production implementation changed after canonical validation.

Revision note (2026-10-08 / Worker): Recorded deletion of the validated task workspace and all 90 disposable files plus the final no-listener/no-browser/no-artifact, ordinary-data/archive integrity, protected-scope, clean-index, unchanged-branch/upstream, and exact durable-file audit. Updated Outcomes for Worker handoff readiness; Reviewer and Coordinator items intentionally remain open.

Revision note (2026-10-08 / Worker): Corrected the keyboard-category evidence gap found during final audit by recording a fresh archive-backed native Tab/Enter proof in the same required named browser session and its second complete cleanup/restoration audit. No implementation or generated artifact changed, so canonical commands and both already-passing viewport inspections did not require repetition.

Revision note (2026-10-08 / Coordinator): Recorded the independent Reviewer’s `APPROVED`/`REVIEW_READY` result after its separate source, generator, canonical, archive-backed desktop/mobile, interaction, and cleanup audit. Checked queue item 06 and finalized outcomes for the Coordinator-owned local commit. The unrelated image-tool directory remains excluded, and no push is authorized or performed.

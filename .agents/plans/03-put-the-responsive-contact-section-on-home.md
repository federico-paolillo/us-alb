# Put the responsive contact section on Home

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this task, every existing `/#contatti` link lands on a real, CMS-backed contact section at the bottom of Home rather than on hardcoded footer details. The section shows editable Home heading and introduction copy, club-wide phone and email actions, then the shared Locations that editors enabled for Home. It remains a valid anchor and explains that contact information is being updated when no methods or visible Locations exist.

The section can be seen by visiting `/` with Home contact data and Location records available through the existing CMS pipeline. On a narrow viewport, club-wide actions occur before all Location cards, long email addresses wrap within their containers, and the final content has clearance above the fixed mobile navigation. Each Location address uses semantic HTML, every phone/email item is a keyboard-focusable link with the site's existing focus ring, and no form or map is introduced. The global footer retains club identity, navigation, legal text, and `Versione <NEXT_PUBLIC_APP_VERSION>`, but no longer owns the `contatti` id or displays hardcoded addresses or email.

## Progress

- [x] (2026-10-11 14:31Z) Read the governing repository and frontend instructions, the selected queue item and queue preamble, `PLAN2.md`, `.agents/docs/PLANS.md`, the completed task-01 and task-02 ExecPlans, the design guidance, the current Home/layout/footer/navigation/CMS implementation, the pinned Next.js 16.3.1 `io` and hash-link documentation, and the applicable workflow and canonical-validation skills.
- [x] (2026-10-11 14:31Z) Confirmed branch `main`, `HEAD`, and `origin/main` all point to pushed commit `8f866ff24ef1ff89980aaa7ef9db89a2804d6514`; there is no tracked change and the only unrelated untracked path is `.agents/skills/imagen/scripts/`.
- [x] (2026-10-11 14:31Z) Defined the Home data composition, contact-section interface and semantics, footer subtraction, focused non-visual unit coverage, generated-artifact refresh, canonical validation, and strict task-03 scope in this ExecPlan; no implementation file was edited.
- [x] (2026-10-11 14:39Z) Added the Home-owned contact presentation after `PartnerStrip`; Home concurrently reads the ordered Location DTOs after `await io()`, filters only `showOnHome`, and passes that order unchanged to the always-present section.
- [x] (2026-10-11 14:39Z) Removed the footer's contact anchor and hardcoded contact column while preserving its identity, navigation including `/#contatti`, legal line, and visible application version.
- [x] (2026-10-11 14:40Z) Added the two focused server-render cases, updated `TYPES.md`, and refreshed both OpenAPI artifacts; only `schema.json` changed, with 41 paired generation-time timestamp replacements and no structural change.
- [x] (2026-10-11 14:41Z) Passed focused and canonical frontend validation and the final semantic/scope audit; exact evidence is recorded below.
- [x] (2026-10-11 14:45Z) Independent Reviewer approved task 03 with no findings after verifying the Home composition and anchor ownership, semantic/accessible contact presentation, footer subtraction, retained links/version, draft handling, strict scope, and native-only OpenAPI churn; the focused tests, `fe:check`, all 78 tests, and `fe:build` passed independently.

## Surprises & Discoveries

- Observation: Context7 cannot currently resolve the required Next.js documentation because its monthly quota is exhausted.
  Evidence: `ctx7 library 'Next.js' ...` returned `Monthly quota exceeded`. The repository-pinned documentation under `frontend/node_modules/next/dist/docs/` was used instead. If a new framework question arises, retry only after `ctx7 login` or a project-local `CONTEXT7_API_KEY`; do not alter machine or user environment variables and do not substitute remembered APIs silently.
- Observation: the current Home presentation already calls `await io()` and performs its cached CMS reads inside the `frontend/components/home/page.tsx` server component.
  Evidence: `HomePage` awaits `io()` before creating the current time and awaiting `listCalendarEntries()` and `listNews()`. The installed Next.js 16.3.1 documentation says `await io()` excludes following work from the static shell while still allowing cached/prefetched reads, so adding `listLocations()` to the same composition preserves request-time SSR plus ISR.
- Observation: native hash scrolling and sticky-header clearance are already configured.
  Evidence: every contact navigation target is an ordinary Next.js `Link` with `href="/#contatti"`; the pinned Link documentation says a hash scrolls to the matching id. `frontend/app/globals.css` already sets `scroll-padding-top: 7rem`, and `frontend/app/layout.tsx` sets `data-scroll-behavior="smooth"`. No new scroll script, effect, router hook, or stylesheet rule is needed.
- Observation: keyboard focus and fixed-mobile-navigation clearance already have global owners, but the new section still needs local layout choices that cooperate with them.
  Evidence: `frontend/app/globals.css` defines a visible gold `:focus-visible` outline, the root body has `mobile-shell-clearance`, and the fixed mobile navigation is 4rem high plus safe-area padding. The contact links must not suppress that outline, and the section will use a larger mobile bottom padding before the footer so its last action can scroll clear of the fixed navigation.
- Observation: task 02 already supplies immutable safe-link DTOs and a status-aware, ordered cached Location list, but no component consumes it.
  Evidence: `ContactMethodDto.href` is typed as `tel:` or `mailto:`, `LocationDto` carries `showOnHome`, and `frontend/cms/data.ts` exports `listLocations()` cached under `locations`. The raw query orders by `displayOrder` then `name`, so Home must preserve that order and must not re-sort or rebuild links.
- Observation: the footer currently owns both the only `id="contatti"` and the demonstration contact data.
  Evidence: `frontend/components/layout/site-footer.tsx` contains the id, two fictional physical addresses, and `segreteria@usalbatese.example`; it also contains a separate navigation link to `/#contatti` and the application version. Only the id and contact-detail block are to be removed.
- Observation: Vitest runs in Node and includes `*.test.ts`, not `*.test.tsx`.
  Evidence: `frontend/vitest.config.ts` uses `environment: "node"` and `include: ["**/*.test.ts"]`. A focused semantic-render test can therefore use `react-dom/server` plus `React.createElement` in a `.test.ts` file without adding a DOM library, changing the test configuration, or starting a browser.
- Observation: the required native OpenAPI refresh changed only volatile Strapi generation timestamps.
  Evidence: `frontend/cms/schema.d.ts` remained byte-for-byte unchanged; `frontend/cms/schema.json` had 41 removals and 41 additions, and a zero-context diff audit proved every changed data line was a `publishedAt.default` ISO timestamp.
- Observation: the initial link-audit expression in this plan matched JSX attributes but not the shared navigation route object's property syntax.
  Evidence: the footer and registration use `href="/#contatti"`, while `frontend/components/layout/site-nav.tsx` uses `{ href: "/#contatti", ... }`. The final audit searches for `/#contatti` and proves exactly one occurrence in each of the three owning files.

## Decision Log

- Decision: keep Location acquisition and `showOnHome` filtering in `frontend/components/home/page.tsx`, then pass only visible Locations to a new `frontend/components/home/contact-section.tsx` presentation component.
  Rationale: `HomePage` is already the Home server composition root and can call the established cached read after `await io()`. This gives the visibility policy one clear owner, preserves `PageSwitch`, and keeps the new component free of CMS access and cache concerns.
  Date/Author: 2026-10-11 / Planner
- Decision: append `ContactSection` after `PartnerStrip` as the final child of Home's `<main>` and always render it, even when both contact lists are empty.
  Rationale: the root layout renders `SiteFooter` after the page children, so this placement is exactly after all Home content and before the footer. Avoiding an early return guarantees that `/#contatti` always resolves to the intended section.
  Date/Author: 2026-10-11 / Planner
- Decision: trim optional Home heading and introduction at presentation time, use `Contatti` when the heading is absent or blank, omit a blank introduction, and show the exact short empty-state sentence `I contatti sono in aggiornamento.` when there are no club-wide methods and no visible Locations.
  Rationale: task 02 deliberately carries optional strings without inventing display values. A presentation fallback for the section title is required by the content model, while the empty sentence explains temporary editorial absence without fabricating an address, phone, email, or availability claim.
  Date/Author: 2026-10-11 / Planner
- Decision: render club-wide methods before the Location list in document order at every breakpoint, preserve method and Location source order, and show only Location name, address, and Location-specific contact methods on Home.
  Rationale: document order guarantees the required mobile order and remains sensible on desktop. The CMS query already owns Location ordering, contact arrays retain editorial order, and About images/summaries plus Activity details belong to other pages and later tasks.
  Date/Author: 2026-10-11 / Planner
- Decision: use ordinary `<a>` elements for mapper-created `tel:` and `mailto:` links, `<address>` for each non-blank Location address, and a heading for each non-blank Location name; do not invent draft placeholders for missing fields.
  Rationale: protocol links do not need Next.js routing, and native anchors provide the correct keyboard behavior. Semantic physical addresses improve accessibility, while conditional draft fields honor task 02's incomplete-preview policy without rendering fake names or addresses.
  Date/Author: 2026-10-11 / Planner
- Decision: treat a visible draft Location with blank name, blank address, and no valid contact methods as non-displayable presentation content, without changing Home's `showOnHome` visibility filter.
  Rationale: published Locations cannot reach this state, but task 02 deliberately permits incomplete drafts. Omitting a wholly empty card lets the required update message remain truthful; a draft Location with any name, address, or method still renders the content it actually has.
  Date/Author: 2026-10-11 / Planner
- Decision: apply the existing design tokens and utilities in the new component, including `site-container`, the established surface/border/font/card classes, `min-w-0`, and `[overflow-wrap:anywhere]` on contact values. Use mobile `pb-24` before returning to the normal desktop section rhythm.
  Rationale: this matches the implemented site rather than copying old reference HTML. `overflow-wrap:anywhere` lets a valid 255-character email break without horizontal overflow, and 6rem of local mobile bottom padding works with the existing body/safe-area clearance around the 4rem fixed navigation.
  Date/Author: 2026-10-11 / Planner
- Decision: rely on existing `/#contatti` links, native Next.js/browser hash behavior, root scroll padding, and the global `:focus-visible` rule; do not edit navigation, registration, app layout, or global CSS.
  Rationale: the existing behavior already owns these cross-page concerns. Adding client code or a second scroll/focus policy without failure evidence would duplicate established mechanisms and exceed task scope.
  Date/Author: 2026-10-11 / Planner
- Decision: remove only the footer contact column and `id="contatti"`, rebalance its existing grid, and preserve the footer's `Contatti` navigation link, identity copy, affiliations, copyright, and `Versione {version}` line.
  Rationale: the footer must stop impersonating the contact destination and stop publishing hardcoded details, but the navigation link and diagnostic version are explicit contracts. No other footer redesign is needed.
  Date/Author: 2026-10-11 / Planner
- Decision: add one focused Node unit file that server-renders the component and verifies stable non-visual contracts: persistent anchor/fallback/empty state, club-before-Location source order, semantic address markup, and DTO-provided contact href/text.
  Rationale: these behaviors can regress independently of TypeScript and are observable without a browser. The test does not assert a Tailwind class list, pixel layout, focus-ring appearance, or email wrapping; those remain source/style review concerns, so the test stays below the complexity of a browser or DOM fixture family.
  Date/Author: 2026-10-11 / Planner
- Decision: update only the stale Location/Home presentation statements in `TYPES.md`, run `be:openapi` and `fe:openapi`, and do not run `be:types` or a backend build/start.
  Rationale: `TYPES.md` currently says no page presents Locations, which this task changes. Repository instructions require both OpenAPI refreshes after frontend changes and backend type generation only when backend types change; this task changes no schema or backend type.
  Date/Author: 2026-10-11 / Planner

## Outcomes & Retrospective

Task 03 is implemented, validated, and independently approved with no findings. Home now ends with one CMS-backed contact section that preserves request-time SSR plus ISR, uses mapper-owned contact links, keeps club actions ahead of ordered `showOnHome` Locations, renders semantic addresses, and remains useful when editorial contact content is empty. The footer no longer owns contact content but retains its navigation and application version. The focused tests, full frontend suite, aggregate checks, production build, generator refresh, and strict scope audits all pass, and the Reviewer independently reproduced the applicable frontend gates. Tracker bookkeeping, commit, and push remain coordinator-owned.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0 and `frontend/` is Next.js 16.3.1 with React 19 and Tailwind CSS 4. The active branch must remain `main`. At the planning baseline, `HEAD` and `origin/main` are both `8f866ff24ef1ff89980aaa7ef9db89a2804d6514`, there are no tracked changes, and `.agents/skills/imagen/scripts/` is unrelated untracked content that must not be modified, staged, removed, or swept into any diff.

The Home route is `frontend/app/(content)/page.tsx`. It calls `await io()`, reads the cached Home singleton, and passes the resulting `HomePageDto` to `frontend/components/page-switch.tsx`. `PageSwitch` dispatches the `pageType: "home"` value to `frontend/components/home/page.tsx`; this dispatch architecture must remain unchanged. The Home component itself is also an async server component, calls `await io()`, retrieves calendar/news collections, and renders the existing sections inside one `<main>`. Its final current child is `PartnerStrip`.

The contact data is already available through the established CMS pipeline. A DTO, or data-transfer object, is the validated data shape passed from that pipeline into presentation. `frontend/cms/model.ts` defines `ContactMethodDto` with `kind`, editor label, display value, and mapper-created safe `href`; it defines `LocationDto` with stable `documentId`, name, address, optional page-specific material, contact methods, ordering, and three page visibility switches. `HomePageDto` has optional `contactHeading`, optional `contactIntroduction`, and club-wide `contactMethods`. `frontend/cms/data.ts` exports `listLocations()`, which chooses draft or published status outside its private `"use cache"` helper and caches the ordered list with the `locations` tag. The frontend must consume that function; it must not fetch Strapi directly, duplicate safe-link validation, or add Locations to `HomePageDto`.

`frontend/components/layout/site-footer.tsx` is global site chrome rendered after all page children by `frontend/app/layout.tsx`. It currently has `id="contatti"`, a middle contact column with two hardcoded addresses and a hardcoded email, a route navigation column whose final link is `/#contatti`, and a final line that renders `process.env.NEXT_PUBLIC_APP_VERSION ?? "development"`. After this task, the Home section is the sole `contatti` id. The footer navigation link remains and now points back to that Home section from every route.

`frontend/components/layout/site-nav.tsx` owns one `/#contatti` route entry used by both desktop header navigation and fixed mobile navigation. `frontend/components/activity/registration.tsx` owns the registration call to action to the same URL. These files are already correct and must not change. `frontend/app/globals.css` owns the visible keyboard focus ring, root hash-scroll offset, fixed-navigation safe-area utility, and body bottom clearance; `frontend/app/layout.tsx` applies the clearance and renders the fixed mobile navigation. Those files also remain unchanged.

The term “visible Location” in this plan means a `LocationDto` whose `showOnHome` value is `true`. Home filters on exactly that field and preserves the order received from `listLocations()`. Published Locations have valid non-blank names and addresses because the mapper rejects malformed published values. Draft DTOs can carry empty name or address strings; the component conditionally omits blank elements and never invents replacements. A visible draft Location is displayable when at least one of its name, address, or contact methods is present; a wholly blank one is omitted from presentation and does not suppress the update message.

The frontend's implemented visual conventions are authoritative: generous responsive whitespace, a 75rem `site-container`, Epilogue display headings, Manrope body text, gold interaction accents, graphite text, low-contrast borders, and restrained rounded cards/shadows. `design/DESIGN.md` reinforces these choices, but existing Home components are the concrete model. Do not copy the old `design/reference/*` footer markup, because it predates the CMS-backed section and still places `contatti` on a footer.

## Interfaces and Dependencies

Create `frontend/components/home/contact-section.tsx` as a server-compatible presentation module. Export this interface through the function signature; a separately exported props type is not required:

    export function ContactSection({
      heading,
      introduction,
      contactMethods,
      locations,
    }: {
      heading?: string;
      introduction?: string;
      contactMethods: readonly ContactMethodDto[];
      locations: readonly LocationDto[];
    })

The component must return one `<section id="contatti" aria-labelledby="contatti-heading">` unconditionally. Normalize `heading?.trim()` and `introduction?.trim()` locally. The `h2` with `id="contatti-heading"` displays the normalized heading or `Contatti`; the introduction renders only when non-empty and preserves editorial newlines with `whitespace-pre-line`. Derive displayable Locations without reordering them by retaining each Location that has a non-blank name, non-blank address, or at least one contact method. The empty state is true only when `contactMethods.length === 0` and that displayable list is empty, and its message is `I contatti sono in aggiornamento.`.

When methods exist, render them as a semantic list before the Location list. Each club-wide action is an ordinary anchor whose `href` comes directly from `ContactMethodDto.href`, whose visible content includes both `label` and `value`, and whose classes provide a minimum 44px target, `min-w-0`, and wrapping for long unbroken values. Do not inspect `kind` to reconstruct a URI, add query parameters, add icon dependencies, or use `next/link` for these protocol URLs.

When displayable Locations exist, render a semantic list keyed by `documentId`. Each item owns an article/card. Render a Location heading only when `name.trim()` is non-empty and render `<address>` only when `address.trim()` is non-empty; preserve address newlines, use `not-italic`, and allow wrapping. Render Location-specific `contactMethods` as ordinary safe anchors with the same full label/value behavior and long-value wrapping as club-wide methods. Do not render `aboutSummary`, `aboutImage`, `activityDetails`, `displayOrder`, or any visibility switch. Private render helpers may remain in the same file when they centralize repeated contact-link markup.

Use a section class equivalent to `border-t border-outline-soft/50 bg-surface-lowest pt-14 pb-24 md:py-24`, then established site-container, grid, typography, card, and hover utilities. The DOM order, not CSS `order`, must place club-wide methods before Locations. Do not add global CSS, a theme token, client state, effects, custom scrolling, a form, map, map link, availability/hours claim, or standalone route.

In `frontend/components/home/page.tsx`, add `listLocations` to the existing import from `@cmsjs/cms/data`. Extend the current `Promise.all` so calendar entries, news, and Locations are fetched concurrently after the existing `await io()`. Derive `homeLocations` with `locations.filter((location) => location.showOnHome)` and do not sort it again. Import `ContactSection`, then render it after `PartnerStrip` with `page.contactHeading`, `page.contactIntroduction`, `page.contactMethods`, and `homeLocations`.

In `frontend/components/layout/site-footer.tsx`, remove the footer's `id="contatti"` and delete the entire hardcoded `Sedi e contatti` column, including its `<address>` and email anchor. Rebalance the remaining brand and navigation columns within the existing 12-column grid without changing their content. Preserve the footer navigation's `<Link href="/#contatti">Contatti</Link>` and preserve the `version` constant plus visible `Versione {version}` output.

Create `frontend/components/home/contact-section.test.ts`. Use `createElement` from React and `renderToStaticMarkup` from `react-dom/server` so the file remains compatible with the existing Node test include. One case renders no methods or Locations and proves the static HTML contains the sole section target, fallback `Contatti` heading, and specified update message. A second case uses one club-wide long email and one visible-style Location fixture with an address and phone; prove the club-wide value occurs before the Location name, an `<address>` is present, and the exact DTO-provided `mailto:`/`tel:` hrefs and display values survive rendering. Do not assert Tailwind class strings, pixels, computed focus/overflow behavior, or snapshots.

Update `TYPES.md` only where its present state becomes false. Keep the pipeline and draft/published mapper policy text, but state that Home now reads the Location collection, filters `showOnHome`, and renders Home copy, club-wide methods, and visible Location addresses/methods in the bottom contact section. Continue to say About's embedded facilities and Activity's embedded venues remain authoritative until task 04, and Public Location permission/demo archive content remain pending until task 05.

No dependency is added. Use the existing React/React DOM, Next.js server-component model, Tailwind utilities, Vitest setup, DTOs, and cached reads. Do not edit schemas, generated Strapi declarations, CMS client/mapper/connector/cache/tag logic, Preview/refresh behavior, route discovery, `PageSwitch`, navigation, registration, global styles, package manifests, lockfiles, Mise configuration, or runtime versions.

## Plan of Work

### Milestone 1: Compose CMS contacts into the final Home section

Start by recording branch, upstream, and worktree state and by confirming the task-02 DTO/read contracts are present. Create `frontend/components/home/contact-section.tsx` with the unconditional anchor, editable/fallback copy, empty state, club-first lists, semantic Location cards, safe protocol anchors, long-value wrapping, and mobile bottom clearance described above.

Update `frontend/components/home/page.tsx` to fetch Locations in the existing post-`io()` `Promise.all`, filter `showOnHome` once, and append `ContactSection` after every existing Home child. Do not move CMS reads into the component, route, dispatcher, layout, or client code. Add the focused server-render test and run only that file first.

This milestone is complete when the test proves the stable empty and populated semantic output, the Home component passes only visible Locations in existing CMS order, the section is always last inside `<main>`, and neither `PageSwitch` nor the request-time `await io()` path changed.

### Milestone 2: Retire footer contact ownership and reconcile the documented contract

Edit `frontend/components/layout/site-footer.tsx` to remove its contact id and hardcoded contact column, then rebalance the two remaining columns. Keep the footer navigation target and every version-related line intact. Do not change the shared desktop/mobile route list or Activity registration call to action.

Correct the now-stale Home/Location presentation sentences in `TYPES.md`. Run `mise run be:openapi` followed by `mise run fe:openapi` and inspect both generated outputs. Because no schema changed, an empty diff or native generation-time `publishedAt.default` timestamp churn is acceptable; any structural addition, removal, or field change is a scope error to investigate rather than hand-edit.

This milestone is complete when the Home section is the only `id="contatti"`, known demonstration contact details no longer occur in the footer, all three source `/#contatti` hrefs remain, `NEXT_PUBLIC_APP_VERSION` remains visible, documentation describes only task-03 truth, and both generators pass without a structural API change.

### Milestone 3: Prove the frontend integration and strict scope

Run the aggregate frontend check, complete Vitest suite, and production build. The build must continue to show Home as a partial/request-time route rather than requiring Strapi during build; `await io()` remains in both the Home route and Home presentation component. Review the new component for a single h2-led section hierarchy, address semantics, full link text, `min-w-0`/`overflow-wrap:anywhere`, 44px actions, preserved global focus outline, and mobile bottom padding. This is source-level semantic/style verification, not a browser or visual test.

Finish with explicit searches and diff guards for anchor ownership, required links/version, pipeline consumption, untouched architecture/later-task files, and dependency/tooling scope. Update every living section of this ExecPlan with actual commands and outcomes. Leave `TODOS2.md`, staging, commit, and push to the implement-task coordinator after independent approval.

This milestone is complete when all validation passes, generated changes are understood, the final diff is limited to task-03 files, the protected untracked Imagen scripts remain untouched, and the implementation is ready for Reviewer verification.

## Concrete Steps

Run all commands from `/home/codex/src/us-alb` unless a command explicitly changes directory. Record and protect the baseline:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    git diff --check
    mise tasks

Expect branch `main`, both revisions at `8f866ff24ef1ff89980aaa7ef9db89a2804d6514`, no tracked diff, and only `?? .agents/skills/imagen/scripts/`. Do not switch branches, modify or clean that directory, stage files, commit, push, or edit `TODOS2.md` as the Worker.

After adding the component and Home integration, run the focused non-visual unit file:

    cd /home/codex/src/us-alb/frontend
    npm test -- components/home/contact-section.test.ts

Expect Vitest to pass one file with two tests and no external process. The first case must prove persistent empty-section behavior; the second must prove club-before-Location HTML order, semantic address markup, and unchanged DTO href/value rendering. If the test requires a browser, DOM environment, test-config edit, or new dependency, stop and simplify it to `renderToStaticMarkup`; those additions are outside scope.

Refresh the required generated API artifacts from the repository root:

    cd /home/codex/src/us-alb
    mise run be:openapi
    mise run fe:openapi
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts

Both commands must exit zero. Never hand-edit either generated file. Since the schema is unchanged, review any diff as native generator output and compare structure if timestamps moved. Do not run `be:types`, because backend types do not change; do not run a backend build, startup, or backend test.

Run all applicable canonical frontend validation:

    cd /home/codex/src/us-alb
    mise run fe:check
    cd frontend && npm test
    cd /home/codex/src/us-alb
    mise run fe:build

`fe:check` is the repository's aggregate Biome lint/format, Next route type-generation, and TypeScript check. The complete Vitest suite must have zero failures; record actual file/test counts rather than predicting the final totals. `fe:build` must compile under Next.js 16.3.1 without a build-time CMS dependency and must preserve the existing partial rendering classification. There is no `fe:test` Mise task, so `npm test` is the canonical suite. Do not add or run a browser, browser-E2E, smoke, deployment, backend, or Strapi test.

Finish with contract and scope checks:

    cd /home/codex/src/us-alb
    rg -n 'listLocations|showOnHome|ContactSection|PartnerStrip' frontend/components/home/page.tsx
    rg -n 'id="contatti"|contatti-heading|<address|overflow-wrap:anywhere|I contatti sono in aggiornamento' frontend/components/home/contact-section.tsx
    rg -n 'renderToStaticMarkup|mailto:|tel:|<address|I contatti sono in aggiornamento' frontend/components/home/contact-section.test.ts
    rg -n '/#contatti' frontend/components/layout/site-nav.tsx frontend/components/layout/site-footer.tsx frontend/components/activity/registration.tsx
    rg -n 'NEXT_PUBLIC_APP_VERSION|Versione \{version\}' frontend/components/layout/site-footer.tsx
    test "$(rg -l 'id="contatti"' frontend --glob '*.tsx')" = 'frontend/components/home/contact-section.tsx'
    test -z "$(rg -n 'Centro Sportivo Giallonero|Cortile Sportivo dell.Oratorio|segreteria@usalbatese\.example|<address|mailto:|tel:' frontend/components/layout/site-footer.tsx)"
    git diff --exit-code -- frontend/app frontend/components/page-switch.tsx frontend/components/layout/site-header.tsx frontend/components/layout/site-nav.tsx frontend/components/activity/registration.tsx frontend/app/globals.css frontend/cms/client.ts frontend/cms/mappers.ts frontend/cms/connector.ts frontend/cms/data.ts frontend/cms/tags.ts frontend/cms/webhook.ts frontend/app/refresh/route.ts
    git diff --exit-code -- backend/src backend/types/generated mise.toml backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
    git status --short
    git diff --check

Every positive search must find the intended contract. The anchor command must report exactly `frontend/components/home/contact-section.tsx`; the footer-detail command and both diff guards must be silent and exit zero. `/#contatti` must still appear once in `site-nav.tsx` (shared by desktop and mobile), once in footer navigation, and once in the registration CTA. Final status may contain this ExecPlan, `TYPES.md`, `frontend/components/home/contact-section.tsx`, its `.test.ts`, `frontend/components/home/page.tsx`, `frontend/components/layout/site-footer.tsx`, and the two OpenAPI outputs only if native regeneration changed them. `.agents/skills/imagen/scripts/` remains separate and untracked.

Actual Worker transcript summary:

    npm test -- components/home/contact-section.test.ts
    Test Files  1 passed (1)
    Tests       2 passed (2)

    mise run be:openapi
    exit 0; native schema generation completed

    mise run fe:openapi
    exit 0; schema.json -> schema.d.ts completed
    schema.d.ts unchanged; schema.json 41 insertions, 41 deletions, timestamps only

    mise run fe:check
    Biome checked 101 files with no fixes; Next route types generated; tsc --noEmit passed

    npm test
    Test Files  9 passed (9)
    Tests       78 passed (78)

    mise run fe:build
    compiled, type-checked, and generated all static shells successfully
    Home route marker: ◐ / (Partial Prerender)

The final source audit found one `id="contatti"`, owned by `frontend/components/home/contact-section.tsx`; one retained `/#contatti` source occurrence in each of site navigation, footer navigation, and registration; no footer address, protocol link, demonstration location, or hardcoded email; native `<address>` and `<a>` elements; club-wide markup before Location markup; `min-w-0` plus `[overflow-wrap:anywhere]`; no outline suppression; `min-h-11` actions; and mobile `pb-24` cooperating with the unchanged global focus and shell-clearance rules. Both protected-file diff guards, all generated timestamp-shape assertions, and `git diff --check` passed. Final status contains only the task-owned plan, `TYPES.md`, `schema.json`, the new component and test, the Home composition, the footer subtraction, and the pre-existing unrelated `.agents/skills/imagen/scripts/` untracked directory.

## Validation and Acceptance

Acceptance is the following user-visible and architectural behavior:

1. Home still enters through `frontend/app/(content)/page.tsx` and `PageSwitch`; `await io()` remains before CMS reads. `HomePage` concurrently reads calendar entries, news, and the cached status-aware Location collection, then filters Locations only by `showOnHome` without re-sorting.
2. The final child inside Home's `<main>` is an explicit `<section id="contatti">`, and the global `SiteFooter` follows it through the existing root layout. No conditional return can remove the section.
3. The section uses trimmed `contactHeading` and `contactIntroduction`; absent or blank heading renders `Contatti`, blank introduction is omitted, and editorial newlines are preserved. When both club-wide methods and visible Locations are absent, the anchor, heading, and `I contatti sono in aggiornamento.` remain visible.
4. Club-wide methods appear before all displayable visible Location cards in HTML/document order, which also establishes the mobile visual order. Contact and Location ordering from the CMS is preserved. No hidden/false `showOnHome` Location reaches the component.
5. Every method shows its editor-provided label and full display value and uses the mapper-provided safe `href` in a native anchor. No component rebuilds, parses, or sanitizes the URI. Long unbroken email values have a `min-w-0` containing path and `overflow-wrap:anywhere`, so the section creates no horizontal overflow.
6. Each non-blank Location address is inside an `<address>` and preserves authored line breaks; non-blank Location names participate in the section heading hierarchy. Incomplete draft strings are omitted rather than replaced, and a wholly blank draft Location produces no empty card and does not suppress the update message. Home does not expose About or Activity Location fields.
7. Contact anchors remain native keyboard focus targets of at least 44px where presented as actions, no class removes outlines, and the existing global gold `:focus-visible` rule remains unchanged. The section's mobile bottom padding and the existing body/safe-area clearance keep its last action scrollable above the fixed navigation.
8. The footer contains no `id="contatti"`, `<address>`, `mailto:`, `tel:`, demonstration location name, or hardcoded contact value. It still contains identity/navigation/legal content, its `/#contatti` navigation item, and visible `Versione {process.env.NEXT_PUBLIC_APP_VERSION ?? "development"}` behavior.
9. Desktop header navigation, mobile navigation, footer navigation, and registration behavior still target `/#contatti`: the one shared site-nav entry feeds both header variants, while footer and registration retain their own links. There is no `/contatti` route, form, map, map link, custom hash handler, or new scroll behavior.
10. The focused server-render tests pass without asserting visuals. `mise run be:openapi`, `mise run fe:openapi`, `mise run fe:check`, the complete `npm test`, and `mise run fe:build` all exit zero. Generated OpenAPI differences are native and structurally unchanged.
11. `TYPES.md` reflects Home Location presentation while retaining the task-04 About/Activity compatibility bridge and task-05 Public permission/archive boundary. No README or new standalone documentation is added.
12. There is no content-schema, Public permission, archive, About/Activity migration, route discovery, Preview, webhook, cache-policy, dependency, package, build-tool, runtime, Strapi version, stack, rendering-model, environment, system, Docker, branch, index, commit, or upstream change. The unrelated `.agents/skills/imagen/scripts/` remains untouched and untracked.

## Idempotence and Recovery

All source edits are ordinary frontend TypeScript/TSX and documentation changes and can be retried safely. On resume, inspect `git status` and the affected diffs first. Reuse an existing correct `contact-section.tsx` rather than creating a parallel component, keep only one `id="contatti"`, and do not duplicate `listLocations()` or add a second visibility filter outside Home's composition.

If the focused render test fails, fix the component/test at the semantic server-render boundary. Do not change Vitest's include pattern, introduce jsdom/testing-library, convert the component to a client component, or add a browser test. If keyboard focus or long-email behavior is questioned, inspect the existing global `:focus-visible` rule and the component's containment/wrapping utilities; do not duplicate global focus styling or add JavaScript measurement.

OpenAPI generation is repeatable but may refresh native generation-time `publishedAt.default` timestamps even though the source schema did not change. Always run `be:openapi` before `fe:openapi`, retain only the final native output, and review structural equivalence. If fields or operations change, stop and diagnose the generator/source inputs; do not patch JSON/declarations, change schemas, run `be:types`, or accept unrelated API drift.

If `fe:check`, tests, or build fail, repair only task-owned frontend files, rerun the smallest failing command, then repeat the full canonical sequence. The production build must not be made to contact Strapi by moving/removing `await io()`. Never recover with `git reset --hard`, `git checkout --`, broad deletion, environment-file edits, or removal of `.agents/skills/imagen/scripts/`.

## Artifacts and Notes

The expected implementation diff is limited to this ExecPlan; `TYPES.md`; new `frontend/components/home/contact-section.tsx`; new `frontend/components/home/contact-section.test.ts`; modified `frontend/components/home/page.tsx`; and modified `frontend/components/layout/site-footer.tsx`. `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` may also change only as native outputs of the required refresh. No other source, test, configuration, dependency, or generated file is expected.

During implementation, record concise evidence here: the focused test names/result; actual full-suite totals; exact `fe:check` and build outcomes; the Home build rendering marker; generator results and whether output was empty or timestamp-only; the source audit for semantic address, DOM order, long-value wrapping, focus ownership, and mobile clearance; the three retained `/#contatti` source links; the sole anchor owner; removed footer values; and final diff/scope assertions. Do not paste full generated artifacts, compiled HTML, or large logs.

Independent review result: `APPROVED` with no findings. The Reviewer confirmed `await io()`, `PageSwitch`, cached ordered Location consumption, `showOnHome` filtering, the sole always-present Home anchor, club-before-Location DOM order, mapper-provided links, semantic and incomplete-draft behavior, footer/version/link preservation, and all scope guards. It reran the 2 focused tests, `mise run fe:check`, all 78 tests, and `mise run fe:build`; Home remained partial-prerendered and normalized generated schema content remained unchanged.

Revision note (2026-10-11 / Planner): Created the initial self-contained task-03 ExecPlan from pushed commit `8f866ff`. It fixes the Home data ownership, always-present empty state, mobile ordering, semantic and wrapping behavior, footer subtraction, focused non-visual test boundary, required artifact refresh, and canonical validation while preserving every explicit later-task and architecture boundary. No implementation file was changed.

Revision note (2026-10-11 / Worker): Implemented the approved task-03 presentation slice and recorded exact focused, generator, canonical frontend, production-build, semantic, generated-diff, and worktree-scope evidence. Corrected the link-audit search so it covers both JSX attributes and the shared route-object property without changing the intended contract. Independent review and coordinator-owned bookkeeping remain pending.

Revision note (2026-10-11 / Coordinator): Recorded the independent `APPROVED` / `REVIEW_READY` handoff, reproduced validation evidence, and closure of the review progress item. No implementation scope, technical decision, requirement, or validation claim was changed.

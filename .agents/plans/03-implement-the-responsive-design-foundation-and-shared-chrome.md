# Implement the responsive design foundation and shared chrome

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A fresh Worker must be able to execute the task using only this file and the current working tree.

## Purpose / Big Picture

After this work, every U.S. Albatese route has the same calm, editorial identity at desktop and mobile sizes: self-hosted Epilogue headings, Manrope body copy, the gold/graphite/pale-surface token system, an original abstract club mark and wordmark, a sticky desktop header, a compact mobile header, a fixed mobile navigation bar, a useful contact footer, and visibly rendered application version information. Loading, empty, missing-content, content-error, and whole-application-error states use the same Italian visual language instead of the dark template styling.

A user can move among `/`, `/chi-siamo`, `/attivita`, `/notizie`, one `/notizie/[slug]` page, and `/#contatti` without encountering a placeholder `#` link or a missing internal route. The shared shell can be observed against the approved demonstration archive at exactly 1600×900 and 412×914. This task establishes the reusable visual foundation only; tasks 04–07 still own the high-fidelity sections inside Home, Chi siamo, Attività, Notizie, and news detail.

The Strapi 5 raw-client → mapper → connector → cached-read → cache-tag/webhook pipeline and Next.js request-rendered SSR plus ISR behavior remain unchanged. No content type, backend schema, DTO, CMS query, seed archive, page dispatch, README content, or page-specific high-fidelity composition changes are part of this task.

## Progress

- [x] (2026-10-08 14:12Z) Read root `AGENTS.md`, `frontend/AGENTS.md`, `.agents/docs/PLANS.md`, the `implement-task`, `canonical-validation`, and `playwright-cli` skills plus the relevant session-management, running-code, and element-attribute references, `TODOS.md`, `PLAN.md`, `TYPES.md`, `design/DESIGN.md`, `design/HISTORY.md`, all eight desktop/mobile HTML references, the current task-01 frontend/CMS implementation, and the completed task-02 dataset plan.
- [x] (2026-10-08 14:12Z) Attempted the required Context7 library resolution separately for Next.js, Tailwind CSS, and React; all three returned the monthly-quota error, so inspected the pinned Next.js 16.3.1 documentation and installed Tailwind CSS 4 / React 19.2.8 source instead.
- [x] (2026-10-08 14:12Z) Defined the exact fonts, token ownership, shared components, navigation targets, state behavior, isolated demo-import strategy, manual viewport procedure, validation commands, and later-task boundaries in this ExecPlan without changing implementation files or generating assets.
- [x] (2026-10-08 14:33Z) Worker vendored and wired the three pinned variable-font assets plus both OFL texts, replaced the template tokens, and implemented the original mark plus responsive shared shell.
- [x] (2026-10-08 14:33Z) Worker localized and aligned the loading, empty, error, global-error, and not-found presentation without implementing task 04–07 page sections; the first focused `fe:check` passed after formatting.
- [x] (2026-10-08 14:52Z) Worker refreshed the required API artifacts without structural contract drift, passed canonical frontend validation, imported the approved demo archive into an isolated disposable database, completed the named Playwright inspection at both required viewports, and restored and removed all task-owned runtime state.
- [x] (2026-10-08 15:24Z) Independent Reviewer approved scope, implementation, canonical evidence, both exact viewport audits, generated-artifact equivalence, navigation/accessibility behavior, and byte-exact archive/upload/database cleanup with no actionable finding.
- [x] (2026-10-08 15:27Z) Coordinator recorded review approval, checked queue item 03, isolated only task-owned source/assets/generated artifacts/plan/tracker files for one local commit, and intentionally skipped pushing under the explicit user override.
- [x] (2026-10-08 15:34Z) Worker remediation cycle 1 removed the single trailing space from line 21 of each OFL text, preserved LF endings and license semantics, and passed focused integrity plus working-tree and staged-equivalent whitespace checks without changing the real index.
- [x] (2026-10-08 16:16Z) Independent Reviewer approved remediation cycle 1 after verifying both normalized OFL texts, line endings, reconstructed pinned-source hashes, preserved Coordinator bookkeeping, and passing repository-native plus staged-equivalent whitespace checks.
- [x] (2026-10-08 16:18Z) Coordinator finalized the approved task-03 index after remediation and retained the local-commit/no-push boundary.

## Surprises & Discoveries

- Observation: the branch is `main`, is two commits ahead of `origin/main`, and the two local workflow commits are exactly `2bcd098` for task 01 and `4b1b731` for task 02; neither was pushed under the explicit user override.
  Evidence: `git status --short --branch` reports `main...origin/main [ahead 2]`, and `git rev-list --left-right --count '@{upstream}...HEAD'` reports `0 2`.
- Observation: the only unrelated worktree item is the pre-existing untracked `.agents/skills/imagen/scripts/` directory.
  Evidence: `git status --short` reports only `?? .agents/skills/imagen/scripts/`. This task does not use it and must not modify, stage, chmod, relocate, or commit it.
- Observation: every required Context7 lookup is quota-blocked before a library id can be returned.
  Evidence: each `ctx7 library` invocation for Next.js, Tailwind CSS, and React returned `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` A future contributor can run `ctx7 login` or set `CONTEXT7_API_KEY`; this plan instead uses the installed official documentation/source and does not silently fall back to remembered APIs.
- Observation: the pinned frontend is Next.js 16.3.1 with `cacheComponents: true`, Tailwind CSS 4, and React 19.2.8. The installed Next.js docs require `usePathname` to remain in a Client Component and note that an unknown dynamic segment can suspend under Cache Components.
  Evidence: `frontend/package.json`, `frontend/next.config.ts`, and `frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md`. The existing `SiteNav` is already isolated behind `Suspense`; preserve that narrow boundary.
- Observation: installed Next.js documentation supports repository-local variable fonts through `next/font/local`, CSS variables, and root-layout preloading. No font file currently exists in the repository.
  Evidence: `frontend/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`, the local-font and Tailwind sections of `frontend/node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`, and the empty repository font search.
- Observation: the current frontend shell and states still use a dark purple template palette and Geist fallbacks, while the page renderers already consume the approved DTOs and must remain structurally available to later tasks.
  Evidence: `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/components/layout/`, `frontend/components/shared/`, and the five concrete page components.
- Observation: the four reference pairs disagree in incidental content and some radii, but repeat the same shared structure: light editorial surfaces, Epilogue/Manrope, gold accents, a 1200px-class centered desktop canvas, a sticky/fixed compact header, five top-level destinations, a fixed mobile bottom bar, and an institutional contact footer. `design/DESIGN.md` is authoritative when those incidental values differ.
  Evidence: all eight files under `design/reference/` and `design/DESIGN.md`.
- Observation: current-looking people, registration numbers, addresses, telephone numbers, and email addresses in `design/HISTORY.md` and the reference HTML are not safe demonstration facts. Task 02 deliberately replaced them with fictional content.
  Evidence: `PLAN.md` and `.agents/plans/02-generate-placeholder-media-and-build-the-importable-demonstration-dataset.md`. Shared chrome uses only the permitted 1968/Albate/Como/yellow-black/CSI/FIDAL identity facts, task-02 fictional facilities, and a reserved `.example` email address.
- Observation: `backend/.tmp/data.db` exists, but `backend/public/uploads` contains only `.gitkeep`, so the ordinary local state cannot be trusted to render the approved media-rich demo.
  Evidence: the database is present while the upload listing contains only `.gitkeep`. Manual inspection therefore imports the committed archive into a unique task-owned database while safely isolating and restoring the upload directory.
- Observation: the approved archive is tracked at `backend/seed-data/us-albatese-demo.tar.gz`, is 636,008 bytes, and has SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.
  Evidence: local file inspection and task-02 review. This task must leave that byte identity unchanged.
- Observation: required OpenAPI regeneration creates new generation-time `publishedAt` defaults even when the API shape is unchanged.
  Evidence: `frontend/cms/schema.json` contains the task-01 generation timestamp in many defaults, and task 02 recorded this native generator behavior. Regeneration is still required after a frontend change; review the resulting diff and reject any structural API change.
- Observation: the pinned font downloads resolve to 585,781 bytes total and are recognized locally as variable TrueType fonts.
  Evidence: Epilogue normal is 202,996 bytes with SHA-256 `012f651b45f47c10c7714cb7e3f2f7d9ccb7f235a2cc72c6b273ddc735705c67`; Epilogue italic is 209,304 bytes with `7e5263bfe5b8ea9d46201fc3e3d59c354628de2220c3f3fe831fad946a1f7db2`; Manrope is 164,700 bytes with `3ae11c49db0455a3cc33e37d380f20fdb8c7f8b41dc07625c177e3d87a9d6ae6`. After the required whitespace-only remediation, the Epilogue and Manrope OFL texts hash to `8b87b6d048f4ec91f8c31d1a84ec10c08918bf26d2af7be22aee791874dbca11` and `d6a309fcfb963d329a93baf9df66fa5f3c23a4be2b5f67edf24d6cafecde12ac`; adding the removed line-21 space recreates the pinned-download hashes `95ebd6a2e4035b8398c83928fb85297b48441f27f405398c29b59aae899fc747` and `58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b` exactly.
- Observation: the ordinary frontend API token cannot authenticate against the imported disposable database, while an explicitly empty `CMS_API_TOKEN` is rejected by the existing required configuration boundary.
  Evidence: the first two isolated frontend starts respectively reported the required-variable error and HTTP 401. Strapi bootstrap created an encrypted disposable `Read Only` content API token; the Worker decrypted that token process-locally from the project-local encryption key and disposable database, passed it only to the frontend child process, and never printed or wrote either value. The successful frontend run used `CMS_URL=http://127.0.0.1:65130/api` because the client base URL contract includes the trailing `/api`.
- Observation: under Next.js 16.3.1, `app/(content)/not-found.tsx` handles explicit `notFound()` calls inside that route group but does not replace the framework default for an unmatched top-level URL.
  Evidence: `/percorso-inesistente` initially returned Next's English default 404. Adding the root `app/not-found.tsx` entry that re-exports the approved route-group presentation made the same URL return HTTP 404 with `Pagina non trovata` and both Italian recovery links.
- Observation: the Next development tools portal overlaps the leftmost fixed mobile-nav target at 412px; it is not present in the production build.
  Evidence: Playwright reported that `<nextjs-portal>` intercepted the Home target. The portal was removed only from the named inspection page before exercising mobile links; no application CSS, layout, or browser configuration was changed for this development-only overlay.
- Observation: isolated runtime cleanup restored all pre-task state exactly.
  Evidence: the restored upload filename and SHA-256 manifests match the originals, `backend/.tmp/data.db` retained inode/size/mtime `4276133 1355776 1791470052` and SHA-256 `b51d1b264e8ad9e2a4ed0cb9e8e9d2fc05c2895592851e21b8acc163cea0cb49`, no generated import log or 65130/65131 listener remained, the named browser session was closed, and the approved archive retained SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.

## Decision Log

- Decision: vendor the official variable TrueType files for Epilogue normal, Epilogue italic, and Manrope normal, together with their OFL license texts, then load them once through `next/font/local` in `frontend/app/fonts.ts`.
  Rationale: the design requires Epilogue and Manrope, and repository-local files make canonical builds independent of Google Fonts network availability. Variable fonts cover the required weight range with three files, while `display: "swap"` and CSS variables integrate directly with Tailwind 4. Use the pinned Google Fonts repository commit `5e8a3ba899557829a76cfdac30fa512bda91d7ca`, not a moving URL.
  Date/Author: 2026-10-08 / Planner
- Decision: make `frontend/app/globals.css` the sole owner of global design tokens, compatibility aliases, base typography, focus treatment, safe-area helpers, and the reusable 1200px content-container utility.
  Rationale: later page tasks need one authoritative visual vocabulary. Keeping the existing `canvas`, `surface`, `surface-raised`, `border`, `muted`, `text`, `accent`, and `rounded-card` aliases prevents the minimal task-01 renderers from breaking before tasks 04–07 replace their page-specific presentation.
  Date/Author: 2026-10-08 / Planner
- Decision: implement an original geometric shield in `frontend/components/layout/club-brand.tsx` as inline SVG beside an HTML wordmark, and reuse it in header, footer, and global error UI.
  Rationale: inline repository-native vector code is deterministic, responsive, accessible when paired with visible text, and needs no bitmap or dependency. A concise source comment must state that it is an editorial mark, not a documented historical crest. Do not call `imagegen`, `imagen`, fetch a club logo, or imply that the mark is official or historic.
  Date/Author: 2026-10-08 / Planner
- Decision: keep the root layout, header, footer, brand, status presentation, and page content as Server Components; keep only `site-nav.tsx` and the two required Next error boundaries as Client Components.
  Rationale: pathname-aware active state genuinely requires `usePathname`, while the retry buttons genuinely require client event handlers. No other shared interaction needs hydration.
  Date/Author: 2026-10-08 / Planner
- Decision: on mobile, use a compact branded sticky header and the reference-consistent fixed five-item bottom navigation; omit the reference mockups’ redundant inert hamburger.
  Rationale: all five destinations fit the bottom bar, so an additional drawer would duplicate navigation and introduce avoidable state, focus management, and dismissal behavior. The mobile bar supplies visible labels plus decorative inline SVG icons, 56px minimum targets, safe-area padding, and `aria-current`.
  Date/Author: 2026-10-08 / Planner
- Decision: the only shared navigation destinations are `/`, `/chi-siamo`, `/attivita`, `/notizie`, `/#contatti`, and the footer document shortcut `/notizie#documenti`.
  Rationale: every target exists in the approved route surface. Add the stable `documenti` id to the current documents section, but do not create privacy, legal, contact, teams, gallery, or other routes. Do not retain any `href="#"` placeholder.
  Date/Author: 2026-10-08 / Planner
- Decision: centralize the common state panel, loading skeleton, and empty presentation, then use the empty component for all three current Notizie collection-empty cases.
  Rationale: localized error/empty/loading behavior is explicitly owned by this task. Updating only the empty branches and the stable `documenti` anchor in `frontend/components/notizie/list-page.tsx` does not preempt task 07’s high-fidelity page layout.
  Date/Author: 2026-10-08 / Planner
- Decision: do not add an automated UI, browser, snapshot, accessibility, or component test.
  Rationale: this task is visual and framework wiring. The existing Vitest environment is Node-only, and introducing DOM infrastructure would exceed the behavior being verified. Native build/type checks plus required manual Playwright inspection prove the material risks; the existing 44 non-visual tests still run.
  Date/Author: 2026-10-08 / Planner
- Decision: import the task-02 archive only into a disposable task-03 database and isolated upload directory for manual inspection, then restore the pre-task upload tree exactly.
  Rationale: meaningful rendering needs the approved content and media, but ordinary developer data and uploads are out of scope and must never be overwritten. This rehearsal supports inspection and does not alter the tracked archive or become task 08’s final release import rehearsal.
  Date/Author: 2026-10-08 / Planner
- Decision: Planner, Worker, and Reviewer do not edit `TODOS.md`, commit, push, or change branches. After approval, Coordinator creates the one local commit `03 — Implement the responsive design foundation and shared chrome` and performs no push.
  Rationale: this is the explicit role ownership and no-push override for this queue. It supersedes the normal implement-task push gate without broadening implementation scope.
  Date/Author: 2026-10-08 / Planner
- Decision: add `frontend/app/not-found.tsx` as a one-line re-export of the approved `(content)` not-found presentation.
  Rationale: this is the smallest framework-native fix that makes a genuinely unmatched URL satisfy the plan's Italian 404 acceptance criterion without duplicating presentation or changing routing architecture.
  Date/Author: 2026-10-08 / Worker
- Decision: authenticate the archive-backed manual run with Strapi's disposable bootstrap-created read-only token, recovered only in process memory.
  Rationale: tokens belong to their database. Reusing the ordinary token produced a correct 401, while leaving the value empty violates the existing frontend configuration contract. The disposable read-only token proves the real CMS boundary without changing source, env files, ordinary data, or secret handling.
  Date/Author: 2026-10-08 / Worker

## Outcomes & Retrospective

Worker implementation and validation are complete. The frontend now uses pinned repository-local Epilogue and Manrope variable fonts, the gold/graphite/pale token foundation, a deterministic original editorial crest and wordmark, sticky desktop and compact mobile headers, prefix-aware active navigation, a fixed five-target mobile bar, a safe fictional institutional footer, visible `Versione development`, and consistent Italian loading/empty/error/not-found presentation. The root unmatched-route entry reuses the approved not-found UI; page-specific task 04–07 renderers remain otherwise untouched.

`be:openapi` and `fe:openapi` passed. After normalizing generation-time ISO defaults, `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` matched `HEAD` structurally; their durable diff is timestamp-only. Final `fe:check` checked 63 files and passed Biome, generated route types, and TypeScript. Vitest passed 5 files / 44 tests. `fe:build` passed with `/`, `/attivita`, `/chi-siamo`, `/notizie`, and `/notizie/[slug]` remaining Partial Prerender routes; no build-time CMS dependency or font download was introduced.

The named Playwright CLI session inspected archive-backed `/`, `/chi-siamo`, `/attivita`, `/notizie`, `/notizie/la-stagione-2026-27-prende-forma`, and `/percorso-inesistente` at exactly 1600×900 and 412×914. Desktop computed a sticky header, hidden mobile bar, 1200px shell rhythm, Manrope body, Epilogue heading, working active states, anchors, version, and no horizontal overflow. Mobile computed a 64px compact header, fixed visible mobile bar, five 81×64px untruncated targets, stacked 372px footer column, unobscured version line, correct active detail state, working anchors, and no horizontal overflow. Keyboard order began with skip link → brand → primary routes, every inspected focus ring was a 3px solid outline, and the skip link focused `#contenuto`. A fresh application navigation had no console warning or application error; the browser still requests the absent non-application `/favicon.ico`.

The disposable import reported 55 entities, 43 assets, and 112 links. Shutdown and cleanup closed `task-03-shared-chrome`, stopped both loopback listeners, restored uploads byte-for-byte, proved the ordinary database unchanged, removed the generated import log, and removed the unique task workspace after recording this evidence. The archive identity remains unchanged. Independent review reproduced the canonical, responsive, navigation, font, generated-contract, and cleanup evidence and approved the task without findings. The Coordinator recorded the queue item and prepared one isolated local commit; no push is performed. Remediation cycle 1 subsequently normalized one trailing space in each OFL text, with focused hash, line-ending, semantic-content, working-tree whitespace, and staged-equivalent whitespace checks passing; production code and generated artifacts were unchanged, so frontend canonical checks were not repeated.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0 and `frontend/` is Next.js 16.3.1 using React 19.2.8, Tailwind CSS 4, Cache Components, typed routes, and request-rendered CMS routes. `frontend/app/layout.tsx` composes the site header, routed content, and footer. `frontend/app/(content)/layout.tsx` adds Draft Mode’s preview banner. Every CMS-backed page calls `await io()` before a cached read so the backend is consulted at request time rather than at frontend build time.

The CMS pipeline is already complete and out of scope: `frontend/cms/client.ts` serializes Strapi queries, `mappers.ts` validates raw data into the DTOs in `model.ts`, `connector.ts` connects those layers, and `data.ts` owns `"use cache"`, `cacheLife`, and `cacheTag`. `frontend/components/page-switch.tsx` dispatches Home, About, Activity, and news-detail DTOs. `/notizie` intentionally renders `frontend/components/notizie/list-page.tsx` directly. Do not move, replace, or bypass any part of that architecture.

The current shell lives in `frontend/components/layout/site-header.tsx`, `site-nav.tsx`, and `site-footer.tsx`. Global colors are currently dark template tokens in `frontend/app/globals.css`. State UI is in `frontend/components/shared/loading-skeleton.tsx`, `empty-state.tsx`, `frontend/app/(content)/error.tsx`, `frontend/app/(content)/not-found.tsx`, and `frontend/app/global-error.tsx`. Next.js requires both error files to be Client Components; `global-error.tsx` replaces the root layout and therefore must import global CSS and apply its own font variables, `<html>`, and `<body>`.

“Shared chrome” means the header, global navigation, mobile bottom bar, footer, brand mark, skip link, global background/typography, and route-level state presentation that surrounds page-specific content. “SSR + ISR” means requests render on the server while cached CMS reads are reused and invalidated by webhooks. Styling and small navigation clients do not change that model.

## Plan of Work

### Milestone 1: Install the build-stable typography and token foundation

Create `frontend/app/fonts/` and acquire the following files from the pinned official Google Fonts commit. Asset acquisition may use `curl --fail --location --output`; do not use shell heredocs, a font package, a CDN reference, or an unpinned moving branch.

    frontend/app/fonts/epilogue-variable.ttf
      https://raw.githubusercontent.com/google/fonts/5e8a3ba899557829a76cfdac30fa512bda91d7ca/ofl/epilogue/Epilogue%5Bwght%5D.ttf
    frontend/app/fonts/epilogue-italic-variable.ttf
      https://raw.githubusercontent.com/google/fonts/5e8a3ba899557829a76cfdac30fa512bda91d7ca/ofl/epilogue/Epilogue-Italic%5Bwght%5D.ttf
    frontend/app/fonts/manrope-variable.ttf
      https://raw.githubusercontent.com/google/fonts/5e8a3ba899557829a76cfdac30fa512bda91d7ca/ofl/manrope/Manrope%5Bwght%5D.ttf
    frontend/app/fonts/OFL-Epilogue.txt
      https://raw.githubusercontent.com/google/fonts/5e8a3ba899557829a76cfdac30fa512bda91d7ca/ofl/epilogue/OFL.txt
    frontend/app/fonts/OFL-Manrope.txt
      https://raw.githubusercontent.com/google/fonts/5e8a3ba899557829a76cfdac30fa512bda91d7ca/ofl/manrope/OFL.txt

Validate that each request returns successfully, `file` recognizes three TrueType variable fonts, neither license is empty, and record SHA-256 values in this plan. These are source assets, not generated imagery. Add no package or lockfile change.

Create `frontend/app/fonts.ts`. Define and export `epilogue` with normal weight `100 900` and italic weight `100 900`, and `manrope` with normal weight `200 800`. Use `next/font/local`, `display: "swap"`, the CSS variables `--font-epilogue` and `--font-manrope`, and sensible sans-serif fallbacks. The root layout will import these objects once so Next preloads them for all routes.

Replace the dark theme in `frontend/app/globals.css` with Tailwind 4 theme variables based on `design/DESIGN.md`. The authoritative colors are surface `#f7f9ff`, lowest surface `#ffffff`, low surface `#f1f4fa`, container `#ebeef4`, high surface `#e5e8ee`, highest surface `#dfe3e8`, ink `#181c20`, muted ink `#5d5e64`, variant ink `#4f4634`, deep gold `#785a00`, display gold `#d4a000`, pale gold `#f4e8b8`, outline `#817661`, soft outline `#d3c5ad`, inverse `#2d3135`, inverse text `#eef1f7`, and error `#ba1a1a` with pale error `#ffdad6`. Expose intention-revealing Tailwind names and preserve the current token names as compatibility aliases.

Use `--font-display`, `--font-body`, and `--font-sans` aliases for Epilogue/Manrope. Define the design’s restrained 0.25rem–0.75rem radii, atmospheric card shadows, 1200px container, editorial tracking, and display/headline/body/label sizes where repeated use warrants a token. Base rules set Manrope on `body`, Epilogue on headings and `.font-display`, tabular numerals through the ordinary Tailwind `tabular-nums` utility, a light canvas, smooth anchor offset for the sticky header, selection color, reduced-motion-safe animation, and a high-contrast gold/deep-ink `:focus-visible` ring. Add a reusable `.site-container` utility with 1.25rem mobile padding, 2rem tablet padding, and 3rem desktop padding, plus safe-area padding helpers for the mobile bar. Do not create a separate theme package or config file.

Update `frontend/app/layout.tsx` to apply both font variables to `<html>`, keep `lang="it"`, add a keyboard-visible “Vai al contenuto” skip link, and give the content wrapper a stable focus target. Keep `SiteHeader`, routed children, and `SiteFooter` in the same order, then render the fixed mobile navigation after the footer. Add bottom space on mobile so the fixed bar never covers footer content; remove it from the desktop breakpoint. Do not add any data read to the layout.

Milestone acceptance: a frontend build can resolve every font without network access after the files are present, body/headings compute to the intended families, current minimal page components still compile against compatibility tokens, and the root shell remains a Server Component.

### Milestone 2: Build the deterministic brand and responsive shared chrome

Create `frontend/components/layout/club-brand.tsx` as a pure presentational component. Its inline SVG uses a simple shield outline, two abstract graphite/gold fields, and one neutral geometric accent; it does not copy a public emblem, religious device, neighboring-club logo, or reference image. Mark the SVG decorative because adjacent visible HTML supplies `U.S. Albatese` and `Como • Dal 1968`; the home link itself has an explicit accessible name. Support only the compact/header and full/footer arrangements actually needed. Add the concise non-obvious source comment that this is an original editorial mark and must not be presented as a documented historical crest.

Rework `frontend/components/layout/site-header.tsx` into a 4rem mobile and 6rem desktop sticky header with a translucent lowest-surface background, subtle border, backdrop blur, 1200px alignment, and the new brand. At `md` and above, show the primary desktop navigation and a restrained `CSI • FIDAL` affiliation line. Below `md`, show only the compact brand; the mobile navigation lives in the fixed bottom bar. Keep `Suspense` around pathname-aware navigation because `/notizie/[slug]` is a dynamic segment under Cache Components.

Rework `frontend/components/layout/site-nav.tsx` while preserving its `"use client"` boundary. Keep the route data in one frozen list. Export desktop and mobile variants plus matching server-renderable fallbacks. Active state is exact for `/`, prefix-aware for the three section routes so a news detail activates Notizie, and always inactive for the hash-only contact destination. Desktop links are uppercase editorial labels with a gold active underline and visible hover/focus states. Mobile links are five equal-width targets with small decorative inline SVG icons, visible text labels, a gold current indicator, `aria-current="page"`, `aria-label="Navigazione mobile"`, and safe-area padding. The bar is fixed only below `md`, spans the viewport bottom, and must not introduce horizontal overflow.

Rework `frontend/components/layout/site-footer.tsx` as an institutional contact block using the new brand, a short community description, fictional safe contact details, route links, and the application version. Use the task-02 facility names/addresses `Centro Sportivo Giallonero — Via della Comunità 68, Albate (CO)` and `Cortile Sportivo dell’Oratorio — Piazza del Gioco 7, Albate (CO)`, plus the reserved safe address `segreteria@usalbatese.example`. Do not use real-looking telephone, tax, registration, board, or personal data from the references/history. Include links only to the approved routes, `/#contatti`, and `/notizie#documenti`; omit privacy/legal/cookie links because those routes do not exist. Render `process.env.NEXT_PUBLIC_APP_VERSION ?? "development"` visibly as `Versione <value>` in the footer’s final line.

Update `frontend/components/shared/preview-banner.tsx` to use the same container, typography, surface, focus, and gold treatment while retaining its server-side `draftMode()` read and POST exit behavior.

Milestone acceptance: keyboard traversal reaches the skip link, brand home link, every desktop link, and footer links in logical order; mobile targets are not occluded and have usable touch size; every internal href names a real route or real anchor; no blank placeholder link remains in shared chrome; only the navigation module adds client JavaScript.

### Milestone 3: Align localized global states without taking page ownership

Create `frontend/components/shared/status-panel.tsx` for the shared eyebrow, title, explanatory copy, and action-slot styling used by missing and error states. It is a pure component and must not become a new design system.

Restyle `frontend/components/shared/loading-skeleton.tsx` as a light editorial shell with an Italian live-region label, one heading rhythm, content rules, and a surface card. Preserve `aria-busy`, `aria-live="polite"`, and `motion-reduce:animate-none`; do not model a page-specific hero or card grid owned by tasks 04–07.

Generalize `frontend/components/shared/empty-state.tsx` to accept a clear Italian title/body or equivalent concise props. Use it in the three empty branches of `frontend/components/notizie/list-page.tsx` for news, calendar, and documents, and add `id="documenti"` to the documents section so the seeded `/notizie#documenti` call to action and footer link resolve. Do not otherwise change the Notizie composition, cards, sorting, formatting, or interactions.

Replace the remaining English content in `frontend/app/(content)/error.tsx` with Italian copy, the shared state styling, and a target-consistent retry button. Keep it a Client Component and use the required `retry()` prop; never expose the error message or cause. Restyle `frontend/app/(content)/not-found.tsx` with Italian copy and links back to Home and Notizie. Keep it a Server Component.

Restyle `frontend/app/global-error.tsx` as a complete Italian document because it replaces the root layout. Continue importing global CSS, import and apply both local font variables, include `<html lang="it">`, `<body>`, a compact non-interactive brand treatment, the status panel, a retry button, and the visible application version. Keep the React `<title>` because Client Components cannot export metadata. Do not attempt to render the pathname-aware site navigation inside this boundary.

Do not change `frontend/components/home/page.tsx`, `about/page.tsx`, `activity/page.tsx`, `news-detail/page.tsx`, or the substantive Notizie sections. Their final high-fidelity layouts belong to tasks 04–07; in this task they receive the global fonts, token palette, header, footer, and states automatically.

Milestone acceptance: loading announces itself without motion for reduced-motion users, all empty/error/not-found prose is Italian, retry is keyboard operable, global error is independently styled and versioned, a missing route offers working recovery links, and no status UI leaks a CMS exception or secret.

### Milestone 4: Refresh artifacts and run canonical validation

From `/home/codex/src/us-alb`, list the current tasks and run the required artifact refresh before final validation:

    mise tasks
    mise run be:openapi
    mise run fe:openapi

No backend type changed, so do not run `be:types`. Inspect `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`: generation-time date defaults may refresh, but endpoint paths, operations, schemas, and TypeScript shapes must not change. Any structural CMS contract change is a blocker to this task rather than something to accept.

Run the canonical frontend checks:

    mise run fe:check
    cd /home/codex/src/us-alb/frontend && npm test
    cd /home/codex/src/us-alb && mise run fe:build

Expect Biome and TypeScript to exit zero, all existing Vitest files/tests to pass, and Next’s production build to finish without fetching fonts or contacting Strapi. The CMS-backed routes must remain request-rendered because their pages still call `await io()`. Record the actual test count and relevant build route output. Do not add or run backend tests, browser tests, E2E tests, smoke tests, or deployment tests.

Run focused structural checks after build:

    git diff --check
    git diff --exit-code -- README.md TODOS.md PLAN.md TYPES.md mise.toml backend/package.json backend/package-lock.json backend/src backend/types/generated backend/seed-data/us-albatese-demo.tar.gz frontend/package.json frontend/package-lock.json frontend/cms/client.ts frontend/cms/connector.ts frontend/cms/data.ts frontend/cms/mappers.ts frontend/cms/model.ts frontend/cms/tags.ts frontend/cms/webhook.ts
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git status --short -- .agents/skills/imagen/scripts/

The first command prints nothing. The protected implementation/contracts show no diff. The archive hash remains `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. The unrelated image-tool directory remains only the same untracked worktree item. Package manifests and lockfiles remain unchanged.

Milestone acceptance: required generators and every applicable canonical frontend command pass, the API shape is unchanged, the archive is byte-identical, and all changes are confined to task-owned frontend foundation/shared-state files, regenerated API artifacts, and this ExecPlan.

### Milestone 5: Inspect meaningful rendering at both exact viewports and clean up

Use the committed demonstration archive, never the ordinary database, for the manual check. Confirm `backend/.env` and `frontend/.env.development` exist and are ignored without printing them. Create a unique directory with `mktemp -d -p backend/.tmp task-03-preview-XXXXXX`, derive the relative SQLite path `.tmp/<basename>/data.db`, and prove that file does not exist.

Before import, resolve both the task directory and `backend/public/uploads` with `realpath`. Refuse to continue if uploads is missing, is a symlink, or resolves outside `backend/public`. Record the current upload filename list and hashes, move the whole uploads directory into the task workspace as `uploads-original`, and immediately create a new empty `backend/public/uploads`. Establish cleanup that always stops both servers, closes the named browser session, moves imported uploads into the task workspace, and restores `uploads-original` exactly. Never delete or overwrite ordinary uploads.

From `backend`, import and start only on loopback:

    mise exec -- env DATABASE_FILENAME=".tmp/<basename>/data.db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file seed-data/us-albatese-demo.tar.gz --force --only content,files
    mise exec -- env HOST=127.0.0.1 PORT=65130 DATABASE_FILENAME=".tmp/<basename>/data.db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start

Redirect server logs into the task workspace and poll `http://127.0.0.1:65130/_health` or a known public API in short intervals for at most 60 seconds. Record any `backend/import_<timestamp>.log` files that did not exist before the command, positively identify them by the task import time, and move only those task-owned logs into the task workspace for later cleanup.

Start the frontend from `frontend` on the second loopback port with process-local URL overrides while retaining the ignored project env values:

    mise exec -- env CMS_URL=http://127.0.0.1:65130/api CMS_MEDIA_URL=http://127.0.0.1:65130 CMS_API_TOKEN= SITE_URL=http://127.0.0.1:65131 npm run dev -- --hostname 127.0.0.1 --port 65131

Poll `http://127.0.0.1:65131/` for at most 60 seconds. Do not alter machine/user environment variables, bind `0.0.0.0`, use Docker, or expose a port outside 65100–65199.

Manual browser inspection must use exactly the fixed named session `task-03-shared-chrome` and the installed default headless Chromium configuration; do not pass another browser, device profile, executable, or config. Open and close it explicitly:

    playwright-cli -s=task-03-shared-chrome open http://127.0.0.1:65131/
    playwright-cli -s=task-03-shared-chrome resize 1600 900
    ...inspection commands...
    playwright-cli -s=task-03-shared-chrome resize 412 914
    ...inspection commands...
    playwright-cli -s=task-03-shared-chrome close

At 1600×900, inspect `/`, `/chi-siamo`, `/attivita`, `/notizie`, `/notizie/la-stagione-2026-27-prende-forma`, and an unmatched path such as `/percorso-inesistente`. Confirm the 1200px centered rhythm, sticky desktop header, visible brand/affiliation, active underline including the news detail prefix case, readable Epilogue/Manrope typography, focus treatment, Italian 404 recovery, contact footer, and the literal `Versione <value>`. Click each desktop navigation target individually, including Contatti and the footer document link, and confirm the resulting URL/anchor. Confirm the mobile bar is hidden, there is no horizontal overflow, and the browser console has no application error.

At 412×914, repeat the same representative routes. Confirm the compact header, fixed five-item bottom navigation, safe-area/bottom content clearance, visible current item, untruncated labels, usable touch targets, stacked contact footer, version visibility, state layout, and absence of horizontal overflow. Click each bottom destination individually and confirm it reaches the expected real route or `/#contatti`. Use snapshots and a small number of screenshots stored only inside the task workspace to compare visual composition; this is manual inspection evidence, not a saved Playwright test, generated test script, or committed snapshot suite. Use `eval` only for diagnostics such as `innerWidth`, `innerHeight`, scroll width, computed font family, or fixed/sticky positioning.

Close the named session even if an inspection fails. Stop frontend and backend gracefully. Preserve failure evidence until understood. After success, restore `backend/public/uploads` byte-for-byte, prove the ordinary database was untouched, remove only the positively identified task import log and the resolved unique `task-03-preview-*` workspace after checking its prefix, and verify no listener remains on ports 65130 or 65131. Remove any task-created `.playwright-cli` artifact only after positively identifying it; do not use `close-all`, `kill-all`, or broad deletion when the named session suffices.

If visual remediation changes source after validation, rerun the affected canonical commands and repeat both viewport inspections. Record exact observations and cleanup evidence in `Progress`, `Surprises & Discoveries`, and `Outcomes & Retrospective`, then hand off `WORK_READY` without editing `TODOS.md`, committing, pushing, or switching branches.

## Concrete Steps

All commands run from `/home/codex/src/us-alb` unless a step explicitly changes directory. Begin by recording safe prerequisites:

    git branch --show-current
    git status --short --branch
    git merge-base --is-ancestor 2bcd098 HEAD
    git merge-base --is-ancestor 4b1b731 HEAD
    git rev-list --left-right --count '@{upstream}...HEAD'
    test -f backend/.env
    test -f frontend/.env.development
    git check-ignore backend/.env frontend/.env.development
    mise current
    mise tasks

Expected evidence is branch `main`, both ancestor checks succeeding, upstream count `0 2`, ignored local env files, and Node 24.20.0. Never run `env`, `printenv`, `set`, or display either env file.

Use `apply_patch` for text implementation changes. Font binaries and their exact upstream license files are the only download outputs; acquire them from the pinned URLs in Milestone 1 and validate them before importing from `frontend/app/fonts.ts`. Do not modify a dependency manifest.

Implement and format the exact files named in the milestones. Use Biome through the existing frontend formatter only after the intended edits exist; inspect its diff so it cannot hide unrelated changes. During work, keep `git status --short` and file-scoped diffs visible enough to ensure `.agents/skills/imagen/scripts/` and unrelated files remain untouched.

Run generators, checks, build, and the isolated archive-backed manual inspection in the milestone order. A successful final handoff includes actual font hashes/sizes, generator diff characterization, check/build/test output, the frontend test count, the routes clicked at both dimensions, console/overflow/font/version observations, archive hash, upload restoration proof, closed browser session, stopped listeners, and final Git status.

## Validation and Acceptance

Acceptance is observable and bounded to this task:

1. Epilogue normal/italic and Manrope normal are served from committed local variable-font files through one `next/font/local` definition module. The production build succeeds without downloading font data, headings compute to Epilogue, body/labels compute to Manrope, and the two upstream OFL texts remain beside the fonts.
2. `frontend/app/globals.css` reflects the authoritative gold/graphite/white/pale-surface palette, typography, spacing, radii, shadows, focus, selection, 1200px container, safe-area, reduced-motion, and compatibility token rules. Existing page components remain readable while tasks 04–07 are pending.
3. The crest is original deterministic inline vector/HTML/CSS code, has no bitmap or external request, is not presented as a historical official mark, and was created without `imagegen`, repository `imagen`, stock imagery, or a new dependency.
4. Desktop at 1600×900 shows a sticky header, brand, full navigation, active section state, affiliation line, and institutional footer. Mobile at 412×914 shows the compact header and fixed five-item bottom navigation without overlap or horizontal scrolling.
5. Every shared internal link resolves to `/`, `/chi-siamo`, `/attivita`, `/notizie`, an existing news detail, `/#contatti`, or `/notizie#documenti`. There is no `href="#"`, nonexistent privacy/legal/contact page, separate contact form, or invented route.
6. Navigation is semantic and keyboard accessible: labelled `nav` regions, lists of links, visible focus, correct `aria-current`, decorative icons hidden from assistive technology, a working skip link, and touch targets at least 56px high in the mobile bar.
7. The footer displays safe fictional contact data and the exact visible value of `NEXT_PUBLIC_APP_VERSION`, with `development` only as the existing fallback. It contains no real-looking person, phone, registration, tax, or secret value.
8. Loading, all three empty collection cases, content error, application error, and not-found UI are Italian and visually consistent. Loading retains live/busy semantics and reduced-motion behavior; both retry actions work; error detail is not exposed; 404 offers valid recovery links.
9. No page-specific high-fidelity Home, Chi siamo, Attività, Notizie, or article work is introduced. No content type, backend source/type, DTO, CMS pipeline/cache/preview/webhook behavior, architecture, package, lockfile, archive, README, PLAN, TYPES, or task queue edit occurs.
10. `be:openapi` and `fe:openapi` run as required and show no API-shape change; `fe:check`, the existing Vitest suite, and `fe:build` pass without error. No backend/browser/E2E/smoke/deployment test is added or run.
11. Manual inspection uses only the named Playwright CLI session `task-03-shared-chrome`, the installed fixed Chromium setup, exact viewports 1600×900 and 412×914, and loopback ports 65130/65131. The session is closed, servers are stopped, task artifacts are removed, ordinary uploads are restored, and the archive hash is unchanged.
12. Worker and Reviewer leave `TODOS.md`, branch, Git history, and upstream state unchanged. After `APPROVED` and `REVIEW_READY`, Coordinator alone performs permitted plan/review bookkeeping, checks item 03, stages only task-owned changes, commits locally with title `03 — Implement the responsive design foundation and shared chrome`, verifies the unrelated untracked image-tool directory is excluded, and does not push.

## Idempotence and Recovery

Font acquisition is pinned and repeatable. Download to task-specific temporary names, validate successful content, then move each into its final explicit path; never leave a partial font at the name consumed by `fonts.ts`. If the network is unavailable, retain existing valid files if their source/hash was already recorded, or stop with a precise blocker. Do not substitute `next/font/google`, a CDN stylesheet, a system font pretending to be Epilogue/Manrope, or an unlicensed file.

CSS and TSX edits are ordinary source changes and can be reapplied safely. Keep compatibility aliases until tasks 04–07 replace every old token consumer. If a token rename breaks a current renderer, repair the central alias rather than editing page-specific presentation in this task.

Generator commands are deterministic in shape but not in `publishedAt` default timestamps. Rerun both required generators after any source remediation, format with the existing command, and compare structural schema/type output rather than accepting an unexplained diff. Do not manually edit generated files to disguise a contract change.

Archive import is destructive only to its target, so prove the unique SQLite file is absent and the uploads path has been moved intact before using `--force`. A failed import is never retried against the partial database; create a new `task-03-preview-*` workspace. On every exit, stop Strapi before moving uploads. If ordinary upload restoration cannot be proven byte-for-byte, stop and report `BLOCKED` instead of cleaning the workspace.

Browser inspection is repeatable with the one named session. Reuse it during a single remediation pass, but always close it before handoff. Keep screenshots/logs in the unique task workspace and remove them only after their findings are recorded. Do not delete another session’s output or kill all browser sessions.

## Artifacts and Notes

Expected durable implementation files are:

    frontend/app/fonts.ts
    frontend/app/fonts/epilogue-variable.ttf
    frontend/app/fonts/epilogue-italic-variable.ttf
    frontend/app/fonts/manrope-variable.ttf
    frontend/app/fonts/OFL-Epilogue.txt
    frontend/app/fonts/OFL-Manrope.txt
    frontend/app/globals.css
    frontend/app/layout.tsx
    frontend/app/not-found.tsx
    frontend/app/global-error.tsx
    frontend/app/(content)/error.tsx
    frontend/app/(content)/not-found.tsx
    frontend/components/layout/club-brand.tsx
    frontend/components/layout/site-header.tsx
    frontend/components/layout/site-nav.tsx
    frontend/components/layout/site-footer.tsx
    frontend/components/shared/status-panel.tsx
    frontend/components/shared/loading-skeleton.tsx
    frontend/components/shared/empty-state.tsx
    frontend/components/shared/preview-banner.tsx
    frontend/components/notizie/list-page.tsx

The required generators may rewrite `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`; those are generated API-surface artifacts, not authority to alter a content type or CMS implementation. Keep only generator-produced changes and document whether they are date-default-only.

Temporary evidence belongs only below `backend/.tmp/task-03-preview-XXXXXX/`: disposable SQLite data, imported uploads after shutdown, preserved screenshots, and task logs. The original upload directory is restored before handoff. No standalone design-system document, architecture note, browser test, committed screenshot, source-image directory, content manifest, or README edit is needed.

## Interfaces and Dependencies

Use only the existing Next.js 16.3.1, React 19.2.8, Tailwind CSS 4, TypeScript, and browser platform. Add no npm dependency. Use `next/font/local` for fonts, `next/link` for internal navigation, and `usePathname` only in `frontend/components/layout/site-nav.tsx`. Keep `Suspense` fallbacks because Cache Components and an unknown news slug can suspend pathname resolution.

`frontend/app/fonts.ts` exports two font objects with these stable roles:

    epilogue.variable === a class that defines --font-epilogue
    manrope.variable === a class that defines --font-manrope

`frontend/components/layout/club-brand.tsx` exports the reusable presentational brand. `frontend/components/layout/site-nav.tsx` exports desktop navigation, mobile navigation, and their fallbacks. Its internal route list is the single owner of top-level labels/hrefs, and its active predicate accepts a current pathname plus an href. Do not create a router wrapper or global client provider.

`frontend/components/shared/status-panel.tsx` accepts plain serializable display props and a React action slot so Server Components and the two Client error boundaries can share markup. `EmptyState` accepts concise localized text. Neither module fetches data or owns route behavior.

The environment interface does not change. `NEXT_PUBLIC_APP_VERSION` remains in `frontend/.env.example` and is inlined at build time; the footer and global error render it. `CMS_URL`, `CMS_MEDIA_URL`, and `SITE_URL` are overridden only for the disposable manual run. No new secret or environment variable is introduced.

Revision note (2026-10-08 / Planner): Created the initial self-contained task-03 ExecPlan after complete governing-file, skill, current implementation, dataset-plan, design/history, and eight-reference inspection. Recorded all three Context7 quota failures and the pinned-doc fallback; fixed the local-font, token, deterministic-brand, server/client, navigation, state, demo-import, Playwright, validation, ownership, Coordinator-only local-commit, and no-push decisions. No implementation file, task tracker, asset, server, branch, commit, or remote was changed.

Revision note (2026-10-08 / Worker): Recorded completion of the font/token/shared-shell and localized-state milestones, the exact pinned font and license hashes and sizes, and the passing focused frontend check so the living plan reflects the implementation state before artifact refresh and runtime inspection.

Revision note (2026-10-08 / Worker): Recorded artifact regeneration, final canonical results, the process-local disposable-token solution, the Next root-not-found remediation, exact desktop/mobile and keyboard inspection findings, and byte-exact runtime cleanup. Worker execution is complete; Reviewer and Coordinator responsibilities remain deliberately open.

Revision note (2026-10-08 / Coordinator): Recorded independent Reviewer approval with no findings, finalized Progress and Outcomes with reproduced canonical/browser/cleanup evidence, and prepared the approved task for its Coordinator-owned local commit without a push.

Revision note (2026-10-08 / Worker): Recorded remediation cycle 1's two-character OFL whitespace cleanup, updated the normalized license hashes while retaining proof of the pinned source identity, and documented the focused validation decision without altering Coordinator review bookkeeping or the task tracker.

Revision note (2026-10-08 / Coordinator, remediation cycle 1): Recorded independent approval of the OFL whitespace remediation and finalized the task-owned files for the Coordinator-only local commit without a push.

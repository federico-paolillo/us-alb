# Reuse the shared locations on About and Activity

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this task, editors manage each club location once in Strapi and independently choose whether it appears on Home, About, or Activity. About keeps its existing image-led facility cards but fills them from shared Location fields selected by `showOnAbout`; Activity keeps its existing schedules-and-sites layout but fills the site cards from shared Location fields selected by `showOnActivity`. Schedule rows continue to show their own editorial free-text venue so editors can name a field, gym, entrance, or sub-area without creating another Location record.

The change is observable in source and native validation without adding demonstration content in this task. The old About `facilities` and Activity `venues` attributes and their `content.facility` and `content.venue` component definitions disappear from Strapi and all generated contracts. Both request-time routes still enter through `PageSwitch`, both concrete page renderers use the existing cached `listLocations()` read after `await io()`, and the production build keeps `/chi-siamo` and `/attivita` in the SSR plus ISR partial-prerender model. Built Strapi starts successfully against a brand-new isolated database, while the frontend check, unit suite, lint, and production build pass.

## Progress

- [x] (2026-10-11 14:49Z) Read the repository and frontend instructions, `TODOS2.md` task 04 and preamble, `PLAN2.md`, `.agents/docs/PLANS.md`, the applicable workflow, validation, and Playwright skills, the completed task-01/02/03 plans, installed Next.js `io()` documentation, pinned Strapi Content-Type Builder deletion implementation, current schemas/generated contracts, CMS pipeline, page renderers, presentation components, tests, Mise tasks, and content contract.
- [x] (2026-10-11 14:49Z) Confirm branch `main`, `HEAD`, and `origin/main` are all at pushed commit `7ede5fbc66a6878f76bf07de566eaafca68b6e7b`; the tracked tree has no diff and the only pre-existing worktree item is unrelated untracked `.agents/skills/imagen/scripts/`.
- [x] (2026-10-11 14:49Z) Define the official Strapi removal sequence, shared-Location page composition, exact frontend model/query/mapper subtraction, presentation mapping, generated outputs, protected task boundaries, recovery rules, and canonical validation in this ExecPlan; no implementation file was edited.
- [x] (2026-10-11 15:06Z) Removed the two singleton attributes and obsolete reusable components through authenticated Content-Type Builder session `task-04-shared-locations-schema` backed by isolated database `task-04-shared-locations-authoring-NdQ6AP`; verified Schedule `venue*` remained Text, closed the browser, and stopped Strapi cleanly.
- [x] (2026-10-11 15:06Z) Switched About and Activity to cached Location DTOs after local `await io()` gates, removed obsolete raw population/DTO/mapper paths, and preserved page dispatch, presentation, source ordering, independent visibility, and schedule venue text.
- [x] (2026-10-11 15:06Z) Updated `TYPES.md`, regenerated backend types and both OpenAPI artifacts, and confirmed obsolete Facility/Venue contracts disappeared while Schedule and the full Location contract remained.
- [x] (2026-10-11 15:06Z) Passed the focused query test, all approved canonical backend/frontend commands, built Strapi startup against isolated database `task-04-shared-locations-empty-validation-O7Xf5j`, structural/scope checks, and guarded runtime cleanup.
- [x] (2026-10-11 15:39Z) Independent Reviewer approved task 04 after one remediation cycle. The initial review found only stale baseline wording in this ExecPlan; the same Worker corrected that current-state prose without implementation changes, and re-review returned `APPROVED` with no remaining findings.

## Surprises & Discoveries

- Observation: explicit confirmation for these content-type changes is already present and must not be requested again.
  Evidence: `PLAN2.md` states that the user has given consensus to changing Strapi content types, and the task prompt explicitly says this is advance confirmation.
- Observation: Context7 cannot currently return Strapi documentation because its monthly quota is exhausted.
  Evidence: `ctx7 library 'Strapi' ...` returned `Monthly quota exceeded`. The plan therefore relies on pinned Strapi 5.52.0 source and the repository's already-proven Content-Type Builder workflow rather than remembered API details. If a new Strapi documentation question arises, use `ctx7 login` or a project-local `CONTEXT7_API_KEY`; never change machine or user environment variables.
- Observation: the pinned Content-Type Builder has official development-only deletion support for reusable components and removes component references when deleting a component.
  Evidence: `backend/node_modules/@strapi/content-type-builder/dist/server/routes/admin.js` declares development-guarded `PUT /content-types/:uid` and `DELETE /components/:uid`; `services/schema-builder/component-builder.js` removes component references from content types before deleting the component file. This plan still removes the About and Activity attributes explicitly first, making each intended schema change separately visible and leaving no reliance on cascading deletion.
- Observation: Location already has every page-specific field and the complete status-aware cached read needed here.
  Evidence: `LocationDto` contains `aboutSummary`, `aboutImage`, `activityDetails`, `showOnAbout`, and `showOnActivity`; `frontend/cms/data.ts` caches `listLocations()` under `locations`; the raw query populates `aboutImage` and contact methods and sorts by `displayOrder` then `name`.
- Observation: the old page-specific shapes map directly onto the shared Location shape with only optionality differences.
  Evidence: About's old `FacilityDto` uses name, summary, address, and image, which correspond to Location name, `aboutSummary`, address, and `aboutImage`. Activity's old `VenueDto` uses name, address, and details, which correspond to Location name, address, and `activityDetails`. Existing presentation already omits blank optional content.
- Observation: request-time rendering is currently established in both route files, while the Home renderer demonstrates the same dispatched async-component pattern needed here.
  Evidence: `frontend/app/(content)/chi-siamo/page.tsx` and `frontend/app/(content)/attivita/page.tsx` call `await io()` before singleton reads and return `PageSwitch`; `frontend/components/home/page.tsx` is an async component dispatched by that same switch, calls `await io()`, and reads cached collections. Installed Next.js 16.3.1 documentation says `await io()` suspends during prerendering and keeps following work out of the static shell.
- Observation: there are no canonical backend lint/test or frontend test Mise tasks, and repository policy forbids Strapi backend tests.
  Evidence: `mise tasks` exposes `be:build`, `be:types`, `be:openapi`, `fe:openapi`, `fe:check`, `fe:lint`, and `fe:build`; the canonical frontend unit suite is `cd frontend && npm test`.
- Observation: the tracked demonstration archive is intentionally stale after schema removal until task 05 rebuilds it.
  Evidence: `TODOS2.md` assigns archive reconstruction, Location records, and Public `location.find` permission to task 05. Its current SHA-256 is `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633` and task 04 must leave it byte-identical rather than importing or repairing it.
- Observation: saving the singleton field removals through the official builder normalized the order of existing `required` and `maxLength` JSON keys without changing their values.
  Evidence: the schema diffs show only the intended attribute deletions plus key-order changes on unchanged string attributes; protected Home, Location, and Schedule schema diffs remained empty, and generated/build validation passed.

## Decision Log

- Decision: remove About `facilities` and Activity `venues` in separate Content-Type Builder saves, then delete the now-unreferenced Facility and Venue components through the same admin UI.
  Rationale: this uses Strapi's official persistence mechanism, makes each destructive subtraction auditable, and avoids depending on the component deletion cascade to express the intended singleton changes. Direct schema deletion is permitted only after recording the exact UI/API failure and the smallest unavoidable exception in this plan.
  Date/Author: 2026-10-11 / Planner
- Decision: leave `backend/src/components/content/schedule.json` and every `ScheduleDto.venue` mapping and presentation path unchanged.
  Rationale: a schedule venue names a specific training area and is explicitly required to remain editorial free text; it is not the obsolete shared-location substitute.
  Date/Author: 2026-10-11 / Planner
- Decision: keep Locations separate from `AboutPageDto` and `ActivityPageDto`; make the concrete About and Activity renderers async, call `await io()`, read `listLocations()`, filter by their own switch, and preserve the existing `PageSwitch` signature.
  Rationale: Locations are already a separately tagged cached collection. Folding them into singleton DTOs would duplicate cache ownership, and passing extra data through `PageSwitch` would weaken its current discriminated-page dispatch. The pattern already works for Home and retains request-time rendering even if a renderer is reused later.
  Date/Author: 2026-10-11 / Planner
- Decision: preserve Location query order and filter without re-sorting: About uses only `showOnAbout`, and Activity uses only `showOnActivity`.
  Rationale: the raw shared query already provides the editor-controlled `displayOrder` then `name` order. Each page switch must be authoritative and independent; neither Home visibility nor the presence of optional page-specific copy controls whether a selected Location may appear.
  Date/Author: 2026-10-11 / Planner
- Decision: keep `frontend/components/about/facilities.tsx` and `frontend/components/activity/schedules-and-venues.tsx` as the existing presentation modules, but change their props to `LocationDto[]` and use page-specific Location fields.
  Rationale: their filenames and exported component names describe visible page sections, not CMS ownership. Retaining their structure minimizes presentation churn: About substitutes `aboutImage` and `aboutSummary`; Activity substitutes `activityDetails`; headings, section ids, layout, address semantics, responsive classes, and empty-section behavior stay intact.
  Date/Author: 2026-10-11 / Planner
- Decision: do not display Location contact methods on About or Activity.
  Rationale: the task requires preserving existing presentation as closely as the shared model allows. Those pages presently show location identity, address, and page-specific descriptive content; contact methods remain Home contact-section behavior unless a later requirement says otherwise.
  Date/Author: 2026-10-11 / Planner
- Decision: update the existing CMS client query test to prove the removed singleton populations are absent, but add no presentation test.
  Rationale: query population is a stable serialization contract and belongs in `frontend/cms/client.test.ts`. The presentation change is a direct field substitution whose visible layout is deliberately unchanged; repository policy permits skipping tests that would only assert visuals, while generated type checking, source assertions, the existing Location mapper tests, the full suite, and production build cover the material regression risks without introducing a test seam.
  Date/Author: 2026-10-11 / Planner
- Decision: run all defined applicable canonical tasks, including standalone `fe:lint` even though `fe:check` already invokes lint, plus the existing Vitest suite and fresh empty-database startup.
  Rationale: both backend schema and frontend source change. Explicit results for every available applicable task make the handoff unambiguous; startup is native schema/build validation rather than a backend, smoke, E2E, or deployment test.
  Date/Author: 2026-10-11 / Planner
- Decision: retain the Content-Type Builder's harmless key-order normalization in the two singleton schemas.
  Rationale: these files are official builder output, all schema values other than the intended field removals are unchanged, and rewriting the order manually would obscure the required UI-authored provenance without improving behavior.
  Date/Author: 2026-10-11 / Worker

## Outcomes & Retrospective

Task 04 is implemented, validated, and independently approved after one documentation-only remediation cycle. Home, About, and Activity now share the existing cached Location collection while retaining independent visibility switches; About and Activity map only their page-specific fields into the existing presentation, and schedule venue labels remain free text. The embedded Facility/Venue schemas and frontend paths are gone from source and generated contracts. Empty-database startup, all approved canonical commands, strict protected-file checks, archive integrity, browser/port shutdown, and task-owned cleanup passed. Coordinator-owned queue, commit, and push bookkeeping remain open; task-05 content, Public permission, and archive work and task-06 release verification remain untouched.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0 and `frontend/` is Next.js 16.3.1 with React 19.2.8. The active branch must remain `main`. At this plan's baseline, `HEAD` and `origin/main` both resolve to `7ede5fbc66a6878f76bf07de566eaafca68b6e7b`; there is no tracked diff, and `.agents/skills/imagen/scripts/` is unrelated untracked content that must never be modified, removed, staged, or included in task evidence.

Strapi single-type schemas live in `backend/src/api/<api>/content-types/<api>/schema.json`, reusable components in `backend/src/components/content/`, and generated Strapi declarations in `backend/types/generated/components.d.ts` and `backend/types/generated/contentTypes.d.ts`. At the task baseline, About had a required repeatable `facilities` attribute referencing `content.facility`, Activity had a required repeatable `venues` attribute referencing `content.venue`, and their component definitions lived in `backend/src/components/content/facility.json` and `backend/src/components/content/venue.json`. The completed worktree contains none of those attributes or component definitions. `backend/src/components/content/schedule.json` separately retains the protected required string `venue`.

The shared Location schema is `backend/src/api/location/content-types/location/schema.json`. It is a Draft & Publish collection with required name/address, optional About summary/image, optional Activity details and contact methods, ordered display, and separate Home/About/Activity switches. Do not alter this schema in task 04. Task 05 will create demonstration Location records and Public permission; task 04 changes schema consumers only and must not modify `backend/seed-data/us-albatese-demo.tar.gz`, local content, users/roles, tokens, webhooks, or permissions.

The frontend CMS direction is raw client (`frontend/cms/client.ts`) to mapper (`frontend/cms/mappers.ts`) to connector (`frontend/cms/connector.ts`) to tagged cached reads (`frontend/cms/data.ts`). The shared Location path spans all four layers. At the task baseline, the About and Activity raw population objects requested the old embedded fields, their DTOs contained `FacilityDto[]` or `VenueDto[]`, and their mappers validated those arrays. The completed worktree removes those branches while retaining singleton reads for non-location page content; the existing Location client, mapper, connector, cache, tags, and webhook invalidation remain authoritative and unchanged.

`frontend/app/(content)/chi-siamo/page.tsx` and `frontend/app/(content)/attivita/page.tsx` are request-time route components. Each calls `await io()`, loads its singleton through `frontend/cms/data.ts`, handles not-found, and passes the discriminated DTO to `frontend/components/page-switch.tsx`. `PageSwitch` dispatches `pageType: "about"` to `frontend/components/about/page.tsx` and `pageType: "activity"` to `frontend/components/activity/page.tsx`. All three route/dispatch files remain unchanged. The completed concrete renderers mirror the async Home renderer: each places its cached Location read after another `await io()` gate. The duplicated route/component gate is harmless and makes the collection read locally explicit.

About presentation lives in `frontend/components/about/facilities.tsx`. Its card structure consumes Location name, `aboutSummary`, address, and optional `aboutImage`. Activity presentation lives in `frontend/components/activity/schedules-and-venues.tsx`; its schedule cards consume `ScheduleDto.venue`, while its separate site cards consume Location name, address, and `activityDetails`. “Preserve presentation” means retain section ids, headings, responsive layout, class names, semantic `<address>` elements, conditional omission of blank draft content, and placement relative to neighboring sections. It does not mean retaining obsolete DTO names or CMS fields.

`TYPES.md` is the sole human-readable content contract to update. `mise run be:types` overwrites the generated Strapi declarations; `mise run be:openapi` overwrites `frontend/cms/schema.json`; and `mise run fe:openapi` derives and formats `frontend/cms/schema.d.ts`. Generated files are outputs and must never be hand-edited. Native OpenAPI generation can refresh unrelated `publishedAt.default` timestamps, so structural removals and retained contracts must be reviewed separately from timestamp churn.

Ignored local files `backend/.env`, `frontend/.env.development`, and `backend/.tmp/data.db` may exist. Never print, copy, replace, import into, export from, or delete them. Use one unique SQLite directory below `backend/.tmp` for Content-Type Builder authoring and a second unique directory for built startup validation. Bind Strapi only to `127.0.0.1:65100`.

## Interfaces and Dependencies

After the Content-Type Builder changes, `backend/src/api/about-page/content-types/about-page/schema.json` has exactly its current attributes except `facilities`; `backend/src/api/activity-page/content-types/activity-page/schema.json` has exactly its current attributes except `venues`. `backend/src/components/content/facility.json` and `backend/src/components/content/venue.json` no longer exist. `backend/src/components/content/schedule.json` still defines required string `venue` with maximum length 160, and `backend/src/api/location/content-types/location/schema.json` remains byte-for-byte unchanged.

After `mise run be:types`, `backend/types/generated/components.d.ts` no longer defines or registers `ContentFacility` / `content.facility` or `ContentVenue` / `content.venue`. It still defines and registers `ContentSchedule`, including its string `venue`, and `ContentContactMethod`. `backend/types/generated/contentTypes.d.ts` no longer gives About a `facilities` attribute or Activity a `venues` attribute and still exposes the complete Location content type. After the two OpenAPI generators, neither `ContentFacilityEntry`, `ContentVenueEntry`, `facilities`, nor `venues` exists in `frontend/cms/schema.json` or `frontend/cms/schema.d.ts`; `ContentScheduleEntry.venue`, Location operations, and all Location fields remain.

In `frontend/cms/client.ts`, remove `facilities` from `aboutPopulate` and `venues` from `activityPopulate`. Do not change the singleton endpoints, status handling, any other population, Location population, sort, pagination, or serializer. In `frontend/cms/client.test.ts`, retain the current institutional request order and positive population checks, and add negative assertions that the About request has no `populate[facilities]` or nested facility-image parameter and the Activity request has no `populate[venues]`. Existing assertions for board-member portraits, program images, and ordered Location population remain.

In `frontend/cms/model.ts`, delete `FacilityDto` and `VenueDto`, remove `facilities` from `AboutPageDto`, and remove `venues` from `ActivityPageDto`. Do not put Locations inside either singleton DTO. Preserve `ScheduleDto.venue`, `CalendarEntryDto.venue`, `LocationDto`, `CmsPageDto`, and every unrelated shape.

In `frontend/cms/mappers.ts`, remove the `FacilityDto` and `VenueDto` imports, the About facility-entry mapper and required-result guard, the Activity venue-entry mapper and required-result guard, and the corresponding properties from the returned page DTOs. Preserve all remaining singleton validation, draft handling, deep freezing, media mapping, schedule mapping including the `venue` string, and the full `toLocationDto` contract. `frontend/cms/connector.ts` and `frontend/cms/data.ts` need no change because their singleton and Location interfaces remain valid once the mapper output types are updated.

In `frontend/components/about/page.tsx`, import `listLocations` and `io`, make `AboutPage` async, call `await io()` before the collection read, and retain the `page: AboutPageDto` prop used by `PageSwitch`. Filter the already ordered result first to records where `showOnAbout` is true, then omit only wholly blank incomplete draft cards using the current content check adapted to `name`, `aboutSummary`, `address`, and `aboutImage`. Use that filtered list for the `#impianti` section-link decision and the existing `FacilitiesSection` placement. Do not consult `showOnHome` or `showOnActivity`, re-sort, fetch Strapi directly, or move the read into the route or child section.

In `frontend/components/about/facilities.tsx`, accept `readonly LocationDto[]` under a `locations` prop. Preserve the exact section/card presentation and use `location.documentId` as the list key, `location.aboutImage` for media, `location.name` for the h3, `location.aboutSummary` for the descriptive paragraph, and `location.address` for the semantic address. The optional summary/image continue to disappear independently when blank/absent. Do not show `activityDetails` or contact methods.

In `frontend/components/activity/page.tsx`, import `listLocations` and `io`, make `ActivityPage` async, call `await io()` before the collection read, and retain the `page: ActivityPageDto` prop. Keep the schedule filter exactly as-is, including its free-text `schedule.venue`. Filter the ordered Location result first to `showOnActivity`, then omit only wholly blank incomplete draft cards using name, address, and `activityDetails`. Pass those records to the existing schedules-and-sites section without re-sorting and without consulting the other visibility switches.

In `frontend/components/activity/schedules-and-venues.tsx`, retain the exported `SchedulesAndVenues` component, filename, section/card structure, headings, and all schedule rendering. Replace only the site-card prop with `locations: readonly LocationDto[]`; compute empty/combined layout from schedules and Locations; key cards by `documentId`; and render name, address, and `activityDetails` where the old card rendered details. Do not link schedule labels to Location records, normalize them, or show Location contact methods/About images.

Update `TYPES.md` by deleting the obsolete reusable Facility and Venue subsections; removing facilities from About's schema/DTO description and venues from Activity's schema/DTO description; and replacing Location's temporary additive/compatibility paragraph with the final task-04 truth. State that About and Activity read the separately cached ordered Location collection and filter `showOnAbout` or `showOnActivity`, while schedule `venue` remains required free text. Continue to say Public Location permission and demonstration archive content remain pending task 05. Do not add another Markdown document or change README.

No new dependency, API endpoint, migration, test framework, build task, cache tag, webhook mapping, Preview handler, route, navigation entry, content record, Public permission, or archive is needed. Use pinned Strapi, Next.js, React, openapi-fetch, Tailwind, Biome, Vitest, and Mise exactly as installed.

## Plan of Work

### Milestone 1: Retire the embedded Strapi model through the official builder

Record branch, revision, upstream, worktree, ignored-state, archive hash, and available tasks. Create a unique authoring database below `backend/.tmp`, start `strapi develop` on `127.0.0.1:65100`, and use a single named Playwright CLI session. Log in without exposing credentials. In Content-Type Builder, remove About's `facilities`, save and wait for reload; remove Activity's `venues`, save and wait; verify Schedule still contains string `venue`; then delete the unreferenced Facility and Venue reusable components. Inspect source diffs after every save so accidental removal of any other attribute is caught immediately.

Close the named session and stop the exact development process. Keep the task-owned authoring database only until generation and build establish that the source model is coherent. This milestone is complete when both singleton schemas contain only the intended subtraction, both obsolete component files are absent, Location and Schedule source schemas are unchanged, and no frontend, content, permission, archive, package, or tooling file has changed yet.

### Milestone 2: Move both page consumers to the cached Location collection

First remove the old raw population and DTO/mapper branches so generated-contract errors expose any remaining dependence. Update the client query test with the two negative population assertions and run that file. Then make the About and Activity renderers async Location consumers, applying their page-specific flags without sorting, and adapt the two existing section components to page-specific Location fields.

Keep the app route files and `PageSwitch` byte-for-byte unchanged. Keep the schedule venue field and markup byte-for-byte unchanged except incidental formatting around the renamed site-card prop. Do not edit the shared Location query/mapper/connector/cache/tag/webhook path or Home. This milestone is complete when no production frontend symbol depends on `FacilityDto`, `VenueDto`, `page.facilities`, or `page.venues`; visible Location records map into the same markup; and the focused client test passes.

### Milestone 3: Reconcile the content contract and generated API surface

Update only now-stale sections of `TYPES.md`. Run backend type generation, backend build, backend OpenAPI generation, and frontend OpenAPI generation in that order. Review all four outputs: obsolete component types and singleton fields must be gone; schedule venue and the entire Location contract must remain; any unrelated textual OpenAPI changes must be demonstrated as native generation metadata rather than accepted blindly.

This milestone is complete when source schemas, generated Strapi declarations, generated OpenAPI contracts, handwritten DTOs, mapper output, client population, and `TYPES.md` all express the same ownership model, and no generated file was hand-edited.

### Milestone 4: Prove startup, rendering architecture, and strict scope

Run built Strapi against a second empty SQLite database on `127.0.0.1:65100` with administrator/webhook bootstraps disabled process-locally. Require successful readiness and a 200 or 204 health response, then stop it cleanly. Run `fe:check`, the full Vitest suite, `fe:build`, and standalone `fe:lint`. The build must keep `/chi-siamo` and `/attivita` as Partial Prerender routes and must not require a live Strapi backend during the frontend build.

Finish with structural searches, exact protected-file diff guards, archive hash verification, generated-contract checks, clean port/browser/process checks, guarded cleanup of only task-prefixed databases, and `git diff --check`. Update every living section with actual evidence. Leave `TODOS2.md`, staging, commit, and push to the implement-task coordinator after independent approval. This milestone is complete when all gates pass and the worktree contains only task-04 source/docs/generated/plan changes plus the untouched unrelated Imagen scripts.

## Concrete Steps

Run commands from `/home/codex/src/us-alb` unless a command explicitly changes directory. Record and protect the baseline:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    git diff --check
    mise tasks
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    playwright-cli list

Expect branch `main`, both revisions at `7ede5fbc66a6878f76bf07de566eaafca68b6e7b`, no tracked diff, only `?? .agents/skills/imagen/scripts/` before this plan, and archive hash `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Do not switch branches, stage, commit, push, clean the untracked scripts, or edit `TODOS2.md` as the Worker.

Before browser use, reread `/home/codex/.agents/skills/playwright-cli/SKILL.md` and `references/session-management.md`. Prepare task-owned authoring storage and start Strapi in a monitored terminal:

    cd /home/codex/src/us-alb
    mkdir -p backend/.tmp
    authoring_dir="$(mktemp -d -p backend/.tmp task-04-shared-locations-authoring-XXXXXX)"
    authoring_db="${authoring_dir#backend/}/data.db"
    cd backend
    mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME="$authoring_db" WEBHOOKS_NEXTJS_TARGET= npm run dev

Wait for `Strapi started successfully`. In another repository-root terminal, open the one named session:

    playwright-cli -s=task-04-shared-locations-schema open http://127.0.0.1:65100/admin
    playwright-cli -s=task-04-shared-locations-schema snapshot

Authenticate by sourcing only the ignored project-local backend env file with shell tracing disabled, deriving the configured email in a variable, and filling fresh snapshot references. Never print the expanded values:

    set +x
    set -a
    . backend/.env
    set +a
    admin_email="${ADMIN_USER:-admin}@${ADMIN_DOMAIN:-example.com}"
    playwright-cli -s=task-04-shared-locations-schema fill <email-ref> "$admin_email"
    playwright-cli -s=task-04-shared-locations-schema fill <password-ref> "$ADMIN_PASSWORD"
    playwright-cli -s=task-04-shared-locations-schema click <login-ref>
    unset admin_email ADMIN_USER ADMIN_DOMAIN ADMIN_PASSWORD ADMIN_PASSWORD_FILE

Navigate by current snapshots and accessible labels; references become stale after each Strapi auto-reload. In Content-Type Builder, perform these operations in order: edit About Page, delete `facilities`, confirm, and save; edit Activity Page, delete `venues`, confirm, and save; inspect Schedule and confirm `venue` is still a required text/string field; open Components / Content, delete Facility, confirm and wait; delete Venue, confirm and wait. Do not delete the Content category, Schedule, Contact Method, or any other field/component. After each save or deletion, run from another root terminal:

    git status --short
    git diff -- backend/src/api/about-page/content-types/about-page/schema.json backend/src/api/activity-page/content-types/activity-page/schema.json backend/src/components/content/facility.json backend/src/components/content/venue.json
    git diff --exit-code -- backend/src/components/content/schedule.json backend/src/api/location/content-types/location/schema.json backend/src/api/home-page/content-types/home-page/schema.json

The protected command must stay silent. A direct schema edit is not a fallback for stale refs or reload timing: take a fresh snapshot and retry. If the builder genuinely cannot perform an operation, record the attempted UI action, exact error, affected file, and minimal unavoidable exception in `Surprises & Discoveries` and `Decision Log` before touching JSON.

When the builder shows no Facility or Venue component and no old singleton attribute:

    playwright-cli -s=task-04-shared-locations-schema close
    playwright-cli list

The named session must be absent. Stop the development terminal with Ctrl-C; do not broadly kill processes.

Implement the frontend and `TYPES.md` changes from `Interfaces and Dependencies`, then run the focused stable-boundary test:

    cd /home/codex/src/us-alb/frontend
    npm test -- cms/client.test.ts

Expect the client test file to pass. Its captured requests must retain all current endpoint/status/Location-order assertions and prove that About sends no facility population and Activity sends no venue population. It must start no external process.

Regenerate and build from the repository root in dependency order:

    cd /home/codex/src/us-alb
    mise run be:types
    mise run be:build
    mise run be:openapi
    mise run fe:openapi

Every command must exit zero. Inspect rather than hand-edit the outputs:

    git diff -- backend/types/generated/components.d.ts backend/types/generated/contentTypes.d.ts
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts
    ! rg -n 'ContentFacility|content\.facility|ContentVenue|content\.venue|facilities|venues' backend/types/generated/components.d.ts backend/types/generated/contentTypes.d.ts frontend/cms/schema.json frontend/cms/schema.d.ts
    rg -n 'ContentSchedule|content\.schedule|venue' backend/types/generated/components.d.ts backend/types/generated/contentTypes.d.ts frontend/cms/schema.json frontend/cms/schema.d.ts
    rg -n 'api::location\.location|showOnAbout|showOnActivity|aboutSummary|aboutImage|activityDetails' backend/types/generated/contentTypes.d.ts frontend/cms/schema.json frontend/cms/schema.d.ts

The negative search must be silent. The positive searches must find Schedule venue and the full Location surface. If OpenAPI timestamps changed, compare structure after normalizing only `publishedAt.default` generation values; do not restore old output or normalize committed files.

For the required built startup, use a different empty database in a monitored backend terminal:

    cd /home/codex/src/us-alb/backend
    validation_dir="$(mktemp -d -p .tmp task-04-shared-locations-empty-validation-XXXXXX)"
    validation_db="$validation_dir/data.db"
    mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME="$validation_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start

Wait for `Strapi started successfully`. In another terminal, poll readiness for at most 60 seconds:

    for attempt in $(seq 1 60); do
      status="$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:65100/_health || true)"
      test "$status" = 204 -o "$status" = 200 && break
      sleep 1
    done
    test "$status" = 204 -o "$status" = 200

Stop the exact server with Ctrl-C. Back in that server terminal, where `validation_db` is still defined, run `test -f "$validation_db"`. A successful startup has no missing-component/schema/bootstrap error and creates the exact task-owned database. This is build validation, not a smoke or backend test.

Run every applicable frontend validation command:

    cd /home/codex/src/us-alb
    mise run fe:check
    cd frontend && npm test
    cd /home/codex/src/us-alb
    mise run fe:build
    mise run fe:lint

All must exit zero. Record actual Vitest file/test totals. `fe:build` must complete without a live backend and report `◐` Partial Prerender for `/chi-siamo` and `/attivita`; it must not add static export or `generateStaticParams`. There is no backend test/lint task or frontend test Mise task. Do not add or run a Strapi backend test, automated browser test, E2E test, smoke test, or deployment test.

Finish with contract and scope assertions:

    cd /home/codex/src/us-alb
    ! rg -n 'facilities|content\.facility' backend/src/api/about-page/content-types/about-page/schema.json
    ! rg -n 'venues|content\.venue' backend/src/api/activity-page/content-types/activity-page/schema.json
    test ! -e backend/src/components/content/facility.json
    test ! -e backend/src/components/content/venue.json
    rg -n '"venue"|"required": true|"maxLength": 160' backend/src/components/content/schedule.json
    rg -n 'showOnAbout|showOnActivity|aboutSummary|aboutImage|activityDetails' backend/src/api/location/content-types/location/schema.json
    ! rg -n 'FacilityDto|VenueDto|page\.facilities|page\.venues|facilities:|venues:' frontend/cms/client.ts frontend/cms/model.ts frontend/cms/mappers.ts frontend/components/about frontend/components/activity
    rg -n 'listLocations|showOnAbout|await io\(\)|aboutSummary|aboutImage' frontend/components/about/page.tsx frontend/components/about/facilities.tsx
    rg -n 'listLocations|showOnActivity|await io\(\)|activityDetails|schedule\.venue' frontend/components/activity/page.tsx frontend/components/activity/schedules-and-venues.tsx
    rg -n 'venue' frontend/cms/model.ts frontend/cms/mappers.ts frontend/components/activity/schedules-and-venues.tsx
    git diff --exit-code -- frontend/app frontend/components/page-switch.tsx frontend/components/home frontend/cms/connector.ts frontend/cms/data.ts frontend/cms/tags.ts frontend/cms/tags.test.ts frontend/cms/webhook.ts frontend/cms/webhook.test.ts frontend/cms/preview.ts frontend/app/refresh/route.ts
    git diff --exit-code -- backend/src/api/location backend/src/api/home-page backend/src/components/content/schedule.json backend/src/components/content/contact-method.json backend/seed-data/us-albatese-demo.tar.gz mise.toml backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"
    playwright-cli list
    git diff --check
    git status --short

The generated-contract negative search, the two source-schema negative searches, the file-absence checks, and both protected diff guards must pass. Positive searches must show the two visibility filters, local `await io()` gates, page-specific field mapping, Location schema, and unchanged schedule/calendar venue contracts. The archive hash must remain `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`.

After all validation passes, remove only task-owned database directories through resolved allowlisted paths:

    cd /home/codex/src/us-alb
    for candidate in backend/.tmp/task-04-shared-locations-authoring-* backend/.tmp/task-04-shared-locations-empty-validation-*; do
      test -e "$candidate" || continue
      resolved="$(realpath "$candidate")"
      case "$resolved" in
        /home/codex/src/us-alb/backend/.tmp/task-04-shared-locations-authoring-*|/home/codex/src/us-alb/backend/.tmp/task-04-shared-locations-empty-validation-*) rm -rf -- "$resolved" ;;
        *) echo "Refusing unsafe cleanup target: $resolved" >&2; exit 1 ;;
      esac
    done

Never remove `backend/.tmp/data.db`, `backend/.tmp`, uploads, the archive, or unrelated browser/process state. If authoring or validation fails, retain the exact task directory for diagnosis until its failure is recorded; retry with a new uniquely named directory rather than reusing ordinary state. Confirm port 65100 has no listener and the named browser session is closed before handoff.

Final status may contain this ExecPlan; `TYPES.md`; the two modified singleton schemas; deletions of the two obsolete component JSON files; four generated artifacts; `frontend/cms/client.ts`, `client.test.ts`, `model.ts`, and `mappers.ts`; and the four About/Activity presentation files. Native generator output may alter only the expected generated files. `.agents/skills/imagen/scripts/` remains separate and untracked.

## Validation and Acceptance

Acceptance is the following observable behavior and contract:

1. The user-provided advance confirmation is cited; no additional content-type confirmation is requested. Authenticated Content-Type Builder actions in development mode remove the two singleton fields and two reusable components. Direct schema deletion occurs only if a precisely documented official-builder limitation makes it unavoidable.
2. About and Activity no longer expose or populate embedded facilities/venues. Facility/Venue component source files and all generated Strapi/OpenAPI declarations disappear, while all unrelated schema attributes remain.
3. Schedule's `venue` remains a required free-text string through source schema, generated contracts, `ScheduleDto`, mapper validation, filtering, and display. Activity schedule cards keep their existing labels and never resolve or constrain that text against Location records.
4. `AboutPageDto` and `ActivityPageDto` retain their discriminants and all non-location page fields but no longer contain facility/venue arrays. `CmsPageDto` and `PageSwitch` remain unchanged.
5. About's concrete renderer calls `await io()`, reads cached `listLocations()`, preserves its source order, admits only `showOnAbout === true`, and maps name/address/`aboutSummary`/`aboutImage` into the unchanged `#impianti` presentation. It does not show Activity or contact fields.
6. Activity's concrete renderer calls `await io()`, reads the same cached list, preserves its source order, admits only `showOnActivity === true`, and maps name/address/`activityDetails` into the unchanged “Le nostre sedi” cards beside schedules. It does not show About/image/contact fields.
7. A Location can independently appear on Home, About, Activity, multiple pages, or none according to its existing switches. Home remains byte-for-byte unchanged and continues filtering `showOnHome`; no page re-sorts the shared `displayOrder`/name result.
8. Both route files still call `await io()`, load their singleton, and return the unchanged `PageSwitch`. The production build succeeds without Strapi and reports `/chi-siamo` and `/attivita` as Partial Prerender routes, preserving SSR plus ISR rather than static export or build-time CMS rendering.
9. Existing section ids, headings, card structure, responsive classes, semantic addresses, neighboring section order, empty-section behavior, and Location optional-field omission remain. No contact method, map, map link, new route, or visual redesign is added.
10. `TYPES.md` describes the shared ownership and no longer documents Facility/Venue components or singleton fields. It explicitly retains schedule venue free text and leaves Public permission and demonstration Location/archive work pending task 05.
11. `mise run be:types`, `mise run be:build`, `mise run be:openapi`, `mise run fe:openapi`, the focused client test, `mise run fe:check`, the full `npm test`, `mise run fe:build`, and `mise run fe:lint` all exit zero. Generated diffs are native outputs and have no unexplained structural change.
12. Built Strapi starts successfully on `127.0.0.1:65100` against a distinct new task-owned SQLite database, returns health HTTP 200 or 204, and stops cleanly. No backend/browser/E2E/smoke/deployment test is added.
13. There is no Public permission, content record, archive, external migration, custom endpoint, Preview, cache/tag/webhook, discovery, sitemap, navigation, Home, dependency, lockfile, build-tool, runtime, Strapi-version, environment, system, firewall, Docker, branch, index, commit, or upstream change. The archive hash and unrelated `.agents/skills/imagen/scripts/` remain unchanged.

## Idempotence and Recovery

The frontend and documentation edits are ordinary source changes and are safe to repeat after inspecting current diffs. Do not re-add a removed field or create a parallel Location path if part of the task is already complete. Type errors after regeneration should identify stale DTO/mapper/query consumers; fix those consumers rather than restoring obsolete schemas or weakening generated types.

The Content-Type Builder operations are destructive to schema definitions, so inspect the builder and Git diff before each action. If resuming after About or Activity was saved, continue with the missing operation instead of deleting another attribute. Delete reusable components only after both references are absent. If a wrong field is removed, use the builder to restore that exact field before proceeding; do not reset the whole worktree. The authoring database is disposable, but the source files written by the builder are the intended durable result.

Strapi reloads after builder mutations, invalidating browser references. A timeout or stale ref is recovered by waiting for readiness and taking a new snapshot in the same named session, not by changing browser configuration or editing JSON. If the named session or exact server remains after interruption, close/stop only that target. `playwright-cli kill-all` and broad process deletion are last resorts for an identified unresponsive task process, not normal cleanup.

Generators are repeatable and must always run in `be:types`, `be:build`, `be:openapi`, `fe:openapi` order after the final schema. If an obsolete type remains, confirm the source field/component is truly gone, rerun the official generator, and inspect its output; never manually delete generated declarations. If unrelated OpenAPI differences appear, diagnose source/generator state before continuing.

If frontend validation fails, run the smallest failing focused command after repairing only task-owned files, then repeat the entire applicable sequence. Never fix a build-time CMS request by removing `io()`, bypassing the cached data layer, adding static parameters/export, or weakening the SSR plus ISR model.

Task database cleanup is allowed only after resolving each path and matching an exact task-04 prefix. Never use an unresolved variable, broad glob deletion, `git reset --hard`, `git checkout --`, or any command targeting `backend/.tmp`, the workspace root, uploads, archive, ordinary database, env files, or unrelated scripts. A failed database remains until evidence is recorded and may then be removed by the same guarded procedure.

## Artifacts and Notes

The expected implementation diff is limited to this ExecPlan; `TYPES.md`; modified About and Activity source schemas; deleted `backend/src/components/content/facility.json` and `backend/src/components/content/venue.json`; refreshed `backend/types/generated/components.d.ts`, `backend/types/generated/contentTypes.d.ts`, `frontend/cms/schema.json`, and `frontend/cms/schema.d.ts`; `frontend/cms/client.ts`, `frontend/cms/client.test.ts`, `frontend/cms/model.ts`, and `frontend/cms/mappers.ts`; and `frontend/components/about/page.tsx`, `frontend/components/about/facilities.tsx`, `frontend/components/activity/page.tsx`, and `frontend/components/activity/schedules-and-venues.tsx`.

During implementation, record concise evidence here: task database basenames; named browser session and builder field/component observations; source diffs after each builder save; focused client assertion/result; exact generator/build/check/lint/test outcomes and actual test totals; generated symbol removals and retained Schedule/Location symbols; empty-start readiness line and health code; `/chi-siamo` and `/attivita` build markers; archive hash; final protected-file/scope assertions; stopped port; closed session; and cleaned task directories. Do not paste credentials, env contents, complete generated files, large logs, or browser snapshots.

Worker evidence (2026-10-11):

- Content-Type Builder used isolated authoring database `task-04-shared-locations-authoring-NdQ6AP` and named session `task-04-shared-locations-schema`. Separate saves removed About `facilities` and Activity `venues`; the Schedule component displayed required `venue*` as Text; separate confirmed component deletions removed Facility and Venue. Source diff checks after each save showed no protected Home, Location, or Schedule changes. The session closed with `playwright-cli list` reporting no browsers, and the exact development process stopped cleanly.
- `npm test -- cms/client.test.ts` passed 1 file and 2 tests, including negative population assertions. `mise run be:types`, `mise run be:build`, `mise run be:openapi`, and `mise run fe:openapi` all exited zero. Generated-contract searches found no Facility/Venue component or singleton-field symbols and retained `ContentSchedule.venue` plus the complete Location field/switch surface.
- Built Strapi used distinct empty database `task-04-shared-locations-empty-validation-O7Xf5j`, logged `Strapi started successfully`, returned HTTP 204 from `/_health`, created the exact database file, and stopped cleanly without schema/bootstrap errors.
- `mise run fe:check` passed Biome over 101 files, Next route type generation, and TypeScript. The full `npm test` passed 9 files and 78 tests. `mise run fe:build` passed without a live backend and reported `◐` Partial Prerender for both `/chi-siamo` and `/attivita`. Standalone `mise run fe:lint` passed 101 files with no fixes.
- Final source/generated negative and positive searches, both protected-file diff guards, ignored-env/database checks, `git diff --check`, browser closure, port 65100 shutdown, and task-scope status all passed. The demo archive remained byte-identical at SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. Both task-prefixed database directories and the task-owned Playwright artifact directory were moved to trash through resolved exact paths; unrelated `.agents/skills/imagen/scripts/` remained untouched.
- Independent review result: the first review reported one low-severity finding limited to stale baseline/current-state wording in the ExecPlan. Remediation cycle 1 updated only that prose and appended its revision note; re-review confirmed the wording against current schemas and frontend paths and returned `APPROVED`. The Reviewer also independently passed the focused client test, all 78 frontend tests, Biome, TypeScript, generated-contract/protected-file checks, archive integrity, and worktree/index checks.

Revision note (2026-10-11 / Planner): Created the initial self-contained task-04 ExecPlan from pushed commit `7ede5fb`. It fixes the official-builder deletion order, independent page visibility ownership, page-specific Location-to-presentation mapping, schedule free-text boundary, request-time dispatch/caching invariants, generated-contract removals, focused query proof, empty-database startup, canonical validation, cleanup, and strict task-05/06 exclusions. No implementation file was changed.

Revision note (2026-10-11 / Worker): Recorded completed implementation and validation, official-builder evidence and harmless key-order normalization, exact generator/test/build/startup outcomes, strict scope and archive checks, guarded cleanup, final worker outcome, and the remaining independent-review/coordinator boundary.

Revision note (2026-10-11 / Worker, review remediation cycle 1): Recast the stale Context and Orientation descriptions as explicit baseline history followed by the completed current worktree, and updated the adjacent renderer and presentation prose to describe the implemented cached Location reads and page-specific fields accurately. No implementation, scope, decision, progress, outcome, or validation claim changed.

Revision note (2026-10-11 / Coordinator): Recorded the remediation-cycle accounting, final independent `APPROVED` / `REVIEW_READY` handoff, and review evidence. No implementation scope, technical decision, authoritative requirement, or validation claim was changed.

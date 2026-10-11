# Carry contacts and locations through the CMS data pipeline

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this task, the frontend CMS layer can retrieve Home's optional contact copy and club-wide phone/email methods and can retrieve shared Location records in either published or preview mode. Every contact method that reaches a frontend data-transfer object (DTO, the validated shape passed beyond the CMS boundary) has a safe, mapper-created `tel:` or `mailto:` link. Locations include the shared fields needed by the later Home, About, and Activity presentation tasks, arrive in display-order/name order, participate in the existing Next.js cache, and are invalidated by Location webhooks.

The result is observable through focused frontend tests and a production build rather than through new presentation. Mocked client tests show the exact Strapi query, mapper tests show valid links and the different published/draft failure policies, and tag tests show that a Location webhook selects the `locations` cache tag. No page renders the new DTOs in this task: Home presentation belongs to task 03, About/Activity migration belongs to task 04, and public permission and archive records belong to task 05.

## Progress

- [x] (2026-10-11 14:14Z) Read `AGENTS.md`, `frontend/AGENTS.md`, the `TODOS2.md` preamble and task 02, all of `PLAN2.md`, all of `.agents/docs/PLANS.md`, the applicable workflow and validation skills, the completed schema contract, the current CMS pipeline and tests, the generated OpenAPI operations, the installed Next.js cache and Draft Mode documentation, and the current branch/worktree state.
- [x] (2026-10-11 14:14Z) Confirm branch `main` and `origin/main` both point to `5cdaf21f9e71885c7c0e2e4554f7243b3b9e3ddf`, with no tracked changes and only the unrelated untracked `.agents/skills/imagen/scripts/` directory present before this ExecPlan.
- [x] (2026-10-11 14:14Z) Define the DTOs, query, mapper policies, connector/cache/tag flow, compatibility boundaries, focused tests, generated-artifact refresh, and canonical validation in this ExecPlan; no implementation file was edited.
- [x] (2026-10-11 14:20Z) Extended the raw client and its query tests with Home contact population and status-aware, ordered Location listing; `npm test -- cms/client.test.ts` passed 1 file and 2 tests.
- [x] (2026-10-11 14:20Z) Added contact and Location DTOs plus mapper validation, draft normalization, safe link construction, and focused mapper tests; `npm test -- cms/mappers.test.ts` passed 1 file and 22 tests.
- [x] (2026-10-11 14:20Z) Carried Location results through the connector and cached-read layer and added Location webhook tag selection; the tag test passed 1 file and 8 tests, and the combined focused run passed 3 files and 32 tests.
- [x] (2026-10-11 14:21Z) Updated `TYPES.md`, ran `mise run be:openapi` and `mise run fe:openapi`, and confirmed both generated files differ only in 41 native `publishedAt.default` timestamps after normalized structural comparison.
- [x] (2026-10-11 14:23Z) Ran focused and canonical validation, verified compatibility and task scope, and recorded exact results and discoveries below. The first `fe:check` reported formatter-only differences in two task-owned files; Biome fixed them, the focused mapper test was rerun, and the final canonical sequence passed.
- [x] (2026-10-11 14:27Z) Independent Reviewer approved task 02 with no actionable findings after verifying the complete pipeline, safe-link and draft/published mapper policies, Location cache/tag behavior, compatibility paths, native-only generated churn, and scope; focused tests, `fe:check`, all 76 tests, and `fe:build` passed independently.

## Surprises & Discoveries

- Observation: Context7 documentation lookup is unavailable because the account has exhausted its monthly quota.
  Evidence: `ctx7 library 'Strapi' ...` returned `Monthly quota exceeded`. The plan therefore uses the pinned generated Strapi OpenAPI contract, installed Next.js 16.3.1 documentation, and established repository behavior. If a new external-library question arises during implementation, retry only after `ctx7 login` or a project-local `CONTEXT7_API_KEY`; do not alter machine or user environment variables and do not silently substitute remembered API details.
- Observation: the generated Location response types mark `showOnHome`, `showOnAbout`, and `showOnActivity` as `boolean | null` even though the source schema makes them required with default `false`.
  Evidence: `frontend/cms/schema.d.ts` under operation `location/get/locations` contains the nullable boolean types, while `backend/src/api/location/content-types/location/schema.json` declares each field required with default `false`. The mapper therefore needs an explicit draft fallback and strict published validation rather than trusting the generated TypeScript type alone.
- Observation: the Location endpoint and Home response shape are already present in generated OpenAPI artifacts, so task 02 requires no content-type or backend source change.
  Evidence: `frontend/cms/schema.d.ts` exposes `location/get/locations`, `ContentContactMethodEntry`, Home's optional contact fields, and Location image/method population. Public `location.find` permission is intentionally absent until task 05, so live anonymous Location reads can remain HTTP 403 during this task while token-backed and mocked reads exercise the pipeline.
- Observation: the existing refresh route is model-agnostic once a model maps to tags.
  Evidence: `frontend/app/refresh/route.ts` parses accepted entry events, calls `tagsForWebhook`, and invokes `revalidateTag(tag, "days")` for every selected tag. Location invalidation therefore belongs in `frontend/cms/tags.ts`; changing the route or payload parser would duplicate established behavior.
- Observation: Next.js 16 derives a `"use cache"` entry's key from serializable function arguments, and Draft Mode bypasses cached function reads and writes.
  Evidence: the installed `frontend/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md` documents arguments as cache-key inputs and Draft Mode cache bypass. The existing pattern that reads `draftMode()` outside a cached helper and passes `"draft"` or `"published"` into it remains the correct pattern for Locations.
- Observation: refreshing the unchanged Strapi schema updates generated `publishedAt.default` timestamps throughout both OpenAPI artifacts.
  Evidence: generation changed 41 lines in `frontend/cms/schema.json` and the corresponding 41 lines in `frontend/cms/schema.d.ts`. Replacing ISO timestamps in the baseline and generated files before comparison produced no diff, proving the API structure stayed equivalent.

## Decision Log

- Decision: represent a mapped contact as `ContactMethodDto` with `kind`, trimmed `label`, trimmed display `value`, and a mapper-owned `href` whose type is `` `tel:${string}` | `mailto:${string}` ``.
  Rationale: later page components need both editor-authored text and a link they cannot accidentally construct unsafely. Keeping normalization at the mapper boundary gives one authoritative policy and avoids duplicating URI rules in Home and Location presentation.
  Date/Author: 2026-10-11 / Planner
- Decision: use a deliberately conservative contact syntax instead of attempting full RFC email parsing or accepting every telephone URI feature.
  Rationale: the site needs ordinary public phone numbers and email addresses, not extensions, pauses, URI query parameters, or quoted international mailbox syntax. A narrow accepted character set produces predictable safe links with no new dependency and rejects control characters or URI delimiters that could change link meaning.
  Date/Author: 2026-10-11 / Planner
- Decision: fail the entire published Home or Location mapping when any contact entry is malformed, but omit an invalid contact entry from draft output while retaining valid siblings in source order.
  Rationale: published CMS data is a trust-boundary contract and must not silently hide bad public values or emit unsafe links. Drafts are expected to contain partially entered component rows; omitting only those rows lets editors preview the rest of the page without the frontend inventing a phone number, email address, label, or link.
  Date/Author: 2026-10-11 / Planner
- Decision: normalize absent optional contact arrays to `[]` in both statuses; for draft Locations only, normalize absent required name/address to `""`, absent display order to `0`, and absent/null visibility switches to `false`.
  Rationale: contact lists are optional in the Strapi schema, while the draft scalar behavior matches the pipeline's existing `requiredString(..., status)` convention and the exact defaults declared by the Location schema. Published Locations remain strict, and no contact content is fabricated.
  Date/Author: 2026-10-11 / Planner
- Decision: include Strapi's stable `documentId` in `LocationDto` and validate it in both statuses.
  Rationale: Location names are not declared unique, and later list rendering needs a stable identity. `documentId` is system-owned and required in every generated Location response, so accepting a draft without it would conceal a malformed dependency response rather than accommodate editorial incompleteness.
  Date/Author: 2026-10-11 / Planner
- Decision: add one status-aware `listLocations(status)` path through client and connector, with `listLocations()` in `data.ts` selecting status from Draft Mode and delegating to a private cached helper tagged `locations`.
  Rationale: this mirrors existing collection and preview patterns, preserves the raw client → mapper → connector → cached-read architecture, and makes the status argument part of the cache key while Next.js itself bypasses the cache in Draft Mode.
  Date/Author: 2026-10-11 / Planner
- Decision: leave About's embedded facilities and Activity's embedded venues completely unchanged and do not consume Locations from any route or component yet.
  Rationale: the queue deliberately keeps those compatibility paths through task 04. Adding presentation or page integration now would cross task boundaries and could make current pages depend on records and Public permission that task 05 has not supplied.
  Date/Author: 2026-10-11 / Planner
- Decision: test query construction in `client.test.ts`, trust-boundary behavior in `mappers.test.ts`, and webhook tag selection in `tags.test.ts`; rely on type checking and the production build for the thin connector/cache wiring.
  Rationale: these are the lowest stable owners of the required behaviors. A separate connector fake family or Next.js cache mock would duplicate mapper/client assertions and add more test seam than behavior.
  Date/Author: 2026-10-11 / Planner
- Decision: run `be:openapi` and `fe:openapi` even though backend schemas do not change, but do not run `be:types` or require a backend build/startup.
  Rationale: `AGENTS.md` and the queue preamble require both OpenAPI refreshes after frontend changes and require backend type generation only when backend types change. This task changes only frontend pipeline code, tests, the existing content contract, and possibly native generated OpenAPI timestamps.
  Date/Author: 2026-10-11 / Planner

## Outcomes & Retrospective

Task 02 is implemented, validated, and independently approved with no actionable findings. Home contact copy and methods and the shared Location collection now traverse the existing client, mapper, connector, cached-read, and webhook-tag layers without any presentation or route consumer. The mapper owns trimmed, safe links, fails malformed published methods, omits malformed draft methods, and keeps non-contact draft validation strict. About facilities and Activity venues remain unchanged for task 04. All focused tests, required generators, the full 76-test frontend suite, the aggregate frontend check, the production build, normalized generated-contract comparison, and final scope checks passed and the Reviewer independently reproduced the applicable frontend gates. Tracker bookkeeping, commit, and push remain coordinator-owned.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is the Strapi 5 application and `frontend/` is the Next.js 16 application. The active branch must remain `main`. At the planning baseline, `HEAD` and `origin/main` are both commit `5cdaf21f9e71885c7c0e2e4554f7243b3b9e3ddf`; the tracked tree is clean, and `.agents/skills/imagen/scripts/` is unrelated untracked content that must not be modified, staged, or removed.

The already-generated CMS contract lives in `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`. `frontend/cms/schema.d.ts` defines `HomePageData`'s underlying response with optional `contactHeading`, `contactIntroduction`, and `contactMethods`, and defines the `/locations` response with system `documentId`, editorial strings, optional About image/text, optional Activity text, methods, ordering, and visibility switches. These files are generator outputs. Never hand-edit them; `mise run be:openapi` regenerates `schema.json`, then `mise run fe:openapi` regenerates and formats `schema.d.ts`.

The frontend pipeline has four relevant layers. `frontend/cms/client.ts` is the raw `openapi-fetch` client and owns Strapi query construction. `frontend/cms/mappers.ts` treats CMS responses as untrusted runtime values and converts them to immutable DTOs from `frontend/cms/model.ts`. `frontend/cms/connector.ts` composes raw client results with the mappers while preserving the repository's `Result` error model. `frontend/cms/data.ts` selects `draft` versus `published` from Next.js Draft Mode, caches successful connector reads with `"use cache"`, and turns `Result` failures into the values or errors expected by server components. Preserve this exact direction; do not fetch Strapi directly from a page or component.

`frontend/cms/tags.ts` is a pure mapping from Strapi webhook model names to cache tags. `frontend/app/refresh/route.ts` already authenticates webhooks, accepts entry lifecycle events, selects tags through that mapper, and calls `revalidateTag`. Thus adding Location to `tags.ts` is the complete invalidation extension; `frontend/cms/webhook.ts` and the route need no change.

`frontend/cms/client.test.ts`, `frontend/cms/mappers.test.ts`, and `frontend/cms/tags.test.ts` are Vitest files running in Node. Existing tests already use a fake `fetch` to inspect actual request URLs, exercise mapper success/failure without external processes, and verify model-to-tag selection. Extend those files rather than adding a new fixture family. Unit tests must not start Strapi, Next.js, Docker, or a browser.

The backend source schemas are already complete: Home's optional contact fields are in `backend/src/api/home-page/content-types/home-page/schema.json`; the component contract is in `backend/src/components/content/contact-method.json`; and Location is in `backend/src/api/location/content-types/location/schema.json`. Do not edit any backend file, grant Public permission, insert content, rebuild the archive, remove schemas, or add a Location-specific endpoint. `TYPES.md` is the existing human-readable content contract and currently says the new fields are not carried through the frontend; task 02 must correct only those now-stale pipeline statements while continuing to state that presentation, About/Activity migration, public permission, and archive content are pending.

“Published” means a normal public-status Strapi query and must be strict at the frontend trust boundary. “Draft” means the status used during Next.js Draft Mode and may contain incomplete editor input. “Safe link” in this plan means that the mapper chooses the scheme from the validated enum, validates a conservative address/number grammar, and constructs the URI; neither CMS input nor a component can supply or override the scheme.

## Interfaces and Dependencies

In `frontend/cms/model.ts`, add these public DTO contracts alongside the existing shared DTOs:

    export type ContactMethodKind = "phone" | "email";

    export interface ContactMethodDto {
      kind: ContactMethodKind;
      label: string;
      value: string;
      href: `tel:${string}` | `mailto:${string}`;
    }

    export interface LocationDto {
      documentId: string;
      name: string;
      address: string;
      aboutSummary?: string;
      aboutImage?: ImageDto;
      activityDetails?: string;
      contactMethods: ContactMethodDto[];
      displayOrder: number;
      showOnHome: boolean;
      showOnAbout: boolean;
      showOnActivity: boolean;
    }

Extend `HomePageDto` with optional `contactHeading?: string`, optional `contactIntroduction?: string`, and always-present `contactMethods: ContactMethodDto[]`. Do not add Locations to `HomePageDto`: Locations are a separately cached collection so one Location webhook can invalidate the shared list without coupling it to the Home singleton cache. Do not remove or change `FacilityDto`, `VenueDto`, `AboutPageDto.facilities`, or `ActivityPageDto.venues`.

In `frontend/cms/client.ts`, derive `LocationData` and `LocationListData` from `paths["/locations"]` just as the other generated response types are derived. Add `listLocations(status: ContentStatus): Promise<Result<LocationListData>>` to `CmsClient` and its frozen implementation. Add `contactMethods: true` to `homePopulate`; scalar contact heading/introduction fields require no populate expression. Implement the Location request with the existing `listQuery` helper, status passed by the caller, population of both `aboutImage` and `contactMethods`, sort `['displayOrder:asc', 'name:asc']`, and existing page size 100. The resulting request must target `/locations` and serialize these meaningful values:

    status=draft
    populate[aboutImage]=true
    populate[contactMethods]=true
    sort[0]=displayOrder:asc
    sort[1]=name:asc
    pagination[pageSize]=100

The same method called with `published` must emit `status=published`; do not create separate published and preview endpoints or client methods.

In `frontend/cms/mappers.ts`, export `toLocationDto(raw: LocationData, mediaBaseUrl: string, status: ContentStatus): Result<LocationDto>`. Reuse the existing image mapping so `aboutImage` receives the same absolute-URL, dimensions, and MIME validation as all other images. Validate `documentId` as a required string in both statuses. Map name/address with the existing draft-aware required-string policy; map optional About/Activity strings without fabrication. Require published `displayOrder` to be a non-negative integer and every published visibility field to be a boolean. For draft only, use schema defaults when these values are `null` or absent: order `0`, and every visibility switch `false`. Present but wrongly typed non-null draft order/visibility values remain validation errors; this distinction accommodates incompleteness without masking corrupted values.

Implement one private contact-list mapper used by both Home and Location. A missing or null optional list becomes `[]` for either status. A present non-array value is a validation error in either status. Preserve input order for accepted entries and deep-freeze the eventual parent DTO through the existing `resource` helper.

For every contact entry, trim outer whitespace from label and value and enforce the following complete policy:

- `kind` must be exactly `phone` or `email`.
- `label` must contain at least one non-whitespace character after trimming and must not exceed the schema limit of 120 characters.
- `value` must contain at least one non-whitespace character after trimming and must not exceed the schema limit of 255 characters.
- A phone display value may contain only ASCII digits, a single optional leading plus, spaces, horizontal tabs, parentheses, periods, and hyphens. Remove only those presentation separators, retain the optional leading plus, and require the normalized result to match an optional leading plus followed by 3 through 15 ASCII digits. The DTO keeps the trimmed display value and sets `href` to `tel:` plus the normalized value. Values containing letters, line breaks, a plus anywhere except the start, URI punctuation, or too few/many digits are invalid.
- An email must use one `@`; its local part may contain only ASCII letters, digits, `.`, `!`, `$`, `'`, `*`, `+`, `_`, `~`, or `-`; it must not start/end with `.` or contain `..`. Split the domain on `.`, require every label to be nonempty and contain only ASCII letters, digits, or internal hyphens, and forbid a label from starting or ending with `-`. This intentionally rejects spaces, controls, `%`, `?`, `#`, `/`, `&`, `=`, and other URI-changing characters. Preserve case and set `href` to `mailto:` plus the trimmed value.

When status is `published`, any entry that fails any rule must add a path-specific mapper problem and make the whole Home or Location `Result` a validation failure. When status is `draft`, an invalid entry contributes no DTO and no parent failure; valid siblings still map in their original order. This draft exception applies only to contact entries. It must not downgrade invalid image objects, non-array contact collections, bad system IDs, or wrongly typed non-null Location defaults.

Extend `toHomePageDto` to map contact methods with that shared helper and copy optional contact heading/introduction through `optionalString`. Because these fields are optional, their absence is valid in both statuses. Existing required Home fields, media rules, and draft behavior remain unchanged. A published malformed method invalidates the Home result; a draft with missing/blank/unsafe method rows omits those rows and still maps if all existing non-contact Home requirements are satisfied.

In `frontend/cms/connector.ts`, add `listLocations(status: ContentStatus): Promise<Result<LocationDto[]>>` to `CmsConnector`. Implement it through the existing `mapList`, calling the client's status-aware method and `toLocationDto(data, mediaBaseUrl, status)`. Preserve first-error behavior: one malformed published Location causes the list `Result` to fail rather than returning a partial public list.

In `frontend/cms/data.ts`, export `listLocations(): Promise<LocationDto[]>`. It must call `contentStatus()` outside the cached scope, then call a private `listLocationsCached(status)`. That helper must contain `"use cache"`, `cacheLife("days")`, `cacheTag("locations")`, and `listOrThrow(await deps.connector.listLocations(status))`. Do not add page filtering here; task 03 and task 04 will filter the same DTO list by the appropriate visibility switch.

In `frontend/cms/tags.ts`, add model `location` with collection tag `locations` and no item tag. Do not change `frontend/app/refresh/route.ts`: its existing accepted entry events and tag loop will then invalidate the cached Location list for create, update, delete, publish, and unpublish events. Do not add per-document Location tags because no read-by-ID path exists.

No dependency, package manifest, lockfile, runtime version, build task, Next.js configuration, schema, route, component, page, permission, archive, or Preview URL parser change is needed. Preview for shared Locations works through the existing Draft Mode status selected by `listLocations`; a Location has no standalone frontend preview URL in this task.

## Plan of Work

### Milestone 1: Extend and prove the raw queries

Start by recording branch, upstream, and worktree state. The only pre-existing untracked content should be `.agents/skills/imagen/scripts/`; the plan itself is the only task file before implementation. Inspect the generated `/home-page` and `/locations` operations again before editing so query keys continue to match the pinned contract.

Update `frontend/cms/client.ts` with Location response aliases, the interface/implementation method, Home method population, and the status-aware Location list query. Extend the existing single `CmsClient queries` test in `frontend/cms/client.test.ts` or add focused cases without replacing its fake-fetch pattern. Prove Home emits `populate[contactMethods]=true`; prove both draft and published Location calls use `/api/locations`; and prove image/method population, the two indexed sorts in the required order, status, and page size. Keep the general `serializeQuery` test because it owns nested and array bracket behavior.

Run only the client test after this milestone. It must fail before the query edit and pass afterward without starting an external process. This milestone is complete when the raw layer returns typed `Result<LocationListData>` values and the captured URLs prove the exact request contract.

### Milestone 2: Define DTOs and enforce the mapper boundary

Add `ContactMethodDto`, `LocationDto`, and Home's optional contact fields/list to `frontend/cms/model.ts`. In `frontend/cms/mappers.ts`, centralize contact parsing and link creation in private helpers, apply it to Home, and add `toLocationDto`. Keep helpers cohesive: one helper should own contact entry validation and link creation, one should own optional-list/status behavior, and small phone/email validators may be separate when that makes their rules readable. Do not scatter the same checks between Home and Location.

Extend `frontend/cms/mappers.test.ts` with compact raw Home and Location fixtures. At minimum, prove that a published phone value such as `" +39 (031) 123-456 "` maps to display value `"+39 (031) 123-456"` and `tel:+39031123456`, and a published email such as `" Info@Club.Example "` maps to `"Info@Club.Example"` and `mailto:Info@Club.Example`. Prove mapped contact lists and Location DTOs are frozen through the existing deep-freeze behavior.

Prove the strict public policy with representative failures rather than a combinatorial test suite: one unsafe/malformed phone, one unsafe/malformed email, and one missing/blank required contact field must make a published mapper result fail with path-specific validation causes. Prove a draft list containing the same invalid entries plus one valid entry succeeds, contains only the valid method, and invents no replacement label/value/href. Prove an incomplete draft Location maps absent name/address to empty strings and null/absent order/visibility to `0`/`false`, while the corresponding malformed published Location fails. Also prove a present invalid image or non-null wrongly typed draft default still fails so the draft exception remains bounded.

Run only the mapper test after this milestone. This milestone is complete when every DTO crossing the mapper boundary is immutable, every emitted link follows the exact scheme/grammar policy, published malformed values fail closed, and incomplete draft contacts are omitted without failing otherwise valid preview data.

### Milestone 3: Complete connector, caching, and webhook invalidation

Extend `frontend/cms/connector.ts` with the Location list method and `frontend/cms/data.ts` with the Draft Mode-aware cached read. Follow the neighboring list methods exactly so `Result` propagation, not-found-to-empty behavior, cache lifetime, and error causes stay consistent. Do not introduce another cache library or call `draftMode()` inside the private cached helper.

Add `location` → `locations` to `frontend/cms/tags.ts` and add that case to the table in `frontend/cms/tags.test.ts`. The test must assert exactly `['locations']`; existing news item-tag and unknown-model behavior must remain unchanged. No route test is required because the refresh route already delegates tag selection and iterates every returned tag.

Run the tag test and then the three focused test files together. This milestone is complete when Location values travel client → mapper → connector → cached read, published and draft calls are distinguished by the existing status argument, and accepted Location webhooks select the same tag applied by the cached read.

### Milestone 4: Reconcile documentation, generated artifacts, and full validation

Update only the stale portions of `TYPES.md`: say Home's frontend DTO now carries optional contact copy and validated contact methods; describe the `ContactMethodDto` safe-link ownership and published/draft policy; and say Location now has a status-aware DTO/read path but is not yet presented or used by About/Activity. Retain the statements that embedded facilities/venues remain authoritative through task 04 and that Public permission/archive data remain pending. Do not add a new design document or alter README content.

Run `mise run be:openapi` followed by `mise run fe:openapi` as required after frontend changes. Review both generator outputs rather than hand-editing them. Because no schema changed, the structural API surface should remain equivalent; native `publishedAt.default` timestamp churn is acceptable only if the generator produced it and a diff review confirms no accidental schema loss or new endpoint. Do not run `be:types`, because backend types did not change.

Run the complete frontend validation sequence, inspect the final diff, and update every living section of this ExecPlan with exact evidence and discoveries. Leave tracker update, commit, and push to the implement-task coordinator after independent approval. This milestone is complete when all validation passes and the diff contains only this plan, the intended pipeline/test/content-contract files, and any native OpenAPI refresh output, while every later-task and compatibility file remains unchanged.

## Concrete Steps

Run all commands from `/home/codex/src/us-alb` unless a command explicitly changes directory. Record and protect the starting state:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    git diff --check
    mise tasks

Expect branch `main`, both revisions at `5cdaf21f9e71885c7c0e2e4554f7243b3b9e3ddf`, and no tracked implementation change. Preserve `.agents/skills/imagen/scripts/` as unrelated untracked content. Do not switch branches, stage files, commit, push, or edit `TODOS2.md` as the Worker.

After updating the raw query layer, run:

    cd /home/codex/src/us-alb/frontend
    npm test -- cms/client.test.ts

Expect Vitest to report the client file passing. The captured request assertions must prove Home contact population and both status values for ordered, populated Locations.

After adding DTO and mapper behavior, run:

    cd /home/codex/src/us-alb/frontend
    npm test -- cms/mappers.test.ts

Expect every mapper case to pass. The new tests must explicitly inspect the valid `tel:` and `mailto:` strings, published validation failure, draft omission, and draft Location defaults described above.

After connector/cache/tag wiring, run:

    cd /home/codex/src/us-alb/frontend
    npm test -- cms/tags.test.ts
    npm test -- cms/client.test.ts cms/mappers.test.ts cms/tags.test.ts

Expect `location` to select exactly `locations`, unknown models still to select no tags, and all three focused files to pass with no external processes.

Refresh the required generated API artifacts from the repository root:

    cd /home/codex/src/us-alb
    mise run be:openapi
    mise run fe:openapi
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts

Both generation commands must exit zero. Do not edit the generated files manually. Record whether the diff is empty or limited to native generation metadata; investigate any structural change before continuing. Do not run `be:types` unless implementation unexpectedly changes backend types, which is outside this plan and must first be treated as a scope error.

Run all applicable canonical frontend validation:

    cd /home/codex/src/us-alb
    mise run fe:check
    cd frontend && npm test
    cd /home/codex/src/us-alb
    mise run fe:build

`fe:check` is the repository aggregate for Biome lint/format checking plus Next.js type generation and TypeScript checking. The complete Vitest suite must pass with zero failures; record the actual file and test counts rather than predicting them. The production build must complete successfully while preserving SSR + ISR. There is no `fe:test` Mise task, so `npm test` is the canonical test invocation. No backend test, Strapi startup, browser test, smoke test, end-to-end test, or deployment test is applicable to this frontend-only internal pipeline task.

Finish with contract and scope checks:

    cd /home/codex/src/us-alb
    rg -n 'contactMethods|listLocations|LocationData|displayOrder:asc|name:asc' frontend/cms/client.ts frontend/cms/client.test.ts
    rg -n 'ContactMethodDto|LocationDto|tel:|mailto:|toLocationDto' frontend/cms/model.ts frontend/cms/mappers.ts frontend/cms/mappers.test.ts
    rg -n 'listLocations|cacheTag\("locations"\)' frontend/cms/connector.ts frontend/cms/data.ts
    rg -n 'location|locations' frontend/cms/tags.ts frontend/cms/tags.test.ts
    rg -n 'facilities|content\.facility' backend/src/api/about-page/content-types/about-page/schema.json
    rg -n 'venues|content\.venue' backend/src/api/activity-page/content-types/activity-page/schema.json
    rg -n '"venue"' backend/src/components/content/schedule.json
    git diff --exit-code -- backend/src backend/types/generated frontend/app frontend/components frontend/cms/preview.ts frontend/cms/webhook.ts frontend/app/refresh/route.ts
    git diff --exit-code -- mise.toml backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
    git status --short
    git diff --check

Every search must find its intended contract. The first `git diff --exit-code` must be silent: task 02 does not change schemas, backend generated declarations, presentation, routes, Preview parsing, webhook payload parsing, or the generic refresh route. The second must prove tooling and dependencies are untouched. Final status may include this ExecPlan, `TYPES.md`, the nine intended frontend CMS source/test files, and generated OpenAPI files only if native refresh changed them; `.agents/skills/imagen/scripts/` must remain separate and untracked.

## Validation and Acceptance

Acceptance is behavior at the data-pipeline boundary:

1. Calling the raw Home client with either status populates `contactMethods` in addition to all existing Home relations. Existing Home query assertions and mappings still pass.
2. Calling `CmsClient.listLocations("draft")` or `CmsClient.listLocations("published")` requests `/locations` with the matching status, populates `aboutImage` and `contactMethods`, sorts first by ascending `displayOrder` and then ascending `name`, and requests up to 100 records.
3. A valid published Home or Location contact method maps to a frozen `ContactMethodDto` with trimmed display fields and a mapper-owned safe link. The representative phone maps to `tel:+39031123456`; the representative email maps to `mailto:Info@Club.Example`.
4. A published method with an unknown kind, blank/oversized label or value, malformed phone, or malformed email produces a validation `Result` with the failing contact path. No unsafe URI or partial public DTO is emitted, and one invalid published Location causes the connector's Location list result to fail.
5. A draft method that is missing, blank, or malformed is omitted rather than fabricated. Other valid draft methods remain in source order, and the parent maps successfully when its non-contact requirements are valid. A missing optional methods list maps to `[]` in either status.
6. An incomplete draft Location has stable `documentId`, empty name/address when those required editorial fields are absent, `0` display order when absent/null, `false` visibility switches when absent/null, optional content omitted, and only valid contacts. The same missing or malformed required values fail published mapping. Invalid non-null types and malformed present images fail in both statuses.
7. `CmsConnector.listLocations(status)` maps every raw item through `toLocationDto`; `data.listLocations()` selects the status from Draft Mode outside its cached helper; and that helper uses the existing days lifetime, the `locations` cache tag, and normal list error handling. No page, component, or route consumes it yet.
8. A valid Strapi webhook payload whose model is `location` selects exactly `['locations']`. The unchanged refresh route therefore revalidates the cached Location collection for every already-accepted entry lifecycle event. Existing model mappings, news item tags, test payload handling, and unknown-model behavior remain intact.
9. About continues to query/map/render its embedded `facilities`; Activity continues to query/map/render its embedded `venues`; schedule venue remains free text. Their schemas, DTOs, queries, mappers, pages, components, and dispatch behavior are unchanged through task 04.
10. `TYPES.md` describes the new pipeline truth without claiming presentation, Public permission, shared-location migration, archive content, or schema removal. No README or new standalone documentation is added.
11. `mise run be:openapi`, `mise run fe:openapi`, `mise run fe:check`, the complete `npm test`, and `mise run fe:build` all exit zero. Any generated diff is native output and structurally preserves the existing API. No backend/browser/E2E/deployment test is added or requested.
12. There is no dependency, stack, build-tool, Strapi version, rendering-model, content-schema, permission, archive, environment, system, firewall, Docker, branch, index, commit, or upstream change. The unrelated `.agents/skills/imagen/scripts/` directory remains untouched and untracked.

## Idempotence and Recovery

All source edits are ordinary additive TypeScript/test/documentation changes and can be retried safely. Before resuming, inspect `git status` and the relevant file diffs; do not re-add interfaces or methods that already exist. Keep the client, mapper, connector, cache, and tag changes coherent: if interrupted between layers, use TypeScript errors and the focused tests to identify the next missing interface rather than weakening types or bypassing `Result`.

OpenAPI generation is repeatable but can update native generation-time `publishedAt.default` values even without a source schema change. Always run `be:openapi` before `fe:openapi`, retain the final native output, and review structural differences. If the generated contract unexpectedly loses contact or Location fields, stop and diagnose the generator/source schema; do not patch JSON or declarations by hand. A generation failure does not authorize a backend schema, dependency, script, or environment change.

If a contact rule proves ambiguous during implementation, preserve the exact conservative policy in this plan and add a focused test before refactoring. Do not broaden accepted characters merely to make a malformed fixture pass. If a legitimate required editorial format falls outside the policy, record the concrete example and return it for plan revision rather than silently changing the public trust-boundary contract.

If validation fails, fix only task-owned frontend files and rerun the smallest failing focused test, then the full canonical sequence. Never recover with `git reset --hard`, `git checkout --`, broad file deletion, or changes to local/machine environment variables. Do not touch or clean `.agents/skills/imagen/scripts/`.

## Artifacts and Notes

The expected implementation diff is limited to this ExecPlan; `TYPES.md`; `frontend/cms/client.ts`; `frontend/cms/client.test.ts`; `frontend/cms/model.ts`; `frontend/cms/mappers.ts`; `frontend/cms/mappers.test.ts`; `frontend/cms/connector.ts`; `frontend/cms/data.ts`; `frontend/cms/tags.ts`; and `frontend/cms/tags.test.ts`. `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` may also change only as native outputs of the required refresh. No other source or generated file is expected.

During implementation, record concise evidence here: the exact focused test cases added, actual test totals, representative mapped DTO/link output, representative published validation causes, the Location request parameters captured by the fake fetch, the Location webhook tag output, generator results and any timestamp-only churn, canonical command results, and final scope assertions. Do not paste complete generated files or large build logs.

Implementation evidence (2026-10-11):

- `frontend/cms/client.test.ts` captures `/api/locations` for both `draft` and `published`, with `populate[aboutImage]=true`, `populate[contactMethods]=true`, `sort[0]=displayOrder:asc`, `sort[1]=name:asc`, and `pagination[pageSize]=100`; it also proves Home requests `populate[contactMethods]=true`.
- `frontend/cms/mappers.test.ts` proves `" +39 (031) 123-456 "` becomes display value `+39 (031) 123-456` and `tel:+39031123456`, while `" Info@Club.Example "` becomes `Info@Club.Example` and `mailto:Info@Club.Example`. It covers deep freezing, path-specific published failures for unsafe phone/email, blank label, unknown kind, and oversized value, draft omission with a valid sibling retained, non-array rejection, Location draft defaults, and strict present image/default types.
- `frontend/cms/tags.test.ts` proves model `location` selects exactly `["locations"]`. The unchanged refresh route continues to own event acceptance and revalidation iteration.
- Focused commands passed: `npm test -- cms/client.test.ts` (1 file, 2 tests), `npm test -- cms/mappers.test.ts` (1 file, 22 tests), `npm test -- cms/tags.test.ts` (1 file, 8 tests), and `npm test -- cms/client.test.ts cms/mappers.test.ts cms/tags.test.ts` (3 files, 32 tests).
- Required generation passed: `mise run be:openapi` and `mise run fe:openapi`. Both artifacts contain 41 timestamp-only replacements and no normalized structural difference. `be:types` was correctly not run because backend types did not change.
- Canonical validation passed: `mise run fe:check` checked 99 files, generated Next route types, and completed TypeScript checking; `cd frontend && npm test` passed 8 files and 76 tests; `mise run fe:build` compiled with Next.js 16.3.1 and preserved the expected partial-prerender routes for `/`, `/attivita`, `/chi-siamo`, `/notizie`, and `/notizie/[slug]`.
- Final scope checks found all planned query, DTO, mapper, cache, and tag contracts. The compatibility searches still find About `facilities`, Activity `venues`, and schedule free-text `venue`. Diff guards are clean for backend source/types, frontend app/components/preview/webhook/refresh, tooling, manifests, and lockfiles. `git diff --check` passes. Final worktree changes are limited to this ExecPlan, `TYPES.md`, the nine intended frontend CMS source/test files, and the two native generated OpenAPI artifacts; unrelated `.agents/skills/imagen/scripts/` remains untouched and untracked.
- Independent review result: `APPROVED` with no findings. The Reviewer confirmed the exact client query, shared mapper policy, connector/list failure semantics, cached Draft Mode read, Location tag selection, unchanged refresh and compatibility paths, and native-only OpenAPI timestamp changes; it reran the 32 focused tests, `mise run fe:check`, all 76 tests, and `mise run fe:build`, all successfully.

Revision note (2026-10-11, Planner): Created the initial self-contained task-02 ExecPlan from the pushed `main` baseline. It fixes the published/draft contact policy, safe URI grammar, Location draft defaults, exact pipeline interfaces, compatibility boundary, focused tests, generated-artifact refresh, and canonical validation so implementation does not defer design choices to the Worker.

Revision note (2026-10-11, Worker): Recorded completed implementation milestones, focused and canonical validation evidence, timestamp-only generator churn, final scope checks, and the remaining independent-review handoff so this living plan accurately reflects the validated worktree.

Revision note (2026-10-11, Coordinator): Recorded the independent `APPROVED` / `REVIEW_READY` handoff, reproduced validation evidence, and closure of the final review progress item. No implementation scope, technical decision, authoritative requirement, or validation result was changed.

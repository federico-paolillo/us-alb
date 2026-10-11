# Add the Strapi contact model without removing existing page fields

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this task, Strapi editors can configure optional Home contact copy and club-wide phone or email methods, and can create draft or published shared Location records containing an address plus page-specific About and Activity material. The model is additive: the existing About `facilities`, Activity `venues`, `content.facility`, `content.venue`, and the free-text venue on schedules remain intact so the current frontend continues to compile and render until queue task 04 performs the migration.

The result is observable without changing frontend behavior. The Strapi Content-Type Builder shows the new component, Home fields, and Location collection; a production Strapi start against a brand-new task-owned SQLite database reaches readiness; generated Strapi and OpenAPI types expose the new contract; and the unchanged frontend passes its checks, tests, and production build against those expanded generated types. This task does not populate contacts or locations, grant Public Location permission, carry the model through the frontend CMS pipeline, add location Preview routing, alter presentation, rebuild the demonstration archive, or remove the embedded facility and venue fields.

## Progress

- [x] (2026-10-11 13:37Z) Read `AGENTS.md`, the `TODOS2.md` preamble and task 01, all of `PLAN2.md`, all of `.agents/docs/PLANS.md`, the applicable skills, current schemas, generated contracts, build tasks, runtime configuration, installed Strapi Content-Type Builder routes, and prior repository execution evidence; confirmed branch `main` at `52899fdf9e697e5f8284adbf25cbb2b9adda3b93`, equal to `origin/main`, with only unrelated untracked `.agents/skills/imagen/scripts/` present before this plan.
- [x] (2026-10-11 13:37Z) Define the exact additive Strapi contract, official admin-authoring path, generated artifacts, protected legacy fields, bounded task scope, recovery rules, and canonical validation in this ExecPlan; no implementation file was edited.
- [x] (2026-10-11 13:42Z) Reconfirmed branch `main` at `52899fdf9e697e5f8284adbf25cbb2b9adda3b93`, equal to `origin/main`, with no tracked diff; verified the three local runtime files are ignored and untracked, port 65100 is free, no browser session is open, and the only unrelated untracked path remains `.agents/skills/imagen/scripts/`. Created unique task-owned authoring storage without reading, replacing, or exporting `backend/.tmp/data.db`.
- [x] (2026-10-11 13:54Z) Ran Strapi 5.52 development mode on `127.0.0.1:65100` with task database `task-01-contact-authoring-BEByqf`; through authenticated Playwright CLI session `task-01-contact-schema`, Content-Type Builder created `content.contact-method`, extended Home, and created Draft & Publish Location plus its standard core files. Verified the final field lists and the legacy About `facilities`, Activity `venues`, and Schedule `venue` in the builder, closed the named session, confirmed no browsers remained, and stopped Strapi cleanly.
- [x] (2026-10-11 13:57Z) Updated `TYPES.md`, regenerated backend types and both OpenAPI artifacts, and verified the generated component, Home fields, Location type/endpoints, About facilities, and Activity venues; all five protected source files remain byte-for-byte unchanged.
- [x] (2026-10-11 13:59Z) Passed every applicable canonical backend/frontend command plus the existing 63-test Vitest suite; started built Strapi on `127.0.0.1:65100` against empty database `task-01-contact-empty-validation-UxDr2P`, observed successful readiness and HTTP 204, stopped cleanly, and moved only the two task databases and Playwright artifacts to trash.
- [x] (2026-10-11 13:59Z) Audited the final source/generated/docs scope and protected paths, confirmed branch/index/HEAD/upstream and ignored ordinary runtime files are untouched, updated all living plan sections with exact evidence, and prepared the Worker handoff without staging, committing, pushing, switching branches, editing `TODOS2.md`, or beginning task 02.
- [x] (2026-10-11 14:09Z) Independent Reviewer approved task 01 with no actionable findings after checking the exact schemas, generated contracts, Content-Type Builder provenance, protected legacy fields, later-task exclusions, and living-plan evidence; isolated regeneration, backend build, frontend lint/typecheck, all 63 tests, and a self-contained frontend production build passed.

## Surprises & Discoveries

- Observation: the content-type confirmation gate is already satisfied.
  Evidence: `PLAN2.md` states, “The user has given consensus to changing Strapi content types,” and the planning prompt explicitly says this is advance confirmation and not to ask again.
- Observation: the worktree starts on the required branch with no tracked modification; the sole pre-existing item is unrelated and untracked.
  Evidence: `git status --short --branch` reports `## main...origin/main` plus `?? .agents/skills/imagen/scripts/`, and both `HEAD` and `origin/main` resolve to `52899fdf9e697e5f8284adbf25cbb2b9adda3b93`.
- Observation: Context7 documentation lookup for Strapi 5.52 was attempted but refused by quota.
  Evidence: `ctx7 library 'Strapi' ...` returned `Monthly quota exceeded`. The plan therefore relies on the pinned installed package and repository evidence rather than remembered API details. Retry after `ctx7 login` or a project-local `CONTEXT7_API_KEY` only if a new library question must be answered; do not change machine or user environment variables.
- Observation: the installed pinned Content-Type Builder supports authenticated component and content-type creation/update routes only in development mode and persists schema/API files into the source tree.
  Evidence: `backend/node_modules/@strapi/content-type-builder/dist/server/routes/admin.js` defines POST/PUT routes for `/components` and `/content-types` behind `isDevelopmentMode`; its schema builder writes `schema.json`, and its content-type service generates the normal controller, route, and service files.
- Observation: the ordinary ignored SQLite database already exists and must not be used for authoring or validation.
  Evidence: `backend/.tmp/data.db` exists. `backend/config/database.ts` joins `DATABASE_FILENAME` beneath `backend`, so each task database must use a unique relative name beneath `backend/.tmp/` rather than an absolute `/tmp` path.
- Observation: the repository has no canonical backend lint or test task and policy forbids adding or requesting Strapi backend tests.
  Evidence: `mise tasks` exposes `be:build`, `be:types`, and `be:openapi` for backend validation; frontend validation exposes `fe:check`, `fe:build`, and `fe:openapi`, while `frontend/package.json` supplies the existing Vitest command `npm test`.
- Observation: `PLAN2.md`'s broad “Work areas” paragraph mentions Public Location read permission in its first work area, but the authoritative queue deliberately assigns `location.find` permission and archive work to task 05.
  Evidence: `TODOS2.md` task 05 says “Include Public `location.find` permission,” and this prompt requires strict task-01 scope with tasks 02–06 left for later. Task 01 creates the API shape but does not mutate Public-role data.
- Observation: native OpenAPI generation may refresh generation-time `publishedAt` defaults in many otherwise unchanged schemas.
  Evidence: prior checked-in ExecPlans record this behavior for the pinned generator. Keep the final native output and inspect structural additions; do not normalize timestamps, restore an older artifact, or hand-edit generated files.
- Observation: the builder rewrites touched schemas in its own stable key order while leaving protected schemas untouched.
  Evidence: the Home save reordered `required` and `maxLength` for two existing string attributes without changing their values, while `git diff --exit-code` remained silent for About, Activity, Facility, Venue, and Schedule.
- Observation: the anticipated OpenAPI generation-time churn occurred alongside the intended structural additions.
  Evidence: `git diff` shows existing `publishedAt.default` timestamps moving from 2026-10-08 generation values to 2026-10-11 values; generated contracts also add `ContentContactMethodEntry`, Home contact fields, and `/locations` plus `/locations/{id}` operations. The artifacts were kept exactly as produced and were not hand-edited.

## Decision Log

- Decision: use the exact additive field contract specified under `Interfaces and Dependencies`, including conservative limits consistent with existing content fields.
  Rationale: the requirements name the content semantics but not every identifier or limit. Stable, descriptive names let later tasks extend the existing client → mapper → connector → cache pipeline without another schema rename, and existing 120/160/240/255-character conventions give editors useful boundaries without inventing extra validation.
  Date/Author: 2026-10-11 / Planner
- Decision: make each visibility switch required with default `false`, and make `displayOrder` required with default zero and minimum zero.
  Rationale: booleans should not have an ambiguous null state; new locations should appear nowhere until an editor deliberately opts them in. A non-negative default order matches the existing official-document ordering contract and gives task 02 a deterministic primary sort key.
  Date/Author: 2026-10-11 / Planner
- Decision: create and update the model through the authenticated Content-Type Builder UI while `strapi develop` runs against an isolated database.
  Rationale: `AGENTS.md` requires Strapi APIs or admin UI where possible, and the installed builder is the official source-persisting mechanism. A direct JSON edit is allowed only after the Worker records the exact attempted UI/API operation, observed builder limitation, affected field, and smallest necessary exception in this plan.
  Date/Author: 2026-10-11 / Planner
- Decision: preserve About `facilities`, Activity `venues`, the two referenced components, and schedule `venue` byte-for-byte in implementation-owned schema files.
  Rationale: queue task 04 owns replacement and removal. Keeping both old and new models in parallel is the explicit compatibility bridge that allows task 01 to regenerate types and still build the current frontend.
  Date/Author: 2026-10-11 / Planner
- Decision: do not add Public Location permission, Location seed records, frontend DTO/query/cache/webhook code, or a native Location Preview handler in task 01.
  Rationale: task 05 owns Public permission and archive content; tasks 02–04 own the consuming data and UI paths. A Location has no truthful standalone frontend route in task 01, so adding a Preview mapping now would open a page that cannot yet consume the draft record. Reassess shared Preview when task 02 supplies draft-aware Location reads rather than creating a misleading parallel path.
  Date/Author: 2026-10-11 / Planner
- Decision: do not change `mise.toml`, package manifests, lockfiles, dependencies, build scripts, runtime versions, or README content.
  Rationale: the current Node 24.20.0 and corrected generation scripts already support this work, and the task expressly forbids build-tooling changes. The README is not contradicted by an additive, not-yet-consumed content type.
  Date/Author: 2026-10-11 / Planner
- Decision: run the existing frontend Vitest suite but add no tests in this schema-only task.
  Rationale: generated frontend types can regress current compile-time and mapper assumptions, so the existing suite is useful regression evidence. There is no new frontend behavior to test, and repository policy expressly forbids Strapi backend tests.
  Date/Author: 2026-10-11 / Planner
- Decision: run the separately defined `fe:lint` task after `fe:check`, even though `fe:check` already invokes lint, so the Worker handoff contains explicit evidence for every applicable canonical Mise task named by the validation skill.
  Rationale: the task requires every applicable canonical validation; the extra invocation is read-only, fast, and avoids ambiguity about the standalone task while adding no test or tooling change.
  Date/Author: 2026-10-11 / Worker

## Outcomes & Retrospective

Task 01 is implemented and validated. Authenticated Content-Type Builder saves created the exact Contact Method component, appended the three optional Home fields, and created the Draft & Publish Location collection with its standard core controller, router, and service. Builder verification and source diffs prove that About facilities, Activity venues, and schedule venue remain in place. `TYPES.md` and all four generated contracts describe the additive API; the generated OpenAPI surface contains `/locations` and `/locations/{id}` while the existing frontend compiles and its 63 tests pass.

Built Strapi started successfully against a second empty SQLite database and returned HTTP 204 from `/_health`. The named browser session, browser artifacts, and both task databases are no longer in the workspace; port 65100 is free. The ordinary ignored database and env files, uploads, branch, index, commits, upstream, packages, build tooling, protected schemas, and frontend implementation files are untouched. No backend/browser/E2E/deployment test was added. Public Location permission, records/archive data, frontend CMS consumption, Preview integration, and presentation intentionally remain for later tasks. The only external documentation caveat is the recorded Context7 quota refusal; pinned installed Strapi behavior and successful native validation supplied the implementation evidence.

Independent review approved the completed task with no findings. The Reviewer reproduced backend types/build/OpenAPI generation, frontend OpenAPI/check, lint, all 63 tests, and the production frontend build in isolated copies, and separately confirmed that the initial temporary-copy symlink failure was an isolation artifact rather than a product defect. Task 01 is ready for queue bookkeeping, commit, and push.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is a Strapi 5.52.0 application and `frontend/` is a Next.js 16.3.1 application. Strapi schemas live under `backend/src/api/<api-name>/content-types/<singular-name>/schema.json`; reusable components live under `backend/src/components/<category>/`. The Content-Type Builder creates these files and, for a new API, the normal factory controller, router, and service under `backend/src/api/<api-name>/`. Generated Strapi declarations live in `backend/types/generated/components.d.ts` and `backend/types/generated/contentTypes.d.ts`. `mise run be:openapi` writes `frontend/cms/schema.json`, and `mise run fe:openapi` derives and formats `frontend/cms/schema.d.ts` from it.

The current Home schema is `backend/src/api/home-page/content-types/home-page/schema.json`. It is a Draft & Publish single type whose required hero, metric, quote, and activity-teaser fields remain in place and which now also has the optional contact copy and methods added by this task.

The current About schema is `backend/src/api/about-page/content-types/about-page/schema.json`; its required repeatable `facilities` attribute references `backend/src/components/content/facility.json`. The current Activity schema is `backend/src/api/activity-page/content-types/activity-page/schema.json`; its required repeatable `venues` attribute references `backend/src/components/content/venue.json`. `backend/src/components/content/schedule.json` separately owns a required free-text `venue` string for named sub-areas. None of those files may be changed in task 01. Their generated declarations may move or acquire new neighboring declarations when generators run, but their contracts must remain present.

`TYPES.md` is the human-readable CMS contract. Its opening count now says seven editorial types, and it documents Contact Method, the new Home fields, and Location while explicitly noting that the embedded Facility and Venue models remain until task 04. No separate design or implementation document was created.

The raw Strapi client and all behavior consuming CMS data are under `frontend/cms/`. Task 01 does not edit `frontend/cms/client.ts`, `model.ts`, `mappers.ts`, `connector.ts`, `data.ts`, `tags.ts`, `webhook.ts`, or their tests. The generated files in the same directory are the only frontend files expected to change. Because the old fields remain, current imports and typed queries should still compile unchanged.

The ignored local files `backend/.env` and `frontend/.env.development` exist, but they are not source files. Never print, stage, replace, or copy their values into evidence. The ignored ordinary database `backend/.tmp/data.db` also exists and is out of scope. Schema authoring and final startup validation use two distinct `mktemp` directories below `backend/.tmp`, explicit loopback host `127.0.0.1`, and port 65100. “Draft & Publish” means Strapi stores draft and published document states; task 01 enables it for Location but does not yet expose Location through the frontend.

## Interfaces and Dependencies

Create `backend/src/components/content/contact-method.json` through Content-Type Builder. Its UID is `content.contact-method`, display name is `Contact Method`, and collection name should be the builder-generated `components_content_contact_methods`. It has exactly three required fields: `kind`, an enumeration with stable values `phone` and `email`; `label`, a string with maximum length 120; and `value`, a string with maximum length 255. Do not put URI normalization, phone/email syntax validation, icons, ordering, or presentation fields in the component. Task 02 owns safe `tel:` and `mailto:` mapping and the deliberate incomplete-draft policy.

Update the existing Home single type through Content-Type Builder with exactly these optional attributes:

- `contactHeading`: string, maximum length 160, not required.
- `contactIntroduction`: text, not required.
- `contactMethods`: repeatable `content.contact-method`, not required and with no minimum item count.

Create a collection type with display name `Location`, singular name `location`, plural name `locations`, collection name `locations`, UID `api::location.location`, and Draft & Publish enabled. It has exactly these attributes:

- `name`: required string, maximum length 160.
- `address`: required string, maximum length 240.
- `aboutSummary`: optional text.
- `aboutImage`: optional single media field restricted to images.
- `activityDetails`: optional text.
- `contactMethods`: optional repeatable `content.contact-method`, with no minimum item count.
- `displayOrder`: required integer, minimum zero, default zero.
- `showOnHome`: required boolean, default false.
- `showOnAbout`: required boolean, default false.
- `showOnActivity`: required boolean, default false.

The builder must produce `backend/src/api/location/content-types/location/schema.json` and standard factory modules `controllers/location.ts`, `routes/location.ts`, and `services/location.ts`. Those modules call `factories.createCoreController('api::location.location')`, `factories.createCoreRouter('api::location.location')`, and `factories.createCoreService('api::location.location')`, respectively. Do not replace them with custom endpoints or low-level Strapi plumbing.

After generation, `backend/types/generated/components.d.ts` must register `content.contact-method`; `backend/types/generated/contentTypes.d.ts` must register `api::location.location` and include Home's three new attributes while retaining About facilities and Activity venues. `frontend/cms/schema.json` and `schema.d.ts` must expose standard `/locations` and `/locations/{id}` operations, Contact Method entries, the expanded Home response/request shapes, and Location request/response schemas. These generated artifacts are outputs, never hand-edited interfaces.

No new dependency is needed. Use pinned Strapi 5.52.0, the existing Content-Type Builder, current Mise Node 24.20.0, SQLite through `better-sqlite3`, the current OpenAPI generator, and current frontend toolchain exactly as installed.

## Plan of Work

### Milestone 1: Isolate authoring and preserve the compatibility bridge

Begin by recording `main`, `HEAD`, upstream, and the full worktree status. The starting tracked tree must be clean; this plan and `.agents/skills/imagen/scripts/` are expected untracked files after planning. Do not switch branches. Verify the local env files are ignored without displaying them and verify `backend/.tmp/data.db` is not selected by any command.

Create a unique relative authoring directory below `backend/.tmp`. Start Strapi with `npm run dev` from `backend/`, overriding only `HOST`, `PORT`, `DATABASE_FILENAME`, and `WEBHOOKS_NEXTJS_TARGET` process-locally. Leave the local admin password available so the bootstrap can create the isolated authoring administrator, but disable the task-irrelevant webhook by passing an empty target. Development mode is required because the installed Content-Type Builder rejects mutations outside that mode.

This milestone is complete when Strapi reports successful startup on `127.0.0.1:65100`, the authoring database path points inside a unique `backend/.tmp/task-01-contact-authoring-*` directory, and neither the ordinary database nor tracked files have been changed yet.

### Milestone 2: Author the additive model through the official admin UI

Before browser use, reread `/home/codex/.agents/skills/playwright-cli/SKILL.md` and `references/session-management.md`. Use one named headless session, `task-01-contact-schema`, with the fixed staged browser configuration; do not change browsers or create a Playwright test. Log in with the isolated administrator using shell variables sourced from the ignored backend env file while shell tracing is disabled. Never echo credentials or place expanded secret values in the plan or terminal evidence.

In Content-Type Builder, create the Contact Method component first. Then edit Home Page and append its three optional contact attributes without editing or deleting any existing attribute. Finally create the Location collection and its exact fields, ensuring Draft & Publish is enabled. Save through the UI after each coherent model operation, wait for Strapi auto-reload, take a fresh snapshot, and inspect `git status`/`git diff` after the save to prove the builder persisted the expected source files.

Verify the final component, Home, and Location field lists in the builder UI. Separately verify About still shows `facilities`, Activity still shows `venues`, and Schedule still has its text `venue`. Close only `task-01-contact-schema`, list sessions to prove it is gone, stop the development server cleanly, and retain the authoring database until generation and build have succeeded.

If the builder cannot express a required constraint, do not silently edit JSON. Record in `Surprises & Discoveries` the UI/API operation and error, record in `Decision Log` why the smallest direct edit is unavoidable, and constrain that edit to the one unsupported attribute. A stale snapshot or auto-reload is not evidence of a builder limitation; reload, take a fresh snapshot, and retry first.

This milestone is complete when the new component and Location API files and the modified Home schema are source-persisted by the builder, all protected legacy schemas are unchanged, the named session is closed, and no frontend data or presentation file has changed.

### Milestone 3: Document and regenerate the API contract

Update `TYPES.md` to say there are seven Draft & Publish editorial content types. Add a Contact Method subsection with the exact enum, fields, and limits. Extend Home's subsection with its three optional contact fields and explain club-wide ownership. Add a Location subsection with every field, default, and visibility meaning. Keep Facility and Venue documentation, and explicitly state those embedded attributes remain authoritative for the current About and Activity frontend until task 04. Do not describe later DTO, link normalization, seed values, Public permission, archive, or UI work as complete.

Run backend type generation, backend build, backend OpenAPI generation, and frontend OpenAPI generation. Review, but do not hand-edit, the four generated artifacts. Use source schemas as the authority if output is wrong, then rerun all affected generators. Accept native generation-time default changes only when structural comparison confirms they are unrelated to the intended new component, fields, and endpoint.

This milestone is complete when generated Strapi and OpenAPI contracts contain the exact new model and the old Facility/Venue surface, frontend checking can consume the enlarged contract without source changes, and no package/build configuration changed.

### Milestone 4: Prove a clean startup and all applicable builds/checks

Create a second unique SQLite directory under `backend/.tmp` and run the built Strapi application with `npm run start` on `127.0.0.1:65100`. Disable project-owned administrator and webhook creation for this validation by passing empty process-local `ADMIN_PASSWORD`, `ADMIN_PASSWORD_FILE`, and `WEBHOOKS_NEXTJS_TARGET` values. Poll `/_health` in a bounded loop. Success requires the server log to report `Strapi started successfully`, HTTP readiness, no schema/bootstrap error, and creation of the exact new database file. Stop it with Ctrl-C and remove only the resolved task-prefixed validation directory after capturing concise, secret-free evidence.

Run the final canonical sequence in the order given below. The frontend suite is regression coverage only; add no new tests. Inspect the final diff and run explicit protected-file assertions. Update this plan's living sections with actual command results and generated-artifact observations. Leave tracker updates, commit, and push to the implement-task coordinator after independent review.

This milestone is complete when all commands pass, the final diff contains only task-01 model/docs/generated artifacts plus this plan, both task databases and the named browser session are cleaned safely, the ordinary database is untouched, and `.agents/skills/imagen/scripts/` remains unrelated and untracked.

## Concrete Steps

Run all commands from `/home/codex/src/us-alb` unless a command explicitly changes directory. Record the initial state:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    git diff --check
    mise tasks
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"

Expect branch `main`, `HEAD` equal to `origin/main`, and no tracked diff. Preserve this ExecPlan and the pre-existing untracked `.agents/skills/imagen/scripts/`. The ignore checks must succeed without printing file contents.

Prepare authoring storage and start Strapi in a monitored terminal:

    mkdir -p backend/.tmp
    authoring_dir="$(mktemp -d -p backend/.tmp task-01-contact-authoring-XXXXXX)"
    authoring_db="${authoring_dir#backend/}/data.db"
    cd backend
    mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME="$authoring_db" WEBHOOKS_NEXTJS_TARGET= npm run dev

The value passed to Strapi begins `.tmp/task-01-contact-authoring-` because `backend/config/database.ts` resolves it beneath `backend`. Wait for `Strapi started successfully`. In another terminal at the repository root, use the required named browser session:

    playwright-cli -s=task-01-contact-schema open http://127.0.0.1:65100/admin
    playwright-cli -s=task-01-contact-schema snapshot

For authentication, disable shell tracing, source the ignored local file, derive the email in a shell variable, and pass only variable references to `playwright-cli fill` using fresh snapshot refs. Do not record the expanded values:

    set +x
    set -a
    . backend/.env
    set +a
    admin_email="${ADMIN_USER:-admin}@${ADMIN_DOMAIN:-example.com}"
    playwright-cli -s=task-01-contact-schema fill <email-ref> "$admin_email"
    playwright-cli -s=task-01-contact-schema fill <password-ref> "$ADMIN_PASSWORD"
    playwright-cli -s=task-01-contact-schema click <login-ref>
    unset admin_email ADMIN_USER ADMIN_DOMAIN ADMIN_PASSWORD ADMIN_PASSWORD_FILE

Navigate by snapshots and accessible labels rather than stale references. In Content-Type Builder, perform the exact model operations from `Interfaces and Dependencies`. After each save/reload, run the following from another repository-root terminal to document source persistence and protected files:

    git status --short
    git diff -- backend/src/components/content/contact-method.json backend/src/api/home-page/content-types/home-page/schema.json backend/src/api/location
    git diff --exit-code -- backend/src/api/about-page/content-types/about-page/schema.json backend/src/api/activity-page/content-types/activity-page/schema.json backend/src/components/content/facility.json backend/src/components/content/venue.json backend/src/components/content/schedule.json

The protected-file command must remain silent and exit zero. When UI verification is complete:

    playwright-cli -s=task-01-contact-schema close
    playwright-cli list

The named session must not appear. Stop the development terminal with Ctrl-C; do not use broad process killing unless the named session or exact server process is genuinely unresponsive.

Update only `TYPES.md` as described, then generate and build:

    cd /home/codex/src/us-alb
    mise run be:types
    mise run be:build
    mise run be:openapi
    mise run fe:openapi
    mise run fe:check
    cd frontend && npm test
    cd /home/codex/src/us-alb
    mise run fe:build

All commands must exit zero. There is no `be:test` or `be:lint` Mise task, no `fe:test` Mise task, and no authorization to add a backend test, browser test, smoke test, end-to-end test, or deployment test. Record the actual Vitest file/test count rather than predicting it.

For the required fresh production startup, create a different relative database and keep the server in a monitored terminal:

    cd /home/codex/src/us-alb/backend
    validation_dir="$(mktemp -d -p .tmp task-01-contact-empty-validation-XXXXXX)"
    validation_db="$validation_dir/data.db"
    mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME="$validation_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start

From another terminal, poll for at most 60 seconds with one-second intervals:

    for attempt in $(seq 1 60); do
      status="$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:65100/_health || true)"
      test "$status" = 204 -o "$status" = 200 && break
      sleep 1
    done
    test "$status" = 204 -o "$status" = 200
    test -f "$validation_db"

Stop the server with Ctrl-C. Resolve and validate cleanup targets before removing them. Because the authoring variables were created in a different shell, rediscover only exact task-prefixed directories rather than guessing or deleting `backend/.tmp`:

    cd /home/codex/src/us-alb
    for candidate in backend/.tmp/task-01-contact-authoring-* backend/.tmp/task-01-contact-empty-validation-*; do
      test -e "$candidate" || continue
      resolved="$(realpath "$candidate")"
      case "$resolved" in
        /home/codex/src/us-alb/backend/.tmp/task-01-contact-authoring-*|/home/codex/src/us-alb/backend/.tmp/task-01-contact-empty-validation-*) rm -rf -- "$resolved" ;;
        *) echo "Refusing unsafe cleanup target: $resolved" >&2; exit 1 ;;
      esac
    done

Do not remove `backend/.tmp/data.db`, any upload directory, or `backend/.tmp` itself. If startup fails, retain the exact failed directory for diagnosis and create a new uniquely named validation directory only after recording the failure.

Finish with structural and scope checks:

    cd /home/codex/src/us-alb
    test -e backend/src/components/content/contact-method.json
    test -e backend/src/api/location/content-types/location/schema.json
    test -e backend/src/api/location/controllers/location.ts
    test -e backend/src/api/location/routes/location.ts
    test -e backend/src/api/location/services/location.ts
    rg -n 'contactHeading|contactIntroduction|contactMethods' backend/src/api/home-page/content-types/home-page/schema.json
    rg -n 'phone|email|label|value' backend/src/components/content/contact-method.json
    rg -n 'aboutSummary|aboutImage|activityDetails|displayOrder|showOnHome|showOnAbout|showOnActivity' backend/src/api/location/content-types/location/schema.json
    rg -n 'facilities|content\.facility' backend/src/api/about-page/content-types/about-page/schema.json
    rg -n 'venues|content\.venue' backend/src/api/activity-page/content-types/activity-page/schema.json
    rg -n '"venue"' backend/src/components/content/schedule.json
    rg -n "content\.contact-method|api::location\.location" backend/types/generated/components.d.ts backend/types/generated/contentTypes.d.ts
    rg -n 'locations|ContactMethod|Location' frontend/cms/schema.json frontend/cms/schema.d.ts
    git diff --exit-code -- mise.toml backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
    git diff --exit-code -- backend/config/admin.ts backend/src/api/about-page/content-types/about-page/schema.json backend/src/api/activity-page/content-types/activity-page/schema.json backend/src/components/content/facility.json backend/src/components/content/venue.json backend/src/components/content/schedule.json frontend/cms/client.ts frontend/cms/model.ts frontend/cms/mappers.ts frontend/cms/connector.ts frontend/cms/data.ts frontend/cms/tags.ts frontend/cms/webhook.ts
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"
    playwright-cli list
    git status --short
    git diff --check

Each existence/search command must find its intended contract. Both `git diff --exit-code` commands must be silent. No named schema-authoring browser session may remain. `git status` should show this ExecPlan; `TYPES.md`; the Home schema; the new Contact Method and Location API; the four generated artifacts; and the unrelated untracked image-tool directory. It must not show tooling, package, lockfile, env, ordinary database, About/Activity/component compatibility files, archive, or frontend implementation changes.

## Validation and Acceptance

Acceptance is behavioral and contract-based:

1. The consent recorded in `PLAN2.md` is cited as the confirmation for content-type changes; no duplicate confirmation is requested.
2. Authenticated Content-Type Builder operations in development mode, performed through the named Playwright CLI session, create the component, extend Home, and generate the Location API. The living plan records concise evidence of the builder operations. There is no direct schema authoring unless a specific builder failure and minimal exception are recorded first.
3. `content.contact-method` contains only required `kind`, `label`, and `value`; `kind` accepts only `phone` and `email`; label/value limits are 120/255. Home owns optional `contactHeading`, optional `contactIntroduction`, and optional repeatable `contactMethods` without a minimum.
4. `api::location.location` is a Draft & Publish collection with required name/address, optional About summary/image, optional Activity details, optional repeatable contact methods, non-negative display order defaulting to zero, and required false-by-default visibility switches for Home, About, and Activity. Its standard core controller, router, and service exist.
5. About's required repeatable `facilities` still references `content.facility`; Activity's required repeatable `venues` still references `content.venue`; schedule `venue` remains required free text. Their source schema/component files have no diff. The current frontend therefore retains the contract it needs through task 04.
6. `TYPES.md` accurately describes seven Draft & Publish editorial types, the new component, new Home fields, Location fields/defaults, and the temporary old/new overlap. It does not claim later pipeline, presentation, permission, or archive work is finished.
7. `mise run be:types`, `mise run be:build`, `mise run be:openapi`, `mise run fe:openapi`, `mise run fe:check`, `cd frontend && npm test`, and `mise run fe:build` all pass. Generated artifacts contain the new model and endpoint while retaining existing fields. Actual test totals and any native OpenAPI timestamp churn are recorded.
8. The built Strapi application starts on `127.0.0.1:65100` against a second brand-new task-owned SQLite file, reports successful startup, answers `/_health` with HTTP 200 or 204, and stops cleanly without schema or bootstrap errors. This is native startup evidence, not a backend test.
9. No backend test, browser test, smoke test, end-to-end test, deployment test, custom endpoint beyond the builder-generated core Location API, Public Location permission, seed/archive edit, Location record, DTO, query, mapper, connector, cache tag, webhook mapping, Preview mapping, frontend route, or presentation change is introduced.
10. `mise.toml`, package manifests, lockfiles, dependencies, scripts, runtime versions, `backend/config/admin.ts`, and README are unchanged. Services bind only to loopback in the permitted 65100–65199 range, and no machine/user environment, system configuration, firewall, or Docker state changes.
11. The ordinary ignored database, local env files, uploads, current branch, index, commits, and upstream are untouched. Both task-owned database directories and the named browser session are gone after successful validation. Unrelated `.agents/skills/imagen/scripts/` remains untracked and excluded.

## Idempotence and Recovery

The schema operations are model-idempotent but should not be replayed blindly. On resume, inspect the builder and source tree first: create missing structures, edit partially persisted structures, and do nothing to already-correct attributes. Strapi auto-reloads after builder saves, so stale browser references are normal; wait for readiness, reload, and take a new snapshot. Do not create duplicate fields or a second component/collection under a different name.

The authoring and validation databases are disposable and intentionally distinct. An interrupted authoring session can resume against its retained task database after confirming the process and browser state; a failed empty-start validation should be retained for diagnosis, then repeated with a new unique prefix. Never recover by using or deleting `backend/.tmp/data.db`, deleting all of `backend/.tmp`, resetting the worktree, or overwriting a local env file.

Generators are safely repeatable, but native OpenAPI output can change generation-time defaults. Always regenerate from the corrected source model in the prescribed order and keep the final native output. If `fe:check` or `fe:build` fails because the current frontend lost an old generated field, treat that as evidence that a protected schema was accidentally changed; restore the specific old attribute through Content-Type Builder, then regenerate. Do not patch generated declarations or frontend implementation to hide the error.

If a Content-Type Builder limitation is genuine, preserve its output and record the exact failure before a minimal direct schema edit. Then rerun backend type generation, backend build, empty-database startup, both OpenAPI generators, frontend check/tests/build, and all protected-file assertions. The exception does not authorize broader direct JSON work.

If a service or browser session remains after interruption, identify the exact port/process or named session and stop only that target. `playwright-cli kill-all` is a last resort for an unresponsive daemon, not normal cleanup. Resolve every recursive cleanup target with `realpath` and require one of the two exact task prefixes before removal.

## Artifacts and Notes

The expected implementation diff is intentionally small. It adds `backend/src/components/content/contact-method.json` and the four normal Location API files, modifies only the Home schema and `TYPES.md`, and refreshes `backend/types/generated/components.d.ts`, `backend/types/generated/contentTypes.d.ts`, `frontend/cms/schema.json`, and `frontend/cms/schema.d.ts`. This ExecPlan is also part of the workflow diff. Builder formatting determines the exact JSON key order.

Record concise evidence here during implementation: the task database basenames rather than secrets; the named builder session and fields observed; the source files persisted after each save; actual generator/build/check/test exit results; the empty-start readiness line and health status; generated schema symbols/endpoints; and final protected-file/scope checks. Do not paste credentials, env contents, complete logs, generated files, or large snapshots.

Implementation evidence is complete. Development authoring used database `task-01-contact-authoring-BEByqf` and named browser session `task-01-contact-schema`. Content-Type Builder logged creation of `backend/src/components/content/contact-method.json`, the three standard Location factory modules, and `backend/src/api/location/content-types/location/schema.json`, plus modification of only the Home schema. Final builder views showed Contact Method fields `kind`, `label`, and `value`; Home fields `contactHeading`, `contactIntroduction`, and `contactMethods`; all ten Location fields; About `facilities`; Activity `venues`; and required text Schedule `venue`. The session then closed with `playwright-cli list` reporting `(no browsers)`.

The exact validation commands and outcomes were:

    mise run be:types
      PASS — generated content and component declarations; 0 warnings, 0 errors.
    mise run be:build
      PASS — TypeScript and the Strapi admin panel compiled.
    mise run be:openapi
      PASS — generated frontend/cms/schema.json.
    mise run fe:openapi
      PASS — openapi-typescript generated schema.d.ts and Biome formatted both artifacts.
    mise run fe:check
      PASS — Biome checked 99 files; Next route type generation and tsc completed.
    cd frontend && npm test
      PASS — 8 test files and 63 tests passed.
    mise run fe:build
      PASS — Next.js 16.3.1 production build compiled, type-checked, and generated 12 static shells while retaining dynamic/partial rendering markers.
    mise run fe:lint
      PASS — Biome checked 99 files with no fixes.
    cd backend && mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME=.tmp/task-01-contact-empty-validation-UxDr2P/data.db ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start
      PASS — Strapi 5.52.0 logged `Strapi started successfully`; GET /_health returned HTTP 204 and the new database file existed.

Final structural searches found `content.contact-method`, `api::location.location`, `ContentContactMethodEntry`, Home contact fields, and Location operations in the four generated artifacts while retaining generated facilities and venues. An inline Node JSON assertion checked the exact component field set, Home optionality, Location identity/field set/constraints/defaults, and passed; factory searches found the exact core controller/router/service calls. Both protected `git diff --exit-code` commands were silent, `git diff --check` passed, the index was empty, branch/HEAD/upstream were unchanged, task database globs and `.playwright-cli` were absent, port 65100 had no listener, and the only unrelated untracked path remained `.agents/skills/imagen/scripts/`.

Independent review result: `APPROVED` with no actionable findings. Review evidence included exact contract assertions; protected-field and task-scope checks; generated surface comparison; isolated backend types/build/OpenAPI; isolated frontend OpenAPI/check/lint, 8 files and 63 tests, and production build; and confirmation that the branch, index, port, and unrelated untracked image helper remained unchanged.

At handoff, the implement-task coordinator—not the Worker—will arrange independent review, update `TODOS2.md` only after approval, and own commit/push bookkeeping. The implementation role must stay on `main`, must not stage or commit, and must not begin task 02.

Revision note (2026-10-11 / Planner): Created the initial self-contained task-01 ExecPlan after repository, installed-tooling, schema, generated-contract, and validation inspection. Resolved the queue-vs-broad-plan permission boundary in favor of the selected task, recorded the existing content-type consent, and made the official builder workflow plus legacy-field preservation explicit. No implementation file was changed.

Revision note (2026-10-11 / Worker): Kept the plan current through implementation and validation: recorded the official Content-Type Builder operations, builder formatting and native OpenAPI timestamp observations, exact canonical command outcomes, empty-database readiness evidence, task-owned cleanup, final scope audit, remaining later-task boundaries, and completed retrospective.

Revision note (2026-10-11 / Coordinator): Recorded independent Reviewer approval, the reproduced validation evidence, and closure of the review-related progress item after the `APPROVED` / `REVIEW_READY` handoff. No implementation scope, technical decision, requirement, or validation claim was changed.

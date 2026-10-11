# Rebuild and verify the demonstration archive

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

After this task, importing `backend/seed-data/us-albatese-demo.tar.gz` into a new Strapi 5.52 database produces the complete existing demonstration site plus two published shared Locations and safe fictional contact data. The two Locations retain the names, addresses, About summaries/images, and Activity details that the stale archive stored separately as About facilities and Activity venues. Both Locations are visible on Home, About, and Activity; Home has a club-wide `.example` email and clearly fictional phone; and each Location has its own `.example` email and clearly fictional phone. Anonymous readers can retrieve the published Home singleton and ordered Location collection because the archive adds only the required Public `location.find` action while retaining the six existing Public `find` actions.

The result is observable through Strapi's native data-management flow. First, import a protected copy of the old archive into an isolated authoring database, acknowledging only its already-known schema differences. Use Strapi's Document Service, upload records, and users-permissions role service to perform the current-schema transformation. Export a new unencrypted gzip archive containing only content and files. Then import that candidate into a second database whose file did not previously exist, require a warning-free current-schema transfer with matching entity/link/asset totals, start Strapi only on `127.0.0.1:65100`, and make unauthenticated REST requests that prove the published Home contacts, exactly two Locations, every existing demonstration collection, and every referenced media file survived.

The final archive must contain no administrator account, API token, transfer token, session, environment file or sensitive local environment value, configuration stream, webhook configuration, or other secret-bearing runtime state. This task updates the archive and the now-stale Location/archive statements in `TYPES.md`; it does not change a schema, generated contract, backend or frontend source behavior, dependency, build tool, runtime, external CMS instance, or task-06 release gate.

## Progress

- [x] (2026-10-11 15:47Z) Read `AGENTS.md`, `frontend/AGENTS.md`, the `TODOS2.md` preamble and task 05, all of `PLAN2.md`, all of `.agents/docs/PLANS.md`, the completed task-01 through task-04 ExecPlans, the earlier archive-construction ExecPlan, and the `implement-task` and `canonical-validation` skills.
- [x] (2026-10-11 15:47Z) Confirm branch `main`, `HEAD`, and `origin/main` all resolve to pushed commit `d80d2c6ba8fe5ad27b5fa5e878da260f38be7520`, with no tracked change, port 65100 unused, and only unrelated untracked `.agents/skills/imagen/scripts/` present before this plan.
- [x] (2026-10-11 15:47Z) Use Context7 successfully for current Strapi data-management documentation, inspect the installed Strapi 5.52 CLI help and transfer implementation, and inspect the current archive, schemas, bootstrap behavior, upload provider, frontend public queries, and canonical tasks.
- [x] (2026-10-11 15:47Z) Define the isolated stale-archive authoring import, exact Strapi API transformation, content/media/permission invariants, safe export, extracted-payload audit, fresh-import proof, public REST acceptance, cleanup, and strict task-05 scope in this ExecPlan; no implementation file was edited.
- [x] (2026-10-11 16:01Z) Imported protected stale-archive copies only into isolated authoring databases, observed exactly the nine approved schema-integrity differences and 55 entities / 43 assets / 108 surviving links, and restored the one-file ordinary upload tree byte-for-byte between attempts.
- [x] (2026-10-11 16:02Z) Through the temporary Strapi Document Service/upload-query/role-service module, preserved the published 1/1/1/3/6/3 editorial baseline and 11 media records, added the exact Home contacts, derived/published the exact two shared Locations with four local contacts and reused images, and changed Public from six to seven actions by adding only `api::location.location.find` while leaving Authenticated at five.
- [x] (2026-10-11 16:03Z) Exported the current-schema candidate with official `content,files` transfer, then audited 38 schemas, 60 entities, 118 links, 11 media records, and 43 binaries; the allowlist, recursive forbidden-key, configuration/webhook/account/token/session, archive-path, and 24-value local-env scan all reported zero forbidden matches.
- [x] (2026-10-11 16:07Z) Imported the candidate into distinct absent database `task-05-demo-verification-cSMXN9` with equal 60/118/43 transfer totals and zero warning/skipped/orphan/missing/stale diagnostics; built and started Strapi on loopback, received health 204, proved all seven anonymous resources and exact content counts, fetched all 43 discovered media URLs with HTTP 200 and correct MIME, matched all 43 binary hashes, verified Public 7 / Authenticated 5, and found zero webhooks/admin users/content users/transfer tokens.
- [x] (2026-10-11 16:09Z) Updated `TYPES.md`, promoted and re-audited the byte-identical accepted candidate, passed `be:build` and strict scope/state checks, restored ordinary uploads exactly, stopped port 65100, and moved only resolved task-05 workspaces/logs to trash; did not edit `TODOS2.md`, stage, commit, push, switch branches, or begin task 06.
- [x] (2026-10-11 16:26Z) Independent Reviewer approved with no findings after direct archive/preservation/security inspection, a fresh native import, anonymous API and 43-file media verification, `mise run be:build`, and cleanup/state checks. Remediation cycles: 0.

## Surprises & Discoveries

- Observation: Context7 access now works and confirms the native transfer boundary used here.
  Evidence: `ctx7 library Strapi <full task question>` selected the high-reputation `/strapi/documentation` package. Two `ctx7 docs` calls state that export/import archives contain schemas, entities, links, assets, optional configuration, and metadata; `--no-encrypt` produces an inspectable archive; import deletes destination data/uploads; schemas must match unless the CLI's confirmed difference path is accepted; and admin users and API tokens are not exported.
- Observation: the installed pinned CLI has the exact current flags needed and makes `content,files` semantics explicit.
  Evidence: `npm run strapi -- export --help` documents `--no-encrypt --only content,files`; `npm run strapi -- import --help` documents `--force --only content,files`. Both say schemas are always included, `content` includes entities/links and media-library records, `files` includes upload binaries, and `config` is a separate core-store/webhook stream.
- Observation: the existing archive is valid but intentionally stale after task 04.
  Evidence: its SHA-256 is `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`; it contains 55 entity rows, 112 links, 11 media records, 43 upload binaries, old About `facilities` and Activity `venues`, no Location entity, and no Home contact fields. Its top level has `schemas`, `entities`, `links`, `assets`, and `metadata.json`, with no `configuration` directory.
- Observation: the published old About and Activity documents contain two one-to-one location pairs with matching names and addresses.
  Evidence: both contain `Centro Sportivo Giallonero` at `Via della Comunità 68, Albate (CO)` and `Cortile Sportivo dell'Oratorio` at `Piazza del Gioco 7, Albate (CO)`. About supplies `summary` and image links; Activity supplies `details`. The published facility component ids link to media-library ids whose names are `campo-calcio-placeholder.png` and `impianto-oratorio-placeholder.png`.
- Observation: the current archive has exactly the permission baseline task 05 must preserve.
  Evidence: joining users-permissions entities to role links yields six Public actions, all `find` actions for Home, About, Activity, News, Calendar, and Official Documents. Five unrelated default actions belong to the Authenticated role, not Public. Task 05 adds `api::location.location.find` to Public and leaves both preimages otherwise unchanged.
- Observation: the installed import command deliberately permits known schema differences under `--force` rather than requiring an old-schema checkout or direct database manipulation.
  Evidence: `backend/node_modules/@strapi/strapi/dist/src/cli/commands/import/action.mjs` registers the schema-difference handler with the `force` option. The handler warns which source-only fields will not transfer and continues after confirmation. This is suitable only for the first authoring import of the stale archive; the final candidate import must have matching schemas and no such warning.
- Observation: official transfer and the local upload provider can affect all of `backend/public/uploads`, even when the SQLite database is task-owned.
  Evidence: Context7 warns that import deletes destination data and uploads, and installed `@strapi/data-transfer` backs up/replaces the local upload directory. The upload provider has no task-specific root setting. The plan must therefore move the complete ordinary upload directory aside and restore it exactly around each import, as the earlier archive workflow successfully did.
- Observation: Strapi filters every `admin::` content type from transfer, but a fresh local Strapi load can create local admin RBAC and default API-token records independently of the payload.
  Evidence: the installed CLI's `IGNORED_CONTENT_TYPE_PREFIXES` contains `admin::`; prior isolated validation of this exact pinned release observed locally bootstrapped admin roles/permissions and two default API tokens. Archive absence must be proved from the extracted payload, not inferred from destination database totals. `ADMIN_PASSWORD=` and `WEBHOOKS_NEXTJS_TARGET=` disable the project-owned administrator user and webhook bootstrap, not Strapi's internal defaults.
- Observation: no API/schema generator is appropriate for this task.
  Evidence: task 05 changes content, one Public permission, the tracked archive, `TYPES.md`, and this ExecPlan only. The source Location/Home schemas and all generated Strapi/OpenAPI declarations already contain the required fields and endpoint. Regeneration would add no contract proof and may create the known volatile OpenAPI timestamp churn.
- Observation: the initial semantic-preservation audit was stricter than its Document Service query population and therefore failed safely after mutation even though content was present.
  Evidence: the first attempt omitted Home repeatable/single components and the second attempted to populate the scalar Blocks field `content`; both failures occurred in isolated authoring databases after ordinary uploads had been parked, and each database/upload tree was retained as task evidence rather than repaired. The accepted third attempt explicitly populated only component fields, passed the complete semantic comparison, and alone produced the candidate.
- Observation: built Strapi recreates the tracked zero-byte `public/uploads/.gitkeep` marker alongside imported media.
  Evidence: the verified upload directory held the 43 candidate media binaries plus `.gitkeep`; the media manifest comparison intentionally excluded only that zero-byte repository marker and matched path, size, and SHA-256 for all 43 archive assets. The public response recursively exposed all 43 binaries and every URL returned HTTP 200.

## Decision Log

- Decision: use two different official imports: a forced stale-archive import only to establish the authoring database, then a warning-free current-schema import as acceptance.
  Rationale: the old archive is the authoritative content/media source, while the source tree is already on the final schema. Strapi 5.52 can discard the two removed component fields during the first import without changing schemas. The task is not complete until the re-exported archive imports into another empty current-schema database without schema differences, skipped links, orphan warnings, or missing assets.
  Date/Author: 2026-10-11 / Planner
- Decision: derive Location data from the extracted published archive rows and their link records rather than manually retyping the old summaries/details or relying on the removed fields after import.
  Rationale: the forced import necessarily drops source-only Facility/Venue fields. Reading the protected archive before import preserves an auditable source of truth: match the two published facility/venue entries by exact name and address, map `summary` to `aboutSummary`, `details` to `activityDetails`, and resolve each facility image through its archived media link and stable media-library name.
  Date/Author: 2026-10-11 / Planner
- Decision: perform the transformation with a temporary task-owned Node module that loads the pinned Strapi application and calls Document Service, the upload/media query API, and the users-permissions role service.
  Rationale: these are official Strapi mechanisms, enforce the current model and relation behavior, and are reproducible without browser automation. The module is temporary build machinery under an ignored unique task directory, is created with `apply_patch`, and is removed after evidence is captured. It must never issue SQL, edit schema JSON, patch an exported JSONL payload, or become a production endpoint/script.
  Date/Author: 2026-10-11 / Planner
- Decision: use the following exact fictional contacts and no personal data.
  Rationale: `.example` is reserved for examples, and the all-zero Italian-style number blocks are visibly non-real while satisfying the existing conservative phone mapper. Explicit values make archive review deterministic.
  Date/Author: 2026-10-11 / Planner

      Home phone: label `Telefono segreteria`, value `+39 000 000 0000`
      Home email: label `Email segreteria`, value `segreteria@usalbatese.example`
      Centro phone: label `Telefono Centro Sportivo`, value `+39 000 000 0101`
      Centro email: label `Email Centro Sportivo`, value `centro@usalbatese.example`
      Cortile phone: label `Telefono Cortile Sportivo`, value `+39 000 000 0202`
      Cortile email: label `Email Cortile Sportivo`, value `oratorio@usalbatese.example`

- Decision: set `showOnHome`, `showOnAbout`, and `showOnActivity` true for both Locations; derive About/Activity truth from old membership and opt both into Home deliberately.
  Rationale: each old record appeared on both About and Activity, so those switches truthfully preserve behavior. Task 03 already renders visible Locations in Home's contact section, and the demonstration dataset is supposed to show the completed feature. The old source order becomes display orders 0 and 10 and remains stable under the existing secondary name sort.
  Date/Author: 2026-10-11 / Planner
- Decision: update Home through `strapi.documents('api::home-page.home-page').update` with `status: 'published'`, and create both Locations through `strapi.documents('api::location.location').create` with `status: 'published'`.
  Rationale: Document Service owns Draft & Publish semantics and creates coherent draft/published entries and component/media relations. Setting or copying `publishedAt` directly would bypass that ownership.
  Date/Author: 2026-10-11 / Planner
- Decision: add Location permission by merging one enabled action into the loaded Public role, then compare action sets before and after.
  Rationale: the requirement is to preserve existing Public permissions, not reset the role. The after-set must equal the six-action preimage plus only `api::location.location.find`; Authenticated permissions must remain byte-for-byte equivalent by action set, and no `findOne` or mutation action is enabled.
  Date/Author: 2026-10-11 / Planner
- Decision: export `--only content,files --no-encrypt` with gzip compression and reject any configuration stream.
  Rationale: content includes editorial documents, component/media links, users-permissions roles and permissions, and media-library records; files include the binaries. Omitting `config` excludes core-store and webhook configuration. An unencrypted `.tar.gz` can be audited for forbidden content before promotion.
  Date/Author: 2026-10-11 / Planner
- Decision: preserve every existing demonstration document and all 11 original media records/43 binaries, reusing the two existing facility images as Location `aboutImage` relations.
  Rationale: no new media is needed. Semantic comparison against the legacy archive, current-schema Document Service reads, public REST reads, and asset hash comparison give stronger evidence than merely checking import exit status.
  Date/Author: 2026-10-11 / Planner
- Decision: run native archive assembly/import/API verification plus `mise run be:build`, but no generators, frontend suite/build, backend tests, browser tests, or release gates.
  Rationale: the changed product artifact is backend demonstration data, not a source/API interface or frontend implementation. Native transfer and public REST are the stable owning boundary, and `be:build` is the defined applicable backend compilation task. Task 06 explicitly owns the full frontend/revalidation/navigation/release validation later.
  Date/Author: 2026-10-11 / Planner
- Decision: treat only the 43 archive-owned upload files as transfer binaries and preserve `.gitkeep` as a repository directory marker, not media content.
  Rationale: native build/start recreates `.gitkeep`, it has no upload record or public URL, and excluding that single known zero-byte marker lets the authoritative comparison prove every candidate asset without deleting a tracked ordinary-state file or misreporting it as stale media.
  Date/Author: 2026-10-11 / Worker

## Outcomes & Retrospective

Task 05 implementation, Worker validation, and independent review are complete with no findings and zero remediation cycles. The rebuilt archive is a native current-schema `content,files` export with exact Home/Location fictional contacts, two derived published Locations, Public Location collection read, preserved editorial/media content, and no configuration or secret-bearing payload. A separate absent database imported it without warnings, built Strapi served every resource anonymously, and all 43 media binaries passed HTTP/MIME/hash verification. `TYPES.md` now states the archive/permission truth. Task workspaces and transfer logs are removed, ordinary uploads are restored exactly, and port 65100 is free. Source, schemas, generated artifacts, packages, tooling, frontend behavior, task 06, branch/index/history/upstream, ordinary database/env files, and unrelated Imagen scripts remain untouched.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0 and `frontend/` is Next.js 16.3.1. The active branch is `main`; at planning time both local and upstream point to `d80d2c6ba8fe5ad27b5fa5e878da260f38be7520`. The unrelated untracked directory `.agents/skills/imagen/scripts/` must not be edited, moved, staged, cleaned, or included in task evidence.

The tracked stale archive is `backend/seed-data/us-albatese-demo.tar.gz`. It is ignored by the broad `backend/.gitignore` `*.gz` rule but remains tracked because an earlier commit added it. Do not edit it in place or replace it until a candidate has passed the separate empty-database import. Copy it into a unique task workspace first and retain the original tracked file as the recoverable fallback until promotion.

Strapi's ordinary ignored SQLite database is `backend/.tmp/data.db`; ordinary ignored environment files include `backend/.env` and `frontend/.env.development`; and the local upload provider writes to `backend/public/uploads`. Never import into, export from, inspect through SQL, overwrite, delete, or expose the contents of the ordinary database or env files. Local env files may be read only inside a purpose-built secret scanner that never prints values. Authoring and verification use separate directories named `backend/.tmp/task-05-demo-authoring-*` and `backend/.tmp/task-05-demo-verification-*`, each with its own `data.db`. All server processes bind only `127.0.0.1:65100` and are stopped before the next phase.

The current schemas are final. `backend/src/api/home-page/content-types/home-page/schema.json` has optional `contactHeading`, `contactIntroduction`, and repeatable `content.contact-method` entries. `backend/src/api/location/content-types/location/schema.json` is a Draft & Publish collection with required name/address, optional About summary/image and Activity details, optional methods, non-negative display order, and required Home/About/Activity switches. The old `content.facility` and `content.venue` component files and singleton attributes no longer exist. Schedule's `venue` remains unrelated required free text. No schema file may change.

The old archive stores two draft/published rows for each singleton. Select the About and Activity rows whose `publishedAt` is non-null. Their component arrays contain the authoritative legacy values. Archive media relations are separate rows in `links/links_00001.jsonl`: a Facility component is on the `right` and a `plugin::upload.file` id is on the `left`. Resolve that media id through the upload entity in `entities/entities_00001.jsonl`, then resolve the same media after import by exact `name`, not by an old numeric id. Numeric ids are transfer-local and must not be assumed stable.

`backend/src/index.ts` runs two project bootstraps. `ensureDefaultAdmin` creates an administrator only when `ADMIN_PASSWORD` or `ADMIN_PASSWORD_FILE` resolves to a value. `ensureNextJsWebhook` creates a webhook only when `WEBHOOKS_NEXTJS_TARGET` is set. Every task Strapi invocation sets `ADMIN_PASSWORD=`, `ADMIN_PASSWORD_FILE=`, and `WEBHOOKS_NEXTJS_TARGET=` process-locally. This does not alter an env file and prevents task-created administrator and webhook state. Other required Strapi salts/keys continue to come from ignored project-local configuration and must never be printed.

`frontend/cms/client.ts` defines the public request shapes that acceptance must mirror. Home uses `status=published` and populates `contactMethods` along with its existing media/components. Locations use `/api/locations`, `status=published`, `populate[aboutImage]=true`, `populate[contactMethods]=true`, `sort[0]=displayOrder:asc`, `sort[1]=name:asc`, and `pagination[pageSize]=100`. The frontend sends no token in normal public mode, so acceptance requests also send no `Authorization` header.

An “authoring import” in this plan is the first import of the stale archive. Known source/destination differences are expected there because current Location/Home fields did not exist in the archive and old Facility/Venue fields no longer exist in the destination. A “verification import” is the later import of the newly exported candidate into another absent database file. No schema difference, warning, skipped/orphaned link, missing target, or missing/stale asset is acceptable in the verification import.

## Interfaces and Dependencies

The final published Home document retains every existing field and gains these exact values:

    contactHeading: Contatti
    contactIntroduction: Scrivi o telefona alla segreteria, oppure contatta direttamente una delle nostre sedi.
    contactMethods, in order:
      phone / Telefono segreteria / +39 000 000 0000
      email / Email segreteria / segreteria@usalbatese.example

The temporary transformation module derives exactly two Location documents. The first uses the first published legacy facility and matching venue; the second uses the second. It must reject zero, one, three, duplicate, or unmatched entries instead of guessing. The expected result is:

    Centro Sportivo Giallonero
      address: Via della Comunità 68, Albate (CO)
      aboutSummary: Campo principale e spazi di servizio per allenamenti e gare della stagione.
      aboutImage: existing campo-calcio-placeholder.png media record
      activityDetails: Campo a undici, area di allenamento e anello per la preparazione atletica.
      contactMethods, in order:
        phone / Telefono Centro Sportivo / +39 000 000 0101
        email / Email Centro Sportivo / centro@usalbatese.example
      displayOrder: 0
      showOnHome: true
      showOnAbout: true
      showOnActivity: true

    Cortile Sportivo dell'Oratorio
      address: Piazza del Gioco 7, Albate (CO)
      aboutSummary: Campo polivalente e punto d'incontro per attività di base e giornate associative.
      aboutImage: existing impianto-oratorio-placeholder.png media record
      activityDetails: Spazio polivalente dedicato alle attività di base e agli incontri comunitari.
      contactMethods, in order:
        phone / Telefono Cortile Sportivo / +39 000 000 0202
        email / Email Cortile Sportivo / oratorio@usalbatese.example
      displayOrder: 10
      showOnHome: true
      showOnAbout: true
      showOnActivity: true

The Public role action set after transformation is exactly the previous Public set plus:

    api::location.location.find

The complete expected Public set is therefore the seven `find` actions for Home, About, Activity, News, Calendar, Official Documents, and Location. Do not enable Location `findOne`; do not change Authenticated role actions; do not add users, authentication records, upload permissions, or mutation actions.

The temporary module lives only beneath the unique authoring directory. Load the installed `@strapi/core` CommonJS export through Node's `createRequire`, then use `compileStrapi` and `createStrapi`; this is the previously proven workaround for the pinned package's Node 24 ESM `lodash/fp` directory-import failure. Always destroy the application in `finally`. The module must use:

- `strapi.documents(uid).findMany`/`findFirst` to establish source counts and current published records;
- `strapi.documents('api::home-page.home-page').update({ documentId, status: 'published', data })` for the Home contacts;
- `strapi.documents('api::location.location').create({ status: 'published', data })` for each Location;
- Strapi's upload-file query/service to resolve imported media by exact `name` and require one unique image record for each derived facility;
- `strapi.plugin('users-permissions').service('role')` to load and update the Public role while preserving all existing action values.

No dependency is added. Use pinned Strapi, SQLite, the current local upload provider, Node 24.20.0 through Mise, standard `tar`, `jq`, `sha256sum`, `file`, `curl`, and a temporary Node audit module only. Do not use the browser, Docker, direct SQLite tools, raw Knex queries, a custom endpoint, a migration framework, another CMS instance, or any network service.

## Plan of Work

### Milestone 1: Protect local state and inspect the legacy source

Record branch, revisions, index/worktree, archive hash/size, ignored ordinary state, available Mise tasks, port state, and the complete ordinary upload-tree manifest. Create unique authoring and verification directories under `backend/.tmp`; the database files must not exist. Copy the tracked archive into the authoring directory and extract only that copy into a task-owned directory. Validate every JSONL line with `jq`.

Before any import, derive a compact task-owned legacy-location manifest from the published About and Activity rows plus Facility media links. The manifest contains only fictional location fields, source component ids, and stable media names. Require exactly two facilities, two venues, one-to-one exact name/address matches, and one image link per facility. Record only these fictional values and media names; do not include environment data.

Protect `backend/public/uploads` as one directory, not as selected files. Resolve it and the task workspace with `realpath`, refuse symlinks/out-of-tree paths, move the complete upload directory to `uploads-original`, and create a new empty `backend/public/uploads`. Capture a before-manifest with relative path, file size, and SHA-256 so restoration can be proven byte-for-byte. Do not alter the ordinary database or env files.

This milestone is complete when both unique database paths are absent, the stale source is copied/extracted and structurally understood, the exact two-pair legacy manifest is derived, ordinary uploads are safely outside the provider path, and Git source status is unchanged except for this plan.

### Milestone 2: Build the current-schema authoring database through Strapi

Run official `strapi import` against the absent authoring database and isolated empty uploads with `--force --only content,files`. Capture stdout/stderr and positively identify any timestamp-named import log created beside `backend/package.json`; move only that new task log into the authoring workspace. The transfer must succeed. Record the known schema-difference diagnostics: source-only About facilities, Activity venues, and Facility/Venue component definitions are not transferred; destination-only Home contact fields, Contact Method, and Location have no source data. Record any old Facility image link warning separately. Any other schema difference, entity error, missing binary, or unrelated warning is a blocker, not something to force through silently.

Create the temporary transformation module with `apply_patch`. It reads the extracted legacy JSONL files but writes only through loaded Strapi services. Before mutation it requires the current-schema database to contain one published Home, About, and Activity; three published News items; six published Calendar entries; three published Official Documents; zero Locations; the same 11 media records by name/hash/MIME/dimensions; the six expected Public actions; and unchanged Authenticated actions.

Apply the exact Home and Location contracts from `Interfaces and Dependencies`. Resolve Location images by imported media `name`, not legacy id. Then merge only Location `find` into Public. Re-read through Document Service using current frontend-equivalent populations and require one published Home with the exact two club methods, exactly two published Locations in display order, correct mapped text/media, four total Location methods, all six true visibility assertions, seven Public actions, unchanged Authenticated actions, and no old Facility/Venue key in current About/Activity results.

Run a semantic preservation audit at this boundary. Normalize away ids, document ids, component ids, timestamps, publication bookkeeping, and the intentionally removed/added fields. Compare all old versus current editorial values for Home, About, Activity, all three News items, all six Calendar entries, and all three Official Documents. Compare the 11 media records by name, hash, extension, MIME, size, dimensions, alternative text/caption, and format metadata. Require all pre-existing content to match after normalization. The only semantic differences are removed duplicate Facility/Venue arrays, added Home contact fields, exactly two derived Locations, and one Public permission.

This milestone is complete when the authoring database expresses the final current model entirely through Strapi services, all content is published and preserved, every intended media relation resolves, and no source/schema/generated/package file changed.

### Milestone 3: Export and audit the candidate payload

Run official `strapi export` against the authoring database with `--no-encrypt --only content,files`, retaining gzip compression. Export into the authoring workspace, never directly to `backend/seed-data/us-albatese-demo.tar.gz`. Capture the transfer table and move only the newly created timestamp-named export log into the task workspace.

Extract the candidate into a new empty task directory. Require top-level `schemas`, `entities`, `links`, `assets`, and `metadata.json`; reject `configuration` and every unexpected top-level path. Validate every JSONL row. Require current Home/Location schemas, no Facility/Venue schema or old singleton field, exact published content and permission behavior, 11 existing media records, all 43 existing upload binaries, and no new binary. Record entity/link/asset counts and candidate SHA-256/size for comparison with the later import; do not require byte-for-byte reproducibility with the old archive because ids, timestamps, tar metadata, and relations legitimately change.

Audit the extracted payload rather than trusting exporter guarantees. Entity types must be an explicit allowlist of the seven editorial APIs (Home, About, Activity, News, Calendar, Official Document, Location), `plugin::i18n.locale`, `plugin::upload.file`, and `plugin::users-permissions.role`/`permission`; allow `plugin::upload.folder` only if the native exporter actually emits an empty/current media folder record and record it. Reject every entity row whose type starts `admin::`, `plugin::users-permissions.user`, and any entity type or recursive entity-data key containing administrator, credential, password, secret, salt, token, session, authorization, webhook, environment, or env semantics. Join permission-to-role links and prove Public has exactly the seven allowed actions while Authenticated retains its original five. Schemas necessarily describe installed system models and may contain strings such as `admin::user` or token field definitions; those definitions are not accounts or tokens. Prove record absence from `entities` and relation absence from `links`, not by a misleading raw-word ban over `schemas`.

Run a temporary secret scanner without ever printing a value. It reads every nonempty assignment from `backend/.env` and `frontend/.env.development`. Compare all values against entity/link/asset metadata, payload metadata, and upload bytes; compare values whose names contain `KEY`, `SECRET`, `SALT`, `TOKEN`, `PASSWORD`, `ENCRYPTION`, `CREDENTIAL`, or `AUTH` against every extracted file, including schemas. For short or deliberately public operational values that can coincide with schema vocabulary, use exact JSON-scalar equality outside schemas rather than arbitrary substring matching. A hit reports only the env variable name and archive-relative file, then fails. Separately reject `.env`, database, SQLite journal, log, source, source-map, task module, absolute workspace path, and configuration/webhook entries in the tar listing. Search extracted payload data for environment-variable names/assignment syntax and webhook configuration keys. A successful scanner reports only counts checked and zero matches.

This milestone is complete when the candidate is an inspectable current-schema `.tar.gz`, contains only the intended content/files transfer surface, preserves the full media payload, and passes all administrator/token/env/webhook/secret checks.

### Milestone 4: Rehearse a clean import and prove the public result

Move the authoring upload tree into the authoring workspace and restore the original upload directory from `uploads-original`. Prove its manifest matches the pre-task manifest. Then isolate uploads again for verification: move the restored original directory to `uploads-original-verification` and create a new empty `backend/public/uploads`. Confirm the verification database path is absent.

Import the candidate with official `strapi import --force --only content,files` into the verification database. Capture the transfer table and task-created import log. This time, zero schema-difference diagnostics and zero warnings are allowed. Require the imported entity, link, and asset counts/bytes to equal the extracted candidate counts. Reject messages or diagnostics identifying a skipped entity, skipped/orphaned link, missing target, failed asset, missing file, stale media record, or unresolved schema. If import fails or warns, retain the candidate and failing verification workspace, diagnose the authoring relation/media source, create another absent verification database, and retry only after re-exporting a corrected candidate.

Start built Strapi with the verified database on `127.0.0.1:65100`, with project administrator and webhook bootstraps disabled. Poll `/_health` for at most 60 seconds and require HTTP 200 or 204. All acceptance requests are unauthenticated and use `curl --get --data-urlencode` so bracketed Strapi query keys are not altered by the shell.

Save response bodies only inside the verification workspace and assert:

- Home returns HTTP 200 for `status=published` with its existing populations plus `populate[contactMethods]=true`. It has non-null publication state, heading `Contatti`, the exact introduction, exactly the two ordered club-wide methods, a `.example` email, and the fictional `+39 000 000 0000` phone.
- Locations returns HTTP 200 for the exact frontend query: published status, About image and methods populated, display-order/name sort, page size 100. It contains exactly two documents, ordered 0 then 10, with the exact mapped names/addresses/About summaries/Activity details, populated expected image names, all three visibility switches true, and the four exact Location phone/email methods. Every `publishedAt` is non-null.
- About, Activity, News, Calendar, and Official Documents remain anonymously readable with the current frontend population/sort queries and retain counts 1, 1, 3, 6, and 3. About has no `facilities`; Activity has no `venues`; schedule venue strings remain unchanged.
- Public API calls require no bearer token. A Strapi-service verification confirms Public has exactly seven actions and Authenticated actions match the legacy preimage. The loaded webhook store is empty because config was not transferred and the task bootstrap target was disabled. Any locally generated internal admin RBAC/default-token rows are explicitly distinguished from extracted archive content and are not presented as payload records.
- Every media URL recursively discovered in the seven public responses returns HTTP 200 from loopback. All eight original images have `image/png`, all three original documents have `application/pdf`, Location images resolve to the two expected existing records, and no response contains a URL whose file is absent. Compare SHA-256 hashes of all 43 imported upload binaries with the candidate's `assets/uploads` entries so unreferenced derivatives cannot hide a stale/missing asset.

Stop the exact Strapi process with Ctrl-C. Move the verification upload tree into the task workspace and restore `uploads-original-verification`. Recompare the original upload manifest. This milestone is complete when the candidate imports cleanly into a genuinely separate empty database, anonymous public behavior is correct, every relation/media proof passes, port 65100 is free again, and ordinary uploads are restored exactly.

### Milestone 5: Promote, document, validate, and clean up

Update only the stale Location/archive sentences in `TYPES.md`: state that the demo archive now contains two published shared Locations, Home and Location fictional contacts, and Public Location collection read permission. Retain the existing schema/pipeline/rendering descriptions and do not add implementation prose or claim task-06 revalidation/navigation/release checks are complete.

Run `mise run be:build`. Do not run `be:types`, `be:openapi`, or `fe:openapi` because no schema/type/API surface changed. Do not run frontend check/test/build or standalone lint because no frontend source changed and task 06 owns the complete release gates. Do not add or run any Strapi backend test, browser test, E2E test, smoke test, or deployment test. The two native imports, archive audit, built backend startup, and REST/media exercise are task-05 integration/build evidence, not a new automated test suite.

Only after all previous checks pass, move the validated candidate over `backend/seed-data/us-albatese-demo.tar.gz`. Immediately rerun archive listing, JSONL validation, permission join, secret scan, SHA-256/size, and a byte comparison against the already validated candidate. Record the new hash and size in this plan; the old hash must change.

Remove only the temporary task module and resolved task-owned directories after their evidence is recorded and only after verifying their paths match the exact task-05 prefixes. Inventory transfer logs before the task and move/delete only logs positively created by the task; leave no new `backend/import_*.log` or `backend/export_*.log`. Preserve any pre-existing ignored logs. Confirm the ordinary database/env files, source schemas, generated artifacts, packages, uploads, branch, index, upstream, and unrelated Imagen scripts are unchanged.

This milestone is complete when the tracked diff is limited to this ExecPlan, `TYPES.md`, and the rebuilt archive; all validation passes; runtime state is restored; and the Worker can return `WORK_READY` for independent review.

## Concrete Steps

Run all commands from `/home/codex/src/us-alb` unless a command explicitly changes directory. Record the baseline without displaying local environment values:

    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    git diff --check
    git diff --cached --quiet
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    stat --format='%s' backend/seed-data/us-albatese-demo.tar.gz
    tar -tzf backend/seed-data/us-albatese-demo.tar.gz
    mise current
    mise tasks
    ss -ltn '( sport = :65100 )'

Expect `main`, both revisions at `d80d2c6ba8fe5ad27b5fa5e878da260f38be7520`, an empty index, no tracked diff, old archive hash `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`, Node 24.20.0, and no listener on 65100. Preserve `.agents/skills/imagen/scripts/` untouched.

Create unique directories and absent database paths:

    mkdir -p backend/.tmp
    task05_authoring_dir="$(mktemp -d -p backend/.tmp task-05-demo-authoring-XXXXXX)"
    task05_verification_dir="$(mktemp -d -p backend/.tmp task-05-demo-verification-XXXXXX)"
    task05_authoring_base="$(basename "$task05_authoring_dir")"
    task05_verification_base="$(basename "$task05_verification_dir")"
    task05_authoring_db=".tmp/${task05_authoring_base}/data.db"
    task05_verification_db=".tmp/${task05_verification_base}/data.db"
    test ! -e "backend/$task05_authoring_db"
    test ! -e "backend/$task05_verification_db"
    cp --preserve=mode,timestamps backend/seed-data/us-albatese-demo.tar.gz "$task05_authoring_dir/legacy-us-albatese-demo.tar.gz"
    mkdir "$task05_authoring_dir/legacy-extracted"
    tar -xzf "$task05_authoring_dir/legacy-us-albatese-demo.tar.gz" -C "$task05_authoring_dir/legacy-extracted"
    find "$task05_authoring_dir/legacy-extracted" -name '*.jsonl' -type f -exec sh -c 'jq -e . "$1" >/dev/null' _ {} \;

Before moving uploads, create a manifest outside the upload tree, validate exact paths, and preserve the directory:

    realpath backend/public/uploads
    test ! -L backend/public/uploads
    (cd backend/public/uploads && find . -type f -print0 | sort -z | xargs -0 -r sha256sum) > "$task05_authoring_dir/uploads-original.sha256"
    find backend/public/uploads -type f -printf '%P\t%s\n' | sort > "$task05_authoring_dir/uploads-original.files"
    mv backend/public/uploads "$task05_authoring_dir/uploads-original"
    mkdir backend/public/uploads

Resolve and compare the paths before `mv`; `backend/public/uploads` must resolve below `/home/codex/src/us-alb/backend/public`, and the destination below the resolved authoring directory. Install a cleanup/finally procedure immediately so an interruption restores the directory rather than leaving generated uploads in the ordinary path.

Run the stale authoring import from `backend/` and capture its transfer log/output:

    cd /home/codex/src/us-alb/backend
    mise exec -- env DATABASE_FILENAME="$task05_authoring_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file ".tmp/${task05_authoring_base}/legacy-us-albatese-demo.tar.gz" --force --only content,files

The command exits zero with only the expected old/current schema diagnostics described in Milestone 2. Do not accept unrelated warnings. Identify new `backend/import_*.log` files by comparing a pre-command inventory, then move only those task-created files into `$task05_authoring_dir/transfer-logs/`.

Create `$task05_authoring_dir/transform-demo.mjs` with `apply_patch`, implementing the exact Strapi-service operations and assertions in `Interfaces and Dependencies`. Run it from `backend` so installed packages and project configuration resolve naturally:

    cd /home/codex/src/us-alb/backend
    mise exec -- env DATABASE_FILENAME="$task05_authoring_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= node ".tmp/${task05_authoring_base}/transform-demo.mjs" ".tmp/${task05_authoring_base}/legacy-extracted"

Expect a compact, secret-free result equivalent to:

    preserved published documents: home=1 about=1 activity=1 news=3 calendar=6 official=3
    media records: 11; upload binaries: 43
    published locations: 2
    home contacts: 2; location contacts: 4
    public actions: 7; added: api::location.location.find
    semantic preservation: pass

Export the candidate from the same database:

    cd /home/codex/src/us-alb/backend
    mise exec -- env DATABASE_FILENAME="$task05_authoring_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- export --no-encrypt --only content,files --file ".tmp/${task05_authoring_base}/us-albatese-demo-candidate"

Expect `.tmp/${task05_authoring_base}/us-albatese-demo-candidate.tar.gz`. Move only newly created `export_*.log` files into the task transfer-log directory. Extract and audit as described above:

    mkdir "$task05_authoring_dir/candidate-extracted"
    tar -xzf "$task05_authoring_dir/us-albatese-demo-candidate.tar.gz" -C "$task05_authoring_dir/candidate-extracted"
    find "$task05_authoring_dir/candidate-extracted" -name '*.jsonl' -type f -exec sh -c 'jq -e . "$1" >/dev/null' _ {} \;
    test -d "$task05_authoring_dir/candidate-extracted/schemas"
    test -d "$task05_authoring_dir/candidate-extracted/entities"
    test -d "$task05_authoring_dir/candidate-extracted/links"
    test -d "$task05_authoring_dir/candidate-extracted/assets"
    test -f "$task05_authoring_dir/candidate-extracted/metadata.json"
    test ! -e "$task05_authoring_dir/candidate-extracted/configuration"
    sha256sum "$task05_authoring_dir/us-albatese-demo-candidate.tar.gz"
    stat --format='%s' "$task05_authoring_dir/us-albatese-demo-candidate.tar.gz"

Use the temporary audit module for entity allowlisting, permission-link joins, forbidden recursive keys, schema/current-content assertions, all local sensitive-value comparisons, and asset manifests. Do not use `rg` or `jq` commands that print matching secret values. The evidence output contains only row counts, allowed type names, variable names on failure, filenames on failure, and zero-match summaries.

Prepare the verification import by restoring, checking, and re-isolating uploads:

    mv backend/public/uploads "$task05_authoring_dir/uploads-authoring"
    mv "$task05_authoring_dir/uploads-original" backend/public/uploads
    # Recompute and compare the relative-path/size/hash manifests here.
    mv backend/public/uploads "$task05_verification_dir/uploads-original-verification"
    mkdir backend/public/uploads
    test ! -e "backend/$task05_verification_db"

Import the candidate into the distinct verification database:

    cd /home/codex/src/us-alb/backend
    mise exec -- env DATABASE_FILENAME="$task05_verification_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file ".tmp/${task05_authoring_base}/us-albatese-demo-candidate.tar.gz" --force --only content,files

This transfer must have no schema warning, provider warning, skipped/orphaned link, missing target, or asset failure, and its totals must equal the candidate JSONL/binary counts. Capture and move its exact task-created import log.

Build and start the verified backend:

    cd /home/codex/src/us-alb
    mise run be:build
    cd backend
    mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME="$task05_verification_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run start

In another terminal, create the evidence directory and poll readiness for at most 60 seconds:

    mkdir -p "$task05_verification_dir/evidence"
    for attempt in $(seq 1 60); do
      status="$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:65100/_health || true)"
      test "$status" = 204 -o "$status" = 200 && break
      sleep 1
    done
    test "$status" = 204 -o "$status" = 200

Exercise Home and Locations without an authorization header. Use response paths under `$task05_verification_dir/evidence/`:

    curl --fail-with-body --silent --show-error --get http://127.0.0.1:65100/api/home-page \
      --data-urlencode 'status=published' \
      --data-urlencode 'populate[heroImage]=true' \
      --data-urlencode 'populate[metrics]=true' \
      --data-urlencode 'populate[institutionalQuote]=true' \
      --data-urlencode 'populate[activityTeasers][populate][image]=true' \
      --data-urlencode 'populate[contactMethods]=true' \
      --output "$task05_verification_dir/evidence/home.json"

    curl --fail-with-body --silent --show-error --get http://127.0.0.1:65100/api/locations \
      --data-urlencode 'status=published' \
      --data-urlencode 'populate[aboutImage]=true' \
      --data-urlencode 'populate[contactMethods]=true' \
      --data-urlencode 'sort[0]=displayOrder:asc' \
      --data-urlencode 'sort[1]=name:asc' \
      --data-urlencode 'pagination[pageSize]=100' \
      --output "$task05_verification_dir/evidence/locations.json"

Use current queries from `frontend/cms/client.ts` for the other five resources. Apply `jq -e` or the temporary audit module to assert the exact values/counts; never merely inspect by eye. Recursively collect media URLs from all seven response bodies, reject duplicates that disagree on metadata, and request every unique URL from `127.0.0.1:65100`. Compare all imported upload-file hashes with candidate asset hashes.

Stop Strapi with Ctrl-C, verify port 65100 is free, move verification uploads into the task workspace, and restore the ordinary directory:

    mv backend/public/uploads "$task05_verification_dir/uploads-imported"
    mv "$task05_verification_dir/uploads-original-verification" backend/public/uploads
    ss -ltn '( sport = :65100 )'
    # Recompute and compare the original relative-path/size/hash manifests here.

Update `TYPES.md`, promote only the validated candidate, and rerun the final archive audit:

    mv "$task05_authoring_dir/us-albatese-demo-candidate.tar.gz" backend/seed-data/us-albatese-demo.tar.gz
    tar -tzf backend/seed-data/us-albatese-demo.tar.gz
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    stat --format='%s' backend/seed-data/us-albatese-demo.tar.gz

Finish with scope and state assertions:

    cd /home/codex/src/us-alb
    git diff --check
    git diff --exit-code -- backend/src backend/types/generated frontend mise.toml backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
    git diff --name-only
    git status --short --branch
    git diff --cached --quiet
    git rev-parse HEAD
    git rev-parse origin/main
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"
    test -d backend/public/uploads
    ss -ltn '( sport = :65100 )'

The first diff guard must be silent. `git diff --name-only` may report only `TYPES.md` and `backend/seed-data/us-albatese-demo.tar.gz`; this ExecPlan is untracked until coordinator bookkeeping and must also appear in `git status`. The index is empty; HEAD/upstream stay at `d80d2c6`; ordinary ignored files remain ignored/untracked; the original uploads manifest matches; no task-created transfer log or task directory remains after guarded cleanup; and `.agents/skills/imagen/scripts/` remains unrelated and untracked. Perform successful final cleanup only through resolved exact prefixes:

    for candidate in backend/.tmp/task-05-demo-authoring-* backend/.tmp/task-05-demo-verification-*; do
      test -e "$candidate" || continue
      resolved="$(realpath "$candidate")"
      case "$resolved" in
        /home/codex/src/us-alb/backend/.tmp/task-05-demo-authoring-*|/home/codex/src/us-alb/backend/.tmp/task-05-demo-verification-*) gio trash "$resolved" ;;
        *) echo "Refusing unsafe cleanup target: $resolved" >&2; exit 1 ;;
      esac
    done

## Validation and Acceptance

Acceptance is the following observable data and transfer behavior:

1. The stale archive is used only through a protected task copy and official first import. Known schema differences are captured; no old schema is restored, no current schema is edited, and no SQLite row or exported JSONL line is directly manipulated.
2. Exactly two published Location documents exist at the document level. They are derived one-to-one from the two published old About facilities and matching Activity venues by exact name/address. Their About summaries, About images, Activity details, and source order map exactly as specified.
3. Both Locations have `showOnHome`, `showOnAbout`, and `showOnActivity` true. They sort as Centro order 0 then Cortile order 10. Schedule venue remains independent free text.
4. Published Home retains all existing demonstration content and has heading `Contatti`, the exact introduction, club phone `+39 000 000 0000`, and `segreteria@usalbatese.example`. Each Location has the exact local `.example` email and all-zero fictional phone specified above. Every contact satisfies the existing published mapper policy; there is no real personal data.
5. Public role retains its six existing content `find` actions and adds only `api::location.location.find`. Location `findOne`, every mutation, upload/user/auth action, and unrelated permission remain disabled for Public. Authenticated actions are unchanged.
6. Every pre-existing published editorial value survives after normalization, excluding only the intentionally removed duplicate facility/venue arrays. Counts remain Home 1, About 1, Activity 1, News 3, Calendar 6, Official Documents 3. No existing page/component/media content is silently dropped or rewritten.
7. The archive retains exactly the existing 11 semantic original media records and 43 upload binaries; no new media is generated. Both Location images reuse the correct old facility assets. All current public media relations resolve, every discovered URL returns HTTP 200 with the expected MIME, and every imported binary hash equals its candidate asset hash.
8. The final archive is produced by `strapi export --no-encrypt --only content,files`, is gzip-compressed and readable, contains current schemas/entities/links/assets/metadata, and contains no configuration directory. The verified candidate and promoted archive are byte-identical.
9. Extracted payload inspection proves there is no `admin::` entity, administrator account, API token, transfer token, user, session, credential-bearing entity/key, environment file or project-local environment value in payload data/assets, webhook/core-store configuration, task module, database, log, or absolute workspace path. Installed schema definitions are not misreported as runtime records. Evidence never prints actual secrets.
10. The final archive imports with current Strapi 5.52 into a second absent task-owned database file using the official CLI. The verification import has matching schemas, equal entity/link/asset totals, and zero schema, skipped-link, orphan, missing-target, stale-media, or asset-failure diagnostics.
11. Built Strapi starts with that fresh import on `127.0.0.1:65100`, answers health with HTTP 200 or 204, and stops cleanly. Anonymous frontend-equivalent Home and Location requests return HTTP 200 and the exact published contacts/Locations. The other five existing public resources remain readable with their prior counts. No request sends an authorization header.
12. `mise run be:build` exits zero. No Strapi backend, browser, E2E, smoke, deployment, or external-migration test is added or run. Task-06 webhook revalidation, navigation, responsive inspection, frontend release gates, and editorial-change exercise remain untouched.
13. `TYPES.md` states the task-05 data/permission truth without claiming task 06. Backend/frontend source, schemas, generated artifacts, dependencies, lockfiles, build tools, runtime versions, stack, SSR/ISR architecture, Preview, webhook code/config, routes, cache behavior, navigation, footer, system configuration, firewall, Docker, branch, index, commits, and upstream are unchanged.
14. The ordinary database, env files, and original upload tree are restored untouched. Port 65100 has no listener, no task-owned import/export log or database/workspace remains after successful cleanup, and unrelated `.agents/skills/imagen/scripts/` remains unmodified and untracked.

## Idempotence and Recovery

The tracked stale archive remains the fallback until candidate promotion. If transformation or candidate validation fails, do not overwrite it. Keep the failing task directories and transfer logs long enough to record the exact error, then retry with new unique authoring/verification prefixes. Never retry an import against a partially populated database; Strapi import is destructive and a new absent task database is cheap.

The first import is intentionally non-idempotent with respect to one database because it deletes destination data and uploads. Repetition is safe only after restoring ordinary uploads and selecting a new empty task database. The transformation module must refuse to run if any Location already exists or if the existing editorial/media/permission baseline differs; it does not upsert, delete, or guess. If interrupted after mutation, discard that authoring database through guarded task-directory cleanup and begin again from the protected stale archive copy.

Upload restoration is the highest local-state risk. Move directories atomically on the same filesystem, keep a before hash/size/path manifest outside the directory, and install a cleanup path before the first import. If a transfer fails, stop Strapi first, preserve the generated upload tree inside the task workspace, restore the exact saved ordinary directory, and compare manifests before doing anything else. Never recursively delete `backend/public`, `backend/public/uploads`, `backend/.tmp`, the workspace root, or an unresolved variable.

If the authoring import reports a schema difference beyond the known removed Facility/Venue fields/components and new Contact Method/Home/Location surface, stop and revise the plan; `--force` is not blanket permission to lose other data. If old facility image links are skipped, that is expected only in the authoring import and must be repaired by the explicit Location media relations before export. Any warning during the current-schema verification import invalidates the candidate.

If a media name is absent or non-unique after authoring import, do not substitute by numeric id, provider filename, or visual guess. Trace the source facility component through the archived link row to the upload entity, confirm the asset exists, and correct the import/transformation path. If the candidate contains all asset bytes but a public relation is null or a URL is missing, repair through Strapi Document Service, re-export, and verify in a new database.

The export, extraction, scanners, and backend build are repeatable. Always regenerate the candidate from the corrected authoring database rather than editing tar/JSONL contents. Do not patch generated API files or rerun generators to conceal a content problem.

Cleanup occurs only after success. Resolve each candidate with `realpath` and require an exact prefix under `/home/codex/src/us-alb/backend/.tmp/task-05-demo-authoring-` or `task-05-demo-verification-` before removing it. Positively identify task-created transfer logs from before/after inventories and task timestamps; leave pre-existing logs alone. Use recoverable moves to the workspace while validation is ongoing. Never use `git reset --hard`, `git checkout --`, broad glob deletion, machine/user environment changes, or cleanup of `.agents/skills/imagen/scripts/`.

## Artifacts and Notes

The expected final implementation diff is limited to this ExecPlan, `TYPES.md`, and `backend/seed-data/us-albatese-demo.tar.gz`. The archive is tracked despite the current `*.gz` ignore rule. No schema, generated file, backend/frontend source, test, dependency, package manifest, lockfile, Mise task, README, or separate documentation file should change.

During implementation, record concise evidence here: task directory basenames; initial/final archive hashes and sizes; expected authoring schema warnings; old-to-new Location derivation summary; semantic preservation result; exact Home/Location contact values; pre/post Public and Authenticated action sets; authoring Document Service counts; candidate entity/link/asset/binary totals; forbidden-type/key/config/env-value scan counts; secret-free transfer summaries; verification import zero-warning result and equal totals; backend build outcome; health status; exact anonymous API counts; media URL and binary-hash totals; empty webhook-store result; ordinary upload manifest restoration; task log cleanup; port shutdown; and final diff/index/branch/upstream scope.

Worker evidence (2026-10-11):

- Successful authoring used `task-05-demo-authoring-G0UxbF`; verification used `task-05-demo-verification-cSMXN9`. Two earlier isolated authoring workspaces (`h5dHP0`, `xcHmJR`) captured audit-only failures and never supplied the candidate. Each transition restored the ordinary one-file upload manifest exactly before a new import.
- The old archive was 636,008 bytes with SHA-256 `7fa5e19af9998c8ef8db7ccf5f6b6ec4e46b8f1533030c3be6597cd7b5992633`. The accepted candidate/final archive is 636,688 bytes with SHA-256 `50d8130729f893251b3dff0ffab1e6d513cb09863646e10c914bd8f7cf5afd99`; promotion by move preserved candidate identity.
- The stale authoring import reported only the approved source/destination differences for About `facilities`, Activity `venues`, Home's three contact fields, Facility, Venue, Location, and Contact Method. It transferred 55 entities, 43 assets, and 108 current links. The service transformation reported published `home=1 about=1 activity=1 news=3 calendar=6 official=3`, media `11/43`, Locations `2`, Home contacts `2`, Location contacts `4`, Public actions `7`, and semantic preservation pass.
- Location derivation was Centro order 0 with `campo-calcio-placeholder.png` and Cortile order 10 with `impianto-oratorio-placeholder.png`; name, address, About summary, Activity details, image relation, both contacts, and all three visibility switches matched the approved exact values. Home gained the exact heading/introduction plus `+39 000 000 0000` and `segreteria@usalbatese.example`.
- Candidate and final payload audits each found 38 schemas, 60 entities, 118 links, 11 allowed entity types, 11 original media records, 43 binaries, Public 7 and Authenticated 5 actions, zero forbidden entity types/recursive keys, and zero administrator/user/token/session/configuration/webhook/runtime records. The scanner compared 24 nonempty local env values without printing them and found zero matches.
- The clean verification import transferred exactly 60 entities, 118 links, and 43 assets with no warning, schema-integrity, skipped/orphaned link, missing-target/file, stale-media, unresolved-schema, or failed-asset diagnostic. `mise run be:build` passed; built Strapi 5.52 reached health HTTP 204 on `127.0.0.1:65100`.
- Anonymous frontend-equivalent requests returned Home 1, Locations 2, About 1, Activity 1, News 3, Calendar 6, and Official Documents 3 with exact contacts/locations, six true visibility assertions, and six preserved schedule venue strings. Recursive discovery produced 43 unique URLs: 40 PNG and 3 PDF; all returned HTTP 200 with correct MIME, and all imported path/size/SHA-256 values matched candidate assets.
- Service verification found Public 7, Authenticated 5, webhook store 0, administrator users 0, content users 0, and transfer tokens 0. The disposable database locally held Strapi's two expected bootstrap API tokens, while the extracted archive had zero API-token entities.
- Ordinary uploads were restored to the original sole `.gitkeep` with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; port 65100 is free. Before cleanup, diff guards limited tracked changes to `TYPES.md` and the archive, with this ExecPlan untracked; backend/frontend source, schemas, generated artifacts, packages, locks, Mise, branch `main`, `HEAD`/`origin/main` `d80d2c6`, and the empty index remained unchanged.
- Final post-cleanup assertions passed: no task-05 directory or import/export log remains; `git diff --check` is clean; the protected backend/frontend/tooling/task-queue diff is empty; the only tracked diffs are `TYPES.md` and the 636,688-byte archive; this ExecPlan and the unrelated Imagen scripts are the only untracked paths; the index is empty; branch/HEAD/upstream remain unchanged; the final archive is readable and retains SHA-256 `50d8130729f893251b3dff0ffab1e6d513cb09863646e10c914bd8f7cf5afd99`.

Do not paste local env contents, actual secret values, complete entity JSONL, full REST payloads, large logs, or generated files. On a secret-scan failure, record only the variable name and archive-relative path. On a transfer failure, record the stage, content type or relation identity, and sanitized diagnostic.

Revision note (2026-10-11 / Planner): Created the initial self-contained task-05 ExecPlan from pushed commit `d80d2c6`. It uses current Context7 and pinned Strapi 5.52 evidence to separate the one-time forced stale-archive authoring import from the zero-warning fresh-import acceptance, fixes exact contact/location/permission values and mapping, protects ordinary database/env/uploads, audits the payload without exposing secrets, preserves all existing demo content/media, and leaves task 06 and every source/schema/generated/tooling change out of scope. No implementation file was changed.

Revision note (2026-10-11 / Worker): Recorded the isolated import/audit recovery, accepted service transformation, native candidate export, deep payload and local-secret audit, zero-warning verification import, anonymous API and 43-file media proof, backend build/startup, exact archive identity, documentation update, restoration/scope evidence, and remaining guarded cleanup. Independent review and coordinator-only tracker/commit/push work remain pending.

Revision note (2026-10-11 / Worker): Completed allowlisted cleanup by moving all exact task-05 authoring/verification workspaces to trash, confirmed no task import/export log or listener remains, closed the final Progress item owned by the Worker, and updated Outcomes to the post-cleanup state. Independent review and coordinator-only bookkeeping remain pending.

Revision note (2026-10-11 / Coordinator): Recorded independent Reviewer approval with no findings after the reviewer reproduced the native import, public API/media, preservation, security, build, cleanup, and scope checks. Review remediation cycles: 0. Marked task 05 complete in `TODOS2.md`; commit and push are the remaining coordinator actions.

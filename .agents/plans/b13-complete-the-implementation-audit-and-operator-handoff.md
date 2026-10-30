# Complete the backup implementation audit and operator handoff

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative queue item is `B13 — Complete the implementation audit and operator handoff` in `TODO.md`; `BACKUP.md` is the unchanged authoritative design. The repository root is `/home/codex/src/us-alb`, the active branch is `backup-system`, and the pushed planning baseline is commit `2f58c01fb2a2c8fb8fd25d89a3afdbb1748e70bf`. Do not switch branches. Preserve `BACKUP.md` byte-for-byte. Preserve the unrelated untracked `.agents/skills/imagen/scripts/` directory without listing its contents, reading it, formatting it, staging it, or modifying it.

This file is both the executable B13 implementation plan and the final operator handoff. Keep the implementation audit, configuration reference, Grafana rule specification, recovery procedure, external prerequisites, validation evidence, and final review result here. Do not create a second runbook, audit, recovery document, dashboard export, or importable alert-rule file.

## Purpose / Big Picture

After B13, a technical operator has one reviewed handoff that explains what the repository actually implements, what prior validation proved, which live and production-dependent work remains unperformed, how to configure the Grafana-side alerts, and how to restore a selected completed snapshot into unmistakably fresh storage without touching the original production storage. The operator can identify the immutable backend image from the manifest, verify the downloaded archive's byte length and full-file SHA-256, invoke the image's exact Node and Strapi CLI through the writable data-transfer workspace, recreate excluded credentials, reconcile the managed webhook and frontend cache, and hold traffic and scheduling until a human accepts the result.

B13 does not execute a production recovery, contact Scaleway or Grafana Cloud, dispatch a workflow, publish an image or artifact, deploy Compose, or claim measured recovery guarantees. Local validation establishes repository behavior only. A successful Strapi export, archive parse, checksum, manifest confirmation, or lack of recognized warnings does not prove that every source record or asset was exported.

## Progress

- [x] (2026-10-30 06:54Z) Confirmed branch `backup-system`, local `HEAD`, and `origin/backup-system` all equal pushed B12 baseline `2f58c01fb2a2c8fb8fd25d89a3afdbb1748e70bf`, with no tracked worktree change.
- [x] (2026-10-30 06:54Z) Read root `AGENTS.md`, `.agents/docs/PLANS.md`, the complete `implement-task` and `canonical-validation` skills, the selected B13 queue item, all 657 lines of unchanged `BACKUP.md`, and the B01–B12 living plans and their recorded review/validation evidence without inspecting the protected unrelated directory.
- [x] (2026-10-30 06:54Z) Inspected the current backupd, strapid, backend bootstrap, frontend refresh/cache, container, Collector, environment, CI, and release implementation at the pushed baseline; reconciled exact settings, defaults, signal names, manifest fields, storage paths, and recovery-image layout.
- [x] (2026-10-30 06:54Z) Used Context7 to resolve current official Grafana Cloud OTLP metric/log conversion and Grafana/Loki missing-data, No Data, JSON parsing, and query-time grouping behavior. Recorded concrete default-conversion PromQL and LogQL below.
- [x] (2026-10-30 06:54Z) Found no known production-code gap in the B01–B12 implementation. The existing B02 workspace accepts `import`, constructs the exact direct Node/Strapi invocation, and has focused path/cleanup coverage; the missing B13 deliverable is this audited operator handoff and its final independent verification.
- [x] (2026-10-30 07:03Z) Worker rechecked every audit row, configuration/default, manifest/key/checksum contract, recovery command, Compose/image/workspace path, bootstrap/admin/token/webhook/cache behavior, raw and converted Grafana signal/query, missing-series/No Data/priority/advisory rule, and external-prerequisite classification against the pushed implementation, prior approved evidence, exact installed Strapi 5.52.0 source, and current official Grafana/Prometheus documentation. No production-code defect or ownership change was found.
- [x] (2026-10-30 07:10Z) Worker validated only the corrected B13 plan and unresolved concerns, recorded the evidence below, and prepared `WORK_READY` without editing `BACKUP.md`, executing recovery, or performing any live/external action.
- [x] (2026-10-30 07:18Z) Independent Reviewer returned `CHANGES_REQUESTED`/`REVIEW_READY`: replace unreliable sparse-counter alert queries, require the exact source checkout for canonical manifest decoding, and add the independently verifiable narrative milestone required by `.agents/docs/PLANS.md`.
- [x] (2026-10-30 07:44Z) Remediation cycle 1 updated only this plan, resolved all three findings against exact emitted log bodies and current Loki documentation, repeated plan/scope/byte-preservation/Compose/decoder checks successfully, and prepared `WORK_READY` for re-review.
- [x] (2026-10-30 07:56Z) The same independent Reviewer verified remediation cycle 1 from first principles, repeated the plan-only acceptance checks, found no remaining issues, and returned `APPROVED` and `REVIEW_READY`.
- [x] (2026-10-30 07:56Z) After approval, the coordinator recorded the result and final outcome here, linked this exact ExecPlan beneath B13, checked B13 in `TODO.md`, and prepared the exact two-file task scope for commit title `B13 — Complete the implementation audit and operator handoff`; commit and push are the immediate coordinator actions outside this self-referential plan content.

## Surprises & Discoveries

- Observation: The repository already contains a recovery-capable import workspace even though there is no separate recovery executable.
  Evidence: `strapid/src/strapi-runtime.ts` accepts operation `"import"`, fixes the executable at `/nodejs/bin/node`, fixes the CLI at `/strapi/node_modules/@strapi/strapi/bin/strapi.js`, creates `/tmp/strapi-workspaces/import-*`, links the immutable compiled application into it, and constructs `import --file <absolute /staging path>`. `strapid/test/strapi-runtime.test.ts` covers the import form, path confinement, duplicate `-f`/`--file` rejection, callback failure, and workspace cleanup. The handoff can invoke this existing boundary from the immutable backend image; a second recovery script would duplicate path and workspace ownership.

- Observation: The recovery manifest supplies the immutable backend digest but intentionally does not supply its registry repository.
  Evidence: `backupd/src/snapshot-manifest.ts` records `application.imageDigest`, `application.gitRevision`, Node and Strapi versions, and the capture/source identities. The separately protected deployment configuration supplies `BACKEND_IMAGE_REPOSITORY`. Recovery must combine them as `<BACKEND_IMAGE_REPOSITORY>@<manifest application.imageDigest>` and therefore requires the deployment configuration as an off-host source.

- Observation: A fresh Compose project is a safer recovery identity than reusing the production project with replacement volumes.
  Evidence: both Compose files use project-scoped `backend_data`, `backend_config`, `backup_state`, `backup_staging`, and `backup_coordination`. A unique `-p us-alb-recovery-<UTC id>` yields visibly distinct engine volume names and Compose labels while reusing the exact production service definition. It also lets the operator leave the original project's volumes stopped and intact until acceptance.

- Observation: Import startup and normal backend startup both run bootstrap, but only the normal post-import startup can be relied on to reconcile the final imported webhook state.
  Evidence: `backend/src/index.ts` runs `ensureDefaultAdmin` and `ensureNextJsWebhook`. The import CLI loads Strapi and can bootstrap before transfer; imported core-store/webhook configuration may follow. Starting the recovered backend again runs the same idempotent bootstrap against the final imported data, updates the managed `Next revalidation` webhook, and leaves an existing recreated admin alone.

- Observation: A restored frontend must be recreated, not merely trusted to receive future webhooks.
  Evidence: `frontend/app/refresh/route.ts` invalidates tags only for received events, while restored content predates post-recovery webhook events. The production frontend cache is a tmpfs at `/app/.next/cache`; `docker compose up --force-recreate frontend` creates a fresh runtime and therefore prevents newer pre-recovery cached content from masking the restored state.

- Observation: Grafana Cloud's default OTLP conversion changes the repository's OpenTelemetry names.
  Evidence: current official Grafana Cloud documentation says dots and dashes become underscores; monotonic sums gain `_total`; unit `s` gains `_seconds` when not already represented; and `service.namespace`, `service.name`, `service.version`, and `deployment.environment.name` are promoted with underscore label names. Thus raw `backupd.run.outcome` is queried as `backupd_run_outcome_total`, while raw `backupd.snapshot.capture_time` with unit `s` is queried as `backupd_snapshot_capture_time_seconds` under the default tenant conversion.

- Observation: Per-run advisory notification needs the structured log, not a run-ID metric label.
  Evidence: B09 deliberately prohibits run and capture IDs from metric dimensions. `strapid.export.attention` increments once per affected export and emits one structured log whose body contains `correlation.captureWindowId`; all individual diagnostic lines are separate `strapid.export.output` records. Grafana Cloud stores the body as the Loki line and log attributes as structured metadata. A query-time JSON extraction of `correlation.captureWindowId` creates one temporary alert dimension without permanently indexing an unbounded identifier.

- Observation: Prometheus instant-selector lookback makes the attempted sparse-counter fallback ambiguous, even when it is combined with `increase`.
  Evidence: the attempted `current metric unless metric offset 5m` test does not mean “no sample in this alert window.” The offset instant selector can select an older sample through lookback while `increase(metric[5m])` sees only one new sample and returns zero, causing both branches to miss the event. The application already emits one stable structured completion event at the owning boundary for each relevant outcome, so alerting directly on those log records avoids metric scrape and lookback inference.

- Observation: The four-file B12 deployment artifact cannot run the canonical manifest decoder.
  Evidence: recovery imports `decodeSnapshotManifest` from `backupd/src/snapshot-manifest.ts`, while the deployment artifact contains only `.env.example`, `Caddyfile`, `compose.prod.yml`, and `otel-config.yml`. The exact source checkout at `manifest.application.gitRevision` is therefore mandatory for manifest validation; the artifact remains an optional convenient source of the four deployment files, not a substitute for the checkout.

- Observation: The repository already owns a stronger recovery-manifest decoder than the initial handoff's inline subset of checks.
  Evidence: `decodeSnapshotManifest` in `backupd/src/snapshot-manifest.ts` requires the exact v1 field set and canonical serialized bytes, derives and verifies the immutable keys, validates bounded site/environment/run and capture identities, checks positive safe byte length and SHA-256/image/Git forms, and enforces ordered canonical timestamps and bounded Node/Strapi versions. The recovery snippet now calls that owner before extracting shell fields instead of maintaining a second, weaker validator.

- Observation: The initial recovery timestamp command contradicted Compose's lowercase project-name requirement.
  Evidence: the prose required a unique lowercase project, but `date -u +%Y%m%dT%H%M%SZ` emitted uppercase literal `T` and `Z`. The corrected `date -u +%Y%m%dt%H%M%Sz` retains the readable UTC shape while producing only lowercase letters and digits for `us-alb-recovery-<id>`.

## Decision Log

- Decision: Treat B01–B12 as implemented only where current code plus an approved pushed plan supplies evidence; do not use a checked queue box alone as proof.
  Rationale: B13 is an implementation audit. Each audit row below names the implementation owner, prior approved evidence, and any remaining external work. If current code contradicts a prior plan, current code wins and the Worker must repair or correct this handoff.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Record no known production-code remediation in the initial B13 scope, but keep Worker authority to fix a discovered repository defect and its focused tests.
  Rationale: Current inspection found the required runtime, lifecycle, storage, telemetry, deployment, delivery, and import-workspace behavior. Inventing a second recovery executable or alert-rule artifact would duplicate existing ownership or contradict the task. A later concrete finding is not operator work and must be fixed before approval.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Make a uniquely named Compose recovery project and its `backend_data` and `backend_config` volumes the destructive import destination.
  Rationale: Strapi import replaces destination content and uploads. Project-scoped fresh volumes provide an inspectable identity and avoid any command that swaps, removes, or reuses original production storage. The original project remains stopped and its volumes remain recoverable until manual acceptance.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Invoke import by using the existing workspace helper from the exact immutable backend image and letting it spawn the fixed Strapi CLI with inherited standard input/output.
  Rationale: The image is distroless and read-only; `/strapi` cannot hold import diagnostics. The helper creates a writable tmpfs workspace with immutable application symlinks, then directly executes `/nodejs/bin/node /strapi/node_modules/@strapi/strapi/bin/strapi.js import --file /staging/recovery.tar`. Inherited terminal I/O preserves Strapi's destructive confirmation prompt. No shell, npm, npx, runtime compilation, database copy, or archive extraction is used inside the container.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use the manifest's backend digest and Git revision, the separately recovered backend repository and original deployment secrets, and a new logical `STRAPI_SOURCE_IDENTITY`.
  Rationale: executable code/configuration and deployment secrets are outside the export. The original secrets are needed to interpret encrypted or signed settings consistently; excluded API-token rows must still be recreated. The new source identity truthfully distinguishes fresh recovered storage from the original source volume while preserving release attribution.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use Grafana Cloud's default OTLP name conversion in the concrete queries and require live Explore confirmation before enabling notifications.
  Rationale: these are the current documented defaults and match the committed signal definitions. Tenant-specific suffix or label mapping can differ only through Grafana-side configuration. Confirming actual series is an external rollout prerequisite, not a reason to leave queries vague or change application metrics speculatively.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Model missing heartbeat and freshness explicitly in PromQL, but alert on run/capture/recovery events from their stable structured logs.
  Rationale: heartbeat and freshness are continuously exported state and should alert when their series disappears. Run, capture, recovery, and attention are discrete events: the exact completion log is unambiguous, while a sparse cumulative metric requires scrape-window inference. Event-log rules use No Data Normal during legitimate idle periods and query Error Error, while missing continuous telemetry remains explicit in the metric queries.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use priority P1 for unresolved backend recovery, P2 for missing telemetry/freshness and failed or deferred backup work, and P3 for per-run export attention.
  Rationale: concurrent or unrecovered backend ownership is the immediate availability and consistency risk. Missing backup evidence, stale completion, or a failed/deferred run needs prompt operator action but is subordinate to recovery failure. Recognized export diagnostics are advisory and do not invalidate a machine-confirmed backup.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use `backupd.run.finished`, `strapid.recovery.outcome`, and `strapid.capture.terminal` log records for the four discrete failure/defer alert rules; retain their counters as informational inventory only.
  Rationale: each event is emitted once at the owning lifecycle boundary with a JSON body field `event` and bounded `outcome` structured metadata. `count_over_time` over those records directly observes the occurrence without relying on counter initialization, reset, scrape count, instant-selector lookback, or permanent high-cardinality labels. Exact body prose is not matched.
  Date/Author: 2026-10-30 / Codex worker, remediation cycle 1

- Decision: Parse a downloaded manifest with the release's `decodeSnapshotManifest` before using any recovered field.
  Rationale: recovery should consume the same exact manifest/key/identity/timestamp contract that publication and reconciliation own. Reusing the decoder prevents the operator handoff from drifting into a partial parallel validator while keeping archive length and full-file SHA-256 recomputation as independent retrieval checks.
  Date/Author: 2026-10-30 / Codex worker

- Decision: Generate the recovery Compose project ID with lowercase UTC separators.
  Rationale: the command must itself satisfy the project-name contract stated by the procedure. Lowercase `t`/`z` preserves an unambiguous UTC timestamp and makes the derived engine volume names valid and predictable.
  Date/Author: 2026-10-30 / Codex worker

- Decision: Require the exact source checkout at the manifest Git revision before canonical manifest decoding; treat the B12 deployment artifact as optional deployment-file packaging only.
  Rationale: the release-owned decoder and its relative source imports are present in the checkout and absent from the four-file artifact. Requiring the checkout makes the documented command executable without expanding B12 or creating a parallel decoder.
  Date/Author: 2026-10-30 / Codex worker, remediation cycle 1

## Outcomes & Retrospective

Planning completed the repository-to-requirement reconciliation and found no known B01–B12 production-code defect. The initial B13 deliverable is this one living handoff, with exact configuration, current default Grafana conversion, explicit queries and alert state behavior, a safe fresh-volume import invocation, post-import credential/cache/webhook steps, and a complete list of unperformed live prerequisites.

The Worker re-audit found no production-code defect and required no change to cross-boundary ownership, concurrency, or authorization. The first review correctly found that the proposed sparse-counter fallback still depended on Prometheus lookback and could miss an event, that the recovery prerequisites overstated what the four-file artifact could execute, and that the plan lacked the required narrative milestone. Remediation cycle 1 replaces the four discrete counter alerts with stable structured-log event queries, makes the exact source checkout mandatory for canonical manifest decoding, and adds the milestone below. The canonical decoder and lowercase recovery project corrections remain valid. Remediation plan structure, source-to-query trace, scope, byte preservation, native Compose rendering, decoder import, and lowercase recovery-ID checks pass. Package suites were not repeated because no production or test file changed. The same independent Reviewer verified the corrected event queries against exact emitted bodies and current Loki semantics, confirmed the recovery and milestone corrections, repeated every proportionate acceptance check, found no remaining issue, and returned `APPROVED` and `REVIEW_READY`. The final B13 repository diff is this handoff plus `TODO.md` bookkeeping; no production behavior changed and all live/provider/rehearsal prerequisites below remain honestly unperformed. Never replace these caveats with a claim that local tests measured production RPO, outage, throughput, capacity, completeness, or recovery time.

## Milestone: Produce and prove the audited operator handoff

This single milestone covers the complete B13 scope: reconcile every `BACKUP.md` requirement with the pushed B01–B12 implementation, state exact configuration and external prerequisites, give executable Grafana alert and fresh-volume recovery instructions, and resolve review findings without changing production behavior. Its resulting artifact is this one living plan; no second runbook, generated alert resource, recovery wrapper, or production file is part of the milestone.

The Worker proves the artifact by running the six-handoff-heading and milestone-heading structure searches, the untracked-plan whitespace check, `git diff --exit-code -- BACKUP.md`, scoped Git status checks, quiet native rendering of `compose.prod.yml` with a valid lowercase recovery project, and a project-runtime import of `decodeSnapshotManifest`. The Worker also traces every LogQL selector and extracted field to the exact bodies and bounded attributes in `backupd/src/telemetry.ts` and `strapid/src/telemetry.ts`, and checks the syntax/storage assumptions against current official Loki documentation. The expected evidence is: all six handoff headings plus this milestone found; no whitespace diagnostic; unchanged `BACKUP.md` hash; no tracked change; only this plan in the bounded untracked scope; successful Compose rendering without resource creation; and `decodeSnapshotManifest=function`.

The Worker portion of this milestone is complete when those checks pass and this plan records their outputs with every review finding resolved. B13 itself is complete only after the same independent Reviewer returns `APPROVED` and `REVIEW_READY`, the coordinator records that result, updates only permitted queue bookkeeping, commits the approved plan and queue change, and pushes the commit to `origin/backup-system`.

## Context and Orientation

The system has three application processes and one telemetry transport process. `strapid` is the backend image's PID 1 and exclusively owns either a Strapi serving child or a Strapi export child. `backupd` owns schedule, local staging, validation, object-storage publication, and durable freshness state. The OpenTelemetry Collector accepts private OTLP/HTTP from both and forwards it to Grafana Cloud. The Next.js frontend reads Strapi content and uses webhook-driven cache-tag invalidation. The production contract is the exact release's `compose.prod.yml`, `otel-config.yml`, `Caddyfile`, and protected `.env` values.

A completed recovery point is not an archive alone. Its authoritative marker is `snapshots/v1/<site>/<environment>/<run-id>/manifest.json`, published only after the corresponding `archive.tar` was uploaded and confirmed. The manifest names the archive, its byte length and full-file SHA-256, the backend image digest and Git revision, Node and Strapi versions, capture interval, source identity, and run/window identities. The archive is a standard uncompressed, unencrypted Strapi export. It excludes admin users, password hashes, API-token rows, and admin attribution links. It includes supported content, related media, and supported database-held configuration, but neither successful export nor local validation proves source completeness.

“Fresh destination storage” below means newly created recovery-project `backend_data` and `backend_config` Docker named volumes whose names and Compose labels have been inspected before import and do not equal any retained original-production volume name. “Original secrets” means the protected values from the snapshot's deployment generation, especially `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, `REVALIDATION_HEADER`, `REVALIDATION_SECRET`, and `PREVIEW_SECRET`. The export archive is not the source of those values.

## Requirement-to-Evidence Implementation Audit

The task executor must verify every row against current code. The status “implemented” means repository work exists and the cited pushed plan records independent approval. “External” means the repository cannot truthfully prove the live or production-dependent property. Any mismatch between this audit and current code is a B13 implementation defect until fixed.

| Requirement area | Current implementation and authoritative files | Approved focused evidence | Remaining work |
| --- | --- | --- | --- |
| Exact runtime and package tooling | Root `mise.toml` pins Node 24.20.0. `backupd/` and `strapid/` are separate locked ESM TypeScript packages with native type stripping, strict no-emit TypeScript, Biome 2.4.2, and native tests. | B01 plan, pushed commit `6eb812c`, approved after plan remediation. | None in repository. |
| Compiled Strapi runtime and data-transfer workspace | `backend/Dockerfile` packages the compiled `/strapi` application without application TypeScript/`tsconfig.json`, copies exact Node 24.20.0, and includes the fixed import/export workspace in `strapid/src/strapi-runtime.ts`. | B02 plan, pushed commit `5c647cf`, 16 focused tests plus image/layout/empty-database evidence after remediation. | Production recovery is deliberately manual and unrehearsed. |
| Child and writer ownership | `strapid/src/process-group.ts`, `strapi-supervisor.ts`, and `health.ts` own detached Linux process groups, direct close plus group disappearance, bounded termination, health, serving/export exclusion, and intentional shutdown. | B03 plan, pushed commit `6c609b8`, 42 tests and two reviewed remediation cycles. | Production phase timing remains uncalibrated. |
| Bounded capture protocol | `capture-contract.ts`, `capture-coordinator.ts`, `capture-http.ts`, and `backupd/src/capture-client.ts` implement private Unix-socket identity, held response, cancellation, exact reconciliation, and one 900-second clock split 60/600/30/210 with 5-second forced confirmation. | B04 plan, pushed commit `f94a86f`, 69 strapid and 13 backupd tests after two remediation cycles. | Confirm the defaults fit measured production export/recovery. |
| Staging and archive validation | `backupd/src/staging-policy.ts`, `staging-manager.ts`, and `archive-validator.ts` enforce one run, `/staging`, capacity, 75-GiB limit, writer release, strict streaming tar/metadata parsing, file identity, byte length, and full-file SHA-256 without extraction. | B05 plan, pushed commit `c57102d`, 54 tests after remediation. | Calibrate disk allowance; validation does not prove source completeness. |
| Immutable remote publication | `object-storage-config.ts`, `snapshot-manifest.ts`, `snapshot-publisher.ts`, and `s3-snapshot-store.ts` implement static credentials, HTTPS, immutable keys, at most 1,000 multipart parts, archive first, manifest last, conditional writes, exact reconciliation, transport checksum request, and no pruning. | B06 plan, pushed commit `bebf6d0`, 74 tests including digest-pinned LocalStack after remediation. | Live Scaleway checksum behavior and bucket controls remain unconfirmed. |
| Daily schedule and durable state | `schedule-policy.ts`, `daily-scheduler.ts`, `run-admission.ts`, `durable-state.ts`, and `state-repository.ts` implement 03:00 UTC default, newest-only catch-up, no-queue single flight, SIGUSR2 admission, durable retry/cooldown, strict owner-only atomic state, and B06-only freshness. | B07 plan, pushed commit `5600dbf`, 107 tests after two remediation cycles. | Choose the production UTC time and retry policy from measured operations. |
| Complete lifecycle and restart safety | `backup-lifecycle.ts`, `backup-config.ts`, and `backupd/src/main.ts` order preflight, capture, validation, pending state, publication, cleanup, and freshness; retain one pending archive; fail closed on unknown staging; and bound shutdown. | B08 plan, pushed commit `e941f69`, 137 backupd and 69 strapid tests after reviewed design checkpoint/two remediation cycles. | No live deployment or recovery was run. |
| Application telemetry semantics | Both `telemetry.ts` modules implement fail-open explicit OTLP providers, bounded shutdown, safe resources, low-cardinality metrics, causal traces, safe logs, 60-second heartbeat/freshness, and one attention event per affected export. `export-output.ts` strips controls, redacts, bounds, and classifies diagnostics. | B09 plan, pushed commit `93b0dd6`, 148 backupd and 82 strapid tests after two remediation cycles. | Confirm live Grafana delivery, actual converted series, and alert routing. |
| Rootless images, volumes, identities, and settings | `backend/Dockerfile`, `backupd/Dockerfile`, `.env.example`, `compose.yml`, and `compose.prod.yml` use exact Node, nonroot distroless project images, read-only roots, private named volumes/socket, service allowlists, immutable attribution, health/restart/stop policies, and no Docker socket. | B10 plan, pushed commit `c144fbe`, 150 backupd/82 strapid/92 frontend tests plus image, Compose, rootless-volume, and empty-database evidence after remediation. | Supply real immutable references, secrets, and a new source identity during rollout/recovery. |
| Collector transport | `otel-config.yml` and both Compose files define digest-pinned Collector Contrib 0.164.0, private OTLP/HTTP 65103, 100% trace sampling, bounded batch/retry/in-memory queue, and Collector-only Grafana credentials without application field transforms. | B11 plan, pushed commit `463b7af`, native Collector validation, two Compose boundary tests, and 150 backupd tests. | Live endpoint/token/delivery and Grafana resources remain external. |
| CI and release delivery | `.github/workflows/ci.yml` runs both daemon checks/tests. `.github/workflows/cd.yml` publishes backend/frontend/backupd through existing provenance/SBOM/attestation controls and uploads the exact-commit four-file deployment archive. | B12 plan, pushed baseline commit `2f58c01`, 150 backupd/82 strapid/92 frontend tests plus three image builds and deterministic archive evidence. | An authorized release must actually publish and retain immutable artifacts; B13 does not dispatch it. |

Every B01–B12 checkbox is backed by its own ExecPlan, independent `APPROVED`/`REVIEW_READY` record, workflow commit, and pushed branch history in queue order. B13 must preserve that history and must itself complete the same Planner → Worker → Reviewer → coordinator bookkeeping → commit → push workflow before the repository delivery can be declared complete.

## Implemented Configuration Reference

The project-local `.env` is the deployment source, but Compose passes only named values to each service. Required values have no default and deployment must stop if they are absent. The following settings and defaults are the current implemented contract.

`backupd` schedule, capacity, publication, and shutdown settings are:

| Name | Default/current mapping | Meaning |
| --- | --- | --- |
| `BACKUPD_COORDINATION_SOCKET_PATH` | `/coordination/strapid.sock` fixed by Compose | Private supervisor Unix socket. |
| `BACKUPD_SCHEDULE_UTC` | `03:00` | One daily UTC target. |
| `BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS` | `900` | Persisted 15-minute automatic/pending retry delay. |
| `BACKUPD_AUTOMATIC_MAX_ATTEMPTS` | `2` | Initial scheduled attempt plus one retry. |
| `BACKUPD_STAGING_MIN_FREE_BYTES` | `107374182400` | 100 GiB required free space before allocation. |
| `BACKUPD_ARCHIVE_MAX_BYTES` | `80530636800` | 75 GiB maximum archive size. Must remain below minimum free bytes. |
| `BACKUPD_PUBLICATION_WINDOW_SECONDS` | `21600` | Six-hour original publication window; final 60 seconds are fixed read-only reconciliation reserve. |
| `BACKUPD_UPLOAD_CONCURRENCY` | `4` | At most four managed multipart parts buffered/in flight. |
| `BACKUPD_S3_MAX_ATTEMPTS` | `3` | Maximum SDK attempts per request. |
| `BACKUPD_SHUTDOWN_TIMEOUT_SECONDS` | `30` | Daemon shutdown bound; Compose stop grace is 45 seconds. |
| `BACKUPD_S3_ENDPOINT` | required; example `https://s3.fr-par.scw.cloud` | HTTPS origin only, no path/query/user info. |
| `BACKUPD_S3_REGION` | required; example `fr-par` | Signing/provider region. |
| `BACKUPD_S3_BUCKET` | required | Private backup bucket. |
| `BACKUPD_S3_ACCESS_KEY_ID`, `BACKUPD_S3_SECRET_ACCESS_KEY` | required | Explicit static dedicated backup credential; no default provider chain. |
| `BACKUPD_SNAPSHOT_SITE` | required | Lowercase immutable site path segment. |
| `BACKUPD_SNAPSHOT_ENVIRONMENT` | `DEPLOYMENT_ENVIRONMENT` | Lowercase environment segment/resource identity. |
| `BACKUPD_APPLICATION_IMAGE_DIGEST` | `APPLICATION_IMAGE_DIGEST` | Exact backend `sha256:<64 hex>` recorded in every manifest. |
| `BACKUPD_GIT_REVISION` | `APPLICATION_GIT_REVISION` | Exact 7–64 lowercase-hex source revision recorded in every manifest. |

The storage publisher fixes a 5-MiB minimum part, rounds upward in whole MiB so a transfer has no more than 1,000 parts, rejects any required part above 5 GiB, uses concurrency four by default, asks for `SHA256` transfer checksums and multipart `COMPOSITE`, and never treats ETag or a composite checksum as the archive's full-file SHA-256. Its SDK connection, socket-inactivity, and request timeouts are 10, 120, and 600 seconds. Immutable keys are `snapshots/v1/<site>/<environment>/<run-id>/archive.tar` and `.../manifest.json`.

`strapid` capture and recovery settings are:

| Name | Default/current mapping | Meaning |
| --- | --- | --- |
| `STRAPID_COORDINATION_SOCKET_PATH` | `/coordination/strapid.sock` fixed by Compose | Private Unix socket, never TCP or host-published. |
| `STRAPID_CAPTURE_WINDOW_SECONDS` | `900` | Complete interruption bound. |
| `STRAPID_SERVING_SHUTDOWN_SECONDS` | `60` | Clean serving-stop allocation; forced stop invalidates capture. |
| `STRAPID_EXPORT_SECONDS` | `600` | Maximum export execution allocation. |
| `STRAPID_EXPORT_TERMINATION_SECONDS` | `30` | Export termination reserve, internally 25 seconds SIGTERM plus 5 seconds forced confirmation. |
| `STRAPID_RECOVERY_SECONDS` | `210` | Serving restart/health allocation. |
| `STRAPID_FORCE_CONFIRMATION_SECONDS` | `5` | Nested forced group-disappearance confirmation. |
| `STRAPID_RELEASE_ID` | `APPLICATION_GIT_REVISION` | Capture release identity. |
| `STRAPID_SOURCE_VOLUME_ID` | `STRAPI_SOURCE_IDENTITY` | Operator-owned logical storage identity; change it when recovered storage replaces the source. |
| `STRAPID_TELEMETRY_ENVIRONMENT` | `DEPLOYMENT_ENVIRONMENT` | Telemetry resource environment. |

The six phase allocations must be positive integers and `60 + 600 + 30 + 210` must equal the 900-second total. These are initial unmeasured defaults. Do not change only one value and leave the sum invalid.

Both applications use fixed `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:65103` and `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`. Metrics export every 60 seconds with a 2-second exporter timeout. Application telemetry shutdown is capped at five seconds inside the domain shutdown deadline. The Collector receives only private OTLP/HTTP on 65103, batches for five seconds (preferred 1024, maximum 2048), samples traces initially at 100%, and uses an in-memory 1000-request/two-consumer queue with 5-second initial/30-second maximum retry intervals for at most five minutes. `GRAFANA_CLOUD_OTLP_ENDPOINT`, `GRAFANA_CLOUD_INSTANCE_ID`, and `GRAFANA_CLOUD_API_KEY` are required and passed only to the Collector.

The exact compiled recovery runtime is Node `v24.20.0`, Strapi `5.52.0`, immutable application root `/strapi`, Node executable `/nodejs/bin/node`, CLI `/strapi/node_modules/@strapi/strapi/bin/strapi.js`, staging root `/staging`, and temporary workspace parent `/tmp/strapi-workspaces`. The recovery backend image is `${BACKEND_IMAGE_REPOSITORY}@${manifest.application.imageDigest}` from the protected deployment configuration plus selected manifest.

## Grafana Cloud Operator Configuration

These rules are an operator specification, not repository-managed/importable resources. First use Grafana Explore after live OTLP delivery to confirm the default-converted names and resource labels. Under current default Grafana Cloud conversion, raw application metrics map as follows:

| Raw OpenTelemetry signal | Grafana Cloud Prometheus name | Bounded labels |
| --- | --- | --- |
| `backupd.heartbeat` gauge | `backupd_heartbeat` | resource labels only |
| `backupd.snapshot.capture_time` gauge, unit `s` | `backupd_snapshot_capture_time_seconds` | resource labels only |
| `backupd.run.outcome` counter | `backupd_run_outcome_total` | `trigger`, `outcome` |
| `backupd.run.duration` histogram, unit `s` | `backupd_run_duration_seconds` | `trigger`, `outcome` |
| `backupd.phase.duration` histogram, unit `s` | `backupd_phase_duration_seconds` | `phase`, `outcome` |
| `strapid.capture.outcome` counter | `strapid_capture_outcome_total` | `outcome` |
| `strapid.capture.duration` histogram, unit `s` | `strapid_capture_duration_seconds` | `outcome` |
| `strapid.phase.duration` histogram, unit `s` | `strapid_phase_duration_seconds` | `phase`, `outcome` |
| `strapid.recovery.outcome` counter | `strapid_recovery_outcome_total` | `source`, `outcome` |
| `strapid.export.attention` counter | `strapid_export_attention_total` | `outcome` (`warning`, `error`, or `both`) |

Use `service_namespace="us-alb"`, `service_name="backupd"` or `"strapid"`, and `deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"` in every selector. Substitute the literal deployed environment; do not make run IDs, capture-window IDs, object keys, or trace IDs permanent metric labels.

The counter rows above are informational inventory for exploration and trend panels; the discrete event alerts below do not infer occurrences from sparse cumulative metrics. With Loki's native OTLP ingestion, the three resource attributes in the selectors are default stream labels with dots normalized to underscores. Each application's object-valued OpenTelemetry log body is stringified as the JSON log line. The stable event name is body path `event`; backup run/capture correlation is under `correlation.runId` and `correlation.captureWindowId` when present. Bounded log-record attributes are structured metadata: `outcome`, `trigger`, and `phase` retain those names, while `failure.code` is queried as `failure_code`. The event rules filter bounded structured metadata before parsing the JSON body, then extract only the stable `event` field. They never match message prose.

Configure these rules at a one-minute evaluation interval.

The P2 missing-heartbeat rule uses a five-minute window, which permits four missed one-minute exports before firing:

    absent_over_time(
      backupd_heartbeat{
        service_namespace="us-alb",
        service_name="backupd",
        deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"
      }[5m]
    )
    or on() vector(0)

Alert when the result is greater than zero with no additional `for` delay. Set No Data to Alerting and query Error to Error; route Grafana's `DatasourceNoData` and `DatasourceError` meta-alerts at P2. The `or vector(0)` makes a healthy present heartbeat evaluate to zero instead of relying on Grafana No Data state.

The P2 overdue-or-missing snapshot rule treats 26 hours as the initial threshold. `93600` is 26 hours in seconds; it is operational grace and does not change the 24-hour content-loss target:

    (
      time()
      - max(
          last_over_time(
            backupd_snapshot_capture_time_seconds{
              service_namespace="us-alb",
              service_name="backupd",
              deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"
            }[5m]
          )
        )
      > bool 93600
    )
    or on()
    absent_over_time(
      backupd_snapshot_capture_time_seconds{
        service_namespace="us-alb",
        service_name="backupd",
        deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"
      }[5m]
    )
    or on() vector(0)

Alert when the result is greater than zero for five minutes. Set No Data to Alerting and query Error to Error, with datasource meta-alerts routed P2. This intentionally alerts before the first confirmed snapshot and whenever the regularly reported durable freshness series disappears.

The P2 failed-run rule observes the owning `backupd.run.finished` completion record:

    sum(
      count_over_time(
        {service_namespace="us-alb", service_name="backupd", deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"}
        | outcome=~"failed|retryable-failure"
        | json event="event"
        | event="backupd.run.finished"
        | __error__=""
        [5m]
      )
    )

Alert when greater than zero with no additional delay. Set No Data to Normal and query Error to Error. No records during idle operation are healthy No Data; a malformed matching JSON body produces `__error__` and is excluded from this rule, while a datasource/query failure enters Grafana's Error state and its meta-alert remains routed P2. `backupd/src/telemetry.ts` emits this record once from `runFinished`, with the normalized lifecycle result in bounded `outcome` structured metadata.

The P2 exhausted/deferred-publication rule detects a publication attempt that exhausted its bounded SDK work and was retained for durable retry:

    sum(
      count_over_time(
        {service_namespace="us-alb", service_name="backupd", deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"}
        | outcome="pending"
        | json event="event"
        | event="backupd.run.finished"
        | __error__=""
        [5m]
      )
    )

Alert immediately, No Data Normal, query Error Error. `backupd.run.finished` is emitted once for the deferred run with `outcome="pending"`; the informational counter is not used by this rule. This does not claim the snapshot is permanently lost: B08 can retry the durable pending publication every 15 minutes within the original six-hour window. Operators investigate promptly and use freshness as the authoritative completion signal.

The P1 backend-recovery rule covers both an explicit failure and unresolved child-process ownership:

    sum(
      count_over_time(
        {service_namespace="us-alb", service_name="strapid", deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"}
        | outcome=~"failed|ownership-unconfirmed"
        | json event="event"
        | event="strapid.recovery.outcome"
        | __error__=""
        [5m]
      )
    )

Alert immediately, No Data Normal, query Error Error, and page the P1 response channel. `strapid.recovery.outcome` has JSON body field `event`; its bounded `phase` structured metadata identifies source `capture` or `unexpected-serving-loss`, and `outcome` supplies the filter above. Do not include `cancelled`: intentional shutdown and capture cancellation are not independently proof of failed service recovery. A datasource/query failure enters Error and its datasource meta-alert is routed P2 as an observability failure; it does not fabricate a P1 recovery event. The separate P2 capture-failure rule is:

    sum(
      count_over_time(
        {service_namespace="us-alb", service_name="strapid", deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"}
        | outcome="failed"
        | json event="event"
        | event="strapid.capture.terminal"
        | __error__=""
        [5m]
      )
    )

Alert immediately with No Data Normal and query Error Error. `strapid.capture.terminal` is emitted once with body paths `event` and `correlation.captureWindowId` plus bounded `outcome` structured metadata; this rule deliberately does not group on the unbounded correlation value. Backupd failure may also fire; notification policy may group the two by environment and incident priority, but never suppress P1 recovery evidence behind a P2 backup alert.

For the P3 per-run advisory, use Grafana Cloud Logs and the `strapid.export.attention` structured log rather than the counter. The body is JSON and contains the capture-window correlation. This LogQL query extracts that field only at query time:

    sum by (capture_window_id, outcome) (
      count_over_time(
        {service_namespace="us-alb", service_name="strapid", deployment_environment_name="<DEPLOYMENT_ENVIRONMENT>"}
        | outcome=~"warning|error|both"
        | json event="event", capture_window_id="correlation.captureWindowId"
        | event="strapid.export.attention"
        | __error__=""
        [2m]
      )
    )

Alert when greater than zero, with No Data Normal and query Error Error. Group notifications by `alertname`, `deployment_environment_name`, and query-time `capture_window_id`; set the repeat interval longer than the two-minute firing window (24 hours is the initial value) and disable resolved notifications for this advisory route. Because the application emits one attention record only after both output streams close, many recognized diagnostic lines from one export create one alert instance and one firing notification. A later affected run has a different capture-window ID and therefore a new alert instance. Route P3 to a non-paging advisory channel. The operator follows the trace/log correlation, reviews sanitized `strapid.export.output` records, and does not block or retract a machine-confirmed published backup solely because this advisory fired.

Do not alert from exact log prose. Stable structured log event names are `backupd.run.started`, `backupd.phase.started`, `backupd.phase.finished`, `backupd.freshness.confirmed`, `backupd.run.finished`, `backupd.<failure-code>`, `strapid.capture.admitted`, `strapid.phase.started`, `strapid.phase.finished`, `strapid.export.output`, `strapid.export.output_closed`, `strapid.export.attention`, `strapid.capture.terminal`, `strapid.recovery.started`, and `strapid.recovery.outcome`. Run/window IDs belong only in log bodies or traces. Trace roots are `backup.run` and `strapi.capture`; phase spans are `backup.<phase>` and `strapi.<phase>`.

After live delivery, intentionally stop only a nonproduction/rehearsal Collector or daemon to prove the P2 missing-series route, emit one authorized manual rehearsal run with an advisory fixture only if a safe nonproduction method exists, and verify alert grouping/routing. These live tests are not performed by B13 and must never use production content or weaken the application filters.

## Manual Recovery Procedure

This procedure is for a separately authorized incident or rehearsal. Do not execute it while implementing B13. It assumes an operator workstation or replacement host has Rootless Docker/Compose, the exact source checkout at the manifest Git revision, secure access to the private bucket, immutable image registry, and the separately protected original deployment configuration. The B12 four-file deployment artifact may additionally supply `.env.example`, `Caddyfile`, `compose.prod.yml`, and `otel-config.yml`, but it cannot replace the source checkout because it does not contain the canonical manifest decoder. Recovery does not depend on the original VPS.

First disable external traffic to the application. If the original host is available, record the original Compose project and its `/data` and `/config` volume names, then stop scheduling and every writer without deleting containers or volumes. Stop `backupd`, frontend, gateway, and backend; do not run `docker compose down -v`, `docker volume rm`, or any cleanup against the original project. If the original host is gone, record that fact; no recovery step may assume its storage exists.

Select a completed `manifest.json`, not a lone archive. Download that manifest and exactly the `archive.key` it names into a private operator directory. Never select `archive.tar` merely because it exists. From the repository checkout at the manifest's Git revision, parse and validate the bounded identity fields with the project Node runtime. Set `MANIFEST_FILE` and `ARCHIVE_FILE` to the downloaded absolute paths, then run:

    IFS=$'\t' read -r ARCHIVE_KEY EXPECTED_BYTES EXPECTED_SHA256 IMAGE_DIGEST GIT_REVISION NODE_VERSION STRAPI_VERSION < <(
      MANIFEST_PATH="$MANIFEST_FILE" mise exec -- node --input-type=module --eval '
        import { readFile } from "node:fs/promises";
        import { decodeSnapshotManifest } from "./backupd/src/snapshot-manifest.ts";

        const manifest = decodeSnapshotManifest(
          await readFile(process.env.MANIFEST_PATH),
        );
        process.stdout.write([
          manifest.archive.key,
          manifest.archive.byteLength,
          manifest.archive.sha256,
          manifest.application.imageDigest,
          manifest.application.gitRevision,
          manifest.application.nodeVersion,
          manifest.application.strapiVersion,
        ].join("\t"));
      '
    )
    ACTUAL_BYTES="$(stat -c %s -- "$ARCHIVE_FILE")"
    ACTUAL_SHA256="$(sha256sum -- "$ARCHIVE_FILE" | awk '{print $1}')"
    test "$ACTUAL_BYTES" = "$EXPECTED_BYTES"
    test "$ACTUAL_SHA256" = "$EXPECTED_SHA256"

`decodeSnapshotManifest` must return successfully and both final `test` commands must exit zero before the archive is mounted anywhere. The release-owned decoder enforces the exact canonical v1 field, key, identity, timestamp, digest, length, and version contract. The separately recomputed full-file SHA-256 is the recovery checksum. Do not compare the manifest hash with an ETag, multipart composite checksum, or custom object metadata.

Recover the original protected `.env` values from the independent secret source into a mode-0600 recovery environment file outside the repository. Keep the original signing salts/keys and revalidation/preview secrets. Set `APPLICATION_IMAGE_DIGEST=$IMAGE_DIGEST`, `APPLICATION_GIT_REVISION=$GIT_REVISION`, and `BACKEND_IMAGE_REPOSITORY` to the retained repository for that backend image. From the same exact source checkout, resolve the compatible `FRONTEND_IMAGE` and use its deployment files; the matching four-file deployment artifact may supply copies of those files after their revision is verified, but it is not a source-code or decoder substitute. Set `CMS_API_TOKEN` empty until a replacement is created. Set `STRAPI_SOURCE_IDENTITY` to a new durable logical value such as `recovery-<UTC recovery id>`; it must not reuse the original source-storage identity. Preserve `ADMIN_EMAIL` and the original configured `ADMIN_PASSWORD`; if the secure source stored password-file contents, place those recovered contents into this Compose deployment's `ADMIN_PASSWORD` value because current Compose does not mount `ADMIN_PASSWORD_FILE`.

Choose a unique lowercase recovery ID and project, then render the exact production Compose configuration from the selected release without starting it:

    RECOVERY_ID="$(date -u +%Y%m%dt%H%M%Sz)"
    RECOVERY_PROJECT="us-alb-recovery-${RECOVERY_ID}"
    RECOVERY_ENV="/absolute/private/path/recovery.env"
    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml config --quiet
    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml pull backend
    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml create --no-build backend

Inspect the new destination before accepting Strapi's destructive prompt:

    docker volume inspect \
      --format '{{.Name}} project={{index .Labels "com.docker.compose.project"}} volume={{index .Labels "com.docker.compose.volume"}} created={{.CreatedAt}}' \
      "${RECOVERY_PROJECT}_backend_data" \
      "${RECOVERY_PROJECT}_backend_config"

The two names must begin with the unique recovery project, labels must identify that project and logical volumes `backend_data`/`backend_config`, creation times must match this recovery, and neither engine name may equal an original-production volume recorded above. Confirm the fresh SQLite destination does not exist yet:

    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml run --rm --no-deps \
      --entrypoint /nodejs/bin/node \
      backend \
      --input-type=module --eval '
        import { existsSync } from "node:fs";
        if (existsSync(process.env.DATABASE_FILENAME)) throw new Error("destination database already exists");
        process.stdout.write(`${process.env.DATABASE_FILENAME}\n`);
      '

Verify the immutable runtime before import:

    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml run --rm --no-deps \
      --entrypoint /nodejs/bin/node backend --version
    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml run --rm --no-deps \
      --entrypoint /nodejs/bin/node backend --input-type=module --eval '
        import { readFile } from "node:fs/promises";
        const value = JSON.parse(await readFile("/strapi/node_modules/@strapi/strapi/package.json", "utf8"));
        process.stdout.write(`${value.version}\n`);
      '

The outputs must exactly equal `$NODE_VERSION` and `$STRAPI_VERSION` from the manifest. The service image resolves to `${BACKEND_IMAGE_REPOSITORY}@${IMAGE_DIGEST}`. Do not substitute a newer tag, allow a newer image to migrate the fresh database, or use a different schema checkout.

At this point the production backend, production backupd, recovery backend serving process, recovery backupd, and every other writer must all be stopped. Run the import in a real interactive terminal so the operator sees Strapi's destructive confirmation. This is the exact image/Node/CLI/workspace invocation:

    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml run --rm --no-deps \
      --volume "$ARCHIVE_FILE:/staging/recovery.tar:ro" \
      --entrypoint /nodejs/bin/node \
      backend \
      --input-type=module --eval '
        import { spawn } from "node:child_process";
        import { withStrapiDataTransferWorkspace } from "/strapid-daemon/src/strapi-runtime.ts";

        await withStrapiDataTransferWorkspace(
          { operation: "import", filePath: "/staging/recovery.tar" },
          (invocation) => new Promise((resolve, reject) => {
            const child = spawn(invocation.executable, invocation.arguments, {
              cwd: invocation.cwd,
              env: invocation.environment,
              shell: false,
              stdio: "inherit",
            });
            child.once("error", reject);
            child.once("close", (code, signal) => {
              if (code === 0 && signal === null) resolve();
              else reject(new Error(`Strapi import closed with code ${String(code)} signal ${String(signal)}`));
            });
          }),
        );
      '

The helper expands the child invocation to exactly:

    executable: /nodejs/bin/node
    arguments:  /strapi/node_modules/@strapi/strapi/bin/strapi.js import --file /staging/recovery.tar
    cwd:        /tmp/strapi-workspaces/import-<unique suffix>
    app links:  /strapi/{config,src,build,database,node_modules,package.json,package-lock.json,public,favicon.png}

Before answering Strapi's prompt, re-read the inspected recovery volume names shown above. Import replaces the selected fresh destination's content and uploads. Wait for a zero exit and review diagnostics. Do not extract the tar into `/data`, copy SQLite/media from the archive, pass stage filters, or run normal serving concurrently.

The empty destination bootstrap can create the shared administrator during import from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; normal backend startup runs it again and leaves an existing admin unchanged. The recovered account is new: the original password hash, later UI-only password changes, original admin row, and content `createdBy`/`updatedBy` links are not recovered. This attribution loss is accepted.

With external traffic still disabled and scheduling still stopped, start only the recovered backend and gateway for operator access:

    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml up -d --no-deps backend gateway

The gateway publishes only `127.0.0.1:65102`; use the site's approved operator tunnel/access path. Do not re-enable the public upstream. Log in under `/cms/admin` with the configured bootstrap password. Create replacement Strapi API tokens in the admin UI with the least permissions required by each consumer. Update `CMS_API_TOKEN` in the protected recovery environment and every other token consumer; the old API-token rows and token strings cannot be reconstructed from `API_TOKEN_SALT`.

Normal recovered-backend startup must reconcile the managed webhook named `Next revalidation` to `${FRONTEND_INTERNAL_URL}/refresh`, the configured `REVALIDATION_HEADER`/`REVALIDATION_SECRET`, and events `entry.create`, `entry.update`, `entry.delete`, `entry.publish`, and `entry.unpublish`. Inspect that webhook and every other restored webhook before enabling traffic. Use the admin webhook test only through the operator-only stack and require the frontend refresh route to return its successful test response after the frontend starts.

Start a fresh frontend runtime with the replacement token while traffic remains disabled:

    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml up -d --no-deps --force-recreate frontend

Recreation clears the tmpfs Next cache and is the required whole-cache refresh. Do not assume future webhook events invalidate all restored entries.

Manually verify admin login; authenticated frontend reads; representative draft and published content; relations; collection and single-document pages; original uploads and generated media formats; public URLs; managed and other webhooks; and the visible application version. Record the selected manifest/run ID, recovery project, fresh volume names, exact image digest/Git revision, checksum result, import result, replacement-token completion, webhook/cache checks, content/media checks, and named operator acceptance.

Only after the operator signs acceptance may the recovered stack become the traffic target and scheduling resume. Ensure the new `STRAPI_SOURCE_IDENTITY` is already in the recovery environment, then start the Collector and backupd and re-enable the external route under the site's change procedure:

    docker compose -p "$RECOVERY_PROJECT" --env-file "$RECOVERY_ENV" -f compose.prod.yml up -d otel-collector backupd

Keep the original production project's data/config volumes intact after cutover until a separate retention/decommission decision explicitly authorizes their removal. Acceptance of the recovered stack is not authorization to delete original storage.

## Explicit Unperformed External Prerequisites

The following items are required before production reliance and are not proven or performed by B13:

- Live Scaleway checksum confirmation. Use the deployed SDK settings against the real destination to confirm request `SHA256`, multipart `COMPOSITE`, returned checksum fields under `ChecksumMode: ENABLED`, archive/manifest HEAD behavior, and provider handling of conditional PUT/multipart completion. LocalStack proves ordering and client behavior only.
- Bucket controls. Confirm a private bucket, HTTPS endpoint/region, dedicated least-privilege application credential for bucket preflight plus required object/multipart put/head/get operations, independently available recovery credentials, and bucket-level SSE-ONE enabled before the first production upload. Decide and configure retention/expiration, storage class, versioning, Object Lock if desired, and cleanup of unfinished multipart uploads. The application intentionally has no pruning or bucket-administration path.
- Production schedule, timing, and capacity calibration. Measure real 5–50 GB export duration, serving stop/recovery, archive growth, free disk, validation, upload throughput/retries, and import/recovery operator time. Finalize `BACKUPD_SCHEDULE_UTC`, staging allowance, archive cap, 60/600/30/210 capture reserves, six-hour publication window, retry delay/count, upload concurrency/attempts, and remote capacity/cost from evidence. Do not relax writer exclusion or the 15-minute interruption target to make a test pass.
- Live Grafana delivery and alert provisioning. Supply least-privilege OTLP credentials, confirm the actual default-converted metric/log names and labels, create the rules and notification policies above, route P1/P2/P3 and datasource meta-alerts, and exercise missing-series and advisory grouping in a safe rehearsal. No repository validation proves Grafana ingestion.
- Off-host recovery sources. Retain immutable backend/frontend/backupd image references and access, an exact source checkout of every recoverable manifest Git revision, the protected original deployment configuration/secrets, private-bucket manifest/archive recovery access, provider/account recovery information, and this handoff somewhere independent of the failed VPS. Retaining the matching four-file deployment artifact is useful but does not satisfy the source-checkout prerequisite because it lacks `backupd/src/snapshot-manifest.ts`. Do not place the live `.env` into a general-purpose archive or the backup bucket by default.
- Manual recovery rehearsal. On a fresh host/project and fresh volumes, perform the complete procedure through checksum, import, admin login, token recreation, webhook/cache reconciliation, representative content/media inspection, acceptance, and controlled traffic/scheduling resume. Record actual timings and findings. Until that rehearsal and production measurements exist, the 24-hour loss objective, 15-minute interruption budget, and one-day recovery objective are design targets, not measured guarantees.

No local or live check may claim source completeness. Strapi can warn and skip a missing asset or an entity-read failure while exiting successfully. Advisory output, archive integrity, metadata, full-file SHA-256, transport checksum, remote object confirmation, and successful import each prove a narrower property; none independently proves that every source record and asset was present.

## Plan of Work

The Worker begins by re-reading the authoritative B13 item, this whole plan, all of `BACKUP.md`, and the current B01–B12 implementation evidence at the pushed baseline. It checks the audit row by row against current files, not memory. It verifies every configuration name/default against `.env.example`, both Compose files, and the owning parser. It verifies every raw telemetry signal and label against the two telemetry modules and the Grafana default-conversion assumptions recorded from Context7. It verifies the recovery manifest fields, immutable key layout, fixed image paths, workspace helper, bootstrap behavior, webhook/cache paths, and unique recovery-volume commands.

If this pass finds a repository behavior missing or contradicting `BACKUP.md`, the Worker updates this plan's Progress/Surprises/Decision Log, fixes the smallest owning production boundary, adds or updates only the lowest stable focused test, and runs canonical validation for that changed area. It must not write “operator must handle it” for a defect the repository is required to implement. A change to cross-boundary ownership, concurrency, or authorization requires the `implement-task` design checkpoint before implementation.

If no code defect is found, the Worker changes only this living plan to record its completed re-audit and validation evidence. It does not create alert resources, a recovery wrapper, a second document, or redundant tests merely to generate a diff. The independent Reviewer then verifies the handoff and may require bounded corrections or genuine remediation through the same Worker.

After reviewer approval, the coordinator performs only the bookkeeping granted by `implement-task`: record review evidence and final outcomes here, link this file under B13, check B13, stage the approved B13 scope, confirm the protected directory and unrelated files are excluded, commit once, and push. Repository delivery remains incomplete until that push succeeds.

## Concrete Steps

All Worker commands run from `/home/codex/src/us-alb`. Start with read-only identity and scope checks that do not enumerate untracked files:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse origin/backup-system
    git status --short --untracked-files=no

Expect `backup-system`, the same `2f58c01fb2a2c8fb8fd25d89a3afdbb1748e70bf` baseline before B13 edits, and no tracked change except this plan after planning.

Recheck authoritative names and evidence with bounded searches that exclude dependencies and never target the protected directory:

    rg -n 'BACKUPD_|STRAPID_|OTEL_|GRAFANA_|APPLICATION_|STRAPI_SOURCE_IDENTITY' \
      .env.example compose.yml compose.prod.yml backupd/src strapid/src otel-config.yml
    rg -n 'createCounter|createHistogram|createObservableGauge|eventName|\.emit\(' \
      backupd/src/telemetry.ts strapid/src/telemetry.ts
    rg -n 'STRAPI_APPLICATION_ROOT|STRAPI_NODE_EXECUTABLE|STRAPI_CLI|STRAPI_WORKSPACE_PARENT|STRAPI_STAGING_ROOT|operation: "import"' \
      strapid/src/strapi-runtime.ts strapid/test/strapi-runtime.test.ts
    rg -n 'SnapshotManifestV1|snapshots/v1|imageDigest|gitRevision|byteLength|sha256' \
      backupd/src/snapshot-manifest.ts
    git log --oneline a02a11b..HEAD

Compare the results to the audit, configuration reference, Grafana inventory, recovery invocation, and B01–B12 commit list. Correct this plan if current code differs. Do not run production recovery, create Docker recovery volumes, pull a live recovery image, or contact any provider merely to validate prose.

For a plan-only B13 diff, validation is deliberately documentation/scope focused:

    test -f .agents/plans/b13-complete-the-implementation-audit-and-operator-handoff.md
    rg -n '^## (Requirement-to-Evidence Implementation Audit|Implemented Configuration Reference|Grafana Cloud Operator Configuration|Manual Recovery Procedure|Explicit Unperformed External Prerequisites|Validation and Acceptance)$' \
      .agents/plans/b13-complete-the-implementation-audit-and-operator-handoff.md
    rg -n '^## Milestone: Produce and prove the audited operator handoff$' \
      .agents/plans/b13-complete-the-implementation-audit-and-operator-handoff.md
    git diff --no-index --check /dev/null \
      .agents/plans/b13-complete-the-implementation-audit-and-operator-handoff.md
    git diff --exit-code -- BACKUP.md
    git diff --name-only
    git status --short --untracked-files=all -- \
      .agents/plans/b13-complete-the-implementation-audit-and-operator-handoff.md \
      BACKUP.md TODO.md
    git status --short --untracked-files=no

Before coordinator bookkeeping, a no-defect B13 Worker diff contains only this plan. No package suite is rerun merely to repeat B01–B12 evidence. If the Worker changes implementation, use `.agents/skills/canonical-validation/SKILL.md`: list `mise tasks`, run the exact owning daemon/app tasks, add native configuration/image validation only when those files changed, refresh required API artifacts after backend/frontend changes, and record actual command results here. Never add or run Strapi backend automated tests.

The Reviewer independently repeats the bounded audit searches and documentation/scope checks, checks the PromQL/LogQL against current raw signal definitions and documented Grafana default conversion, and statically traces the recovery command through current Compose/image/workspace/bootstrap paths. The Reviewer does not execute import or contact production/providers.

After `APPROVED` and `REVIEW_READY`, the coordinator may update `TODO.md` and this plan only as allowed by `implement-task`, then inspect the staged file list before commit. The exact final commit title is:

    B13 — Complete the implementation audit and operator handoff

Push that commit to `origin/backup-system`. Do not declare the queue or repository delivery complete until the pushed branch contains the B13 commit and every top-level TODO item is checked.

## Validation and Acceptance

B13 is accepted when the audit accounts for every `BACKUP.md` implementation area and each implemented claim points to current files plus focused approved evidence. Every B01–B12 completion must be traceable to its approved pushed workflow commit. A discovered missing repository behavior must be fixed and canonically validated before approval; it cannot be moved into the external-prerequisite list for convenience.

The handoff must state every implemented configuration name and current default needed to operate backup, capture, storage, telemetry, and recovery identity. It must distinguish required secret/deployment values from defaults and state that numeric timing/capacity values are uncalibrated initial policy.

The recovery procedure must require the exact source checkout at the manifest Git revision for canonical decoding, identify a completed manifest, verify its canonical archive key, byte length, and recomputed full-file SHA-256, combine the manifest digest with `BACKEND_IMAGE_REPOSITORY`, verify exact Node/Strapi versions, identify fresh recovery-project data/config volumes, and show the exact direct Node → workspace → Strapi CLI import command. It must treat the matching four-file artifact as optional deployment-file packaging rather than a decoder substitute, retain original storage, keep serving/scheduling/other writers stopped during import, preserve original secrets, recreate the admin with accepted attribution loss, replace API tokens, reconcile webhooks, recreate the frontend cache runtime, require representative manual checks, and withhold traffic and scheduling until named operator acceptance. No production recovery is run during B13.

The Grafana section must give raw and default-converted metric names, exact structured-event body/metadata ownership, complete selectors, executable PromQL/LogQL, one-minute evaluation, 5-minute heartbeat loss, 26-hour freshness, idle event-log No Data Normal behavior, P1/P2/P3 priorities, query-error states, datasource meta-alert routing, and query-time capture-window grouping that yields one advisory notification per affected run without a permanent high-cardinality label. No importable Grafana resource is required or added.

The external-prerequisite section must explicitly leave live Scaleway checksum confirmation, bucket security/lifecycle policy, production timing/capacity calibration, live Grafana delivery/rules/routing, off-host images, exact source checkouts for retained manifest Git revisions, optional deployment artifacts, secret/storage-access sources, and a fresh-host manual rehearsal unperformed. The plan and final outcome must never claim measured RPO/outage/RTO or source completeness from local checks.

`BACKUP.md` must remain byte-identical. No production/provider action, workflow dispatch, publication, deployment, environment mutation, recovery volume, archive, credential, alert resource, or second documentation file may be created. Final scope and validation must obey `implement-task`, and B13 remains unchecked until independent approval.

## Idempotence and Recovery

The B13 audit and documentation checks are read-only or repeatable. Re-running the bounded searches and diff checks changes no repository or external state. If current code changes during remediation, update every affected section of this living plan before rerunning only the relevant canonical validation.

The future recovery procedure is intentionally additive until acceptance: it creates a unique Compose project and fresh volumes, performs import only there, and leaves the original project stopped but intact. A failed import can be retried only after the operator discards that exact failed recovery project's fresh volumes or chooses a new unique project; never retry into ambiguous partially imported storage and never clean by a broad glob. Remote completed objects are immutable and are not removed by recovery. The downloaded archive remains sensitive plaintext and must be protected and removed only under the operator's approved retention procedure.

If checksum, image/version, fresh-volume identity, import, bootstrap, token, webhook, cache, or manual content/media verification fails, keep traffic and backup scheduling disabled and retain both original and failed recovery evidence. Do not improvise by upgrading Strapi, copying files into SQLite storage, reusing the original source identity, or suppressing diagnostics.

If B13 review finds that the exact handoff cannot be made truthful without a material product/architecture decision, stop with `BLOCKED: <reason>` under `implement-task`; do not check B13 or push a completion commit.

## Artifacts and Notes

The approved historical workflow commits at planning time are:

    B01  6eb812c  daemon packages and tooling
    B02  5c647cf  compiled Strapi runtime and workspace
    B03  6c609b8  Strapi child supervision
    B04  f94a86f  bounded capture coordination
    B05  c57102d  archive validation and staging
    B06  bebf6d0  object-storage publication
    B07  5600dbf  scheduling and durable state
    B08  e941f69  complete lifecycle composition
    B09  93b0dd6  backup/supervisor telemetry
    B10  c144fbe  containers and service configuration
    B11  463b7af  project Collector
    B12  2f58c01  CI and release delivery

The strongest current local validation evidence is already retained in those plans: B10's final 150 backupd, 82 strapid, and 92 frontend tests plus three exact-runtime images, Rootless Docker volumes, and fresh empty-database startup; B11's native Collector validation and Compose isolation; and B12's repeated package/config/image/release-archive validation. B13 links that evidence rather than rerunning it without a new concern.

Worker validation on 2026-10-30 selected the plan-only path after `mise tasks` confirmed the repository's canonical package commands and the completed audit found no implementation change. The required six handoff headings were present; `git diff --no-index --check /dev/null <plan>` returned the expected content-difference status with no whitespace diagnostic; `git diff --exit-code -- BACKUP.md` passed and its SHA-256 remained `6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533`; `git diff --name-only` and tracked-only status were empty; and the scoped untracked status contained only this B13 plan. `docker compose -p us-alb-recovery-20261030t000000z --env-file .env.example -f compose.prod.yml config --quiet` passed without starting or creating anything. The project runtime imported `decodeSnapshotManifest` as a function, and the corrected timestamp command produced a lowercase-alphanumeric ID. No package suite was applicable to the plan-only change.

Remediation cycle 1 repeated `mise tasks` and selected the same plan-only path. The six required handoff headings and the narrative milestone heading were found; the no-index whitespace check returned the expected untracked-content status without a diagnostic; `BACKUP.md` remained unchanged at SHA-256 `6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533`; tracked diff/status were empty; and bounded untracked status contained only this plan. Quiet production Compose rendering passed for project `us-alb-recovery-20261030t000000z`; the project runtime again printed `decodeSnapshotManifest=function`; and the lowercase timestamp check produced `20261030t074426z`. Bounded source/query searches found the four LogQL event selectors at the exact `emit` owners and found no counter-selector alert query. No recovery resource, volume, provider call, alert resource, workflow, artifact, deployment, credential, or environment mutation occurred.

The Worker documentation audit used current official Grafana Cloud/Grafana/Loki material for OTLP metric/log conversion, query-time JSON extraction, structured-metadata filters, and No Data/MissingSeries semantics; Prometheus material for `absent_over_time`, `last_over_time`, and metric absence; Strapi v5 data-transfer documentation plus installed Strapi 5.52.0 source; AWS SDK for JavaScript v3 documentation plus installed 3.1159.0 source; Scaleway Object Storage checksum/encryption documentation; and Docker Compose 5.5.1 documentation. These checks were read-only and did not contact configured provider services.

Current Grafana documentation used during planning and remediation establishes default dot/dash-to-underscore conversion, monotonic `_total`, unit suffixes, promoted service/environment resource labels, explicit No Data versus MissingSeries behavior, `absent_over_time`/`present_over_time` patterns, OTLP log body-to-Loki-line conversion, log attributes as structured metadata, and nested JSON query-time extraction. For remediation, Context7 resolved current official Loki `/grafana/loki/v3.6.7`: native OTLP normalizes attribute dots, stores default service/environment resources as labels, stores remaining log attributes as structured metadata, recommends applying structured-metadata equality/regex filters before parsers, and stringifies a map body as JSON through the OpenTelemetry `AsString` path. These are documentation inputs only; actual tenant series and log fields remain a live confirmation prerequisite.

No credential, endpoint token, archive content, signed URL, SQLite content, full Compose rendering, or production identifier belongs in this plan's validation evidence. Record names, defaults, non-secret image digests/revisions, command outcomes, counts, and boolean boundary results only.

## Interfaces and Dependencies

No new production interface or dependency is planned. B13 consumes the existing interfaces at their owning boundaries:

- `SnapshotManifestV1` and `decodeSnapshotManifest` in `backupd/src/snapshot-manifest.ts` are the recovery identity/checksum contract and its exact canonical recovery decoder.
- `withStrapiDataTransferWorkspace` in `strapid/src/strapi-runtime.ts` is the immutable application/writable diagnostics boundary for the manual import invocation.
- `ensureDefaultAdmin` and `ensureNextJsWebhook` in `backend/src/bootstrap/` own excluded-admin recreation and managed webhook reconciliation.
- `frontend/app/refresh/route.ts` owns event-driven cache-tag invalidation; frontend container recreation owns the whole-cache reset used during recovery.
- `backupd/src/telemetry.ts` and `strapid/src/telemetry.ts` own signal names, safe fields, bounded dimensions, and event semantics.
- `otel-config.yml` owns private reception, batching, sampling, authentication, transport retry, and queueing without duplicating application field policy.
- `compose.prod.yml` owns the exact immutable image, service environment, volume, network, read-only, restart, health, and stop-grace deployment boundary.

If remediation adds an interface or dependency, explain why the existing owner cannot satisfy the requirement, update this section and the audit, use current documentation through Context7 when an external library/API is involved, and obtain the required independent review before approval.

Revision note (2026-10-30 / Codex planner): Created the initial self-contained B13 implementation audit and operator handoff from pushed B12 commit `2f58c01fb2a2c8fb8fd25d89a3afdbb1748e70bf`. Complete authoritative-input, B01–B12 evidence, current implementation, and current Grafana documentation review found no known production-code gap. The plan records exact configuration/defaults, default-converted signal names and alert queries, explicit missing-series/No Data/priority/advisory behavior, a unique fresh-volume recovery identity, recomputed checksum and immutable image verification, the direct distroless Node/workspace/Strapi import invocation, excluded credential/attribution handling, webhook/cache/manual acceptance gates, and every unperformed external prerequisite. No production, test, queue, design, protected, or unrelated file was changed during planning except creation of this required plan.

Revision note (2026-10-30 / Codex worker): Rechecked every handoff claim against the exact pushed B01–B12 implementation, approved historical evidence, installed dependency source where material, and current official provider/tool documentation. No production-code defect or design-checkpoint change was required. Corrected the manifest decoding command and lowercase Compose recovery identity, and attempted a sparse-counter first-sample fallback that the first independent review later rejected and remediation cycle 1 supersedes; the validation evidence for that Worker handoff remains recorded above as workflow history.

Revision note (2026-10-30 / Codex worker, remediation cycle 1): Resolved all three first-review findings in this plan only. Replaced four ambiguous sparse-counter alert queries with exact structured-log completion-event LogQL and explicit No Data/error/priority behavior; made the exact manifest-revision source checkout mandatory while retaining the four-file artifact only as optional deployment packaging; and added the independently verifiable narrative milestone. Repeated all required plan, scope, `BACKUP.md`, Compose, decoder, recovery-ID, and source-to-query checks successfully. No production boundary changed, so no design checkpoint or package test was applicable.

Revision note (2026-10-30 / Codex coordinator): Recorded the same Reviewer's remediation-cycle-1 approval with no remaining findings after it independently verified the structured-event queries, mandatory exact-source recovery prerequisite, narrative milestone, plan-only scope, byte preservation, Compose rendering, canonical decoder import, lowercase recovery identity, and source-to-query trace. Finalized the handoff and B13 queue bookkeeping for the exact two-file task commit.

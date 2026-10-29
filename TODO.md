# Implement the Strapi backup design

Use the [implement-task skill](.agents/skills/implement-task/SKILL.md) to execute
this Markdown task queue and implement [BACKUP.md](BACKUP.md). Read both files
and the applicable `AGENTS.md` instructions before selecting work. BACKUP.md is
the authoritative design; this queue supplies the agreed delivery boundary,
initial defaults, ordered implementation milestones, and acceptance criteria.
Keep BACKUP.md unchanged. Stop for direction on a material contradiction rather
than silently weakening a requirement.

## Execution and completion

Process unchecked top-level checkboxes in document order. Each complete checkbox
label is a stable task identifier and commit title; do not rename or reorder it
after work begins. Give each role the selected item, this preamble, BACKUP.md,
and the applicable repository instructions. The skill owns planning, independent
review, remediation, bookkeeping, commit, push, and resume behavior. Use its
required ExecPlans under `.agents/plans/`, following `.agents/docs/PLANS.md`.
Do not skip blockers or begin a later task before the current task has completed
that workflow. On resume, follow the skill's outstanding-commit handling before
selecting another item.

The goal is complete when all 13 tasks have reviewer approval, their checkboxes
are checked, and their workflow commits are pushed. This means repository
delivery, not production rollout or proof of recovery performance. Do not check
off implementation work merely because an operator prerequisite is outstanding;
complete all locally verifiable behavior. Conversely, the explicitly external
prerequisites below do not block repository completion. Do not deploy, perform
live cloud verification, or trigger release publication as part of this queue.

Record detailed interfaces, configuration names, decisions, validation evidence,
and operational handoff in the required ExecPlans. Add links to the relevant
plans beneath their task as they become available. Do not create separate
feature, architecture, testing, or operations documents. Change README only if
an implementation change directly contradicts it. Preserve unrelated work.

## Agreed initial defaults

Implement these as configurable settings, with validation of their relationships
at the owning configuration boundary. They are initial, uncalibrated defaults;
do not describe them as measured production guarantees.

| Setting | Initial value and behavior |
| --- | --- |
| Daily schedule | 03:00 UTC, unaffected by local daylight-saving changes |
| Backend interruption | One absolute 900-second deadline, including shutdown and recovery |
| Budget allocations | Up to 60 seconds serving shutdown, 600 seconds export, 30 seconds exporter termination, and 210 seconds recovery; nested retries must not reset the overall deadline |
| Staging admission | At least 100 GiB free on disk-backed staging before capture |
| Archive limit | 75 GiB; exceeding the limit invalidates capture and initiates safe cancellation and recovery |
| Retained staging | At most one pending archive; never clean it while an exporter may still write |
| Publication window | Six hours from acceptance of the valid capture, including retries and restart reconciliation; restarting must not reset the deadline |
| Upload concurrency | Four multipart parts, with part size derived from archive size and provider limits |
| Request attempts | At most three SDK attempts per request, also bounded by the overall publication deadline |
| Publication expiry | Stop retrying, reconcile any uncertain remote completion, and safely remove unpublished staging after writer ownership is resolved; report unresolved remote status honestly |
| Regular reports | Heartbeat and last confirmed capture timestamp every 60 seconds |
| Missing heartbeat | Alert after five minutes without reports |
| Snapshot overdue | Alert after 26 hours from the last remotely completed snapshot's capture time |
| Failure notifications | Prompt run/upload-exhaustion alerts; highest priority for failed backend recovery |
| Advisory notifications | One per run with recognized diagnostic severity markers, independent of backup success |

Do not silently increase the 15-minute interruption ceiling. The 24-hour
normal-operation content-loss target allows upload grace and is not a strict
remote-snapshot age ceiling. Alert specifications must handle absent series and
Collector/host telemetry loss as unhealthy, while sparse daily outcome samples
must not make ordinary idle time a failure.

## Validation and architectural constraints

- Preserve the Strapi version, frontend SSR + ISR architecture, CMS pipeline,
  bootstrap behavior, and visible `NEXT_PUBLIC_APP_VERSION`. No content-type
  change is planned or authorized by this queue.
- Use Node's native `node:test` and `node:assert/strict` for daemon unit and
  integration tests. Unit tests start no external processes. Supervisor
  integration tests use fixture children, never a Strapi test suite. Test each
  behavior at its lowest stable owning boundary; add cross-boundary coverage
  only for a material failure that lower-level checks cannot establish.
- Do not create automated backend, smoke, end-to-end, browser, or deployment
  tests. Verify Strapi changes by startup from an empty database. The actual
  export/import recovery rehearsal is an external manual prerequisite.
- Follow the [canonical-validation skill](.agents/skills/canonical-validation/SKILL.md)
  and root Mise tasks for affected areas. After backend/frontend changes,
  refresh `be:openapi` and `fe:openapi`, and `be:types` when backend types change.
  Add and run canonical daemon checks/tests as their packages are introduced.
- Prefer native configuration validation, image builds, and release assembly
  checks. Reuse established evidence; do not introduce redundant structural
  tests or repeat unaffected validation merely for reassurance.
- Integration dependencies must be task-owned and isolated. Published test
  ports bind to `127.0.0.1` and may be Docker-assigned ephemeral ports. Other
  services use 65100–65199; any published host port binds to `127.0.0.1`.
- Keep secrets and content out of tracked files, test output, and evidence.
  Never change machine/user environment variables, use privileged containers,
  require `sudo`, mount the Docker socket, or depend on other tenants' services.

## External operator prerequisites

These are rollout prerequisites, not additional executable queue items. B13 must
provide concrete handoff details without claiming that these activities occurred.

- Provision a private Scaleway bucket with bucket-level SSE-ONE enabled before
  upload, HTTPS access, and dedicated least-privilege application credentials.
  Confirm the chosen SDK transport-checksum mode against real Scaleway; a local
  S3-compatible dependency cannot prove provider compatibility.
- Configure retention, storage classes, versioning/Object Lock if desired, and
  orphan multipart cleanup independently. The application must not administer
  these policies or delete completed backups.
- Provide Grafana Cloud forwarding access and configure the handoff's queries,
  alert thresholds, missing-data behavior, and notification routing. Repository
  delivery requires specifications, not importable Grafana rules or live setup.
- Measure representative 5–50 GB exports, upload durations, staging usage,
  termination, and recovery. Calibrate within the consistency and interruption
  requirements; if direct export cannot fit, revisit the design before rollout.
- Retain compatible application images and separately recoverable deployment
  secrets off-host. Perform the manual recovery procedure against fresh storage,
  including account/token recreation, webhook/cache reconciliation, and content
  and media checks. Measure the entire recovery against the one-day target.

## Ordered tasks

- [ ] B01 — Establish daemon packages and tooling
  - Scope: Create separate private npm packages in `backupd/` and `strapid/`,
    each with a committed lockfile, ESM TypeScript, and direct `.ts` execution.
    Use the exact project Node version from root `mise.toml` (currently
    `24.20.0`), explicit `.ts` imports, type-only imports, and erasable syntax.
    Keep configuration outside `/strapi`; add no runtime loader or transpilation.
  - Acceptance: `npm ci`, strict `tsc --noEmit` with `erasableSyntaxOnly`, and
    local Biome configurations work independently for both packages. Match the
    frontend's Biome version and applicable conventions. Supply `lint`, `format`,
    `typecheck`, and `check` scripts as specified in BACKUP.md, plus native tests
    and root Mise tasks; add no nested Mise configuration or independent Node pin.
  - Validation: Run both packages' checks and applicable tests. Do not add
    artificial behavior or meaningless tests merely to populate a scaffold.
  - Design references: “Runtime, packages, and tooling”; “Verification and
    implementation calibration.”

- [ ] B02 — Prepare the compiled Strapi runtime
  - Scope: Extend the existing backend image to package compiled config, source,
    schemas/components, admin bundle, migrations when present, dependencies,
    package metadata, public assets, and favicon in the application-root layout
    described in BACKUP.md. Keep application TypeScript and `tsconfig.json` out
    of the immutable `/strapi` runtime.
  - Acceptance: The image runs the existing CLI directly through Node without
    shell/npm/npx or runtime compilation. Provide a cohesive workspace mechanism
    for export/import with symlinks to immutable application assets, absolute
    runtime paths, and writable diagnostics under `/tmp`; remove workspaces only
    after child exit. Archives remain on disk-backed staging. Verify the actual
    runtime binary matches the exact project Node version.
  - Validation: Build the image, verify its packaged layout through native build
    checks, and verify Strapi starts from a fresh empty database with the required
    writable mounts. Refresh required generated API artifacts. No automated
    Strapi export/import tests.
  - Design references: “Strapi-export feasibility”; “Verified current state and
    recovery coverage”; “Manual recovery procedure.”

- [ ] B03 — Implement Strapi child supervision
  - Scope: Implement `strapid` startup and serving-child ownership using direct
    `node:child_process` invocation, graceful shutdown, bounded forced
    termination, and child plus `/_health` recovery checks. Reuse B02's runtime
    workspace mechanism where required.
  - Acceptance: Serving and export children can never run concurrently. Confirm
    exporter/subprocess exit before serving restart; inability to confirm exit
    produces recovery failure rather than concurrent access. Intentional
    container shutdown does not restart serving. Normal startup is independent
    of `backupd` and Collector availability.
  - Validation: Fixture-child integration tests establish process exit, failure,
    health checks, and shutdown semantics. Unit tests cover pure lifecycle policy
    only where integration coverage does not already own the behavior.
  - Design references: “Libraries and private coordination”; “Compose services
    and private coordination”; “Proposed lifecycle and container boundaries.”

- [ ] B04 — Implement bounded capture coordination
  - Scope: Implement private `node:http` JSON coordination over a Unix socket,
    with capture admission, status reconciliation, supervisor-instance and
    capture-window identities, and a response held open through recovery.
    Define the minimal shared wire contract in the task's ExecPlan and code.
  - Acceptance: Admit one capture only from a healthy serving state. Establish
    release/source-volume identity and runtime readiness. Start an independent
    deadline before stopping serving, acknowledge capture only after clean
    shutdown, and run the standard export with all stages and
    `--no-encrypt --no-compress`. Forced serving shutdown aborts capture.
    Explicit HTTP timeouts accommodate the bounded window. Premature disconnect,
    cancellation, expiry, or supervisor replacement invalidates the window;
    normal terminal connection closure does not. Recovery runs independently
    of the requesting daemon. Unknown/stale outcomes cannot authorize upload.
  - Validation: Socket and fixture-child integration tests cover material event
    orderings, deadline reserves, output closure before acceptance, disconnected
    clients, recovery failure, and stale-result rejection. No production data is
    required for these tests.
  - Design references: “Libraries and private coordination”; “Snapshot format”;
    “Proposed lifecycle and container boundaries.”

- [ ] B05 — Validate archives and manage staging
  - Scope: Implement run-specific staging allocation, free-space admission,
    archive-size enforcement during capture through the supervisor's writer
    ownership, and safe cleanup. Stream tar inspection with the `tar` package;
    read Strapi export metadata and compute full-file SHA-256 without extracting
    or rewriting the archive.
  - Acceptance: Invalid/truncated tar, unreadable archives, missing required
    export metadata, and size violations fail the run. Staging is disk-backed,
    memory remains bounded, and cleanup/reuse cannot race an exporter. Coordinate
    limit-triggered cancellation through B04. Partial/orphan captures are not
    adopted after restart. Do not parse SQLite, add a parallel Strapi schema
    validator, or claim source completeness from archive integrity.
  - Validation: Focused archive fixtures cover acceptance/rejection and hashing;
    filesystem integration tests establish capacity and cleanup ownership where
    lower-level tests cannot. Enforce the agreed staging defaults.
  - Design references: “Snapshot format”; “Strapi-export feasibility”; lifecycle
    steps “Validate and upload” and “Record completion and clean staging.”

- [ ] B06 — Publish completed snapshots to object storage
  - Scope: Use official AWS SDK v3 `@aws-sdk/client-s3` and
    `@aws-sdk/lib-storage` for destination preflight, streaming upload,
    cancellation, and remote confirmation. Define unique snapshot keys and a
    versioned completion manifest with every field required by BACKUP.md.
  - Acceptance: Preserve the unmodified `.tar`; upload it before the manifest,
    confirm remote existence/length, publish the manifest last, and confirm that
    write before success. Reconcile lost acknowledgements by the same identity.
    No mutable latest pointer or unrelated overwrite is needed. Fit Scaleway's
    1,000-part and part-size limits, use a supported transfer-checksum mode, and
    keep full-file SHA-256 distinct from multipart/composite checksums and ETags.
    Bound attempts, concurrency, and time; abort multipart work on handled
    failure/cancellation. Never prune completed remote backups.
  - Validation: Unit tests own manifest/publication policy and part sizing;
    task-owned storage integration proves material SDK/storage semantics.
    Record real Scaleway checksum verification as an external prerequisite,
    not a locally established fact. Custom hash metadata is not independent
    remote verification.
  - Design references: “Remote artifact contract”; “Libraries and private
    coordination”; “Verification and implementation calibration.”

- [ ] B07 — Implement scheduling and durable state
  - Scope: Implement the daily UTC timer, one overdue startup catch-up rather
    than missed-date replay, shared single-flight admission for scheduled and
    `SIGUSR2` requests, and small versioned JSON state files replaced atomically
    on the same filesystem.
  - Acceptance: Requests during an active run do not queue more work. Persist
    scheduling information, confirmed capture freshness, and the information
    needed to reconcile pending publication without resetting its deadline.
    Malformed state or an unconfirmed upload never establishes success. Define
    bounded failure/retry scheduling so startup or a failed run cannot create
    an immediate repeated-capture loop.
  - Validation: Unit tests cover daily boundaries, overdue startup, manual
    admission, overlap, and state interpretation. Filesystem integration covers
    material persistence behavior. Reuse B06's remote confirmation owner.
  - Design references: “Scheduling, state, and manual runs”; “Compose services
    and private coordination”; “Signals and ownership.”

- [ ] B08 — Connect the complete backup lifecycle
  - Scope: Wire scheduling, destination/capacity preflight, supervisor admission,
    export/recovery confirmation, validation, publication, persistence, and
    staging cleanup into the daemon entrypoints. Define safe restart handling
    for interrupted capture versus an already accepted pending publication.
  - Acceptance: Destination access is checked before interruption. Upload starts
    only after a matching valid capture result and confirmed Strapi recovery;
    missing acknowledgements require reconciliation. No remote operation extends
    the outage. Resume only eligible confirmed artifacts, within their original
    publication deadline; unknown/invalid captures cannot become successful
    through later exporter exit or service recovery. Advance freshness only
    after manifest confirmation. Clean safely on failure, cancellation, expiry,
    and completion without exceeding the one-pending-archive policy.
  - Validation: Add only material cross-boundary integration coverage using
    fixture children and isolated dependencies. Prove recovery failure blocks
    publication, restart does not invent success, and ownership protects active
    staging. Reuse the existing policy tests rather than duplicating them.
  - Design references: “Proposed lifecycle and container boundaries”; “Remote
    artifact contract”; “Scheduling, state, and manual runs.”

- [ ] B09 — Instrument backup and supervisor outcomes
  - Scope: Use official OpenTelemetry SDKs/exporters for correlated run/phase
    traces, structured lifecycle logs, independent supervisor recovery evidence,
    heartbeat, persisted freshness, and bounded outcome/duration metrics.
    Forward export stdout/stderr through application-owned secret filtering and
    bounded buffering; do not separately ingest workspace diagnostic files.
  - Acceptance: Recognized warning/error severity prefixes are advisory. Aggregate
    one attention event per run, forward unfamiliar output under the same safe
    policy, and allow otherwise successful backups to publish and advance
    freshness. No message-wording allowlist or completeness inference. Run IDs,
    object keys, and trace IDs are not metric dimensions or indexed log labels.
    No archive contents, environment dumps, credentials, or signed URLs escape.
    Telemetry failure preserves completed backups and produces a safe local
    operational error; shutdown flushing has a bounded wait.
  - Validation: Test representative filtering/policy classes, advisory aggregation,
    successful publication despite advisory diagnostics, cardinality, and
    telemetry failure isolation at their owning boundaries. Do not assert exact
    Strapi prose or duplicate existing lifecycle tests.
  - Design references: “Signals and ownership”; “Availability and alerts.”

- [ ] B10 — Integrate containers and service-specific configuration
  - Scope: Package `backupd`, embed `strapid` in the backend image, and wire
    Compose services, restart policies, release metadata, and project-scoped
    state/staging/socket volumes. Source configuration from the single local
    `.env`, passing each service only its settings; remove whole-file shared
    environment distribution. Update `.env.example` without real credentials.
  - Acceptance: `backupd` cannot access production data or Strapi secrets;
    `strapid` has no storage credentials; Grafana forwarding credentials belong
    only to the Collector. Nonroot users can use required named volumes under
    Rootless Docker without host ownership changes. Project images are distroless
    and read-only except explicit storage/scratch. Verify actual runtime Node
    parity. Provide no public control service, Docker socket, host log access,
    host timer, orchestration script, or extra host-service requirement.
    Make application image digest/Git revision and source identity available for
    capture/manifest attribution without daemon access to container management.
  - Validation: Native Compose rendering and affected image builds, relevant
    configuration-boundary tests, and empty-database backend startup. Inspect
    service settings without disclosing values. Refresh API artifacts for
    backend/frontend changes; preserve frontend rendering and version display.
  - Design references: “Recommendation and agreed requirements”; “Proposed
    lifecycle and container boundaries”; “Runtime, packages, and tooling.”

- [ ] B11 — Configure the project Collector
  - Scope: Add the Collector service and project-owned `otel-config.yml` beside
    Compose, mounted read-only, with OTLP reception and Grafana Cloud forwarding.
    Pass only required deployment values/credentials from `.env`; use private
    network listeners within 65100–65199.
  - Acceptance: The Collector owns routing, batching, transport authentication,
    retry queues, and sampling, without duplicating application field allowlists.
    Avoid duplicate OTLP/stdout ingestion. Collector loss cannot block Strapi
    startup or invalidate completed backups. Follow the selected third-party
    image's supported runtime requirements rather than imposing project image
    hardening. No host journal or Docker log collection is required.
  - Validation: Validate with the selected Collector's native configuration
    tooling and Compose rendering using non-secret placeholders. Live Grafana
    delivery remains an external prerequisite.
  - Design references: “Compose services and private coordination”; “Signals
    and ownership”; “Availability and alerts.”

- [ ] B12 — Extend CI and release delivery
  - Scope: Extend existing CI with reproducible daemon installation and
    non-mutating checks/tests. Update image build contexts for embedded
    `strapid`, add `backupd` to the existing publication workflow, and ensure
    Compose and `otel-config.yml` are available together through the repository's
    deployment delivery mechanism.
  - Acceptance: Existing frontend/backend validation remains intact. Required
    image builds use the project Node version and include all daemon runtime
    files outside `node_modules`. Preserve existing release provenance,
    attestations, version metadata, and image identity needed for recovery.
    CI does not require live cloud credentials, a shared stack, fixed test ports,
    or automated Strapi tests. No unrelated release-system redesign.
  - Validation: Run applicable canonical checks and native image/configuration
    or release-assembly validation. Review workflow wiring without triggering
    deployment, image publication, or other external writes beyond the skill's
    authorized task commits and pushes.
  - Design references: “Runtime, packages, and tooling”; “Recommendation and
    agreed requirements”; “Remote artifact contract.”

- [ ] B13 — Complete the implementation audit and operator handoff
  - Scope: Reconcile all BACKUP.md requirements against completed implementation,
    focused validation evidence, and the explicit external prerequisites. Fix
    remaining repository gaps within this task and validate affected areas;
    do not defer an implementation defect as operator work.
  - Acceptance: The required ExecPlan records implemented configuration names
    and defaults, exact recovery image/Node/CLI/workspace invocation, fresh
    destination storage identification, and checksum verification. Preserve the
    original production storage pending operator acceptance. Cover import with
    serving/scheduling/writers stopped, compatible image and original secrets,
    admin recreation and accepted attribution loss, replacement API tokens,
    webhook reconciliation, frontend cache refresh, and manual acceptance before
    traffic/scheduling resume. Do not execute production recovery in this task.
  - Acceptance: Record concrete Grafana queries and signal names, thresholds,
    missing-series/No Data behavior, priority, and per-run advisory notification
    handling for operator configuration; no importable rules are required.
    Identify live Scaleway checksum confirmation, bucket policies, production
    timing/capacity calibration, off-host recovery sources, and manual rehearsal
    as unperformed prerequisites. Never claim source completeness or measured
    recovery guarantees from local checks.
  - Validation: Review requirement coverage and link existing validation evidence;
    rerun checks only for new changes or unresolved concerns. Link the final
    handoff ExecPlan here, preserve BACKUP.md, and ensure every task's completion
    obeys implement-task before declaring repository delivery complete.
  - Design references: All BACKUP.md requirements, especially “Verified current
    state and recovery coverage,” “Verification and implementation calibration,”
    “Availability and alerts,” and “Manual recovery procedure.”

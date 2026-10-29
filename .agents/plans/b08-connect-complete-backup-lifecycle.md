# Connect the complete backup lifecycle

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B08 — Connect the complete backup lifecycle` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B08, `backupd` is an actual daemon rather than a collection of policies. A scheduled or manual request first proves that the object-storage destination is reachable and that local staging has capacity. It then asks `strapid` for one bounded capture, waits for the exact exporter result and confirmed Strapi recovery, validates the resulting archive locally, durably records the one accepted pending publication, publishes and confirms the immutable remote manifest, advances freshness, and safely removes the owned staging directory.

The daemon remains honest across missing acknowledgements, cancellation, expiry, and restart. A restarted process distinguishes a durable, previously validated pending publication from an interrupted or unknown capture. It may reopen only the exact pending archive described by durable state, never adopt an orphan, and never turn later exporter exit or serving recovery into capture success. A remote manifest confirmed by B06 is the sole event that advances freshness. The behavior is demonstrated by focused cross-boundary integration tests that use only task-owned fixture children, temporary Unix sockets and directories, and isolated in-memory storage boundaries; no Strapi process, prestarted stack, backend test, frontend test, smoke test, end-to-end test, or deployment test is introduced.

## Progress

- [x] (2026-10-29 17:20Z) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, pushed B01–B07 plans, and the exact B08 queue item.
- [x] (2026-10-29 17:20Z) Confirmed `backup-system`, `HEAD`, and `origin/backup-system` are at pushed B07 commit `5600dbf1ab6234e04a72a48ecfb1a0f46c89a6c9`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present; that directory was not inspected.
- [x] (2026-10-29 17:20Z) Traced the current B01–B07 source and tests, including B03 supervisor ownership, B04 Unix-socket protocol and missing-ack reconciliation result, B05 writer/allocation states, B06 publication authority and confirmation, and B07 admission/scheduler/state transitions.
- [x] (2026-10-29 17:20Z) Resolved restart classification, one-pending enforcement, preflight/outage/publication ordering, crash-safe cleanup order, expiry reconciliation, signal shutdown, and the two narrow interface extensions required by the current implementation.
- [x] (2026-10-29 17:20Z) Created and self-reviewed this B08 ExecPlan against `BACKUP.md`, the exact current interfaces, later-task boundaries, canonical validation, residue checks, and the B08 observable acceptance criteria.
- [x] (2026-10-29 17:06Z) Began the approved worker implementation at the protected pushed B07 baseline, re-read all governing instructions and the full plan, and linked the still-unchecked B08 tracker item as explicitly required by the worker handoff.
- [x] (2026-10-29 17:20Z) Implemented the narrow B05 startup-empty/exact retained-archive reopen boundary and the B06 independently bounded read-only final reconciliation boundary, including exact fingerprint/path ownership and no-mutation tests.
- [x] (2026-10-29 17:20Z) Implemented strict daemon configuration, lifecycle composition, persisted pending retry/expiry timing, real dependency composition, signal admission, exact cancellation, and bounded/forced shutdown.
- [x] (2026-10-29 17:20Z) Added focused configuration, lifecycle, restart/expiry, ownership, and main signal integration evidence; focused B08/B05/B06 probes and the first full canonical backupd run passed.
- [x] (2026-10-29 17:22Z) Ran clean `npm ci`, final backupd format/check/full native suite (124/124), explicit strapid format/check/full native regression (69/69), dependency tree/integrity, LocalStack/container, PID/socket/temp/workspace, generated-artifact, protected-input, staged-file, branch/baseline, scoped-diff, and `git diff --check` audits; all passed with no owned residue.
- [x] (2026-10-29 17:46Z) Remediation cycle 1: implemented the reviewer-approved capture-admission generation/linearization, strict definite B04 rejection decoder, scheduler admitted-flight shutdown wait, and bounded race/protocol/state tests. Five focused repetitions passed for the allocation/stop, exact-cancel, rejection, ambiguity, cleanup, and durable-state boundaries.
- [x] (2026-10-29 17:54Z) Repeated clean install and canonical validation: backupd format/check and 133/133 tests passed, strapid format/check and 69/69 tests passed, the locked dependency tree is valid, and LocalStack/container, PID/socket/temp/workspace, artifact, protected-input, staged-file, branch/baseline, scope, and `git diff --check` audits are clean. One exact temporary directory left by an intentionally interrupted earlier failing probe was removed and the residue audit was repeated empty.
- [x] (2026-10-29 18:08Z) Remediation cycle 2: classified B05 allocation rejection before shutdown generation, limited retryability to exact no-owned-directory capacity/unavailability outcomes, made typed B04 rejection provisional through clean HTTP exchange close, and added paused-allocation, nonzero-main, real-B04, raw trailing-byte, and fail-closed lifecycle regressions. Five focused repetitions passed; after clean install, backupd format/check and 137/137 tests plus strapid format/check and 69/69 tests passed.
- [x] (2026-10-29 18:09Z) Repeated dependency, LocalStack/container, PID/socket/temp/workspace, generated-artifact, protected-input, staged-file, branch/baseline, scoped-diff, B08-checkbox, and `git diff --check` audits after remediation cycle 2; all are clean with no task-owned residue, protected-file change, staged content, commit, or push.
- [x] (2026-10-29 18:10Z) Independent rereview approved B08 after a read-only design checkpoint and two remediation cycles. The reviewer reproduced unsafe/safe allocation classification, raw trailing-byte fail-closed handling, actual B04 409/503 compatibility, and all earlier concurrency/restart/shutdown invariants; five 35-test focused repetitions, backupd 137/137, and strapid 69/69 passed. The coordinator then checked B08 for its single scoped commit and user-authorized push.

## Surprises & Discoveries

- Observation: B07 persists enough information to reconstruct B06 publication authority, but B05 deliberately keeps allocation and cleanup authority only in memory.
  Evidence: `backupd/src/durable-state.ts` stores the full validated archive and file identity, while `backupd/src/staging-manager.ts` accepts `cleanup` only for the exact `StagingAllocation` object held in its private `records` map. Restart therefore needs a narrow fingerprint-proving reopen operation; bypassing B05 or scanning and adopting an orphan would violate its ownership contract.

- Observation: Normal B06 reconciliation intentionally stops at the original publication deadline, yet an upload acknowledgement can be lost at that boundary.
  Evidence: `backupd/src/snapshot-publisher.ts` applies the request deadline to `reconcile` and `publish`. Without a separate read-only final check, B08 could neither distinguish an already confirmed manifest from an incomplete remote archive after expiry nor obtain B06-authored `PublishedSnapshot` evidence. Extending mutation time would violate the original six-hour window, so the new operation must perform reads only.

- Observation: B07 has no active-capture record, and that omission is useful rather than accidental for B08 safety.
  Evidence: durable state distinguishes only a validated pending publication from no pending publication. A process crash before B05 validation leaves staging residue with no durable authority. Classifying that residue as unknown and refusing adoption prevents a later exporter exit or recovered serving child from converting it into success.

- Observation: State must not be marked successful before staging cleanup.
  Evidence: if `recordPublishedSnapshot` clears pending state first and the process crashes before cleanup, restart sees an unexplained staging directory and cannot safely adopt or remove it. Cleaning first leaves a recoverable state: after a crash, the pending request remains, B06 can reconfirm its immutable manifest without the local archive, and B07 can then advance freshness.

- Observation: B07's `DailyScheduler.stop()` stops timers and future admission but does not cancel a lifecycle already running.
  Evidence: `backupd/src/daily-scheduler.ts` owns scheduling and its shared single-flight token only. B08 must own one AbortController per admitted lifecycle and a separate pending-publication timer, and the composition root must stop those before awaiting bounded shutdown.

- Observation: B07 deliberately refuses to claim a normal pending-publication attempt at or after its original deadline.
  Evidence: `StateRepository.claimPendingPublicationAttempt` returns `state_not_eligible` once `now >= publicationDeadlineAt`, so B08 cannot route post-expiry status checking through a normal `DailyScheduler.requestPendingPublication` callback. Expiry reconciliation is terminal handling of the already-durable pending item, not a new publication attempt: the B08 coordinator waits for its current admitted lifecycle to settle, relies on the durable pending record to make scheduled/manual capture ineligible, and then performs one read-only B06 final check under its own stopping/active guard.

- Observation: B04 already treats a disconnected held response as cancellation and owns Strapi recovery independently of `backupd`.
  Evidence: `strapid/src/capture-http.ts` calls `coordinator.disconnect` when the response closes before terminal delivery, and B04/B03 continue recovery inside `strapid`. B08 must destroy its held request on shutdown or size violation, but must not attempt to signal or restart a Strapi child itself.

- Observation: A final reconciliation timer that only aborts the storage signal is not itself a hard outer bound when a storage implementation ignores abort.
  Evidence: the B06 final-reconciliation test holds both HEAD promises forever while manually firing the 30-second boundary. `reconcileFinal` now races every read phase against its own rejection boundary, aborts the store signal, returns `remote_status_unknown`, and performs zero mutation.

- Observation: Cleanup-before-freshness also requires the reverse failure path to stay durable: an uncertain state write after cleanup must be resolved by strict reload, not by recreating local ownership.
  Evidence: the coordinator accepts pending, published, and terminal pending-clear durability uncertainty only when `reload()` proves the exact intended state; otherwise it enters the fail-closed state. Restart tests cover the safe already-cleaned plus still-pending case.

- Observation: The initial B08 implementation had no linearization point between the awaited B05 allocation and `CaptureClient.startCapture`, so shutdown could observe no active capture, return, and still allow the resumed lifecycle to start B04 afterward.
  Evidence: reviewer remediation cycle 1 identified the allocation/stop ordering and approved a coordinator-private generation claimed before fresh work, revalidated after every pre-start await, and atomically published with the active capture before invoking the client.

- Observation: A complete B04 409/503 JSON rejection can prove that no capture was accepted, but the previous client collapsed it with malformed, truncated, and transport-ambiguous failures.
  Evidence: the approved checkpoint limits safe cleanup to an exact status/reason mapping decoded only after a complete bounded `application/json` body. Every other post-start failure remains ownership-ambiguous and retains staging.

- Observation: Cancellation does not classify a rejected B05 allocation.
  Evidence: a paused allocation can reject after shutdown with `cleanup_failed`, occupancy/collision, a raw filesystem error, or another ownership-ambiguous cause. Only B05's `insufficient_capacity` and `staging_unavailable` semantics prove that no run directory remains: they occur before run-directory creation or after exact successful cleanup. The allocation error must therefore be classified before consulting the capture-admission generation.

- Observation: `IncomingMessage` body completion is not the end of the HTTP exchange when a peer sends bytes beyond its declared response body.
  Evidence: a raw Unix-socket response containing an exact 409 JSON body plus one trailing byte reaches body `end` before Node reports the HTTP parser error on `ClientRequest`. Treating the decoded body as final at `end` briefly authorized safe cleanup; waiting for clean request `close` lets the later parser error dominate without extending keep-alive because capture requests explicitly use `Connection: close` and retain their existing absolute timer.

## Decision Log

- Decision: Implement B08 in `backupd` only and make no `strapid`, backend, frontend, schema, Compose, image, CI, or release change.
  Rationale: B03 and B04 already own child supervision and private capture coordination. B08 composes their public protocol through `CaptureClient`; B09 owns telemetry and B10 owns service/image/volume/environment wiring.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add `backupd/src/backup-config.ts`, `backupd/src/backup-lifecycle.ts`, and the real composition root in `backupd/src/main.ts`.
  Rationale: configuration parsing, lifecycle orchestration, and process wiring are separate concerns. `main.ts` should construct dependencies and own signals, while the lifecycle module owns event ordering and can be tested without mutating the real process.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Extend B05 with an exact retained-archive startup reopen operation and a no-pending emptiness check; do not add orphan discovery or adoption.
  Rationale: a durable pending record is the only authority for a restart to regain cleanup ownership. The method must re-prove the canonical run path, directory identity, archive file identity, and sole-entry rule before constructing a new in-memory allocation. Any uncorrelated, partial, changed, symlinked, or additional staging entry is foreign/unknown and must remain untouched.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Extend B06 with a bounded, read-only final reconciliation operation that may run after the original deadline but may never upload, overwrite, delete, or extend publication eligibility.
  Rationale: this resolves a lost final acknowledgement honestly. Exact existing archive plus manifest evidence can produce a B06-authored `PublishedSnapshot`; absent or archive-only evidence is not success; collision, inconsistent data, cancellation, or unavailable remote status remains failure. The original deadline still governs every mutation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Do not add active-capture state to B07's schema.
  Rationale: B08 cannot safely resume an interrupted exporter after process restart, and B04 records are in-memory to one supervisor instance. No pending state plus nonempty staging is therefore classified as interrupted/unknown and blocks new capture rather than being adopted or deleted. This is the safest interpretation and avoids broadening B07's durable schema without a recoverable operation to support it.
  Date/Author: 2026-10-29 / Codex planner

- Decision: At startup, fail closed on malformed state, unknown staging, or a pending archive whose exact local ownership cannot be proved.
  Rationale: missing state and an empty staging area describe a new installation; malformed state or unexplained files do not. The scheduler and `SIGUSR2` handler must not start in the latter cases. `strapid` remains an independent service, so this failure does not interrupt normal Strapi serving.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Treat a durable pending publication as the sole admitted work until it is remotely confirmed or terminally cleared.
  Rationale: B07 already suppresses manual and scheduled capture while pending exists. B08 adds one generation-guarded timer for the persisted `notBefore`, claims every pre-deadline retry through `requestPendingPublication`, and never queues a request skipped during active work. At expiry, the coordinator first waits for its one active lifecycle promise to settle, then performs terminal read-only reconciliation while durable pending exclusion still prevents any capture. This preserves the one-pending-archive invariant without changing B07's public interface.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Order a fresh run as service identity check, destination preflight, staging capacity/allocation, B04 capture, B05 validation, durable pending transition, B06 publication, staging cleanup, then B07 freshness transition.
  Rationale: destination access and capacity are proven before Strapi interruption. There is no remote operation during the outage. Pending state precedes the first upload. Cleanup before state success is the only crash order that permits exact remote reconciliation without leaving an unauthorized local orphan.
  Date/Author: 2026-10-29 / Codex planner

- Decision: After B04 returns or reconciliation yields a terminal record, process that immutable terminal once and stop polling that window.
  Rationale: only a matching `captured` terminal contains exporter-close plus serving-recovery evidence eligible for B05 validation. `invalid`, `recovery-failed`, `supervisor-shutdown`, an unusable window, or unconfirmable ownership is terminal failure. A later exporter exit or `/v1/status` recovery cannot rewrite that outcome.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Advance freshness only through `StateRepository.recordPublishedSnapshot` with the exact B06 `PublishedSnapshot`, after local cleanup succeeds.
  Rationale: neither a capture terminal, validated tar, archive upload, manifest PUT acknowledgement, nor manifest-shaped bytes are remote confirmation. The existing B07 method verifies the full B06 evidence and atomically clears matching pending state while advancing freshness.
  Date/Author: 2026-10-29 / Codex planner

- Decision: On expiry, perform one bounded B06-owned read-only final reconciliation before local disposal.
  Rationale: an exact manifest already present is success and follows cleanup-then-freshness ordering. Absent or archive-only remote state is unpublished; B08 safely cleans local staging and calls `clearPendingWithoutSuccess(..., "expired")`. Remote collision, inconsistency, or unavailable status is reported as `remote-status-unknown`; after safe local cleanup it is cleared without freshness. No mutation occurs after the original deadline.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use a 30-second default daemon shutdown bound, configurable as `BACKUPD_SHUTDOWN_TIMEOUT_SECONDS` from 1 through 300 seconds, and a fixed 30-second final read-only reconciliation bound.
  Rationale: the backup design requires bounded container shutdown but assigns no daemon number. Thirty seconds allows request cancellation, multipart abort, safe state completion, and owned cleanup without approaching the 900-second capture window. The final status check is read-only and must not become an unbounded expiry extension. B10 later sets container stop grace greater than this daemon bound.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use no new dependency and do not run Context7 for B08 planning.
  Rationale: B08 composes exact repository-owned interfaces and standard Node APIs already exercised by this codebase; it introduces no new external library or uncertain API. The required AWS, tar, and Node-specific behavior was established and tested in B01–B07. If implementation changes an external API use, the worker must follow repository Context7 rules then record the result here.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep B07 admission as the only request mutex and give B08 only one generation-guarded pending wake plus one expiry-finalization promise.
  Rationale: pending retries dispatch through `DailyScheduler.requestPendingPublication`; active results are awaited and then reloaded rather than queued. Expiry is not a second request admission path: it can only finalize the exact durable pending run, and duplicate callbacks share one read-only reconciliation.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Treat unexpected lifecycle exceptions, allocation collisions/foreign occupancy, writer uncertainty, and exact pending-identity mismatches as fail-closed terminal state.
  Rationale: none of these paths proves that another capture can safely own staging. Only destination/readiness/capacity failures before capture and confirmed publication-pending outcomes remain retryable.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Adopt the remediation cycle 1 read-only design checkpoint exactly: one fresh-capture admission generation is invalidated synchronously by stop, and the final post-allocation check plus active-handle publication plus `startCapture` invocation form one synchronous winning turn.
  Rationale: if shutdown wins, B04 is never contacted and the exact still-allocated directory is safely cleaned; if capture wins, shutdown snapshots and cancels the exact generation/identity/controller. Pending publication never participates in this generation.
  Date/Author: 2026-10-29 / Codex reviewer-approved worker remediation

- Decision: Extend B07's scheduler surface only with `waitForIdle()` and track its existing admission completion; do not add another lock or durable field.
  Rationale: coordinator settlement can precede `finishAutomaticAttempt`. Shutdown must await the already-admitted completion so retry debt is durable before a clean exit, while `RunAdmission` remains the sole no-queue owner.
  Date/Author: 2026-10-29 / Codex reviewer-approved worker remediation

- Decision: Decode a safe capture-admission rejection only as `CaptureAdmissionRejectedError` after a complete bounded JSON response with the exact version, status, and reason mapping approved by B04; all other failures after `startCapture` retain the allocation and fail closed.
  Rationale: an exact 409/503 application response proves that B04 rejected admission before acceptance, so B05 may clean the original allocation and the lifecycle may remain retryable. Invalid media, framing, UTF-8, shape, status/reason mapping, timeout, cancellation, and transport loss cannot prove non-ownership. Cleanup failure retains ownership and preserves both the rejection and cleanup causes.
  Date/Author: 2026-10-29 / Codex reviewer-approved worker remediation

- Decision: Classify allocation errors before capture cancellation and accept only `insufficient_capacity` or `staging_unavailable` as retryable; throw every other cause through the terminal coordinator failure path.
  Rationale: those two B05 errors are the only current allocation results proving no owned run directory remains. Shutdown cannot make an ambiguous allocation safe. Throwing the terminal failure preserves its cause for diagnostics, leaves cleanup untouched when no exact allocation handle exists, and makes bounded daemon shutdown nonzero.
  Date/Author: 2026-10-29 / Codex worker remediation cycle 2

- Decision: Keep a strictly decoded `CaptureAdmissionRejectedError` provisional until `ClientRequest.close`, with any request/parser error winning first.
  Rationale: response-body `end` proves only the declared body was consumed, not that the exchange contained no trailing protocol violation. `ClientRequest` emits parser errors before its final `close`; the existing capture timer and explicit close connection keep this confirmation bounded. Real `startCaptureHttpServer` rejection tests prove compatibility with B04's actual `CaptureAdmissionError` mapping.
  Date/Author: 2026-10-29 / Codex worker remediation cycle 2

## Outcomes & Retrospective

Implementation and remediation cycles 1–2 are complete and independently approved. After the cycle-2 clean `npm ci` (48 packages, zero audit vulnerabilities), the canonical backupd sequence completed with formatting clean, zero Biome/TypeScript errors, and 137/137 native tests passing, including the digest-pinned isolated LocalStack integration. The unchanged-area strapid regression completed with formatting/check clean and 69/69 tests passing. Final independent review repeated 35 focused cases five times and reproduced narrow allocation classification, preserved cleanup-failure cause and nonzero daemon shutdown, real B04 409/503 compatibility, trailing-byte parser-error dominance, lifecycle staging retention, generation ownership, durable retry finalization, restart/publication ordering, and bounded shutdown. No actionable finding remains.

The dependency tree is valid at the locked versions; package/lock/Mise diffs are empty. No B08/B04 temporary directory or socket, B02 workspace, fixture PID, generated JS/map/tsbuildinfo artifact, or B06-labeled container remains. `BACKUP.md` matches `HEAD`; the scoped worktree contains only the B08 plan/TODO, named backupd source, and focused tests plus the preserved unrelated Imagen directory. B08 is checked complete and remains intentionally bounded to daemon composition. Residual real-environment prerequisites remain outside B08: B09 telemetry, B10 container/image/Compose wiring and stop grace, an operator-verified Scaleway checksum/retention configuration, and production throughput/capacity rehearsal.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; at planning time `HEAD` and `origin/backup-system` both identify pushed B07 commit `5600dbf1ab6234e04a72a48ecfb1a0f46c89a6c9`. Do not switch branches. Preserve the unrelated untracked `.agents/skills/imagen/scripts/` directory exactly: do not inspect, format, stage, remove, or otherwise modify it.

`strapid` is the Strapi-owning supervisor process. `backupd` is the backup scheduler/publisher. They communicate over a private Unix-domain HTTP socket; a Unix socket is a filesystem path used for local HTTP instead of a network port. `strapid/src/strapi-supervisor.ts` guarantees that serving and export process groups never overlap. `strapid/src/capture-coordinator.ts` owns the 900-second capture window and its 60/600/30/210-second phase allocation. `strapid/src/capture-http.ts` exposes status, capture, exact-window reconciliation, and cancellation. B08 must not recreate these policies.

`backupd/src/capture-client.ts` is B08's only `strapid` client. `getStatus` returns supervisor/release/source/runtime identity and health. `startCapture` validates an NDJSON stream containing at most one accepted record followed by one terminal record. If transport closes without a terminal acknowledgement, it returns `reconciliation-required`; B08 must then poll `reconcile` for that exact identity within the original capture deadline. `cancel` is best effort and never proves writer exit. Destroying the held request causes B04 to treat the client as disconnected and continue its own bounded recovery.

`backupd/src/staging-manager.ts` owns `/staging/runs/<runId>`, capacity checks, the in-flight 75 GiB limit, archive validation, and exact cleanup. An allocation moves through `allocated`, `capturing`, writer-confirmed or writer-unconfirmed, validation, retained, and cleaned states. Only a matching B04 terminal can release writer ownership; `export_ownership_unconfirmed` and `supervisor-shutdown` retain the directory because deletion could race a writer. `backupd/src/archive-validator.ts` streams the tar and computes the full-file SHA-256; B08 must not inspect tar or invent a validated archive.

`backupd/src/snapshot-manifest.ts` creates an immutable, privately authorized `SnapshotPublicationRequest` from one B05 `ValidatedArchive`, deployment attribution, and B06's six-hour policy. `backupd/src/snapshot-publisher.ts` owns destination preflight, exact immutable object reconciliation, upload, manifest-last publication, and remote confirmation. `PublishedSnapshot` is its sole success evidence. `backupd/src/s3-snapshot-store.ts` owns AWS SDK requests and multipart cancellation.

`backupd/src/state-repository.ts` is the only durable-state writer. It records daily claims/retry cooldowns, one pending publication with its original accepted time/deadline, and last remotely confirmed freshness. It reconstructs B06 request authority from strict JSON after restart. `backupd/src/daily-scheduler.ts` and `backupd/src/run-admission.ts` share one synchronous no-queue admission path across scheduled, catch-up, retry, pending-publication, and manual requests. `DailyScheduler.stop` prevents new work but intentionally does not abort active work; B08 supplies cancellation.

An outage in this plan begins when B08 sends the B04 capture request because B04 may immediately stop serving after its own admission checks. It ends only when a matching terminal says `captured`, whose `exportClosedAt` proves exporter close and whose `servingRecoveredAt` follows B03 live-child plus `/_health` confirmation. A pending publication is a B05-validated archive whose exact B06 request is durably recorded but whose remote manifest has not yet been durably accepted as confirmed. Freshness is the capture time in the confirmed manifest, not the upload time.

## Required Lifecycle States and Allowed Transitions

In `backupd/src/backup-lifecycle.ts`, keep one coordinator-owned state value for diagnostics and invariant checks. The states are `starting`, `idle`, `preflighting`, `capturing`, `validating`, `pending-publication`, `publishing`, `cleaning`, `stopping`, `stopped`, and `failed`. The state is not a second scheduler lock and is not persisted; B07 admission remains the authoritative single-flight owner.

Startup moves `starting` to `idle` only after strict state load and staging classification succeed. An admitted fresh run moves `idle` to `preflighting`, then `capturing`, then either `validating` or failure cleanup. Only successful validation moves to `pending-publication`; only a successful durable pending write moves to `publishing`. An admitted pending retry starts at `pending-publication` and moves to `publishing` without contacting `strapid`. Exact remote success moves to `cleaning`; successful cleanup then permits the B07 freshness transition and return to `idle`. A retryable publication failure returns to `pending-publication` while keeping state and staging. Any shutdown request moves every nonterminal state to `stopping`; nothing may transition from `stopping` back to capture, validation, or publication.

Writer-unconfirmed capture outcomes are a special terminal safety condition. They retain staging and move the daemon to `failed`, not `idle`, because neither deletion nor another capture is safe. Malformed state, unexplained startup staging, cleanup failure, and state durability-unconfirmed without a successful `reload` likewise fail closed. Recoverable destination, capacity, readiness, admission, validation, or publication errors return a typed B07 lifecycle result only after all resources whose ownership is confirmed have been safely handled.

Map results deliberately. A completed cleanup plus B07 freshness transition returns `completed`. A durable retained request that remains eligible for publication returns `publication-pending`; B07 treats the capture slot as consumed and the separate pending timer owns retry. A transient failure before accepted capture and with successful safe cleanup returns `retryable-failure` for automatic triggers, while manual requests receive the same observable failure but create no scheduled retry. Invalid capture, writer uncertainty, expiry, unsafe cleanup, state corruption, or identity mismatch returns `terminal-failure`. Do not classify a failure as retryable if staging remains occupied or writer ownership is unconfirmed.

## Safe Startup Classification

Construct and load `StateRepository` before starting the scheduler or installing `SIGUSR2`. Parse all configuration first, install termination handling as described below, then classify staging against the loaded state.

When `pendingPublication` is null, require `/staging/runs` to be empty through a B05-owned `assertEmptyForStartup()` operation. A missing runs directory may be created with B05's existing private permissions. Any entry—whether its name is a UUID, partial archive, old valid tar, symlink, or directory—is an interrupted or foreign capture. Do not read its archive, poll `strapid`, delete it, or start scheduling. Fail startup with secret-free `staging_occupied` evidence and leave it for operator inspection.

When `pendingPublication` exists, call B07's existing `restorePendingPublicationRequest(pending, publicationPolicy)` so strict state interpretation re-creates private B06 request authority without incrementing an attempt or resetting time. Pass its `request.archive` to B05 `reopenRetainedArchive`. The operation accepts exactly one of two safe shapes. If the exact run directory is present, it must be the sole `/staging/runs` entry, a real non-symlink directory at `/staging/runs/<runId>`, contain exactly `strapi-export.tar`, and the archive's device, inode, size, modified time, and changed time must equal the persisted fingerprint. B05 then registers a new `retained` allocation and returns it. If that exact run directory is absent and `/staging/runs` is otherwise empty, return `already-cleaned`; this represents a crash after cleanup but before state success/clear. Any other shape is a mismatch, remains untouched, and fails startup.

After safe pending classification, start B07's scheduler; it sees pending state and consumes any newly due automatic slot without starting a capture. Then arm B08's pending timer for the earlier of the persisted `notBefore` and `publicationDeadlineAt`, or run an immediate pre-deadline claim if already due. If current time is at or beyond `publicationDeadlineAt`, do not ask B07 for an ineligible normal claim: with no admitted lifecycle yet and durable pending state excluding capture, run only the coordinator's guarded final read-only reconciliation. Never derive a new accepted time or deadline.

## Fresh Capture Event Ordering

An admitted scheduled, catch-up, scheduled-retry, or manual request uses a fresh canonical UUID for `runId` and another for `captureWindowId`. It performs these steps in order.

First call `CaptureClient.getStatus` with the run signal. Require `runtimeReady`, `healthyServing`, no `activeCaptureWindowId`, and identity values matching the release/source/runtime values that will be copied into the request. A busy, unhealthy, replaced, or unavailable supervisor fails before allocation and before object-storage mutation.

Second call `SnapshotPublisher.preflight` with the run signal. This is the only remote operation allowed before the capture terminal. It must complete successfully before staging allocation or interruption. Third call `StagingManager.allocate(runId)`. Allocation performs both minimum-free-space checks and returns the sole canonical archive base path. If allocation fails, do not call B04. If a later pre-capture step fails, clean this still-`allocated` directory before returning.

Fourth create a version-one B04 `CaptureRequest` using the exact status identity and allocation base path, then call `startCapture`. From this call until a terminal record proves serving recovery, do not call any B06 method, including preflight, HEAD, reconciliation, upload, or manifest read. In `onAccepted`, synchronously remember the accepted record and start B05's size watcher for the exact identity. Give the watcher a callback that aborts the held capture request if its DELETE cancellation cannot be confirmed. The accepted record's deadline, not a new timer, remains authoritative.

If `startCapture` returns `reconciliation-required`, poll only `CaptureClient.reconcile(exactIdentity)` with abortable, non-overlapping requests and a short internal interval. Continue while the exact window is active and before its recorded deadline. An exact terminal is processed once. `unknown_window`, `supervisor_replaced`, protocol/identity mismatch, deadline exhaustion without terminal, or repeated transport inability makes writer ownership unconfirmed whenever acceptance may have occurred; retain staging and fail closed. Do not substitute a later `getStatus` health response for the missing terminal.

Acceptance can be learned either from the held NDJSON response or from exact-window reconciliation. If an active reconciliation record first exposes `acceptedAt`, start the B05 size watcher immediately with the same identity and base path. If reconciliation has already reached a terminal with `acceptedAt` before the watcher was installed, install the watcher once, let its first observation settle, and then record the terminal; the final size check and B05 validation still enforce the limit, and the exact terminal proves whether the writer released. If an exact terminal has no `acceptedAt` and no accepted callback, B04's ordering proves export never started, so leave the allocation in `allocated` state and clean it without fabricating a watcher. If acceptance may have happened but cannot be proved either way, retain the allocation despite its local `allocated` label; that label alone is not evidence that B04 never acquired a writer.

For a terminal after proven acceptance, call `StagingManager.recordCaptureTerminal` exactly once, which stops the size watcher and classifies writer ownership. A matching `captured` terminal is eligible for validation only when B05 returns `released`, no size violation occurred, `exportClosedAt` is present, and `servingRecoveredAt` is present. B04 has already required B03's live child plus successful `/_health`; B08 performs no second health policy. Validate with `StagingManager.validateArchive` and the run signal.

An `invalid` terminal or a recovery failure whose exporter ownership is confirmed is never publishable. Clean only after B05 records writer release. `export_ownership_unconfirmed`, `supervisor-shutdown`, an unusable reconciliation result, cancellation without a terminal, or inability to stop the size watcher is never safe to clean. Retain the exact directory, publish nothing, persist no pending publication, return terminal failure, and stop the daemon from admitting another run. Later exporter exit or service recovery does not revisit the rejected capture.

After B05 returns `ValidatedArchive`, call `createSnapshotPublicationRequest` using B06 configuration and the original capture acceptance time. Before the first B06 reconciliation or upload, call `StateRepository.setPendingPublication(request, now, retryDelayMs)`. If this durable transition fails, do not publish; retain the validated archive and fail closed because restart cannot otherwise correlate it. Once pending is durable, invoke B06 `publish` only if still before the original deadline.

## Publication, Missing Acknowledgement, and Expiry

B06 remains the sole owner of archive/manifest identity, local fingerprint recheck, multipart upload, lost-ack reconciliation, and manifest confirmation. B08 must never inspect ETags/checksums, create a `PublishedSnapshot`, retry an S3 call directly, or treat upload progress as success.

For normal publication, pass the exact authorized request and run signal to `SnapshotPublisher.publish`. B06 reconciles immutable keys before mutation. An exact existing manifest yields `already-published`; an exact archive without manifest resumes manifest-last publication; absent objects permit upload only before B06's existing `publicationDeadlineAt - 60 seconds` mutation cutoff. The final 60 seconds are a read-only reconciliation reserve: `publish` may still recognize an already-confirmed manifest but may not begin another archive or manifest mutation. Collision or inconsistent remote evidence is terminal. A cancellation or retryable remote failure retains pending state and staging; load the latest state and arm the one pending timer from its persisted `notBefore`, the mutation cutoff, and the original deadline. No remote request is permitted before recovery/validation, so upload can neither occur during nor extend the Strapi outage.

Add `SnapshotPublisher.reconcileFinal(request, { signal })`. It authorizes the request exactly as other B06 entrypoints do, uses only `headArchive`, `headManifest`, and bounded `getManifest`, and deliberately does not use the publication deadline as an eligibility extension. It returns either `{ status: "published", published: PublishedSnapshot }`, `{ status: "archive-confirmed", archive: RemoteObjectEvidence }`, or `{ status: "absent" }`. The `PublishedSnapshot` is B06-authored only after the exact manifest bytes and archive evidence match. The operation accepts a required caller signal; B08 combines shutdown cancellation with a 30-second timer. It contains no upload or PUT path, so it is safe at or after expiry.

The pending timer is owned by `BackupLifecycleCoordinator`, not B07. It is referenced while live, has a monotonically increasing generation, and is cleared on replacement or shutdown. Before the mutation cutoff, at `notBefore`, call `DailyScheduler.requestPendingPublication(runId)`. If shared admission reports `active`, do not queue; after the coordinator's active lifecycle promise settles, reload state and arm from the current pending record. If it reports `not-ready`, arm the persisted later time. At the mutation cutoff, permit at most one normal B06 call whose initial reconciliation can observe an already-published manifest but cannot mutate; after that result, wait for the original deadline for the final read-only decision. If pending disappeared, clear the timer. On restart use the same path, so attempts and cooldown survive and the deadline never resets.

When the deadline wins the timer race, do not call the normal B07 claim, because it is intentionally ineligible. Invalidate the timer generation, wait for the coordinator's one active lifecycle promise if there is one, reload and revalidate that the same run is still pending and expired, reconstruct the exact request with `restorePendingPublicationRequest`, then enter a private `finalizing-expired-publication` guard and perform `reconcileFinal`. During this terminal handling, B07's durable pending check makes manual work not eligible and its scheduler suppresses automatic capture; the guard prevents a second expiry callback. This is not a second admission system or a queued run: it can only finalize the already-admitted, already-durable pending archive. Shutdown aborts it through the same root controller.

At or beyond the original deadline, run one `reconcileFinal`. Exact published evidence follows the success order below. `absent` or `archive-confirmed` cannot establish success; safely clean the local retained allocation if present, then call `clearPendingWithoutSuccess(runId, "expired")`. A collision, inconsistency, cancellation, timeout, or unavailable remote response is reported as remote status unknown; if local cleanup is safe and succeeds, call `clearPendingWithoutSuccess(runId, "remote-status-unknown")`, never freshness. Remote immutable residue is left for operator retention tooling; B08 adds no delete, overwrite, latest pointer, or pruning.

On exact `PublishedSnapshot`, clean the reopened/current staging allocation first. If it was already absent, treat cleanup as already complete. Only then call `recordPublishedSnapshot(runId, published, confirmedAt)`. A crash after cleanup but before the state write leaves pending state and no local directory; restart's `already-cleaned` classification plus B06 exact manifest reconciliation completes the transition. If cleanup fails, keep pending state and do not advance freshness. If the state write returns durability-unconfirmed, call `reload`; accept success only if reloaded state contains the exact completed run and no matching pending record, otherwise fail closed.

## Cancellation, Signals, and Bounded Exit

`backupd/src/main.ts` must export a testable `runBackupDaemon` composition function and execute it only when the module is the program entrypoint. Use explicit `.ts` local imports, type-only imports, erasable TypeScript syntax, preserved error causes, and secret-free messages. Do not start child processes in production `backupd`; fixture children are integration-test-only.

Parse configuration and install `SIGTERM`/`SIGINT` listeners before awaiting state or remote work so a signal during startup aborts startup. Coalesce repeated termination signals through one shutdown promise. Install `SIGUSR2` only after startup classification, scheduler start, and pending-timer initialization are complete. Its synchronous handler calls `scheduler.requestManual()` and observes the returned completion rejection through the coordinator error sink; it does not wait inline, queue, bypass pending exclusion, or alter automatic cooldown. Remove all three listeners in `finally`.

On the first termination signal, synchronously set the stopping guard, remove `SIGUSR2`, call `scheduler.stop()`, clear and generation-invalidate the pending timer, and abort the startup/current lifecycle controller. If there is an accepted active capture, send best-effort exact `CaptureClient.cancel` under a small child signal while also aborting/destroying the held POST; B04 independently completes recovery. If publication is active, its signal aborts B06 and multipart cleanup. Do not clear pending state on shutdown. Cleanup an allocated/validated directory only if B05 has already proved writer release and the operation can finish within the bound; otherwise leave it and its durable authority untouched.

Await active lifecycle settlement, owned HTTP request destruction, pending state operation, and safe cleanup for at most `shutdownTimeoutMs`. Idle shutdown exits zero. Cancellation of active work exits zero only when all ownership and durable-state invariants settle safely; state corruption, cleanup failure, or forced timeout exits nonzero. At the outermost production entrypoint, if owned work has not settled at the deadline after every owned AbortController/request has been destroyed, invoke the injected/default forced-exit callback with code 1. Production's default callback calls `process.exit(1)` as the last bound; tests inject a recorder so no test process exits. B10 must configure container stop grace longer than the daemon bound. B08 never signals B03 child process groups.

## Configuration Ownership and Diagnostics

Create `backupd/src/backup-config.ts`. `parseBackupDaemonConfig(environment = process.env)` composes the existing `parseSchedulePolicy`, `parseStagingPolicy`, and `parseBackupPublicationConfig` results without mutating environment variables. Add `BACKUPD_COORDINATION_SOCKET_PATH`, default `/coordination/strapid.sock`, requiring an absolute path with no NUL byte, and `BACKUPD_SHUTDOWN_TIMEOUT_SECONDS`, default `30`, requiring a canonical base-ten integer from 1 through 300. Keep the B07 03:00 UTC schedule and retry defaults, B05 100 GiB minimum free space and 75 GiB archive maximum, B04 900-second window, and B06 six-hour publication window unchanged.

The returned object contains capture client options, schedule policy, staging policy, publication/storage/attribution policy, and shutdown milliseconds. Do not add B04 budget settings to `backupd`; `getStatus` advertises them and `strapid` owns enforcement. Do not add a second publication, capacity, or retry setting. B10 later injects production paths, credentials, release identity through service environment and mounts; B08 only parses existing process environment.

Define one `BackupDaemonError`/result taxonomy in `backup-lifecycle.ts` with stable event codes for startup state invalid, staging occupied/mismatch, destination preflight, supervisor unavailable, capture invalid, capture ownership unknown, validation failure, state transition failure, publication pending, publication expired, remote status unknown, cleanup failure, shutdown cancellation, and shutdown timeout. Preserve the original error in `cause` or an `AggregateError`. Diagnostics expose only event code, run ID, capture window ID, trigger, phase, and safe classification; never include credentials, endpoint query/userinfo, raw environment values, tar contents, response bodies, or exporter output. B09 later turns these outcomes into traces/logs/metrics; B08 supplies the cohesive typed events without adding an OpenTelemetry dependency.

## Narrow Interface Extensions

In `backupd/src/staging-policy.ts`, add a specific `staging_recovery_mismatch` error code if the existing `staging_occupied`, `archive_output_invalid`, and `writer_unconfirmed` codes cannot distinguish a durable pending fingerprint mismatch. Keep messages secret-free and preserve causes.

In `backupd/src/staging-manager.ts`, extend `StagingManager` with:

    export type ReopenedRetainedArchive =
      | { readonly status: "reopened"; readonly allocation: StagingAllocation }
      | { readonly status: "already-cleaned"; readonly runId: string };

    assertEmptyForStartup(): Promise<void>;

    reopenRetainedArchive(
      archive: ValidatedArchive,
    ): Promise<ReopenedRetainedArchive>;

Both operations reuse B05's realpath, symlink, private-directory, and sole-entry checks. `reopenRetainedArchive` derives all paths from `archive.runId`, requires equality with the persisted canonical `archivePath`, uses bigint `lstat` to compare the five file-identity fields, and registers exactly one `retained` record only after every check passes. It does not parse tar, recompute SHA-256, scan for candidates, accept a caller-supplied arbitrary directory, or delete on error. Existing `cleanup` then owns deletion of the reopened allocation.

In `backupd/src/snapshot-publisher.ts`, extend `SnapshotPublisher` with:

    export type FinalPublicationReconciliation =
      | { readonly status: "absent" }
      | {
          readonly status: "archive-confirmed";
          readonly archive: RemoteObjectEvidence;
        }
      | {
          readonly status: "published";
          readonly published: PublishedSnapshot;
        };

    reconcileFinal(
      request: SnapshotPublicationRequest,
      options: { readonly signal: AbortSignal },
    ): Promise<FinalPublicationReconciliation>;

Implement it by reusing B06's exact private authorization and remote evidence/manifest matching functions. Do not call the existing deadline boundary, `beginArchiveUpload`, or `putManifest`. Return `PublishedSnapshot.status = "already-published"` only from exact evidence. Preserve collision/inconsistency/cancellation/unavailability causes through `SnapshotPublicationError`.

In `backupd/src/backup-lifecycle.ts`, export `BackupLifecycleCoordinator`, its typed result/error/event interfaces, and a factory. Its constructor receives `CaptureClient`, `StagingManager`, `SnapshotPublisher`, `StateRepository`, B07 policies, publication configuration, UUID/clock/timer functions, and an error sink. Production passes real dependencies; tests inject controlled clocks and isolated stores, not alternate policy implementations. It exposes `classifyStartup`, `runLifecycle(request, signal)`, `armPendingPublication`, `stop`, and `waitForIdle`. Internally it retains exactly one current lifecycle promise and one expiry-finalization guard so the existing B07 interface needs no extension. Keep accepted-capture/allocation ownership private.

In `backupd/src/main.ts`, construct `createCaptureClient`, `createStagingManager`, `createS3SnapshotStore`, `createSnapshotPublisher`, `createStateRepository`, `createDailyScheduler`, and `BackupLifecycleCoordinator` from one parsed configuration. The scheduler callback creates a per-flight controller linked to daemon shutdown and delegates to `runLifecycle`. Avoid circular construction by creating the lifecycle first with a narrow pending-dispatch registration callback, then assigning the scheduler before startup; alternatively use a small local deferred dispatcher. Do not weaken types with `any` or make the scheduler optional after startup.

No package dependency or lockfile change is expected. Preserve Node 24.20.0, TypeScript 5.9.3, AWS SDK pins, `tar`, ESM execution, explicit `.ts` imports, and the existing frontend/backend/Strapi versions and architecture.

## Milestones

### Milestone 1: Make restart authority explicit at B05 and B06

First implement the two narrow lower-boundary extensions. B05 can reopen only the exact retained archive named by a restored request or prove it is already absent; B06 can perform an exact read-only final reconciliation without extending mutation eligibility. At the end of this milestone, focused B05 filesystem tests prove exact fingerprint reopen, already-cleaned handling, refusal of unknown/changed/extra/symlink entries, and cleanup through the reopened allocation. Focused B06 unit tests prove that post-expiry exact manifest evidence yields B06 success while absent/archive-only evidence does not, and that no upload/PUT method is invoked under any final-reconciliation outcome.

Run the focused Node test commands named below and `mise run backupd:check`. No daemon entrypoint is active yet, and no existing B01–B07 behavior should change.

### Milestone 2: Compose one lifecycle and its crash ordering

Implement configuration and `BackupLifecycleCoordinator`. Cover fresh capture ordering, missing capture acknowledgement reconciliation, B05 validation, pending persistence before B06, publication retry scheduling, final reconciliation, cleanup-before-freshness, state reload after uncertain durability, and typed failure mapping. At the end, an isolated integration trace observes destination preflight before capture admission, zero remote operations during the capture/recovery interval, pending state before the first upload, and cleanup before freshness.

Add the three material acceptance scenarios described in the test section rather than duplicating B01–B07 policy assertions. Run focused lifecycle integration plus the full `backupd` check/test tasks.

### Milestone 3: Activate the daemon and bounded signal lifecycle

Fill `backupd/src/main.ts` with the small composition root, safe startup classification, scheduler/pending-timer startup, `SIGUSR2`, coalesced termination, listener removal, and bounded forced exit. Add a task-owned Node fixture only for behavior that cannot be proved in-process: signal registration/removal and bounded process exit. The fixture uses temporary state/staging/socket paths and controlled dependencies; it never starts Strapi or needs a project stack.

At the end, idle startup begins B07 scheduling independently of Collector and without contacting `backupd` dependencies beyond its own state/staging and configured destination preflight when a run is actually admitted. A signal during an active capture closes the held request, does not queue a second run or advance freshness, and exits within the configured bound. Canonical backupd validation passes and all fixture PIDs, sockets, temporary directories, and isolated storage resources are gone.

### Milestone 4: Review, evidence, and bookkeeping

Run the exact canonical commands, residue and diff audits, then request independent review under the implement-task workflow. Remediate findings without broadening scope and repeat affected validation. Update every living section in this plan with actual timestamps and evidence.

Only after reviewer approval, add the relative plan link beneath B08 in `TODO.md` and check B08. The plan link is `.agents/plans/b08-connect-complete-backup-lifecycle.md`. The expected single commit title is `B08 — Connect the complete backup lifecycle`. Do not push unless the workflow/user separately authorizes it.

## Test Strategy and Material Evidence

Keep existing B01–B07 tests as the only proofs for pure budget arithmetic, supervisor state transitions, process-group exit, health polling, wire decoding, tar validation, storage protocol semantics, schedule math, no-queue admission, retry bounds, and durable-state interpretation. Do not reproduce their assertions in B08.

Extend `backupd/test/staging-manager.integration.test.ts` at the B05 owning boundary. Use a temporary staging root and real files to prove exact pending reopen and cleanup; missing exact directory with an otherwise empty runs directory returns `already-cleaned`; changed inode/size/mtime/ctime, wrong archive name/path, extra entry, symlink, foreign run, and no-pending residue are rejected without deletion. Keep memory bounded and start no process.

Extend `backupd/test/snapshot-publisher.test.ts` at the B06 owning boundary. With a recording `SnapshotStore`, set current time after the request deadline and prove `reconcileFinal` can return an exact B06 `PublishedSnapshot`, absent, or archive-confirmed; collision/inconsistent bytes/timeout remain errors; and archive upload plus manifest PUT call counts remain zero. Do not duplicate LocalStack multipart coverage.

Add `backupd/test/backup-lifecycle.integration.test.ts` plus the smallest reusable fixture helpers under `backupd/test/fixtures/`. Temporary HTTP fixtures, if any, bind only `127.0.0.1` on an OS-assigned ephemeral port. Prefer B04's Unix socket and fixture supervisor because production uses the Unix protocol. Fixture children are task-owned Node scripts only, are launched in isolated process groups when the existing helper requires it, expose explicit ready/PID/exit messages, and are always terminated and awaited in `t.after`. Never run Strapi.

The first lifecycle scenario exercises one full successful ordering with a recording isolated `SnapshotStore` and temporary B04/B05/B07 dependencies. Its event trace must be exactly ordered as destination preflight, staging allocation/capacity, capture accepted, exporter closed, serving healthy, local validation, pending-state durability, remote archive/manifest confirmation, staging cleanup, and freshness transition. Assert there is no remote store event between capture admission and recovery terminal. Include a lost-acceptance-stream variant where exact-window reconciliation first reveals `acceptedAt`; prove the watcher is installed once before terminal classification and that an oversized final archive remains ineligible.

The required recovery-failure scenario uses a B03/B04 fixture child whose exporter closes but whose serving recovery cannot satisfy health. Assert that B04 returns the matching recovery failure, B05 applies the correct writer disposition, B06 publish/reconcile/upload/manifest methods are never called after the initial destination preflight, freshness remains null, and cleanup occurs only if the terminal proves writer release. An export-ownership-unconfirmed variant retains staging and rejects another allocation.

The required restart scenario first creates and validates an archive, persists pending publication, and constructs a new state repository, staging manager, publisher, and lifecycle coordinator as a process restart would. With remote absent/archive-only evidence, assert no freshness appears and the original accepted time/deadline remain unchanged. With an exact preexisting manifest, assert B06 authors success, cleanup happens first, and B07 then advances freshness. With no pending state plus leftover capture staging, assert startup fails without reading, adopting, or deleting it. This proves restart never invents success.

In the same restart family, set the clock exactly to and after `publicationDeadlineAt`. Prove no normal pending claim, upload, or manifest PUT occurs; an active pre-deadline lifecycle settles before the one final read begins; scheduled/manual capture remains ineligible because pending is still durable; and duplicate deadline callbacks produce one final reconciliation. This test owns the material B07/B08 expiry seam without repeating B07's schedule or admission policy suite.

The required ownership scenario holds a fixture exporter or produces B04 `export_ownership_unconfirmed`, then requests cancellation/shutdown. Assert that B05 rejects cleanup, the exact active staging inode remains, no new capture/pending publication starts, and the fixture/process group is fully reaped by B03/B04 rather than backupd. This is the cross-boundary proof that ownership protects active staging.

Add `backupd/test/main.integration.test.ts` and `backupd/test/fixtures/backupd-main-fixture.ts` only if direct in-process signal registration cannot prove process exit. The fixture uses injected isolated dependencies and temporary paths, reports readiness over IPC/stdout, accepts real `SIGUSR2` and `SIGTERM`, and never starts a project service. Prove `SIGUSR2` while active is skipped with no queued callback; shutdown removes manual admission, aborts held work, and exits within the configured bound. This test owns its process and verifies exit; unit tests start no process.

Do not add backend, frontend, Strapi backend, smoke, browser, end-to-end, deployment, or prestarted-stack tests. Do not add a Docker dependency unless the existing B06 canonical LocalStack test runs as part of the package suite; B08's new tests use isolated in-memory storage because B06 already owns real S3 semantics.

## Concrete Steps

Work from `/home/codex/src/us-alb` on `backup-system`. Before edits, verify the protected baseline without inspecting the unrelated directory:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse origin/backup-system
    git status --short

Expected baseline:

    backup-system
    5600dbf1ab6234e04a72a48ecfb1a0f46c89a6c9
    5600dbf1ab6234e04a72a48ecfb1a0f46c89a6c9
    ?? .agents/skills/imagen/scripts/

Before production edits, add the plan link under B08 but leave its checkbox unchecked. The planner was explicitly prohibited from editing `TODO.md`; the approved worker performs this bookkeeping step.

Install exactly the locked backupd dependencies, with no package update:

    mise exec -- npm ci --prefix backupd

During milestones, use focused tests. Confirm exact supported file arguments from `node --test --help` if needed rather than inventing a test-runner flag:

    mise exec -- npm --prefix backupd exec -- node --test test/staging-manager.integration.test.ts
    mise exec -- npm --prefix backupd exec -- node --test test/snapshot-publisher.test.ts
    mise exec -- npm --prefix backupd exec -- node --test test/backup-lifecycle.integration.test.ts
    mise exec -- npm --prefix backupd exec -- node --test test/main.integration.test.ts
    mise run backupd:check

After implementation, run the canonical sequence from the repository root:

    mise run backupd:format
    mise run backupd:check
    mise run backupd:test

Expect format to complete without changing protected/out-of-scope files, check to report zero Biome or TypeScript errors, and every backupd unit/integration test to pass with zero failure, cancellation, or skip. Record the actual total in `Progress` and `Outcomes & Retrospective`; do not predict a fixed count. The `backupd:test` task includes B06's isolated digest-pinned LocalStack test and may use rootless Docker on an ephemeral `127.0.0.1` port. It must not require a prestarted stack.

No `strapid` source change is planned, so its canonical suite is not an applicable changed-area gate. The B08 backupd integration suite imports the exact B04 contract and exercises fixture ownership. If implementation discovers an unavoidable `strapid` production/test change, first document the narrow contradiction in this plan, then run:

    mise run strapid:format
    mise run strapid:check
    mise run strapid:test

Audit the final scope without opening the unrelated Imagen directory:

    git diff --check
    git status --short
    git diff --name-only -- . ':!.agents/skills/imagen/scripts/**'
    git diff -- BACKUP.md
    git diff -- backend frontend compose.yml .github
    git diff -- backupd/package.json backupd/package-lock.json mise.toml

Expected protected diffs are empty. Expected implementation files are the plan, B08 TODO bookkeeping after approval, the named backupd source files, the narrow B05/B06 edits, and focused backupd tests/fixtures only. Package and lock files remain unchanged.

Inspect task-owned residue with exact paths/labels established by the tests. Do not inspect the protected unrelated directory:

    find /tmp -maxdepth 1 -type d -name 'b08-*' -print
    find /tmp -maxdepth 1 -type s -name 'b08-*' -print
    find /tmp -maxdepth 1 -type d -name 'b04-*' -print
    find /tmp/strapi-workspaces -mindepth 1 -maxdepth 1 -print 2>/dev/null
    docker ps -a --filter label=us-alb.test-suite=b06 --format '{{.ID}} {{.Names}}'

Expect no B08/B04 fixture directory or socket, no B02 workspace residue, no B06 task-owned container, and no live fixture PID/process group. Tests use injected temporary staging/state roots and must not create or alter host `/staging` or `/state`.

## Validation and Acceptance

B08 is accepted only when all of the following are observable in passing tests and scoped code.

A fresh run performs destination HEAD/preflight and both B05 capacity checks before B04 can stop serving. After capture admission, the event trace contains no remote operation until a matching `captured` terminal has proved exporter close and serving health and B05 has validated the archive. Pending publication is durable before B06's first remote reconciliation/upload.

Serving recovery failure, export ownership uncertainty, invalid capture, unknown/replaced reconciliation, cancellation without terminal, or expired capture never invokes publication or advances freshness. Later exporter exit or healthy serving status cannot revise that immutable failed outcome. Cleanup occurs only after B05 proves writer release and only for the exact owned directory.

One pending archive excludes every scheduled/manual capture. Publication retries use the persisted `notBefore`, accepted time, and original deadline. Requests while active are skipped and never replayed. Restart may reopen only the exact fingerprinted pending archive, may tolerate its exact prior cleanup, and rejects every unexplained staging entry without deletion.

Normal publication mutates remote state only before the original deadline. Final post-expiry reconciliation is read-only. Exact B06 manifest confirmation is the sole freshness transition. Archive-only, absent, collision, inconsistent, timeout, and remote-unknown outcomes never advance freshness.

Success ordering is remote manifest confirmation, safe local cleanup, then atomic B07 pending-clear/freshness transition. Failure/expiry ordering is writer release, safe cleanup, then pending clear without success. A crash at every boundary is idempotently recoverable or fails closed; it does not create concurrent capture, overwrite an object, reset a deadline, invent success, or delete foreign/active staging.

Normal daemon startup depends on its own valid configuration, state/staging access, and `strapid` only when a run is admitted. It does not depend on Collector availability. B09 telemetry absence does not block backup operation. `SIGUSR2` shares B07 admission; `SIGTERM`/`SIGINT` stop timers/admission, cancel owned work, leave unsafe/pending artifacts intact, remove handlers, and terminate within the configured bound without restarting or signaling Strapi children directly.

All canonical commands pass, all task-owned resources are cleaned, `BACKUP.md` is byte-for-byte unchanged, no dependency/lockfile/generated API artifact changes occur, and no frontend/backend/schema/Compose/image/CI/release behavior changes.

## Idempotence and Recovery

Every B08 remote operation uses B06's immutable unique keys and exact reconciliation, so rerunning a pending attempt cannot overwrite or create a second logical snapshot. Every state mutation is keyed by exact run identity and serialized by B07. Every staging cleanup goes through B05's directory identity proof. Repeating startup classification, pending reconciliation, or cleanup either reaches the same state or fails closed on changed identity.

If execution stops before capture acceptance, clean the owned `allocated` directory and retry through B07 policy. If it stops after acceptance without a terminal proving writer release, retain staging and do not retry capture; operator inspection is required. If it stops after validation but before pending state durability, retain staging and fail closed because there is no safe automatic adoption path. If it stops after pending durability, restart reconstructs the same request and deadline. If it stops after remote confirmation but before cleanup, restart reconfirms and retries exact cleanup. If it stops after cleanup but before freshness, restart accepts an empty runs directory only in conjunction with the durable pending request, reconfirms the manifest, and records success. If it stops after freshness, no pending authority remains and staging must already be empty.

State durability-unconfirmed is never retried from stale memory. Reload the strict file; continue only when it proves the intended exact transition, otherwise stop. Publication cancellation retains pending. Capture cancellation cleans only after a B04 terminal and B05 writer-release classification. Forced process exit leaves state/staging for the same startup classifier and never performs speculative deletion.

Tests create unique temporary roots, Unix sockets, UUIDs, and child groups and register cleanup before starting work. They may be rerun concurrently without fixed host ports or shared project names. If a focused run fails, clean only its exact printed temporary path or labeled container after confirming ownership; never recursively remove `/tmp`, `/staging`, `/state`, the repository, or an unresolved variable.

## Artifacts and Notes

The key successful event transcript should resemble this order, with actual test IDs redacted from prose diagnostics:

    destination-preflight
    staging-capacity-confirmed
    capture-accepted
    export-closed
    serving-recovered
    archive-validated
    pending-state-durable
    manifest-confirmed
    staging-cleaned
    freshness-recorded

The key restart-success transcript is:

    pending-state-restored(original acceptedAt/deadline)
    retained-staging-reopened | retained-staging-already-cleaned
    exact-manifest-reconfirmed
    staging-cleaned | cleanup-already-complete
    freshness-recorded

The key fail-closed transcript is:

    no-pending-state
    unexplained-staging-entry
    scheduler-not-started
    manual-handler-not-installed
    entry-left-untouched

Do not make log wording an API. Tests assert event identity, phase order, safe correlation fields, forbidden remote calls, state, and filesystem/process ownership rather than exact prose.

Residual external prerequisites are not B08 blockers: real Scaleway credentials and bucket policy, server-side encryption/retention verification, live provider checksum verification, production throughput/capacity rehearsal, B09 observability, and B10 container image/Compose/volume/socket/environment wiring. Record them in the final retrospective but do not emulate or claim them here.

## Later-Task Boundaries and Commit Scope

B09 owns OpenTelemetry SDK/exporters, structured logs, traces, metrics, heartbeat, freshness telemetry, exporter-output filtering, and Collector behavior. B08 exposes typed lifecycle events and secret-free causes only. Collector unavailability must not affect scheduling, capture, recovery, publication, state, or cleanup.

B10 owns embedding `strapid`/`backupd` in images, Compose service definitions, rootless/read-only container settings, private socket and staging/state volumes, credentials/environment injection, health checks, stop grace, dependencies, and release assembly. B08 parses and runs the daemon but changes none of those files.

B11/B12 own restore tooling and restore runbooks; B08 adds no import path. B13 owns broader verification/runbook coverage; B08 adds only its material automated integration evidence. B14 owns operator documentation and retention/freshness explanation. B08 does not add latest pointers, pruning, remote deletion, schema validation, SQLite parsing, source-completeness claims, or content-type changes.

The approved commit may include `.agents/plans/b08-connect-complete-backup-lifecycle.md`, B08's link/check in `TODO.md`, `backupd/src/backup-config.ts`, `backupd/src/backup-lifecycle.ts`, `backupd/src/main.ts`, narrow edits to `backupd/src/staging-manager.ts`, `backupd/src/staging-policy.ts`, and `backupd/src/snapshot-publisher.ts`, plus the focused tests/fixtures named above. It must not include `.agents/skills/imagen/scripts/`, `BACKUP.md`, dependency manifests, generated artifacts, Compose/image/release/CI files, or unrelated formatting. Expected title: `B08 — Connect the complete backup lifecycle`.

## Revision Notes

- 2026-10-29 / Codex planner: Created the initial B08 ExecPlan from pushed B07 commit `5600dbf1ab6234e04a72a48ecfb1a0f46c89a6c9`. Resolved complete lifecycle composition, safe restart classification, one-pending enforcement, exact outage/remote ordering, missing-ack and expiry reconciliation, cleanup-before-state crash order, signals/bounded shutdown, minimum B05/B06 extensions, material integration evidence, canonical validation, and later-task boundaries. Self-review clarified that B07's deadline-ineligible normal claim remains unchanged: B08 finalizes the already-durable expired item only after its active lifecycle settles and while pending exclusion blocks capture. No production, test, queue, design, dependency, or protected unrelated file was changed.
- 2026-10-29 / Codex worker: Implemented milestones 1–3 and their material tests. During self-review, strengthened the approved design without changing architecture: final reconciliation now has a true outer timer race even for an abort-ignoring store, retained reopen validates canonical paths before accepting the already-cleaned case, durable transitions require exact reload proof, duplicate expiry callbacks share one finalization, and unexpected/foreign ownership conditions fail closed. The first full backupd canonical suite passed 123 tests; final clean-install, strapid regression, and protected/residue audits remain to be recorded before handoff.
- 2026-10-29 / Codex worker: Completed the worker stopping-point validation after clean install. Final evidence is backupd 124/124 and strapid 69/69 with formatting/check clean, valid locked dependency tree, clean LocalStack/process/socket/temp/workspace/artifact residue, byte-identical `BACKUP.md`, empty index, unchanged pushed B07 baseline, and no out-of-scope diff. B08 remains unchecked and uncommitted for independent review as required.
- 2026-10-29 / Codex worker remediation cycle 1: Implemented the reviewer-approved capture-admission generation and synchronous post-allocation linearization, exact active-handle shutdown cancellation, safe exact cleanup when shutdown wins before B04, strict typed 409/503 rejection decoding, fail-closed ambiguity, and scheduler admission completion waiting through durable automatic-attempt finalization. Added process-free decoder, real Unix-socket, coordinator race/ownership, retry-classification, cleanup aggregation, and bounded main-shutdown tests. Final evidence is backupd 133/133 and strapid 69/69 with five focused race/protocol repetitions, clean dependency/protected/scope/diff audits, and no task-owned residue. B08 remains unchecked, unstaged, uncommitted, and unpushed.
- 2026-10-29 / Codex worker remediation cycle 2: Moved allocation-error authority ahead of shutdown generation so only B05's proven no-owned-directory capacity/unavailability results are retryable; unsafe errors preserve their cause, fail the coordinator, and make main exit nonzero without guessed cleanup. Made exact typed B04 rejection provisional until clean request close, with later parser/request failure dominant, and replaced the hand-written compatibility producer with real `startCaptureHttpServer` plus actual `CaptureAdmissionError`. Added raw trailing-byte client/lifecycle regressions and five focused repetitions. Clean-install evidence is backupd 137/137 and strapid 69/69 with clean dependency, residue, artifact, protected-input, scope, and diff audits. B08 remains unchecked, unstaged, uncommitted, and unpushed.
- 2026-10-29 / Codex coordinator: Recorded final independent approval after the reviewer-approved concurrency/protocol checkpoint and two remediation cycles. The reviewer independently reproduced both final adversarial cases, repeated 35 focused tests five times, and passed backupd 137/137 plus strapid 69/69 with clean dependency, residue, protected-input, and scope audits. B08 is checked complete for its single scoped commit and user-authorized push; B09 telemetry, B10 deployment wiring, and live provider/capacity prerequisites remain deferred to their owning tasks.

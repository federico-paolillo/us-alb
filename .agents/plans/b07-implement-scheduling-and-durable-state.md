# Implement scheduling and durable state

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B07 — Implement scheduling and durable state` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B07, `backupd` has a reusable daily UTC scheduler and durable state boundary without yet running the complete backup lifecycle. At the default 03:00 UTC target, it can request one scheduled run; after downtime it requests only the newest overdue slot instead of replaying every missed date. Scheduled, retry, pending-publication, and manual `SIGUSR2` requests all pass through one synchronous single-flight gate, so a request received during active work is reported as skipped and is never queued for later execution.

The daemon can also survive a crash without inventing success or resetting an upload deadline. A small strict version-one JSON file records which daily slot was consumed, a bounded retry cooldown, the last remotely confirmed capture timestamp, and the complete B05/B06 identity required to reconstruct one pending publication. State replacement is atomic and crash-durable on the same Linux filesystem. Only an exact B06 `PublishedSnapshot` can atomically clear pending publication and advance freshness; an archive upload, local manifest, transport acknowledgement, or malformed state cannot.

The behavior is observable through process-free unit tests for UTC math, catch-up, single-flight admission, signal requests, overlap, retry bounds, and strict state interpretation, plus real-filesystem integration tests for permissions, file identity, atomic replacement, sync ordering, concurrent mutation serialization, and failure recovery. B08 later supplies the actual capture/publication callback and wires these primitives into `backupd/src/main.ts`.

## Progress

- [x] (2026-10-29 16:05Z) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, pushed B01–B06 plans, relevant current `backupd` code/tests, and the exact B07 queue item.
- [x] (2026-10-29 16:05Z) Confirmed `backup-system`, `HEAD`, and `origin/backup-system` are at pushed B06 commit `bebf6d0b56b4300ed95b35877aae017f609871d0`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present.
- [x] (2026-10-29 16:05Z) Traced B05 `ValidatedArchive`, B06 canonical request authority, original publication deadline, `PublishedSnapshot`, and reconciliation interfaces to define the minimum lossless pending-publication record and sole success transition.
- [x] (2026-10-29 16:05Z) Verified on exact Node v24.20.0/Linux that file `sync`, same-directory `rename`, directory `sync`, `O_NOFOLLOW`, and mode `0600` work in the planned atomic sequence; removed the exact disposable `/tmp/b07-fsync-probe-*` directory.
- [x] (2026-10-29 16:05Z) Created and self-reviewed this B07 ExecPlan against the 03:00 UTC default, one-catch-up rule, no-queue single flight, persisted cooldowns, strict schema, crash ordering, current B06 reconstruction contract, and B08/B09/B10 boundaries.
- [x] (2026-10-29 16:14Z) Tightened the shared-admission contract so the active token precedes every asynchronous boundary, durable automatic/publication claims precede B08 lifecycle work, active-time automatic requests are consumed without release, a retained manual capture clears older automatic retry debt, and signal registration/lifecycle cancellation remain B08-owned.
- [x] (2026-10-29 16:16Z) Began the approved worker implementation at pushed B06 commit `bebf6d0b56b4300ed95b35877aae017f609871d0`, re-read the governing worker/validation instructions and complete plan, and linked the still-unchecked B07 tracker item before production edits.
- [x] (2026-10-29 16:25Z) Implemented pure UTC schedule/configuration math and synchronous no-queue admission/manual-handler boundaries; focused process-free tests cover exact UTC rollovers, bounded settings, synchronous ownership, rejection, and stopped admission.
- [x] (2026-10-29 16:25Z) Implemented strict canonical version-one state, lossless B05/B06 request reconstruction, serialized same-filesystem file-sync/rename/directory-sync replacement, poison/reload recovery, and real-filesystem integration coverage.
- [x] (2026-10-29 16:25Z) Implemented the daily/retry timer coordinator without lifecycle composition; 28 focused B07 tests pass across startup catch-up, cooldown restart, retry exhaustion, all three active-work skip paths, pending suppression, state-write failure, and stale completion ordering.
- [x] (2026-10-29 16:31Z) Reinstalled from the unchanged lockfile, passed canonical format/check and all 102 backupd tests with zero failures/skips, and completed dependency/artifact/residue/protected-input/scoped-worktree audits without finding B06/B07 residue or out-of-scope changes.
- [x] (2026-10-29 16:41Z) Remediation cycle 1 addressed all three bounded reviewer findings: complete known B06 evidence is admitted and strictly typed, UTC time is recomputed after state access with overdue state armed immediately, and timer-arm generations prevent post-stop installation. The 22 owning focused scheduler/repository tests pass, including four new deterministic regressions.
- [x] (2026-10-29 16:42Z) Remediation validation passed canonical format/check and all 106 backupd tests with zero failures/skips, including isolated LocalStack; clean install, dependency, artifact, reviewer-log, temp/container residue, protected-input, and scoped-worktree audits are clean.
- [x] (2026-10-29 16:49Z) Remediation cycle 2 linearized a final newest-slot reconciliation inside every started automatic/manual/pending lifecycle while admission is still owned. The deterministic fast catch-up target-crossing regression and all 14 scheduler tests pass with one lifecycle, a durable skip of the newly due slot, and no queued later run.
- [x] (2026-10-29 16:50Z) Cycle-2 validation passed the 14-test scheduler focus and all 107 canonical backupd tests with zero failures/skips, including isolated LocalStack; clean install, dependency, artifact, reviewer-log, temp/container residue, protected-input, and scoped-worktree audits are clean.
- [x] (2026-10-29 16:53Z) Independent rereview approved B07 after two remediation cycles. The reviewer reproduced the final no-queue ordering, passed all 33 focused tests, repeated the 14 scheduler tests 20 additional times, passed strict checks and all 107 canonical tests, and found no remaining actionable issue; the coordinator then checked B07.

## Surprises & Discoveries

- Observation: A B06 manifest or object key alone is insufficient to resume publication.
  Evidence: `createSnapshotPublicationRequest` accepts a complete B05 `ValidatedArchive`, persisted site/environment/image/Git attribution, and a `PublicationPolicy`; it copies those values into an unexported `WeakMap` authority. B07 must restore through that constructor, not cast decoded JSON to `SnapshotPublicationRequest`.

- Observation: Reconstructing with current configuration could silently reset or redirect an old publication.
  Evidence: B06 derives `publicationDeadlineAt` from capture `acceptedAt + publicationWindowMs`, keys from stored site/environment/run ID, and manifest attribution from stored image/Git values. B07 must persist accepted-at, original deadline, validated archive, and attribution, then derive a one-run policy whose window is exactly `deadline - acceptedAt`; current deployment attribution or window settings cannot replace those persisted values.

- Observation: The B06 success result is the correct freshness authorization boundary.
  Evidence: `PublishedSnapshot` is returned only after exact archive evidence and manifest HEAD plus byte-for-byte GET confirmation. `ReconciledSnapshot` may be only `absent` or `archive-confirmed`. B07 may correlate a `PublishedSnapshot` to pending state, but must not duplicate remote confirmation or advance freshness from any weaker result.

- Observation: “Skip while active” requires consuming a scheduled slot, not merely returning busy.
  Evidence: If a 03:00 timer fires during a manual or pending-publication run and the slot remains unclaimed, recomputing after that run would immediately treat 03:00 as overdue. Recording the slot as skipped makes the request truly non-queued and defers the next automatic capture to the next UTC target.

- Observation: A retry cooldown must be committed before work begins to survive a crash.
  Evidence: Recording failure only after the callback returns leaves a crash window in which restart sees the same due slot with no delay. The state transition therefore claims the attempt and its next-not-before time atomically before B08 is invoked. A hard kill can lose the result but cannot create an immediate retry loop.

- Observation: File rename alone is atomic but not the complete durability sequence.
  Evidence: The exact-runtime probe wrote and synced a `0600` temp file, renamed it within one directory, opened that directory with `O_DIRECTORY | O_NOFOLLOW`, and synced the directory successfully. B07 must sync both file contents and the containing-directory rename before reporting a committed transition.

- Observation: An older automatic lifecycle may finish after a newer daily slot has been consumed while that lifecycle still owns admission.
  Evidence: The controlled automatic-overlap test advances to the next UTC day while the first callback remains pending. The newer slot is durably skipped before the first callback settles, so finishing the older claim must be a stale no-op rather than conflicting with or overwriting the newer schedule record.

- Observation: Restoring an authorized B06 request does not by itself re-prove every B05 allocation invariant from untrusted JSON.
  Evidence: B06 validates archive fingerprints, identity tokens, capture ordering, attribution, keys, and manifest bytes, but the B07 decoder must additionally require the exact `/staging/runs/<runId>/strapi-export(.tar)` relationship and capture deadline ordering before granting fresh private B06 authority.

- Observation: A pre-read size check is not a complete bounded-read guarantee for a mutable filesystem object.
  Evidence: The repository reads through a fixed 65,537-byte buffer, rejects a byte beyond the 65,536-byte state limit, and requires the observed byte count to equal the opened file's checked size before decoding.

- Observation: Genuine S3-backed B06 evidence has a wider known shape than the seven correlation fields B07 initially required.
  Evidence: `s3-snapshot-store.ts` returns the seven required identity/content fields plus `etag`, `versionId`, `checksumAlgorithm`, `checksumType`, and `checksumValue`, with optional values represented as strings or `undefined`. An actual `createSnapshotPublisher` result exercises that shape across the B06/B07 boundary.

- Observation: A wall-clock snapshot taken before asynchronous state access can become a stale scheduling decision at the exact UTC target.
  Evidence: Controlled clocks move from `02:59:59.999Z` to `03:00:00.000Z` while `load()` is pending. Recomputing after the load selects today's slot; if the crossing occurs during timer arming, comparing `latestDueSlot` with durable state produces a zero-delay wake rather than tomorrow's timer.

- Observation: Clearing the current timer is insufficient when an older `armTimer()` call is still awaiting state.
  Evidence: A controlled pending load allowed `stop()` to run after the initial stopped check. A monotonic arm generation invalidated by stop and newer arm attempts prevents that continuation from installing a referenced timer.

- Observation: A zero-delay overdue timer cannot be the no-queue linearization when a fast active flight finishes before the timer callback runs.
  Evidence: The adversarial ordering claims the previous day's catch-up at `02:59:59.999Z`, advances to `03:00:00.000Z` inside the fast lifecycle, and lets the lifecycle settle before firing timers. Without a final in-admission state reconciliation, the queued callback claims the new day after admission releases.

- Observation: B07-specific tests need no process or external dependency, but the canonical package suite already contains B06's task-owned LocalStack integration.
  Evidence: `mise run backupd:test` currently reports 74 tests and provisions its own digest-pinned rootless S3 container on an ephemeral loopback port. B07 adds only process-free unit and filesystem tests and still runs the complete canonical package suite.

## Decision Log

- Decision: Implement B07 entirely in new reusable `backupd` modules and tests; leave `backupd/src/main.ts` empty.
  Rationale: B07 owns schedule, state, and admission policies. B08 owns complete lifecycle composition, process signal registration/removal, startup order, shutdown cancellation, staging reconciliation, and daemon entrypoint behavior. Keeping main unchanged prevents B07 from running an incomplete backup loop.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Parse one UTC `HH:MM` setting named `BACKUPD_SCHEDULE_UTC`, defaulting exactly to `03:00`.
  Rationale: One validated value is sufficient for the agreed daily schedule and cannot be affected by the host's timezone or daylight-saving changes. Pure math uses only `Date.UTC` and UTC getters; it never parses local dates or uses local setters.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add configurable automatic retry settings `BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS` default `900` and `BACKUPD_AUTOMATIC_MAX_ATTEMPTS` default `2`, allowing one initial attempt plus one retry for a scheduled slot.
  Rationale: The authoritative design requires bounded failure/retry scheduling but does not assign numbers. A 15-minute persisted cooldown and at most two automatic attempts prevent tight failure/startup loops while allowing one recovery from a transient failure. Values validate as 60–86,400 seconds and 1–3 attempts. They are initial policy, not measured guarantees; B10 later wires them.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Give pending-publication attempts the same persisted 15-minute not-before delay but bound them by their original B06 deadline rather than the scheduled-slot attempt count.
  Rationale: A confirmed local artifact should remain eligible for bounded publication retry throughout its original six-hour window. At most one attempt can be claimed per delay, so the window and cooldown place a finite upper bound on attempts and restart cannot reset either. B08 owns invoking B06 and expiry cleanup; B07 only records/claims eligibility.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Represent each daily occurrence by its UTC calendar date `YYYY-MM-DD`, with its due instant derived from the configured hour/minute.
  Rationale: The identifier is readable, strict, independent of local timezone, and sufficient because there is exactly one run per UTC day. Jumping from an old claimed date to the newest due date implements one catch-up without enumerating missed days.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Claim or skip an automatic slot durably before lifecycle work; never queue an active-time request.
  Rationale: A started initial attempt records attempt one and the earliest retry time. A started retry increments the count before execution. A scheduled/catch-up/retry request that meets an already-active single flight records that occurrence as consumed with no retry. This makes “skipped” durable and prevents completion from releasing a latent request.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Treat completion of an automatic claim as stale when durable state already names a later slot.
  Rationale: The later slot is the authoritative no-queue decision. Returning that immutable state preserves retry ownership without allowing an older completion to regress or conflict with it.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Manual `SIGUSR2` requests bypass automatic cooldown but never bypass single-flight or pending-publication exclusion.
  Rationale: The signal is an explicit operator request, so it need not alter or wait for a failed daily slot's cooldown. It still cannot start a second run or a new capture while one retained archive needs publication. A manual failure has no automatic retry and does not shift the next 03:00 UTC slot.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Publish an in-memory active token synchronously before any policy check, state write, or lifecycle callback.
  Rationale: Two signals/timers in one event-loop turn must not both cross an asynchronous boundary. The first `request` installs one admitted operation and returns `started` with a completion promise; every later request observes active state and returns `skipped/active` immediately. The admitted operation performs the durable claim before it invokes B08's lifecycle callback. Clearing occurs once in `finally`, and there is no pending flag or queue.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Store one strict canonical JSON document at `/state/backupd/state.json`, under a private `/state/backupd` directory.
  Rationale: B10 later mounts `/state` as `backupd`'s private writable state volume. The child directory is owned by the effective backupd UID and mode `0700`; the regular state file is owned by the same UID and mode `0600`. Tests inject a temporary root. Production never follows a symlink or accepts group/world access.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Fail closed on malformed, oversized, unknown-version, symlinked, wrongly owned, or wrongly permissioned state.
  Rationale: Missing state means a new installation and permits one catch-up. Invalid existing state is not equivalent to missing state, cannot establish freshness/publication success, and must remain untouched for operator inspection. The scheduler and signal admission do not start until state loads successfully.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Persist the full minimal B05/B06 reconstruction record, using decimal strings for bigint file identity.
  Rationale: The B06 constructor requires archive path, length/hash/metadata, full captured terminal, and device/inode/size/mtime/ctime plus attribution. JSON cannot encode bigint, so those five nonnegative values use canonical decimal strings and are parsed back to bigint. Keys and accepted/deadline are stored redundantly and re-derived for equality to detect corruption or changed interpretation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Revalidate exact persisted staging paths, capture deadline order, canonical fingerprints, and B06-derived keys before reconstructing publication authority.
  Rationale: State JSON is an independent trust boundary; values originally emitted by B04–B06 cannot be trusted merely because their TypeScript shape survived serialization.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Write state by exclusive same-directory temp file, file sync, atomic rename, and directory sync.
  Rationale: `writeFile` alone can expose partial JSON and rename without syncing the directory can be lost after a host crash. The state repository serializes mutations, writes mode `0600` with `O_EXCL | O_NOFOLLOW`, syncs/closes, renames over the final path on the same filesystem, then syncs the private directory before updating its in-memory committed value.
  Date/Author: 2026-10-29 / Codex planner

- Decision: If rename succeeds but directory sync fails, mark repository durability unconfirmed and require reload before another mutation.
  Rationale: The final path may already contain the new document, so rolling back in memory or overwriting from stale state is unsafe. The error retains its cause; callers stop automatic work, reload the authoritative path, and apply idempotent run/slot transitions after successful validation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Advance `lastCompletedSnapshot` only from an exact correlated B06 `PublishedSnapshot`, in the same atomic transition that clears pending publication.
  Rationale: B06 is the sole remote-confirmation owner. An older completed capture may clear its matching pending record but cannot move freshness backward; an identical already-recorded run is idempotent. No other method accepts a boolean, archive evidence, manifest-shaped JSON, or transport acknowledgement as success.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Validate B06 object evidence against the complete known key set while requiring all seven correlation fields and typing every optional transport/checksum field.
  Rationale: Real S3 evidence must pass unchanged, truncated or type-confused evidence must not authorize freshness, and additional unknown properties remain rejected.
  Date/Author: 2026-10-29 / Codex worker, remediation cycle 1

- Decision: Recompute schedule time after state reads, arm immediately for any newer durable slot, and generation-guard timer installation and callbacks.
  Rationale: These checks close both the exact UTC-boundary miss and the stop-versus-await race without changing admission, lifecycle, or shutdown ownership.
  Date/Author: 2026-10-29 / Codex worker, remediation cycle 1

- Decision: Reconcile and durably consume the newest newly due slot after each started lifecycle settles but before its admission promise can release ownership.
  Rationale: Long flights are still handled by the due timer while admission is active; the final reconciliation closes the fast-completion gap. It runs for automatic, manual, and pending lifecycle work, recomputes time after loading state, preserves one-newest-slot semantics, and aggregates reconciliation failure with any lifecycle failure.
  Date/Author: 2026-10-29 / Codex worker, remediation cycle 2

- Decision: Add no dependency and use only Node timers, signals-as-callbacks, crypto UUIDs already available to callers, and filesystem APIs.
  Rationale: UTC math, single-flight control, strict JSON, and durable replacement need no scheduler, lock, database, or state library. Context7 was unnecessary because no uncertain third-party API is introduced; exact Node directory-sync behavior was verified on the pinned runtime.
  Date/Author: 2026-10-29 / Codex planner

## Outcomes & Retrospective

B07 is complete and independently approved. Five production modules now own pure UTC slot/configuration policy, synchronous no-queue admission, strict durable state, crash-durable repository transitions, and one daily/retry timer without composing the B08 lifecycle. Tests prove exact UTC boundaries and rollovers, newest-only catch-up, persisted cooldown/retry exhaustion, synchronous overlap exclusion, durable consumption during manual/pending/automatic activity, strict B05/B06 reconstruction, B06-only freshness advancement, owner-only filesystem modes, serialized mutation, interrupted pre-rename preservation, post-rename poison/reload, and stale-result non-regression.

Remediation cycle 1 closed the initial review findings with strict acceptance of the complete known B06 evidence shape, an actual `createSnapshotPublisher`-to-state transition, post-state-read UTC decisions with immediate overdue arming, and generation-guarded stop/arm ordering.

Remediation cycle 2 closed the remaining fast-flight no-queue race. Every started lifecycle now performs one final post-state-read newest-slot reconciliation before its admission promise settles; the exact adversarial trace is `claim 2026-10-28`, lifecycle completion, then durable `skip 2026-10-29`, with no `claim 2026-10-29` after the timer fires. Final independent review passed all 33 focused B07 tests, repeated the 14 scheduler tests 20 additional times, and passed strict checks plus all 107 canonical tests. The suite retained B06's isolated digest-pinned LocalStack coverage and cleaned its container. No dependency, lockfile, `main.ts`, `BACKUP.md`, or later-task change was made. Residual integration ownership remains explicitly with B08 and B10.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; `HEAD` and `origin/backup-system` are both `bebf6d0b56b4300ed95b35877aae017f609871d0`, the pushed B06 commit. Do not switch branches. The unrelated untracked `.agents/skills/imagen/scripts/` directory must remain unread, unformatted, unstaged, and unchanged.

`backupd/` is a private ESM TypeScript package executed directly by Node v24.20.0. Relative local imports include `.ts`, type-only imports are explicit, and strict erasable TypeScript is checked without emitting JavaScript. `backupd/src/main.ts` is empty. The current suite has 74 passing tests, including B06's isolated LocalStack integration. B07 adds no runtime dependency.

`backupd/src/staging-manager.ts` and `backupd/src/archive-validator.ts` produce a retained `ValidatedArchive` only after writer release, tar validation, and full-file SHA-256. `backupd/src/snapshot-manifest.ts` turns that artifact plus persisted attribution and publication policy into an authorized `SnapshotPublicationRequest`. `backupd/src/snapshot-publisher.ts` returns `PublishedSnapshot` only after remote manifest confirmation. Those are B07's data boundaries; B07 never validates tar or contacts object storage.

A schedule slot is the one UTC date whose configured daily target has become due. Claiming a slot means state records that its request was considered, so it cannot be rediscovered as overdue. A single flight is one in-memory active promise that excludes all other scheduled, retry, pending, or manual requests. A cooldown is a persisted earliest next-attempt timestamp. Freshness is the capture's B06 manifest `capturedAt`, not upload completion time. Pending publication means one validated local artifact has not yet produced a confirmed remote manifest.

The state repository is the only writer to its JSON file. One `backupd` process is the deployment invariant, and the in-process single-flight plus serialized mutation chain prevents local concurrent writes. B07 does not add a cross-process lock or support multiple replicas. Compose ownership and one service replica remain B10 concerns.

## UTC Schedule and Retry Policy

Create `backupd/src/schedule-policy.ts`. `parseSchedulePolicy(environment = process.env)` reads `BACKUPD_SCHEDULE_UTC`, `BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS`, and `BACKUPD_AUTOMATIC_MAX_ATTEMPTS` without changing the environment. The result is:

    export interface SchedulePolicy {
      readonly utcHour: number;
      readonly utcMinute: number;
      readonly automaticRetryDelayMs: number;
      readonly automaticMaximumAttempts: number;
    }

The schedule string must be exactly zero-padded `HH:MM`, hour 00–23 and minute 00–59. Defaults are 03:00, 900,000 milliseconds, and two attempts. Numeric settings reject sign, whitespace, exponent, fraction, leading zero ambiguity, unsafe conversion, and values outside the bounds above. Errors use `ScheduleConfigurationError` with code `configuration_invalid` and no raw environment value.

Export pure functions `latestDueSlot(now, policy)`, `nextDailySlot(now, policy)`, and `compareSlotIds`. A `ScheduledSlot` contains canonical `id: YYYY-MM-DD` and `dueAt: <canonical ISO UTC>`. At exactly 03:00:00.000 UTC, today's slot is due; one millisecond before, yesterday is latest. `nextDailySlot` is strictly after `now`. Construct instants with `Date.UTC`, including month/year/leap rollover. Invalid or noncanonical `now` is rejected.

Do not enumerate missed days. Startup compares `state.schedule.lastClaimedSlot` with `latestDueSlot(now)`. If the newest due ID is later, request exactly that one as `startup-catch-up` and durably jump `lastClaimedSlot` to it. Existing retry state applies only when its slot is still the newest due slot; a newer due slot supersedes and clears an older retry. Timer callbacks recompute from current UTC time so forward jumps still create one newest request and backward jumps cannot duplicate a claimed ID.

An automatic initial claim records attempt one and `notBefore = claim time + retry delay`, clipped no later than the next daily slot. On success, clear retry. On failure/crash, attempt two becomes eligible only at `notBefore`. Claiming attempt two increments durably before callback and clears further eligibility because the default maximum is reached. Configured maximums one through three follow the same rule. Manual attempts never create automatic retry state.

## Strict Version-One Durable State

Create `backupd/src/durable-state.ts`. The semantic on-disk schema uses exact keys and explicit nulls:

    export interface BackupStateFileV1 {
      readonly version: 1;
      readonly schedule: {
        readonly lastClaimedSlot: string | null;
        readonly retry: null | {
          readonly slot: string;
          readonly attemptsStarted: number;
          readonly notBefore: string;
        };
      };
      readonly lastCompletedSnapshot: null | {
        readonly runId: string;
        readonly capturedAt: string;
        readonly confirmedAt: string;
        readonly archiveKey: string;
        readonly manifestKey: string;
      };
      readonly pendingPublication: null | {
        readonly runId: string;
        readonly archiveKey: string;
        readonly manifestKey: string;
        readonly acceptedAt: string;
        readonly publicationDeadlineAt: string;
        readonly attemptsStarted: number;
        readonly notBefore: string;
        readonly attribution: {
          readonly site: string;
          readonly environment: string;
          readonly imageDigest: string;
          readonly gitRevision: string;
        };
        readonly archive: PersistedValidatedArchiveV1;
      };
    }

`PersistedValidatedArchiveV1` contains exactly the B05 `ValidatedArchive`: run ID, absolute archive path, safe numeric byte length, lowercase SHA-256, metadata `createdAt`/`strapiVersion`, complete captured B04 terminal and identity/timestamps/outcome, and file identity. File identity fields `device`, `inode`, `size`, `modifiedNanoseconds`, and `changedNanoseconds` are canonical unsigned decimal strings with no sign or leading zeros except `0`. The captured outcome must be exactly `captured`; accepted-at must exist and equal the pending top-level accepted-at; run IDs and supervisor/window IDs are canonical UUIDs; tokens, paths, hashes, timestamp order, Strapi versions, derived keys, archive length, fingerprint size, and deadline relationship must pass the same semantic rules as B05/B06.

The document is canonical JSON in fixed property order plus one trailing newline and no more than 65,536 bytes. The decoder rejects duplicate/unknown/missing keys by parsing then comparing re-serialization byte-for-byte, just as B06 protects its manifest. Unknown version, invalid UTF-8/JSON, noncanonical number/timestamp/path/key, conflicting identity, unsafe attempt count, a retry slot different from `lastClaimedSlot`, pending deadline not later than accepted-at, or last freshness with inconsistent keys is `state_invalid`. Decoding does not reject a claimed slot merely because the current wall clock moved backward; schedule policy handles that conservatively without replay.

Missing `state.json` returns this in-memory initial value and does not write until the first transition:

    {
      version: 1,
      schedule: { lastClaimedSlot: null, retry: null },
      lastCompletedSnapshot: null,
      pendingPublication: null
    }

Malformed existing state is never renamed aside, repaired, truncated, deleted, or replaced with initial state. Loading fails and B08 must not install timers/signals or start lifecycle work. Local state remains subordinate to remote manifests, but only B06 may perform that remote reconciliation.

## State Repository and Atomic Replacement

Create `backupd/src/state-repository.ts`. Production uses root `/state`, private directory `/state/backupd`, and final file `/state/backupd/state.json`. Tests inject a unique temporary root. The private directory is created non-recursively at mode `0700` if absent, then checked with `lstat`, `realpath`, effective UID, and permission bits. The final file is opened with `O_RDONLY | O_NOFOLLOW`, must be a regular file owned by the effective UID at mode `0600`, and is read through a 65,536-byte bound. A symlink, changed directory identity, foreign owner, or group/world permission fails `state_unavailable` or `state_invalid` without mutation.

Expose a `StateRepository` whose `load` returns an immutable snapshot and whose transition methods serialize through one internal promise chain. Every transition starts from the most recently committed state and returns the new immutable snapshot; callers never write a caller-supplied whole document. The methods are semantically:

    export interface StateRepository {
      load(): Promise<BackupState>;
      claimAutomaticAttempt(
        slot: ScheduledSlot,
        now: string,
        policy: SchedulePolicy,
      ): Promise<AutomaticAttemptClaim>;
      skipAutomaticRequest(slot: ScheduledSlot): Promise<BackupState>;
      finishAutomaticAttempt(
        claim: AutomaticAttemptClaim,
        outcome: "succeeded" | "failed",
      ): Promise<BackupState>;
      setPendingPublication(
        request: SnapshotPublicationRequest,
        now: string,
        retryDelayMs: number,
      ): Promise<BackupState>;
      claimPendingPublicationAttempt(
        runId: string,
        now: string,
        retryDelayMs: number,
      ): Promise<RestoredPendingPublication>;
      recordPublishedSnapshot(
        runId: string,
        published: PublishedSnapshot,
        confirmedAt: string,
      ): Promise<BackupState>;
      clearPendingWithoutSuccess(
        runId: string,
        reason: "expired" | "invalid" | "remote-status-unknown",
      ): Promise<BackupState>;
      reload(): Promise<BackupState>;
    }

`setPendingPublication` accepts only a B06-authorized request, extracts a defensive persisted copy, and rejects a different existing pending run. It occurs after B05 validation and before the first B06 mutation; B08 owns that ordering. In one state replacement it stores `attemptsStarted: 0` and `notBefore: now` and clears any automatic capture retry, because a validated retained capture now owns recovery even when it came from a manual request during an earlier scheduled cooldown. It does not change `lastClaimedSlot`, so the next ordinary 03:00 target is unchanged. `claimPendingPublicationAttempt` requires the matching run, current time at or after not-before, and time before the original deadline. Before returning, it increments attempts and sets the next not-before to the lesser of `now + retryDelay` and the original deadline. It restores bigint fields and calls B06 `createSnapshotPublicationRequest` using persisted attribution and a reconstructed publication window of exactly `deadline - acceptedAt`; current upload concurrency and fixed reconciliation reserve are retained. The returned request therefore receives a fresh B06 private authority.

`recordPublishedSnapshot` requires the matching pending run, exact request keys/run/capture/deadline, and B06 status `published` or `already-published`. It does not query or reinterpret storage. One atomic state write clears pending and records capture freshness. If the current `lastCompletedSnapshot.capturedAt` is newer, keep it rather than regress; exact same run is idempotent. No other transition changes freshness.

`clearPendingWithoutSuccess` exists for B08 only after it has applied B06 reconciliation/expiry policy and safely handled staging. It clears the matching pending record but does not change `lastCompletedSnapshot`. The reason is a typed control input for later telemetry, not persisted prose. B07 does not call this method automatically.

For each write, encode the full next state in memory, create `.state.<pid>.<uuid>.tmp` in the same private directory with `O_CREAT | O_EXCL | O_WRONLY | O_NOFOLLOW` and mode `0600`, write all bytes, call file `sync()`, close, revalidate the directory identity, rename to `state.json`, open the directory with `O_RDONLY | O_DIRECTORY | O_NOFOLLOW`, call directory `sync()`, and close. Before rename failure, remove only the exact current temp file. After rename, never delete or attempt rollback. Do not scan or adopt stale temp files from a hard kill; they are non-authoritative and ignored.

Update the repository's in-memory committed snapshot only after directory sync succeeds. If rename may have occurred but durability is unconfirmed, throw `state_durability_unconfirmed`, poison further mutation, and require `reload()` to read and validate the final path. Preserve primary/cleanup causes with `AggregateError` and keep diagnostics free of state content, archive paths, keys, or arbitrary filesystem prose.

## Single-Flight Admission, Manual Signal, and Daily Coordinator

Create `backupd/src/run-admission.ts`. It owns only the sole in-process active token and runs the operation supplied with the winning request. Trigger kinds are `scheduled`, `startup-catch-up`, `scheduled-retry`, `manual`, and `pending-publication`. Its production surface is:

    export interface RunAdmission {
      request<T>(
        trigger: RunTrigger,
        admittedOperation: () => Promise<T>,
      ):
        | { readonly status: "started"; readonly completion: Promise<T> }
        | { readonly status: "skipped"; readonly reason: "active" | "not-ready" };
      stop(): void;
    }

The controller publishes its active record before invoking any async code. Its completion promise preserves operation rejection and clears only its own generation in `finally`. It stores no pending request and never invokes an operation after a skip. A shutdown flag rejects new requests as `not-ready`; `stop` does not pretend to cancel active lifecycle work, because B08 owns the run AbortController. Policy outcomes such as pending publication, cooldown, or an ineligible slot are returned by the admitted operation, not checked before the active token exists.

Export `createManualRunRequestHandler(requestManual, onError)`. The returned zero-argument function is suitable for `process.on("SIGUSR2", handler)` but B07 does not register it. It calls the coordinator's `requestManual()` once, returns immediately, and attaches one rejection observer to a started completion. `requestManual()` enters the same `RunAdmission` instance used by timers and pending-publication recovery; repeated signals while active return skipped, do not set a boolean, and do not run after completion. B08 registers the handler only after state/configuration are ready and removes it before shutdown; B07 owns no `SIGTERM`/`SIGINT` behavior.

Create `backupd/src/daily-scheduler.ts`. It composes schedule math, the state repository, one admission controller, and one B08-supplied lifecycle callback without knowing capture, staging, archive, or storage implementation. It exposes `start()`, `stop()`, `requestManual()`, and `requestPendingPublication(runId)`; all three request sources enter that one admission instance. It owns one daily/retry timer and accepts injected clock/timer functions. `start()` loads state before arming anything. If pending publication exists, it durably consumes the newest due daily slot so that resolving the pending run cannot release a queued catch-up; B08 requests the pending-publication trigger through `requestPendingPublication`, whose admitted operation uses `claimPendingPublicationAttempt` and therefore cannot run before its persisted not-before time or after its original deadline. Without pending state, `start()` requests exactly one current eligible retry or newest overdue catch-up. It then arms the earlier of the next daily target or automatic retry not-before.

For an automatic request, call `RunAdmission.request` first. Its admitted operation calls `claimAutomaticAttempt`; only a returned claim may be passed to the B08 lifecycle callback. This establishes the material order `active token -> durable attempt claim/cooldown -> lifecycle callback`. If admission reports active, durably consume the due slot/retry as skipped at that linearization point; completion of the older flight cannot release it later. If the admitted state check reports pending publication or cooldown, no lifecycle callback runs. State-write failure prevents lifecycle invocation and stops automatic scheduling with a surfaced error; it never falls back to an in-memory-only claim.

The lifecycle callback returns one of `completed`, `publication-pending`, `retryable-failure`, or `terminal-failure`. `completed` and `publication-pending` clear the automatic retry; the latter requires that B08 already committed the matching pending publication before returning. `retryable-failure` retains the already persisted not-before only while attempts remain; callback rejection is conservatively this bounded class. `terminal-failure` exhausts the slot. Manual results never create or modify automatic retry state. A pending-publication request must durably claim its attempt before B08 is invoked; a failed attempt retains the persisted not-before and original deadline, while an exact B06 success is recorded through `recordPublishedSnapshot`. B07 does not run its own immediate retry loop: B08 may request pending recovery again at or after the exposed eligibility time, and B08 owns the timer/lifecycle composition needed to do so.

`stop()` clears the one timer and stops new scheduler requests. The timer remains referenced during normal operation so it can keep the daemon alive; do not call `unref()`. B08 later coordinates stop order and active-run cancellation. Timer delays remain under one day, below Node's maximum timer interval. No fixed polling loop or local-time calculation is needed.

## Milestone 1: Establish pure UTC and admission policy

Create `backupd/src/schedule-policy.ts`, `backupd/src/run-admission.ts`, `backupd/test/schedule-policy.test.ts`, and `backupd/test/run-admission.test.ts`. Unit tests start no process and use controlled clocks/promises.

Cover exact default/override parsing and invalid settings; 02:59:59.999 versus 03:00:00.000; midnight, month, year, leap-day, and representative daylight-saving dates; newest-only catch-up across multiple missed days; next-slot strictness; clock movement; synchronous first-request ownership; overlapping scheduled/manual/signal requests; first completion clearing without releasing a queued request; operation rejection; shutdown/not-ready; and manual requests bypassing cooldown but not active/pending exclusion. Milestone acceptance is green strict checks and deterministic proof that at most one admitted operation exists.

## Milestone 2: Persist strict state without partial success

Create `backupd/src/durable-state.ts`, `backupd/src/state-repository.ts`, `backupd/test/durable-state.test.ts`, and `backupd/test/state-repository.integration.test.ts`. Unit tests own schema/semantic rejection. Filesystem integration uses one `mkdtemp("/tmp/b07-state-")` root per test and real open/write/sync/rename/directory-sync behavior.

Cover missing-file initial state; canonical round trip; every top-level variant; bigint conversion; exact pending B06 reconstruction with unchanged deadline/keys/manifest; setting pending atomically clearing an older automatic retry without shifting the daily slot; malformed/unknown/oversized/duplicate/noncanonical JSON; invalid timestamps/UUIDs/paths/hash/fingerprint/attempts; symlinked/wrong-mode/wrong-owner simulations at feasible boundaries; file and directory modes; old final file surviving a pre-rename failure; exact temp cleanup; post-rename durability uncertainty requiring reload; serialized concurrent transitions without a lost schedule/pending/freshness field; idempotent same-run publication; newer freshness not regressing; archive-only/unconfirmed results unable to call success; and clear-without-success preserving freshness.

Use a narrow test-only hook immediately before rename and immediately before directory sync to induce the two crash-ordering classes without replacing Node filesystem behavior. Milestone acceptance is that no reader observes partial JSON, a failed pre-rename write preserves the old state, a post-rename uncertainty cannot be overwritten until reload, and only a matching B06 publication result advances capture freshness.

## Milestone 3: Coordinate one daily timer without lifecycle wiring

Create `backupd/src/daily-scheduler.ts` and `backupd/test/daily-scheduler.test.ts`. Use a controlled timer harness and the real in-memory state-repository interface; do not sleep or start a process.

Cover first startup before/after 03:00; one newest catch-up from stale/missing state; no missed-date replay; restart during persisted cooldown; one retry after 15 minutes; retry exhaustion; newer day superseding an old retry; active-token-before-claim and claim-before-lifecycle ordering; manual success not shifting daily time; scheduled event during manual/pending/automatic active work consumed as skipped; pending publication suppressing catch-up; pending attempt eligibility using its original not-before/deadline; no immediate re-arm after failure; state-write failure preventing the lifecycle callback; start/stop idempotence; and no request after stop. Milestone acceptance is a trace of requested trigger kinds/times showing no duplicate, overlap, or queued execution.

## Plan of Work

After this plan is approved and before production edits, add this indented line directly beneath the B07 checkbox label in `TODO.md`:

    - Plan: [ExecPlan](.agents/plans/b07-implement-scheduling-and-durable-state.md)

Leave B07 as `- [ ]`. Do not alter its label, scope, acceptance, order, B01–B06, or later tasks. Only the workflow coordinator may check B07 after the reviewer returns both `APPROVED` and `REVIEW_READY`.

Implement Milestones 1–3 in order. Keep all existing 74 `backupd` tests green after each milestone. Update Progress, discoveries, decisions, outcomes, evidence, and bottom revision notes at every stopping point. Use explicit `.ts` local imports, type-only imports, erasable syntax, guarded control flow, AbortSignal/cancellation ownership only where B07 actually owns it, preserved causes, and secret-free diagnostics.

Expected production changes are limited to `backupd/src/schedule-policy.ts`, `backupd/src/durable-state.ts`, `backupd/src/state-repository.ts`, `backupd/src/run-admission.ts`, and `backupd/src/daily-scheduler.ts`. Add their focused tests and no dependency. Do not wire `backupd/src/main.ts`, change B03–B06 contracts unless an implementation-proven type-only compatibility adjustment is unavoidable, or change `strapid`.

Do not edit `BACKUP.md`, package dependencies/lockfile, backend/frontend source, content types, schemas, bootstrap, generated CMS artifacts, Dockerfiles, Compose, workflows, release files, README, `.env` files, machine/user environment variables, host configuration, or the unrelated Imagen directory.

## Test Strategy and Ownership

`schedule-policy.test.ts` owns pure configuration and UTC slot math. `run-admission.test.ts` owns synchronous single flight and manual-handler semantics. `durable-state.test.ts` owns exact schema and semantic interpretation. `state-repository.integration.test.ts` owns real path/permission/open/sync/rename/reload behavior. `daily-scheduler.test.ts` owns startup, timer, slot, cooldown, skip, and stop ordering.

Existing B04 tests remain the capture/deadline authority; B05 tests remain staging/archive ownership; B06 tests remain remote confirmation, manifest-last publication, and SDK retry/abort behavior. B07 tests do not duplicate those assertions, call object storage, parse tar, spawn Strapi/fixture children, bind a port, or start a new container. Unit tests start no process. Filesystem integration uses only task-owned temporary directories and cleans exact paths in `finally`.

The full `backupd:test` command still executes B06's existing isolated rootless LocalStack integration. It requires no prestarted stack, publishes only an ephemeral `127.0.0.1` port, and owns its cleanup. B07 adds no Docker dependency or public service.

## Concrete Steps

Work from `/home/codex/src/us-alb` and reconfirm the protected baseline:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch
    mise exec -- node --version

Expect `backup-system`, both revisions at `bebf6d0b56b4300ed95b35877aae017f609871d0`, only `?? .agents/skills/imagen/scripts/`, and Node `v24.20.0`. Stop on a moved baseline or overlapping edit; do not inspect the unrelated directory.

B07 adds no dependency. Confirm the existing lock remains reproducible, then format only the changed package:

    mise exec -- npm ci --prefix backupd
    mise run backupd:format

Run all applicable canonical validation:

    mise run backupd:check
    mise run backupd:test

Expect Biome and strict no-emit TypeScript to pass, all existing 74 tests plus focused B07 tests to report zero failures/skips, and the existing B06 task-owned integration to clean its container. Record the actual count rather than shaping tests to a target. No backend/frontend/Strapi/Compose/image change exists, so their checks, generators, startup, builds, smoke tests, and deployment tests are inapplicable.

Inspect dependencies and forbidden artifacts:

    mise exec -- npm ls --prefix backupd --depth=0
    git diff --exit-code -- backupd/package.json backupd/package-lock.json
    find backupd \
      \( -path 'backupd/node_modules' -o -path 'backupd/dist' -o -path 'backupd/build' \) -prune -o \
      -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.map' -o -name '*.tsbuildinfo' \) -print
    test ! -d backupd/dist
    test ! -d backupd/build

Expect only the already pinned AWS SDK packages and `tar@7.5.22`, no package diff, no emitted runtime artifact, and no build directory.

Check exact test residue without reading unrelated content:

    find /tmp -maxdepth 1 -type d -name 'b07-*' -print
    find /tmp -maxdepth 1 -type d -name 'b06-*' -print
    docker ps --all \
      --filter 'label=us-alb.test-owner=b06' \
      --format '{{.ID}} {{.Names}}'

All commands must print nothing. If a B07 test leaves a directory, remove only its exact recorded path after confirming ownership. Existing B06 cleanup guidance applies only to its labeled test container; never prune Docker or inspect/remove another container.

Finish with protected-input and scope inspection:

    git diff --check
    git diff -- BACKUP.md
    git status --short --branch
    git diff -- TODO.md backupd/src backupd/test \
      .agents/plans/b07-implement-scheduling-and-durable-state.md

`git diff -- BACKUP.md` must be empty. Status may contain only B07 files plus the separately preserved untracked Imagen directory. `backupd/package.json` and lockfile must be unchanged. Generated backend/frontend artifacts are inapplicable. Do not start `backupd/src/main.ts` as a daemon because B08 has not wired lifecycle behavior.

After reviewer approval, the coordinator stages only the five B07 source modules, focused B07 tests, this plan, and B07 tracker bookkeeping; verifies the unrelated directory and later tasks are excluded; commits with exact title `B07 — Implement scheduling and durable state`; and pushes to `origin/backup-system` before B08 begins.

## Validation and Acceptance

B07 is accepted when pure tests show the default target is exactly 03:00 UTC on ordinary, DST-transition, month/year, and leap-day dates; the instant just before is not due and the exact instant is; multi-day downtime selects only the newest due ID; and next daily scheduling never depends on local timezone.

B07 is accepted when startup with missing/stale state requests exactly one catch-up, persists its slot/attempt/cooldown before callback, and cannot immediately repeat after failure or restart. A scheduled slot has at most two default attempts separated by 15 minutes; a newer day supersedes old retry debt. These values remain explicit configurable initial policy, not measured guarantees.

B07 is accepted when controlled overlap proves the first scheduled/manual/pending request owns the single flight synchronously, every request while active is skipped, repeated `SIGUSR2` calls do not queue work, and completion starts nothing implicitly. A daily event occurring during active work is durably consumed, so it does not run immediately afterward. Manual requests neither move the daily target nor create automatic retries.

B07 is accepted when a strict state round trip preserves schedule, latest confirmed freshness, and every field needed to reconstruct an authorized B06 request with the exact original keys, manifest, accepted-at, and deadline. Current configuration cannot reset the window or change persisted attribution. Invalid state blocks all work and never establishes success.

B07 is accepted when filesystem integration proves `/state/backupd` semantics with injected temporary roots: owner-only directory/file modes, no-follow regular-file checks, bounded reads, file sync before rename, same-directory atomic replacement, directory sync before success, exact temp cleanup before rename, reload after post-rename uncertainty, and serialized transitions with no lost update or partial JSON.

B07 is accepted when only a matching B06 `PublishedSnapshot` atomically clears pending publication and advances `lastCompletedSnapshot.capturedAt`; archive-confirmed, absent, malformed, fabricated/mismatched, failed, cancelled, expired, or remote-unknown outcomes cannot. A newer existing capture timestamp never regresses. Clearing failed/expired pending state never changes freshness.

B07 is accepted when pending-publication attempt claims persist a not-before time before B08 work, restart respects it, the original deadline is never recomputed from current configuration, and expiry exposes a typed state to B08 rather than retrying or claiming success. B07 does not contact B06 storage, clean staging, or perform capture/publication itself.

Canonical acceptance is green `mise run backupd:check` and `mise run backupd:test`, unchanged dependencies/lockfile, no emitted artifact, no B06/B07 residue, scoped diff, and byte-identical `BACKUP.md`. B07 remains unchecked until independent reviewer approval.

## Idempotence and Recovery

Formatting, checks, and tests are repeatable. Test clocks/timers are deterministic; filesystem tests use unique directories and exact `finally` cleanup. `npm ci` recreates only ignored dependencies from the unchanged lockfile.

State transitions are keyed by slot, attempt, or run ID and validate their expected current record, so a caller may safely retry after reloading. The repository never applies a transition from stale caller state. Identical already-committed completion is idempotent; a different run or key is rejected.

If temp creation/write/sync/close fails before rename, retain the previous final file and remove only the exact temp when possible. If rename or directory sync is uncertain, do not assume old or new state; poison mutations, reload the final path, and resume from its strictly validated contents. Never delete malformed final state or sweep arbitrary files in `/state`.

If a scheduled callback fails, the cooldown already exists on disk. If the process crashes during the initial attempt, restart cannot retry before not-before. If it crashes during the final allowed attempt, attempts were already incremented and no further automatic retry exists. A future daily slot may still run. Manual operator requests remain explicit and no queued signal survives a crash.

If pending publication exists, B07 restores only through B06's constructor. Missing or changed local staging will later fail B06/B08 and cannot advance freshness. A remote manifest confirmed before a local state-write failure remains authoritative: restart retains pending state, B08 calls B06 reconciliation, and the same `PublishedSnapshot` transition completes idempotently without resetting the deadline.

Any plan revision must update all affected sections and append a revision note. The work can be resumed from this file alone.

## Artifacts and Notes

Planning established this baseline:

    branch/upstream:          backup-system at bebf6d0b56b4300ed95b35877aae017f609871d0
    Node runtime:             v24.20.0
    existing backupd tests:   74 passing
    production state root:    /state/backupd/state.json
    daily default:            03:00 UTC
    retry defaults:           15 minutes; 2 automatic attempts per daily slot
    publication authority:    B06 PublishedSnapshot only
    protected BACKUP.md:      SHA-256 6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533

The exact-runtime disposable durability probe produced:

    temp file mode:          0600
    file sync:               success
    same-directory rename:   success
    O_DIRECTORY open/sync:   success
    final canonical body:    {"version":1}\n

The probe changed no repository file and its exact `/tmp/b07-fsync-probe-*` directory was removed. Context7 was not used because B07 introduces no external library/API and the material Node behavior was verified directly under the pinned runtime.

Worker handoff evidence:

    configuration/math:       03:00 UTC; 900-second retry; two attempts; strict configured bounds
    focused B07 tests:        33 passed; zero failed/skipped
    canonical backupd suite:  107 passed; zero failed/skipped; 6.87 seconds cycle-2 pass
    clean install:             49 packages audited; zero vulnerabilities
    dependencies:              unchanged; AWS SDK 3.1159.0, tar 7.5.22, existing toolchain only
    filesystem evidence:       directory 0700; state 0600; bounded read; file sync/rename/directory sync
    failure injection:         pre-rename old state retained/temp removed; post-rename poisoned until reload
    reconstruction:            exact original deadline, keys, manifest, attribution, bigint fingerprint
    freshness:                 exact correlated PublishedSnapshot only; older completion cannot regress
    artifacts/residue:         no emitted build files, B06/B07 temp directories, or labeled containers
    protected BACKUP.md:       SHA-256 6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533
    branch/baseline:           backup-system at bebf6d0b56b4300ed95b35877aae017f609871d0
    scope:                     only B07 plan/tracker, five source modules, five focused test files; Imagen preserved

## Interfaces and Dependencies

B07 adds no dependency. Use `node:fs`/`node:fs/promises`, `node:path`, `node:crypto.randomUUID` for private temp names, Node timers, and plain callbacks. It imports B05/B06 values with explicit local `.ts` and `import type` where erased. No scheduler, database, file-lock, cron, signal, validation, or atomic-write package is authorized.

`schedule-policy.ts` owns `SchedulePolicy`, `ScheduledSlot`, parsing, UTC slot calculation, comparison, and retry-time calculation. `durable-state.ts` owns the only JSON shape, canonical encode/decode, persisted-to-runtime B05 conversion, and semantic validation. `state-repository.ts` owns path/permissions, serialized mutations, exact temp ownership, file/directory sync, rename, poison/reload behavior, and B06 request reconstruction.

`run-admission.ts` owns one active in-process generation, trigger/result types, and the manual request handler; it does not know timers or lifecycle phases. `daily-scheduler.ts` owns startup catch-up choice, one daily/retry timer, durable automatic claim/skip/finish ordering, and stop/re-arm behavior; it does not know capture, staging, archive, S3, or telemetry.

B08 later parses all configuration, loads state, creates B05/B06 services, supplies the run callback, requests pending-publication resume, registers/removes `SIGUSR2`, wires `SIGTERM`/`SIGINT`, persists pending before first remote mutation, applies B06 results, cleans staging, handles expiry/unknown remote status, and starts/stops the scheduler in `backupd/src/main.ts`. B08 may add the narrowly authorized B05 durable-state reopen path and B06 read-only post-expiry reconciliation needed for complete crash recovery; B07 does not adopt staging or weaken either owner.

B09 later emits safe scheduling/admission/state/retry/freshness signals. Run IDs and keys may be bounded log/trace fields but are not metric dimensions; state JSON, paths, manifests, and errors are never dumped. B10 mounts and grants `/state` only to `backupd`, passes the three B07 settings, proves nonroot ownership/modes, and keeps storage credentials service-specific. B12 runs the existing package checks/tests in CI; B13 records final defaults and operational state/recovery details.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B07 plan after complete authoritative-input and pushed B06 interface review plus an exact Node v24.20.0 Linux file/directory-sync probe. The plan resolves 03:00 UTC math, newest-only catch-up, persisted bounded retry, synchronous no-queue admission, manual signal semantics, strict lossless state, B06-only freshness authorization, same-filesystem crash durability, focused validation, and B08/B09/B10 boundaries without changing production code, tests, `TODO.md`, or `BACKUP.md`.

Revision note (2026-10-29 / Codex planner): Self-review made the concurrency linearization and callback ordering explicit. One shared admission token is now acquired before state policy work; the winning automatic or pending request commits its claim/cooldown before B08 runs; an active-time scheduled request is durably consumed and never released after completion; and the manual handler delegates to the same coordinator while B08 retains signal registration, cancellation, retry-timer composition for pending publication, and complete lifecycle wiring. The same review made pending-publication creation clear an older automatic retry atomically, preventing a successful manual capture during cooldown from releasing an unnecessary second capture while preserving the next daily target.

Revision note (2026-10-29 / Codex worker): Started the approved B07 implementation from the protected pushed B06 baseline, confirmed the only unrelated worktree item remains the untracked Imagen directory, re-read the authoritative plan and worker/validation rules, and added the B07 plan link while leaving its checkbox unchecked.

Revision note (2026-10-29 / Codex worker): Completed all three implementation milestones and 28 focused tests. Implementation review added bounded opened-file reads, exact B05 staging-path and capture-deadline reconstruction checks, and stale automatic-completion handling after a newer slot is consumed; these tighten the approved trust and no-queue invariants without changing B03–B06 interfaces or taking B08 lifecycle ownership.

Revision note (2026-10-29 / Codex worker): Recorded final worker validation: reproducible clean install, green format/strict checks, 102 passing canonical tests including isolated B06 LocalStack, unchanged dependencies and protected inputs, no emitted artifacts or process/container/temp residue, and a scoped unstaged worktree. B07 remains unchecked pending independent review; B08 composition remains deliberately unimplemented.

Revision note (2026-10-29 / Codex worker, remediation cycle 1): Resolved all three bounded review findings without a design change: B07 now strictly admits all known required/optional B06 evidence fields and rejects unknown/type-confused fields; scheduler decisions re-read time after asynchronous state access and immediately process durable-state lag; and arm generations prevent stop/newer-arm races from installing or firing stale timers. Four new deterministic regressions bring B07 to 32 focused tests, and the 106-test canonical suite plus clean-install/residue/protected/scope audits pass for rereview.

Revision note (2026-10-29 / Codex worker, remediation cycle 2): Closed the remaining no-queue race by reconciling the newest due slot after every started lifecycle and before admission release, while preserving the existing due timer for long active flights. The deterministic fast catch-up crossing records the newer slot as skipped, runs exactly one lifecycle, and cannot release a queued run; all 14 scheduler tests, 107 canonical tests, and cycle-2 cleanup/protected/scope audits pass for rereview.

Revision note (2026-10-29 / Codex coordinator): Recorded independent approval after two remediation cycles. The reviewer reproduced the B06 evidence transition, post-read UTC boundary handling, stop/arm generation behavior, and final fast-flight no-queue trace; all 33 focused tests, 20 extra scheduler repetitions, strict checks, and the 107-test canonical suite passed. B07 is checked complete, with B08 lifecycle/signal composition and B10 state-volume integration remaining intentionally deferred.

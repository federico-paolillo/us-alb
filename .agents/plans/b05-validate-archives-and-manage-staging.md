# Validate archives and manage staging

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B05 — Validate archives and manage staging` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B05, `backupd` can reserve one collision-resistant run directory on disk-backed staging, refuse capture when unprivileged free space is below 100 GiB, and watch the exact Strapi output while B04 owns the exporter. If the archive grows beyond 75 GiB, `backupd` permanently invalidates that local artifact and requests cancellation through B04; it never signals a Strapi process or removes a file that B03 may still be writing.

Once B04 provides an exact matching `captured` terminal and therefore safe exporter release, `backupd` opens the `.tar` without following a final symlink, streams the whole file once through the `tar` parser and SHA-256, reads only a bounded root `metadata.json`, and returns a typed validated-artifact result. Invalid or truncated tar, unreadable or changing files, missing or malformed Strapi metadata, identity/version mismatch, and size violations fail without extracting or rewriting anything. Focused native tests demonstrate capacity, cancellation, ownership, cleanup, metadata, integrity, and hashing using task-owned temporary files; no test runs Strapi, another process, Docker, Compose, or a prestarted stack.

## Progress

- [x] (2026-10-29 14:15Z) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, pushed B01–B04 plans and code, and the exact B05 queue item.
- [x] (2026-10-29 14:15Z) Confirmed branch `backup-system`, `HEAD`, and `origin/backup-system` are at pushed B04 commit `f94a86ffc803fee303adcf701acc513c2b76ed9b`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present.
- [x] (2026-10-29 14:15Z) Resolved current Node.js 24 filesystem/stream APIs through Context7; attempted all three allowed Context7 library resolutions for the official `isaacs/node-tar` package, then inspected npm registry metadata, exact installed `tar` 7.5.22 source/types, and Strapi 5.52.0 data-transfer source when Context7 returned only unrelated tar libraries.
- [x] (2026-10-29 14:15Z) Probed `tar` 7.5.22 under Node v24.20.0 with a disposable archive: strict streaming read recovered the expected Strapi-shaped metadata, produced a 64-character SHA-256, and rejected a truncated entry with `TAR_BAD_ARCHIVE`; the exact temporary directory was removed.
- [x] (2026-10-29 14:41Z) Created and self-reviewed this B05 ExecPlan against `BACKUP.md`, current B04 terminal semantics, accepted/export transport ordering, Strapi extension/metadata behavior, dependency conventions, and later-task ownership; tightened watch/terminal ordering and exact configuration bounds.
- [x] (2026-10-29) Re-read all authoritative worker inputs and pushed B04 interfaces at the exact baseline, added the B05 plan link beneath the still-unchecked task, and confirmed `/staging/runs` was absent before implementation.
- [x] (2026-10-29) Pinned `tar` 7.5.22 through project npm/Mise, implemented exact configuration/bigint policy, one-run allocation, immediate size observation, B04 cancellation/disconnect fallback, terminal writer classification, object-owned cleanup gates, and focused policy/filesystem tests.
- [x] (2026-10-29) Implemented no-follow, one-handle streaming tar validation and SHA-256, bounded required metadata parsing, opening/closing file identity checks, stable failure codes, and task-owned generated fixtures. The focused B05 suite passes 36 tests; canonical full-suite validation remains pending.
- [x] (2026-10-29) Ran reproducible install/lock validation, canonical `backupd` format/check/test, focused ownership/archive probes, dependency/artifact/residue/protected/scope/diff checks, and recorded the final worker evidence. All 52 tests pass with zero failures/skips; B05 remains unchecked and nothing is staged, committed, or pushed.
- [x] (2026-10-29) Remediation cycle 1: validate an exact terminal before stopping the size watcher and latch every begun archive-validation failure into cleanup-only state. Both deterministic adversarial regressions and all canonical/hygiene validation pass; the full suite now has 54 passing tests with zero failures/skips.
- [x] (2026-10-29) Obtained independent reviewer approval after remediation cycle 1; the workflow coordinator checked B05 and finalized review bookkeeping.

## Surprises & Discoveries

- Observation: The current B04 wire result already distinguishes the only terminal state in which an exporter may still own the archive.
  Evidence: `strapid/src/capture-coordinator.ts` maps B03 `runExport(...).status === "recovery-failed"` to `recovery-failed/export_ownership_unconfirmed` and does not start serving. `captured`, `invalid`, and the other recovery-failure reasons occur only after export was never started or B03 safely resolved export ownership. `supervisor-shutdown` is committed before B03 shutdown completes and is therefore not writer-release evidence.

- Observation: The capture request names a base, not the final archive.
  Evidence: Strapi 5.52.0's installed file destination provider computes `${file.path}.tar`, then appends `.gz` and `.enc` only when those features are enabled. B04 passes `--no-compress --no-encrypt`, so an allocation base `/staging/runs/<runId>/strapi-export` has exactly one expected output `/staging/runs/<runId>/strapi-export.tar`.

- Observation: The minimum metadata needed to establish that the artifact is a Strapi export is small and stable, but Strapi's TypeScript interface marks it optional.
  Evidence: The installed local-source provider always returns `{ createdAt, strapi: { version } }`, and the file destination writes that object as root `metadata.json`. Its general `IMetadata` type makes both fields optional for other providers. B05 must require and validate these two observed local-export fields without treating the remainder of the archive as a schema to reproduce.

- Observation: `tar` parse warnings are permissive unless strict mode is selected.
  Evidence: Exact installed `tar` 7.5.22 documentation says invalid entries are warnings and `TAR_BAD_ARCHIVE` is informative for parse operations by default. `strict: true` promotes recoverable warnings to errors. The exact-runtime probe confirmed a truncated entry rejects with `TAR_BAD_ARCHIVE` only under the selected strict parser boundary.

- Observation: Node exposes unprivileged filesystem capacity directly and can avoid number precision loss.
  Evidence: Current Node 24 documentation retrieved through Context7 defines `fs.promises.statfs(path, { bigint: true })`; `bavail * bsize` is the byte count available to the unprivileged service user. The 100-GiB and 75-GiB policies therefore stay `bigint` until the validated archive result is converted to a safe JSON-compatible byte count.

- Observation: Application code cannot prove that `/staging` is backed by a disk rather than tmpfs.
  Evidence: B02 fixes the shared path and B10 owns the named-volume mount. B05 can confine every archive to `/staging`, check its filesystem capacity, and keep large data out of `/tmp`; native mount wiring and image/Compose validation remain the boundary that proves disk-backed deployment.

- Observation: Portable tar writers encode a directory named `metadata.json` with a trailing slash in the entry path.
  Evidence: The generated directory fixture reaches the parser as `metadata.json/`. Validation treats that exact root-directory spelling as an attempted metadata entry and rejects it with `metadata_not_file`; it does not normalize or accept the directory as the required file.

- Observation: Awaiting watcher shutdown before checking terminal identity creates a permanent monitoring blind spot after a stale result.
  Evidence: A mismatched terminal stopped the only size watcher, then left the allocation in `capturing`; later archive growth produced no cancellation. Terminal version/type/outcome shape, exact identity, and archive base are now checked synchronously before watcher shutdown is admitted, so a rejected terminal changes neither watcher nor allocation state.

- Observation: Writer release and artifact eligibility are independent monotonic facts.
  Evidence: Returning `archive_changed` to `writer-released` allowed the same mutated file to enter validation again. Once any archive validation begins and fails, B05 now retains the exact lease in `cleanup-only`, rethrows the latched failure on every later validation request without opening or hashing again, and permits only exact cleanup.

## Decision Log

- Decision: Implement B05 entirely in `backupd`; make no B04 protocol, `strapid`, backend, frontend, image, or Compose change.
  Rationale: B04 already exposes exact capture identity, terminal outcomes, and cancellation. `backupd` owns staging, archive validation, and SHA-256. B10 later proves the shared disk volume and settings wiring, while B08 composes the full run. Keeping B05 on the consumer side preserves the established child and socket ownership boundaries.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add exact runtime dependency `tar: "7.5.22"` to `backupd/package.json` and regenerate only `backupd/package-lock.json` through root Mise-selected npm.
  Rationale: `npm view tar` reports 7.5.22 as current, it supports Node 18 and later, includes ESM exports and TypeScript declarations, and Strapi 5.52.0's installed data-transfer package independently pins the same version. `backupd` must still declare its own dependency rather than reach into backend or Strapi `node_modules`. Exact pinning matches this repository's dependency convention and makes parser semantics reproducible.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep production staging fixed at `/staging`, and allocate `/staging/runs/<canonical-run-uuid>/` with archive base `strapi-export` and final file `strapi-export.tar`.
  Rationale: B02 and B04 already make `/staging` the cross-service path. A canonical UUID is a safe single path segment and later comes from B07's run owner. The final name mirrors Strapi's installed extension behavior; B05 never passes a name already ending in `.tar`, `.gz`, or `.enc` and never searches for a plausible alternative.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Configure minimum free bytes and maximum archive bytes at one `backupd` boundary with defaults of exactly 100 GiB and 75 GiB.
  Rationale: Read decimal integer byte settings `BACKUPD_STAGING_MIN_FREE_BYTES` and `BACKUPD_ARCHIVE_MAX_BYTES`, defaulting to `107374182400` and `80530636800`. Validate `minimumFreeBytes > maximumArchiveBytes > 0` and both at most `Number.MAX_SAFE_INTEGER` bytes before allocation. Tests inject smaller `bigint` policies. These are initial uncalibrated defaults, not measured guarantees.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Admit at most one in-process or on-disk run, and never discover, adopt, or automatically delete a pre-existing run directory.
  Rationale: Allocation first verifies the manager has no live lease and `/staging/runs` contains no entry, then creates one exact UUID directory exclusively. Any existing file, directory, or symlink makes staging occupied. B07 later supplies durable state and B08 may add an explicit reopen path for a known pending publication; B05 must not infer ownership from an archive that happens to exist after restart.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Let only B04 cancel capture and only B03 terminate the writer.
  Rationale: After B04 emits `accepted`, a B05 watcher polls `lstat` on the expected `.tar`. On a non-regular output or size strictly greater than the configured maximum, it atomically latches a permanent local violation and calls `CaptureClient.cancel` once with the exact instance/window. If that request fails, it invokes the B08-supplied disconnect callback for the held capture request so B04's existing response-close invalidation is the fallback. B05 never signals a PID, touches the B02 workspace, or deletes staging during this interval.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Treat local size/output violation as permanently dominant, even if a racing B04 terminal says `captured`.
  Rationale: B04 can finish between a filesystem observation and the cancellation request. The local guard records the violation before any await. Later successful CLI exit or recovery cannot make an over-limit or non-regular artifact eligible for validation or upload.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Derive staging-writer release from the current B04 terminal taxonomy and exact envelope.
  Rationale: An exact matching `captured` or `invalid` terminal releases the writer. `recovery-failed/export_ownership_unconfirmed` and `supervisor-shutdown` do not. Other `recovery-failed` reasons concern a serving child after export was safely closed, or a stop path on which export never began, so the staging writer is released even though the run remains failed. Unknown, replaced, malformed, mismatched, or reconciliation-required results provide no release evidence. Encode this as a pure exhaustively tested policy so a future B04 variant requires an intentional update.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Validate only an exact B04 `captured` result with matching allocation path and identity, after writer release and a clean local size guard.
  Rationale: Safe writer release permits cleanup of failed runs but does not authorize an archive. Only B04's captured outcome establishes zero export exit and healthy serving recovery. A file from an invalid, failed, unknown, stale, replaced, shutdown, locally over-limit, or mismatched window remains unusable regardless of tar integrity.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Open the final file once with `O_RDONLY | O_NOFOLLOW`, then parse and hash that same file descriptor in one backpressured stream.
  Rationale: Initial `FileHandle.stat({ bigint: true })` rejects non-regular, empty, and over-limit files. A pass-through `Transform` updates `createHash("sha256")` and forwards each chunk into `tar.Parser({ strict: true })`; `stream/promises.pipeline` propagates I/O, abort, parser, and transform errors. The parser resumes every non-metadata entry and buffers only root `metadata.json`, bounded to 64 KiB. Final streamed byte count and a second handle stat must match the opening identity before success. Nothing is extracted or rewritten.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Require exactly one regular root `metadata.json` with canonical `createdAt` and `strapi.version` equal to the B04 capture identity's Strapi version.
  Rationale: Missing, duplicate, non-file, oversized, invalid UTF-8, invalid JSON, non-object, missing-field, non-canonical timestamp, or version-mismatched metadata is not a recognizable matching Strapi export. Unknown metadata fields remain allowed for forward compatibility. The metadata timestamp is evidence from Strapi, not the authoritative capture timestamp and not proof of source completeness.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Return a file fingerprint with the validated result for B06, but do not upload, publish, or persist it in B05.
  Rationale: The result includes path, safe numeric byte length, lowercase full-file SHA-256, bounded metadata, capture terminal, and opening `dev`/`ino`/`size`/`mtimeNs` identity. B06 can re-open and compare that identity before streaming the unmodified file. B06 owns object storage and manifest schema; B07 owns durable state; B08 owns orchestration and restart reconciliation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use stable failure codes with preserved causes and secret-free messages.
  Rationale: Configuration, capacity, occupied staging, size cancellation, writer uncertainty, archive I/O, tar integrity, metadata, file mutation, and cleanup are materially different operator outcomes. Typed errors retain the underlying `cause` without copying tar contents, JSON values, environment data, or arbitrary library prose into their own messages. B09 later maps safe codes and fields to telemetry.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Do not parse SQLite, validate content schemas or stage presence, count source records/assets, or infer source completeness.
  Rationale: B05 establishes file integrity, recognizable Strapi metadata, full-file identity, and the exact B04 capture relationship. Strapi warnings may still mean a successful export skipped source records or assets. That limitation is authoritative in `BACKUP.md` and is not repairable with a parallel archive schema checker.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Reject a mismatched or malformed terminal before any await or watcher state change.
  Rationale: Only an exact terminal can prove writer release. Keeping the watcher active after a stale result preserves the accepted-time archive limit until later exact reconciliation; an exact admitted terminal then stops and awaits the watcher before release classification.
  Date/Author: 2026-10-29 / Codex worker, remediation cycle 1

- Decision: Treat every failure after archive validation starts as permanent for that allocation and retain the original failure as cleanup-only evidence.
  Rationale: The approved plan authorizes exact cleanup after validation failure but does not authorize revalidating an artifact that has already failed integrity, metadata, I/O, abort, or mutation checks. No retryable validation category is therefore introduced. Publication retry remains B06's later responsibility only after B05 has produced a retained validated artifact.
  Date/Author: 2026-10-29 / Codex worker, remediation cycle 1

## Outcomes & Retrospective

Worker implementation and remediation cycle 1 validation of the approved B05 scope are complete and independently approved. The result pins `tar` 7.5.22, enforces exact staging capacity and one-run ownership, coordinates size violations only through B04, keeps monitoring live across rejected terminal evidence, blocks unsafe cleanup, permanently latches failed artifacts as cleanup-only, and returns one-pass validated archive metadata, hash, and file identity without extraction or rewriting. The full `backupd` suite passes 54 tests: the existing 13 B04 tests plus 41 focused B05 tests.

Tests prove the default 100-GiB/75-GiB policy and exact bigint equality boundaries with small filesystem policies; two capacity checks around exclusive allocation; no orphan/symlink adoption; an already-present five-byte-at-limit output followed by a six-byte violation; one exact cancellation and one disconnect fallback on cancellation failure; writer-unconfirmed retention for export ownership uncertainty and supervisor shutdown; object-owned cleanup failure/retry; and no deletion above the exact run. The remediation race proves a mismatched terminal is rejected before watcher shutdown, later growth still latches one violation/cancellation, and a later exact terminal safely releases the writer for cleanup. Generated archives prove strict rejection of random, checksum-damaged, truncated, missing/duplicate/non-file/oversized/malformed metadata, version mismatch, extra output, missing/unreadable/nonregular/symlink/empty/oversized archives, abort, and mutation. The manager-level mutation probe proves `archive_changed` is latched, a second validation returns the same failure without a second parser/hash attempt, and exact cleanup remains available. Independent review repeated stronger watcher and mutation probes, including induced cleanup failure/retry, before approval. The valid 256-KiB payload fixture returns the independently checked full-file SHA-256, byte length, bounded metadata, exact captured terminal, and stable file fingerprint while leaving the archive unchanged. B06 publication, B07 state/scheduling, B08 orchestration/restart reconciliation, B09 telemetry, and B10 volume wiring remain intentionally unimplemented. B05 is checked only after that approval.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; both `HEAD` and `origin/backup-system` are `f94a86ffc803fee303adcf701acc513c2b76ed9b`, the pushed B04 commit. Do not switch branches. The unrelated untracked `.agents/skills/imagen/scripts/` directory must remain unread, unformatted, unstaged, and unchanged.

`backupd/` is a private ESM TypeScript package executed directly by Node v24.20.0. Local imports spell `.ts`, imports used only as types use `import type`, and syntax remains erasable under strict no-emit TypeScript. It currently has no runtime dependency and `backupd/src/main.ts` is intentionally empty. B05 adds a library capability but does not start scheduling or a backup loop; B08 later composes it into the daemon entrypoint.

`backupd/src/capture-client.ts` is the B04 client boundary. `CaptureClient.startCapture` holds the response through recovery, accepts an `onAccepted` callback and AbortSignal, and returns an exact terminal or `reconciliation-required`. `CaptureClient.cancel` sends an idempotent DELETE for the exact supervisor/window. The client independently validates identities, archive bases below `/staging`, terminal outcomes, and stale/replaced responses. B05 consumes this interface and does not weaken or duplicate its wire decoder.

`strapid/src/capture-contract.ts` defines `CaptureIdentity` and `CaptureTerminalRecord`. A `captured` terminal carries the exact `archiveBasePath`, zero-exit `exportClosedAt`, and healthy `servingRecoveredAt`. `invalid` means capture was unusable but serving recovered. `recovery-failed/export_ownership_unconfirmed` means the exporter or its descendants may still own the B02 workspace and staging file. `supervisor-shutdown` is committed before shutdown completes. Those distinctions control B05 cleanup; the existence of a file alone never does.

`strapid/src/strapi-runtime.ts` fixes staging at `/staging`, and B04 calls it with base path plus `--no-encrypt --no-compress`. The installed Strapi 5.52.0 destination provider appends `.tar` and writes root `metadata.json` before finalizing the tar stream. The local-source provider supplies `createdAt` and `strapi.version`. The standard archive may also contain schemas, entities, links, assets, and configuration, but any of those data stages may legitimately be empty and B05 does not impose a second content model.

A staging allocation is an in-memory lease over one directory created by the current `backupd` process. A writer is the B03-owned Strapi export process group that can append archive bytes. Writer release means current B04 evidence proves that group never started or has safely closed; it does not mean the overall backup succeeded. An orphan is any run directory present without a current allocation lease. B05 blocks on orphans and never adopts or deletes them.

## Staging Policy, Allocation, and Ownership

Create `backupd/src/staging-policy.ts`. It owns constants for production root `/staging`, child directory `runs`, archive base name `strapi-export`, metadata path `metadata.json`, metadata limit 65,536 bytes, and default size-poll interval 250 milliseconds. It exports `StagingPolicy`, default construction, environment parsing for the two byte limits, pure available-byte calculation, and capture-writer classification. Use `bigint` for policy and filesystem arithmetic. Validate decimal integer strings without exponent, sign, whitespace, fractional form, or unsafe conversion.

The default policy is:

    stagingRoot:          /staging
    minimumFreeBytes:     107374182400n  // 100 * 1024^3
    maximumArchiveBytes:   80530636800n  //  75 * 1024^3
    metadataMaximumBytes:         65536
    sizePollIntervalMs:              250

Only `minimumFreeBytes` and `maximumArchiveBytes` are deployment settings in B05. Tests inject a complete policy with a temporary root and small bounds; production code never changes `process.env`. The configured minimum must be greater than the maximum so a newly admitted export begins with at least 25 GiB beyond the allowed archive size at defaults. This reserve does not protect against unrelated concurrent disk consumption and is not a measured capacity guarantee.

Create `backupd/src/staging-manager.ts`. Its production filesystem adapter uses `mkdir`, `readdir`, `lstat`, `realpath`, `statfs`, `rm`, and timers from Node. Tests inject only capacity results and timing/cancellation where deterministic control is necessary; real temporary filesystem behavior remains authoritative for allocation, file observation, and cleanup.

Initialization ensures the configured root is an existing real directory and production resolves exactly to `/staging`; tests may use their injected temporary root. Create only the fixed `runs` child when absent. Refuse a symlink root or runs directory. Read the runs directory before every allocation. Any entry means `staging_occupied`; do not inspect it for validity, rename it, clean it, or choose a second directory.

Allocation accepts a canonical UUID supplied by the later run owner. It rejects path separators or noncanonical forms, calls `statfs(root, { bigint: true })`, computes `bavail * bsize`, and requires `available >= minimumFreeBytes`. Then create `runs/<runId>` with mode `0700` and non-recursive exclusive `mkdir`; `EEXIST` is occupied/collision, not resume. Recheck capacity on the newly created directory. If that second check fails before any capture can start, remove only the still-empty directory and report capacity failure. Return these immutable paths:

    runDirectory     /staging/runs/<runId>
    archiveBasePath  /staging/runs/<runId>/strapi-export
    archivePath      /staging/runs/<runId>/strapi-export.tar

The manager keeps object-identity ownership of the returned allocation. A caller cannot construct a lookalike path object and gain cleanup rights. State transitions are:

    allocated -> capturing -> writer-released -> validating -> retained
    allocated -> cleaning -> cleaned
    capturing -> writer-released -> cleaning -> cleaned
    capturing -> writer-unconfirmed
    validating -> cleanup-only -> cleaning -> cleaned

`writer-unconfirmed` is deliberately terminal within B05: no validation, reuse, or cleanup is allowed. `cleanup-only` retains exact allocation ownership after a permanent local validation failure but never permits another validation or authorization attempt. `retained` is the one valid pending artifact reserved for B06. Cleanup is explicit and exact, never an automatic `finally` around the capture request. Cleanup first requires `allocated` with no capture started, proven `writer-released`, `cleanup-only`, or `retained`; it lstat-checks the exact generated directory, confirms it is still a directory beneath the fixed real runs parent, and calls `rm` only on that directory with bounded recursive retries. Failure preserves the lease and state so the same exact cleanup can be retried. It never removes `/staging/runs`, `/staging`, another run, a B02 workspace, or an arbitrary caller path.

## In-Flight Size Enforcement and B04 Integration

The staging manager exposes a size watcher for one allocation and exact `CaptureIdentity`. B08 will synchronously install it from B04's `onAccepted` callback. The B04 coordinator awaits writing the accepted record before it invokes the exporter, but socket scheduling does not prove that the client has decoded that record before the child starts. Therefore watcher installation must schedule its first observation immediately and correctly handle an archive that is already present or growing; final validation independently re-enforces the maximum. Starting the watch is the only `allocated -> capturing` transition, and a captured result cannot be validated if no watch ran. The watcher treats `ENOENT` as “export has not created the archive yet” and polls again. Every observation uses `lstat(path, { bigint: true })`. Once present, the exact path must be a regular file, never a symlink, directory, device, or alternate extension. File size equal to 75 GiB is allowed; size greater than the maximum is a violation.

The watch API accepts the production `CaptureClient` and a synchronous `disconnectHeldCapture(cause)` callback owned by B08's AbortController. On the first violation it records the local failure before awaiting anything, calls `captureClient.cancel(identity)` exactly once, and if DELETE fails calls `disconnectHeldCapture` exactly once. Both routes leave termination and recovery to B04/B03. The watcher continues to hold the allocation but does not need to keep polling after the first permanent violation. Stopping the watch waits for an in-flight lstat/cancel attempt and removes its timer/listeners; it does not clean files.

B08 supplies an exact B04 terminal to `recordCaptureTerminal` only after `startCapture` returns one directly or reconciliation later obtains one. Before any await, the method requires the version-one terminal/type/outcome shape plus exact equality of supervisor instance, capture window, release, source volume, Node version, Strapi version, and archive base. A mismatched or malformed terminal is rejected without stopping the watcher or changing `capturing`, so later growth still cancels and a later exact terminal remains recordable. Only after that synchronous admission does the method stop and await the watch, including any in-flight lstat/cancellation/fallback, and classify writer release. An exact `recovery-failed/export_ownership_unconfirmed` or `supervisor-shutdown` terminal moves to terminal B05 state `writer-unconfirmed`. The following current exact outcomes prove only writer release:

    captured                                           writer released
    invalid                                            writer released
    recovery-failed/serving_ownership_unconfirmed     writer released
    recovery-failed/serving_recovery_failed           writer released
    recovery-failed/recovery_expired                  writer released

The latter three still fail the backup and are cleanup-eligible from `writer-released`; they cannot be validated or retained. The explicit `cleanup-only` state is reserved for an archive whose local validation actually began and failed. This mapping must be exhaustive over the imported B04 union; no default “safe” branch is permitted.

`startCapture`'s `reconciliation-required` result and `reconcile` results of `active`, `unknown_window`, or `supervisor_replaced` are not terminals and are not passed to `recordCaptureTerminal`. B08 owns retry/deadline policy for those results. Until an exact terminal is available, the allocation stays `capturing`; validation and cleanup remain forbidden, but a later exact terminal can still resolve it. This separates “not yet proved” from the exact unsafe terminals that permanently enter `writer-unconfirmed`.

If the local size watcher observed a violation, that violation remains even when the matching terminal is `captured`. After writer release the allocation can be cleaned, but `validateArchive` must reject it. If B04 never yields writer-release evidence, leave the exact run untouched. B05 does not poll PIDs, inspect the B02 workspace, infer safety from elapsed time, or assume that container disappearance released the writer.

## Streaming Archive Validation and SHA-256

Create `backupd/src/archive-validator.ts`. It receives a manager-owned allocation, a clean matching B04 `captured` terminal, an expected Strapi version from that identity, and an optional AbortSignal. It asks the manager to enter `validating`; callers cannot validate a path outside a lease or a run still capturing.

List the run directory and require exactly one entry named `strapi-export.tar`. A missing archive, alternate `.tar.gz`/`.enc`, partial name, or extra staging entry fails. Open the exact archive with `node:fs/promises.open` flags `O_RDONLY | O_NOFOLLOW`; map `ENOENT`, `EACCES`, `EPERM`, `ELOOP`, `EISDIR`, and other open failures to stable archive I/O codes while preserving the original cause. Initial `FileHandle.stat({ bigint: true })` must report a regular file, a positive size, a size no greater than the configured maximum, and a size no greater than `Number.MAX_SAFE_INTEGER` for the result contract.

Create the read stream from that handle with `autoClose: false`. Feed it through a small `Transform` that increments a `bigint` byte counter, rejects if the stream exceeds the maximum or opening size, updates `createHash("sha256")`, and forwards the original chunk. Pipe that transform into `new Parser({ strict: true, maxMetaEntrySize: 65_536, onReadEntry })` from `tar` using `node:stream/promises.pipeline` and the caller's AbortSignal. Close the handle in `finally` on every outcome.

The tar callback uses POSIX entry names. For every entry other than exact root `metadata.json`, immediately call `entry.resume()`; do not retain names or contents. For `metadata.json`, require `entry.type === "File"`, reject a duplicate, require declared and observed size at most 65,536 bytes, and collect only that entry. Decode with fatal UTF-8, parse JSON, require a non-array object with canonical UTC `createdAt` (`new Date(value).toISOString() === value`), require a non-array `strapi` object and bounded visible-ASCII `version`, and require equality with `terminal.identity.strapiVersion`. Permit unknown keys without returning their values.

`strict: true` makes checksum, invalid-entry, unsupported-entry, bad-archive, and truncated-body warnings fail the pipeline. Do not extract entries, normalize their payloads, parse JSONL stages, inspect SQLite, or require non-metadata stage files. After the pipeline completes, require metadata was found, finalize a lowercase 64-character hex digest, require streamed bytes equal the opening size, and stat the same open handle again. Opening and closing identity must have equal `dev`, `ino`, `size`, `mtimeNs`, and `ctimeNs`; otherwise fail `archive_changed`.

On success return:

    export interface ValidatedArchive {
      readonly runId: string;
      readonly archivePath: string;
      readonly byteLength: number;
      readonly sha256: string;
      readonly metadata: {
        readonly createdAt: string;
        readonly strapiVersion: string;
      };
      readonly capture: CaptureTerminalRecord & {
        readonly outcome: Extract<
          CaptureTerminalOutcome,
          { readonly status: "captured" }
        >;
      };
      readonly fileIdentity: {
        readonly device: bigint;
        readonly inode: bigint;
        readonly size: bigint;
        readonly modifiedNanoseconds: bigint;
        readonly changedNanoseconds: bigint;
      };
    }

The manager transitions the allocation to `retained` only after this result exists. B06 must later re-open with no-follow semantics and compare the fingerprint before upload; B05 does not hold a file descriptor indefinitely. Any failed validation latches its original error and transitions the allocation to `cleanup-only`: exact cleanup remains permitted, but later validation requests reject with that same failure before opening or hashing the archive.

## Failure Taxonomy and Diagnostics

`staging-policy.ts`, `staging-manager.ts`, and `archive-validator.ts` define cohesive error classes with literal `code` unions. Messages state the operation and stable code, not raw metadata, entry content, environment values, archive bytes, or arbitrary paths. Constructors accept `cause` and use the standard Error cause option; multi-failure cleanup/cancellation preserves both with `AggregateError` when necessary.

The staging codes are `configuration_invalid`, `staging_unavailable`, `insufficient_capacity`, `staging_occupied`, `allocation_collision`, `archive_limit_exceeded`, `archive_output_invalid`, `capture_cancellation_failed`, `capture_identity_mismatch`, `writer_unconfirmed`, and `cleanup_failed`. Archive codes are `archive_missing`, `archive_unreadable`, `archive_not_regular`, `archive_empty`, `archive_too_large`, `archive_invalid`, `archive_changed`, `metadata_missing`, `metadata_duplicate`, `metadata_not_file`, `metadata_too_large`, `metadata_invalid`, and `metadata_version_mismatch`.

Tests assert codes, cause identity, state, and forbidden content rather than exact third-party error prose. The `archive_invalid` code intentionally covers checksum failure, malformed tar, and truncation because `tar` can report all-invalid and truncated archives through the same `TAR_BAD_ARCHIVE` family. Evidence records the stable B05 code and cause class/code, never fixture content.

## Milestone 1: Pin the parser and establish pure policy

Add exact `tar` dependency and create `backupd/src/staging-policy.ts`. Add `backupd/test/staging-policy.test.ts` with no filesystem or process. Cover exact defaults, decimal parsing, `minimum > maximum`, `bavail * bsize` bigint arithmetic, equality acceptance for minimum capacity and maximum size, strict-greater rejection for the archive limit, exhaustive current B04 writer-release classification, exact identity/path eligibility, and local-violation dominance.

Run `mise run backupd:check` and `mise run backupd:test`. Milestone acceptance is a reproducible lockfile, green existing B04 client tests, and pure evidence for every authorization and arithmetic branch before filesystem work exists.

## Milestone 2: Allocate, monitor, and clean one run safely

Add `backupd/src/staging-manager.ts` and `backupd/test/staging-manager.integration.test.ts`. Use one `mkdtemp` root per test and inject it as staging root; never touch host `/staging`. Simulate capacity with injected bigint statfs values while using real mkdir/readdir/lstat/open/rm behavior.

Cover insufficient capacity with no leftover run; exact-threshold admission; exclusive canonical-UUID allocation; a second live allocation rejection; pre-existing file/directory/symlink occupancy with no adoption or deletion; expected base and `.tar` paths; a watcher installed after a file already exists; delayed file creation; at-limit observation without cancellation; over-limit and non-regular output with one exact B04 cancel; cancel failure invoking one disconnect fallback; local violation dominance; safe terminal cleanup; `export_ownership_unconfirmed` and shutdown entering `writer-unconfirmed`; mismatched terminals leaving capture unproved and the watcher active through later growth/cancellation until exact resolution; cleanup failure cause and exact retry; and no deletion above the allocated directory.

The integration tests start no process, socket, HTTP server, or Strapi instance. A small in-memory `CaptureClient` records only the production cancel call; existing B04 integration remains the authoritative wire-cancellation test. Milestone acceptance is that a filesystem writer simulated by test file appends can exceed a small injected limit, trigger exactly one cancellation, remain present until explicit writer release, and then be removed only by exact cleanup.

## Milestone 3: Validate and hash representative archives

Add `backupd/src/archive-validator.ts`, `backupd/test/archive-validator.test.ts`, and a private test helper `backupd/test/archive-fixtures.ts` if fixture construction would otherwise obscure scenarios. The helper uses the pinned `tar` package with portable/no-mtime output to create small task-owned tar files. Fixtures are generated in each test's temporary run directory and removed in `finally`; no binary archive is committed.

Cover a valid root metadata archive plus a representative large streamed payload, exact full-file SHA-256 compared with an independent direct test hash, byte length, metadata result, and no extracted files. Focused rejected fixtures cover random bytes, invalid header/checksum, a truncated body, missing metadata, duplicate metadata, metadata as a directory, invalid UTF-8/JSON/shape/timestamp, oversized metadata using an injected small bound, Strapi-version mismatch, empty file, extra run-directory entry, final symlink, missing/unreadable open with preserved cause, over-limit final stat, stream abort, and file mutation between opening and final stat through a narrow test hook or controlled append. At manager level, prove a mutation failure is latched cleanup-only, a second validation request never invokes the validator or returns a hash, and exact cleanup still succeeds.

Do not reproduce B04 capture semantics here beyond the one exact captured-terminal guard already owned by staging policy. Do not create a memory-usage threshold assertion; bounded memory is established by streaming the full archive, resuming all ordinary entries, and collecting only the capped metadata entry. Milestone acceptance is green package validation and fixtures that fail before the implementation but demonstrate all B05 observable acceptance afterward.

## Plan of Work

After this plan is approved and before production edits, add this indented line directly beneath the B05 checkbox label in `TODO.md`:

    - Plan: [ExecPlan](.agents/plans/b05-validate-archives-and-manage-staging.md)

Leave B05 as `- [ ]`. Do not alter its label, scope, acceptance, order, B01–B04, or later tasks. Only the workflow coordinator may check B05 after the reviewer returns both `APPROVED` and `REVIEW_READY`.

Implement Milestone 1, then Milestone 2, then Milestone 3. Keep all existing B04 client tests green after each milestone. Update Progress, discoveries, decisions, outcomes, and the bottom revision notes at every stopping point. Use explicit `.ts` local imports, type-only imports, standard Error causes, AbortSignal propagation, ordinary control flow, and no non-erasable TypeScript syntax.

Expected task-owned production changes are limited to `backupd/package.json`, `backupd/package-lock.json`, `backupd/src/staging-policy.ts`, `backupd/src/staging-manager.ts`, and `backupd/src/archive-validator.ts`. Add focused tests and at most one cohesive fixture helper. Do not wire `backupd/src/main.ts`, change `backupd/src/capture-client.ts` unless an implementation-proven type-only compatibility adjustment is unavoidable, or change any `strapid` source/contract.

Do not edit `BACKUP.md`, backend/frontend source, content types, schemas, bootstrap, generated CMS artifacts, Dockerfiles, Compose, workflows, release files, README, `.env` files, machine/user environment variables, host configuration, or the unrelated Imagen directory.

## Test Strategy and Ownership

`staging-policy.test.ts` owns pure configuration, bigint arithmetic, identity/terminal authorization, and writer-release classification. It starts no process and touches no filesystem. `staging-manager.integration.test.ts` owns real allocation, path, polling, occupancy, cancellation callback, and exact cleanup semantics under task-owned temporary roots. `archive-validator.test.ts` owns real file-handle, stream, tar, metadata, mutation, and SHA-256 behavior.

Existing `backupd/test/capture-client.test.ts` remains the owner of client decoding and exact identity. Existing `capture-client.integration.test.ts` remains the owner of real Unix cancellation and reconciliation. Existing B03/B04 fixture tests remain the owner of process-group termination, workspace retention, output closure, and recovery. B05 tests do not start fixture children merely to re-prove those boundaries.

Every filesystem test uses a unique `/tmp/b05-*` directory created by `mkdtemp`, a small injected capacity/size policy, and `finally` cleanup of only that exact directory. No test writes production `/staging`, binds a port, starts a server, uses Docker, calls a prestarted stack, invokes Strapi, parses SQLite, or reads production content. Unit tests start no process; B05 integration tests also need no process.

The current baseline is 13 passing `backupd` tests. The implementation should add only focused scenarios needed for the policies above; record the actual stable final count rather than targeting an assertion count.

## Concrete Steps

Work from `/home/codex/src/us-alb` and reconfirm the protected baseline:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch
    mise exec -- node --version

Expect `backup-system`, both revisions at `f94a86ffc803fee303adcf701acc513c2b76ed9b`, only `?? .agents/skills/imagen/scripts/`, and `v24.20.0`. Stop if the baseline moved or an overlapping edit appears.

After adding the approved plan link, add the exact dependency through the root-selected npm rather than hand-editing lockfile resolution or integrity fields:

    mise exec -- npm install --prefix backupd --save-exact tar@7.5.22
    mise exec -- npm ci --prefix backupd

Expect `backupd/package.json` to contain `"dependencies": { "tar": "7.5.22" }`, the npm-generated lockfile to contain that exact direct dependency and its transitive graph, and `npm ci` to finish without manifest/lock disagreement. Do not install `@types/tar`; the package exports its own declarations. Do not add `tar-stream`, an extraction CLI, hashing package, fixture framework, or runtime loader.

Format only the changed package:

    mise run backupd:format

Run all applicable canonical validation:

    mise run backupd:check
    mise run backupd:test

Expect Biome and strict no-emit TypeScript to pass and all existing 13 B04 client tests plus new B05 tests to report zero failures/skips. Record the actual count. No `strapid`, backend, or frontend file changes, so their checks/tests, Strapi startup, CMS generators, image builds, Compose rendering, browser checks, smoke tests, and deployment tests are inapplicable.

Inspect the installed dependency and forbidden emitted output:

    mise exec -- npm ls --prefix backupd --depth=0
    mise exec -- npm pkg get dependencies.tar --prefix backupd
    find backupd \
      \( -path 'backupd/node_modules' -o -path 'backupd/dist' -o -path 'backupd/build' \) -prune -o \
      -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print
    test ! -d backupd/dist
    test ! -d backupd/build

Expect top-level `tar@7.5.22`, JSON string `"7.5.22"`, no emitted JavaScript, and no build directory.

Check test and runtime residue without reading or changing the unrelated directory:

    find /tmp -maxdepth 1 -type d -name 'b05-*' -print
    test ! -e /staging/runs

The first command must print nothing after the suite. The second documents that B05 validation never touched production staging on this development host; if `/staging/runs` pre-existed before work, record that fact and instead prove the tests used only their captured temporary roots without deleting or inspecting unrelated staging content.

Finish with protected-input and scope inspection:

    git diff --check
    git diff -- BACKUP.md
    git status --short --branch
    git diff -- TODO.md backupd/package.json backupd/package-lock.json backupd/src backupd/test .agents/plans/b05-validate-archives-and-manage-staging.md

`git diff -- BACKUP.md` must be empty. Status may contain only B05 files plus the separately preserved untracked Imagen directory. Generated backend/frontend artifacts are inapplicable because B05 changes no API/schema/application source. Do not commit or push during planning or worker implementation.

After reviewer approval, the coordinator stages only B05 package/source/tests, this plan, and B05's tracker bookkeeping; verifies the unrelated directory and later tasks are excluded; commits with exact title `B05 — Validate archives and manage staging`; and pushes to `origin/backup-system` before B06 begins.

## Validation and Acceptance

B05 is accepted when a capacity test shows 100 GiB exactly admits and one byte less rejects under defaults, while a 75-GiB archive exactly remains eligible and one byte more latches a violation. Production uses `statfs(..., { bigint: true })` and `bavail * bsize`; tests use small injected values without allocating large files.

B05 is accepted when one canonical run allocation yields the exact base and `.tar` paths below `/staging/runs/<uuid>`, a second or pre-existing run is rejected without deletion/adoption, and no archive uses `/tmp`. Physical disk-backed mounting remains B10's native volume/configuration acceptance; B05's invariant is confinement to the shared staging root and capacity measurement there.

B05 is accepted when a test file growing beyond the injected limit causes one exact B04 `cancel(identity)` call, a failed cancellation causes one held-request disconnect fallback, the file remains while writer ownership is pending, and later exact release permits cleanup. A file that already exists when the accepted callback installs the watch is still observed. Local violation prevents validation even if the terminal races to `captured`. Export-ownership-unconfirmed and supervisor shutdown enter `writer-unconfirmed`; reconciliation-required, active, replacement, and unknown status provide no terminal evidence. A mismatched terminal is rejected before watcher shutdown, so later growth still causes one exact cancellation and later exact terminal evidence can resolve ownership.

B05 is accepted when the valid fixture is read once from one no-follow file handle, strict tar parsing completes, exactly one bounded root metadata object reports canonical creation time and Strapi version matching the capture, the full-file byte length and SHA-256 are correct, the opening/final file identity agrees, and no file is extracted or rewritten. The returned capture is the same exact B04 captured terminal.

B05 is accepted when invalid/random/truncated tar, unreadable/nonregular/symlink/empty/over-limit/changing files, missing/duplicate/oversized/invalid metadata, version mismatch, extra output, and aborted validation all fail with the appropriate stable code and preserved cause. A failed validation becomes exact-cleanup eligible only because writer release was already proved, latches that failure permanently, and can never be retried into a validated result.

B05 is accepted when no test or production module parses SQLite, validates Strapi schemas/content entries, counts source records/assets, treats diagnostics as completeness evidence, or claims archive validation proves source completeness. It does not upload, publish a manifest, persist scheduling state, orchestrate a whole run, adopt restart artifacts, emit telemetry, or wire volumes/containers.

All code remains idiomatic ESM TypeScript with explicit `.ts` local imports, type-only imports, erasable syntax, cancellation propagation, bounded memory, preserved causes, and secret-free diagnostics. Canonical acceptance is green `mise run backupd:check` and `mise run backupd:test`, exact `tar@7.5.22`, no emitted artifact, no temporary residue, a scoped diff, and unchanged `BACKUP.md`. B05 remains unchecked until independent reviewer approval.

## Idempotence and Recovery

Dependency installation, formatting, checks, and tests are repeatable. `npm ci` recreates only ignored `backupd/node_modules` from the committed lockfile. Fixture helpers generate unique archives below their own temporary directory and exact `finally` cleanup is safe to repeat.

Allocation never reuses an existing path. If creation fails after the manager created an empty directory but before capture begins, remove only that exact manager-owned empty directory. Once capture begins, never clean in a broad error `finally`; record the result and require writer-release evidence. A cleanup failure preserves the allocation and can retry the same exact directory after confirming state has not changed.

If cancellation cannot be sent, invoke the held-request disconnect fallback and retain staging. If B04 then reports reconciliation-required, unknown, replacement, shutdown, or export ownership unconfirmed, do not guess. Leave the exact run occupied and report `writer_unconfirmed`. B08 later owns reconciliation, and operator/audit work must resolve an orphan before a new allocation; startup does not sweep it.

If validation fails, close/destroy the stream and parser through `pipeline`, close the exact file handle, preserve the stable failure plus cause, and leave the allocation cleanup-only. Cleanup may then remove only that run and may retry after a cleanup error. The artifact is never validated again after any failed attempt; in particular, a file changed during validation cannot later produce a hash or valid result.

If a future `tar` update changes warning/error semantics, do not loosen strict parsing or silently accept new warnings. Re-run the truncated/checksum fixtures, inspect the official package source/types, and record an intentional version decision. The exact dependency remains 7.5.22 in B05.

Any plan revision must update all affected sections and append a revision note. The work can be resumed from this file alone.

## Artifacts and Notes

Planning established this baseline:

    branch/upstream:       backup-system at f94a86ffc803fee303adcf701acc513c2b76ed9b
    Node runtime:          v24.20.0
    existing backupd:      13 passing native tests
    existing dependencies: Biome 2.4.2, Node types 24.19.2, TypeScript 5.9.3
    selected tar:          7.5.22, Node >=18, bundled TypeScript declarations
    Strapi version:        5.52.0
    protected BACKUP.md:   SHA-256 6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533

The installed Strapi 5.52.0 source establishes:

    archive path:   `${file.path}.tar` with .gz/.enc only when enabled
    B04 flags:      --no-compress --no-encrypt
    metadata path:  metadata.json at archive root
    metadata body:  { createdAt: <ISO>, strapi: { version: <version> } }

The disposable exact-runtime parser probe used `tar` 7.5.22 and Node v24.20.0, then removed `/tmp/b05-tar-probe-*`. Its concise result was:

    metadata.strapi.version = 5.52.0
    sha256 hex length = 64
    truncated strict parse = TAR_BAD_ARCHIVE

Context7 resolved current Node 24 documentation for bigint `statfs`, backpressured/abortable `pipeline`, Transform behavior, and exact recursive `rm`. Three official-name resolution attempts did not surface `isaacs/node-tar`; they returned unrelated `tar-stream`/modern-tar packages. Planning therefore did not substitute a different library and used npm registry metadata plus the repository's exact installed official `tar` 7.5.22 README, exports, types, and source.

Worker validation evidence:

    mise exec -- npm ci --prefix backupd        pass; 0 vulnerabilities
    npm pkg get dependencies.tar                "7.5.22"
    npm ls --prefix backupd --depth=0           exact tar@7.5.22 present
    mise run backupd:format                     pass; 13 files unchanged
    mise run backupd:check                      pass; Biome and strict no-emit TypeScript
    mise run backupd:test                       pass; 54 tests, 0 failed/skipped
    focused staging ownership/order probes      pass; 4 tests
    focused archive/hash/integrity probes       pass; 8 tests
    focused remediation adversarial probes      pass; 2 tests

The dependency lock-only integrity pass reported up to date with zero vulnerabilities. No `.js`, `.mjs`, `.cjs`, source map, TypeScript build-info, `dist`, or `build` artifact exists outside ignored dependencies. Final checks found zero `/tmp/b05-*` directories, no `/staging/runs`, and no matching Node fixture process. `BACKUP.md` remains unchanged at SHA-256 `6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533`; tracked and untracked whitespace checks pass; the scoped worktree contains only B05 files plus the separately preserved Imagen directory; B05 is unchecked; the index is clean; and no commit or push occurred.

## Interfaces and Dependencies

B05 uses `tar` 7.5.22 plus Node built-ins: `node:crypto`, `node:fs`, `node:fs/promises`, `node:path`, `node:stream`, and `node:stream/promises`. It imports current B04 contract types with `import type` through the existing cross-package pattern and uses the local `CaptureClient` interface. No new package is added to `strapid`.

`backupd/src/staging-policy.ts` exposes semantically:

    export interface StagingPolicy {
      readonly stagingRoot: string;
      readonly minimumFreeBytes: bigint;
      readonly maximumArchiveBytes: bigint;
      readonly metadataMaximumBytes: number;
      readonly sizePollIntervalMs: number;
    }

    export function parseStagingPolicy(
      environment?: NodeJS.ProcessEnv,
    ): StagingPolicy;

    export type CaptureWriterDisposition = "released" | "unconfirmed";

    export function classifyCaptureWriterDisposition(
      terminal: CaptureTerminalRecord,
    ): CaptureWriterDisposition;

`backupd/src/staging-manager.ts` exposes semantic data, not caller-controlled cleanup paths:

    export interface StagingAllocation {
      readonly runId: string;
      readonly runDirectory: string;
      readonly archiveBasePath: string;
      readonly archivePath: string;
    }

    export interface ArchiveSizeWatch {
      readonly violation:
        | undefined
        | {
            readonly code:
              | "archive_limit_exceeded"
              | "archive_output_invalid";
          };
      stop(): Promise<void>;
    }

    export interface StagingManager {
      allocate(runId: string): Promise<StagingAllocation>;
      watchCaptureSize(
        allocation: StagingAllocation,
        identity: CaptureIdentity,
        captureClient: CaptureClient,
        disconnectHeldCapture: (cause: Error) => void,
      ): ArchiveSizeWatch;
      recordCaptureTerminal(
        allocation: StagingAllocation,
        terminal: CaptureTerminalRecord,
      ): Promise<CaptureWriterDisposition>;
      validateArchive(
        allocation: StagingAllocation,
        terminal: CaptureTerminalRecord,
        options?: { readonly signal?: AbortSignal },
      ): Promise<ValidatedArchive>;
      cleanup(allocation: StagingAllocation): Promise<void>;
    }

The concrete manager owns allocation object identity and state. `watchCaptureSize` is called only after B04 acceptance; B08 owns that event ordering. `recordCaptureTerminal` validates the terminal synchronously while the active watch remains live, then stops and awaits that watch before classifying release. `validateArchive` delegates streaming mechanics to `archive-validator.ts` only once for exact captured eligibility after that watch/terminal sequence; failure latches cleanup-only. `cleanup` checks internal state and cannot accept an arbitrary path.

`archive-validator.ts` owns the `ValidatedArchive` interface shown above, a narrow internal filesystem/timing hook for deterministic unreadable/mutation tests if needed, and typed archive errors. The production path always uses real Node open/stat/streams/hash and `tar.Parser`; no injected parser, hash, or fake file contents are authorized.

B04 remains the cancellation, capture identity, exporter termination, recovery, and writer-ownership authority. B05 never turns a filesystem observation into a supervisor terminal and never cleans while B04 evidence is unsafe. B06 consumes `ValidatedArchive`, compares its file identity before upload, owns object keys/storage/checksum transport/manifest publication, and never changes the local `.tar`. B07 owns collision-resistant run creation, durable schedule/publication state, and the record needed for restart reconciliation. B08 wires preflight, capture, guard, validation, upload, state, and cleanup; it may add an explicit durable-state-authorized reopen path, but unknown orphan discovery remains forbidden.

B09 maps stable B05 codes to safe telemetry and does not log archive or metadata contents. B10 mounts `/staging` as a shared project-scoped disk-backed named volume, passes the two size settings, packages the `tar` runtime dependency, and proves nonroot permissions; B05 does not change container files. B13 records archive checksum verification and the manual recovery limitation; B05 supplies no recovery rehearsal or source-completeness claim.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B05 plan after complete authoritative-input and pushed B04 interface review, Context7 Node 24 research, exhausted Context7 resolution for the official tar package, npm/exact-package and Strapi 5.52.0 source inspection, and a disposable strict-parser probe. The final self-review made the accepted-record/export transport race explicit and separated unresolved reconciliation from exact unsafe terminals. The plan fixes exact dependency/version changes, one-run staging and capacity ownership, B04-only cancellation, writer-release and cleanup gates, no orphan adoption, strict bounded one-pass tar/metadata/SHA-256 validation, failure taxonomy, focused tests, canonical validation, and later-task boundaries without changing production code, `TODO.md`, or `BACKUP.md`.

Revision note (2026-10-29 / Codex worker): Began implementation from pushed B04 commit `f94a86ffc803fee303adcf701acc513c2b76ed9b`, re-read every authoritative input and current B04 interface, recorded the approved plan link without checking B05, and confirmed production `/staging/runs` was absent. Dependency and production implementation remain pending at this stopping point.

Revision note (2026-10-29 / Codex worker): Implemented Milestones 1–3 within `backupd`: exact `tar` 7.5.22 dependency/lock, bigint policy, exclusive staging lease and capacity checks, immediate size cancellation with disconnect fallback, exhaustive writer-release gates, exact cleanup retry, and strict one-handle tar/metadata/SHA-256/file-identity validation. Generated filesystem fixtures cover acceptance and material rejection/race cases with 36 focused tests passing; full canonical validation and final evidence remain pending.

Revision note (2026-10-29 / Codex worker validation): Completed canonical validation with 52 passing `backupd` tests, including 39 B05 policy/filesystem/archive cases. Final hardening added canonical-run rejection, symlink-root refusal, missing-field/nonregular archive fixtures, stable close/I/O cause handling, and a captured-terminal type guard without broadening the approved scope. Reproducible dependency/lock checks, focused race/order probes, residue/artifact/process/protected-file/scope/whitespace checks all pass; `BACKUP.md` and the unchecked B05 tracker state are preserved; nothing is staged, committed, or pushed.

Revision note (2026-10-29 / Codex worker, remediation cycle 1): Addressed both reviewer findings without changing the B04 boundary: mismatched/malformed terminals now reject synchronously before watcher shutdown, and every begun archive-validation failure now latches the allocation into non-validatable cleanup-only state with the original error preserved. Deterministic mismatch-growth-cancellation and manager-level mutation-retry regressions pass; full canonical and hygiene validation remain pending.

Revision note (2026-10-29 / Codex worker, remediation cycle 1 validation): Completed canonical format/check/test with 54 passing `backupd` tests and independently repeated both adversarial regressions. Exact `npm ci`, dependency/version, residue, artifact, process, protected-file, scope, staging, and whitespace checks pass. Mismatched evidence no longer disables size enforcement, failed validation can never later authorize a hash, exact cleanup remains retryable, B05 stays unchecked, and nothing is staged, committed, or pushed.

Revision note (2026-10-29 / Codex coordinator): Recorded independent `APPROVED` after stronger direct watcher and mutation-latch probes, clean `npm ci`, exact `tar` 7.5.22 resolution, 54 passing tests, and clean residue/scope inspection; checked B05 and finalized the plan for commit.

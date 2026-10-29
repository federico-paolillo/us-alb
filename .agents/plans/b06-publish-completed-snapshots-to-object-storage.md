# Publish completed snapshots to object storage

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B06 — Publish completed snapshots to object storage` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B06, `backupd` can prove that its private S3-compatible destination is reachable before a capture interrupts Strapi, then publish one B05-validated archive under a collision-resistant immutable key. It re-opens the unchanged local file, streams it with the official AWS SDK multipart uploader, confirms the remote archive's length and exact run metadata, publishes a small versioned completion manifest last, and confirms that manifest by both metadata and exact body. Only that final confirmation means a completed snapshot exists.

The same operation is safe to retry after a lost acknowledgement. It first reconciles the exact run and keys: an already confirmed archive is not uploaded again, an exact manifest means success, and any object belonging to another identity fails as a collision rather than being overwritten. Cancellation, timeout, SDK failure, local-file change, or uncertain remote state never invents success. Focused unit tests establish manifest, key, part-sizing, deadline, ordering, and reconciliation policy; a task-owned S3-compatible container proves the material AWS SDK upload, conditional-write, HEAD/GET, multipart, and abort semantics without a prestarted stack or live Scaleway credentials.

## Progress

- [x] (2026-10-29 15:12Z) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, pushed B01–B05 plans and code, and the exact B06 queue item.
- [x] (2026-10-29 15:12Z) Confirmed `backup-system`, `HEAD`, and `origin/backup-system` are at pushed B05 commit `c57102d433b268363b1e1d7f98f47a32d69ea504`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present.
- [x] (2026-10-29 15:12Z) Used the three-command Context7 allowance to resolve the official AWS SDK for JavaScript v3 source and inspect current S3 client, abort, checksum, retry, and managed-upload guidance; then inspected exact npm 3.1159.0 package types/source where Context7's latest indexed version was 3.1153.0.
- [x] (2026-10-29 15:12Z) Inspected the exact B05 `ValidatedArchive` and staging ownership interfaces, current package conventions, root Mise tasks, and the rootless Docker runtime; selected a digest-pinned task-owned LocalStack S3 dependency for integration validation.
- [x] (2026-10-29 15:12Z) Created and self-reviewed this B06 ExecPlan against every remote-artifact field and initial default in `BACKUP.md`, current B05 file-identity semantics, manifest-last ordering, uncertain-result recovery, provider limits, and later-task ownership; removed duplicate release attribution so capture identity has one authority.
- [x] (2026-10-29 15:16Z) Began the approved worker implementation from pushed B05 commit `c57102d433b268363b1e1d7f98f47a32d69ea504`; re-read the authoritative inputs and added the B06 plan link beneath the still-unchecked tracker item.
- [x] (2026-10-29 15:22Z) Pinned both official AWS SDK packages at 3.1159.0 and implemented the strict production/test configuration boundary, immutable keys, deterministic full manifest, strict decoder, exact publication deadline, and 1,000-part policy with process-free tests.
- [x] (2026-10-29 15:28Z) Implemented the AWS S3 store and archive-first publisher with B05 no-follow fingerprint rechecks, bounded cancellation/reserve, managed multipart abort, exact archive/manifest confirmation, conditional writes, lost-ack reconciliation, collision refusal, and focused filesystem/order tests.
- [x] (2026-10-29 15:34Z) Added the digest-pinned task-owned LocalStack integration, ran clean-install canonical validation with 71/71 tests passing, and completed dependency, artifact, container, temporary-directory, protected-file, scope, staging, and diff checks with no residue or unauthorized change.
- [x] (2026-10-29 15:49Z) Remediation cycle 1: replaced caller-owned request authority with a private canonical admission snapshot, added synchronous post-I/O mutation-cutoff/cancellation gates and post-await preflight checks, and proved the three reviewer findings with adversarial zero-store-call and controlled-clock regressions; clean-install canonical validation now passes 74/74 tests including the real LocalStack suite.
- [x] (2026-10-29) Obtained independent reviewer approval after remediation cycle 1; the workflow coordinator checked B06 and finalized review bookkeeping.

## Surprises & Discoveries

- Observation: B05 returns all local authorization needed by B06 but deliberately leaves the file descriptor closed.
  Evidence: `backupd/src/archive-validator.ts` returns `ValidatedArchive` with the exact archive path, byte length, lowercase SHA-256, captured terminal, and opening `dev`/`ino`/`size`/`mtimeNs`/`ctimeNs` fingerprint. B06 must re-open with no-follow semantics and compare that fingerprint before streaming; it must not accept an arbitrary path or recompute eligibility from a file alone.

- Observation: The managed uploader's native part ceiling is too loose for Scaleway.
  Evidence: Exact `@aws-sdk/lib-storage` 3.1159.0 source sets `MAX_PARTS = 10_000`, while `BACKUP.md` fixes Scaleway's ceiling at 1,000. The `Upload` type also documents that it buffers at most `queueSize * partSize` bytes. B06 therefore owns a stricter pure part-size calculation and passes both explicit `partSize` and `queueSize`.

- Observation: Current AWS SDK inputs can make the final object creation conditional for both upload paths.
  Evidence: Exact `@aws-sdk/client-s3` 3.1159.0 types expose `IfNoneMatch` on `PutObjectRequest` and `CompleteMultipartUploadRequest`. Exact `lib-storage` source spreads the supplied params into both the single-part PUT and final `CompleteMultipartUploadCommand`. Passing `IfNoneMatch: "*"` therefore prevents a successful final commit when the key already exists; a 409/412 response is reconciled rather than blindly retried.

- Observation: An SDK-managed upload abort is necessary but not by itself publication evidence.
  Evidence: `Upload` accepts an `abortController`, `leavePartsOnError: false`, and exposes `abort()`/`done()`. Its source attempts `AbortMultipartUpload` when an upload ID exists. B06 must await settlement, preserve an abort-cleanup failure, and still reconcile the object key because the final completion acknowledgement can race cancellation or transport loss.

- Observation: AWS SDK checksum fields and the B05 archive hash have different meanings for multipart data.
  Evidence: Current S3 types expose `ChecksumAlgorithm`, `ChecksumType: "COMPOSITE" | "FULL_OBJECT"`, and HEAD checksum response fields. `BACKUP.md` states that Scaleway multipart SHA-256 is composite and an ETag is not a full-file hash. B06 requests SHA-256 transfer checksums but never compares a multipart checksum or ETag to B05's full-file SHA-256.

- Observation: Context7's official AWS repository index lagged the npm registry by six patch releases.
  Evidence: Context7 resolved official `/aws/aws-sdk-js-v3/v3.1153.0`; npm reported both requested packages at 3.1159.0 with Node `>=20`. Planning inspected the exact 3.1159.0 tarball types/source for conditional completion, options, and abort behavior rather than assuming the indexed patch was identical.

- Observation: Local S3 compatibility cannot prove Scaleway's live checksum behavior or bucket policy.
  Evidence: A task-owned emulator can prove the repository sends the intended SDK requests and handles their responses, but `BACKUP.md` explicitly makes live Scaleway checksum confirmation, private-bucket/SSE-ONE provisioning, credentials, and policy an external operator prerequisite. B06 must record that limit rather than claim provider verification.

- Observation: AWS SDK v3 annotates a resolved static credential object internally.
  Evidence: The first real SDK readiness probe failed with `Cannot set properties of undefined (setting 'CREDENTIALS_CODE')` when it received the frozen validated credential record. `createS3Client` now passes a fresh shallow copy, preserving immutable application configuration while allowing the SDK's internal annotation; the repeated LocalStack suite then passed.

- Observation: Managed `Upload.abort()` signals cancellation immediately while its internal multipart cleanup may remain briefly observable.
  Evidence: The cancellation integration initially observed its exact upload in `ListMultipartUploads` immediately after rejection, then confirmed it disappeared through a bounded poll. The production call still uses the SDK controller, `leavePartsOnError: false`, awaits the public abort and upload promises, and never lists or deletes remote work; the test alone uses administrative listing to prove eventual cleanup of that exact key.

- Observation: TypeScript `readonly` and an outer `Object.freeze` do not protect nested B05 records or `Uint8Array` contents at runtime.
  Evidence: Remediation review demonstrated that a caller could change `archive.runId`, capture identity, attribution, or manifest bytes after request construction. The constructor now copies all nested B05/capture/fingerprint values into a private canonical authority snapshot; both public entrypoints require exact constructor provenance and current equality before any store call, then operate on a fresh canonical copy.

- Observation: Deadline timers are notification mechanisms, not authorization checks.
  Evidence: A deterministic local-stat hook advanced the monotonic clock to the exact mutation cutoff before the timer callback ran. Explicit post-open/post-stat/post-fingerprint and immediate pre-mutation checks rejected the operation with only the initial read-only HEAD events. The same pattern rejects preflight success returned at its exact 30-second deadline even when the store ignores abort.

## Decision Log

- Decision: Implement B06 only in `backupd`, with no `strapid`, backend, frontend, Compose, image, CI, release, or environment-file change.
  Rationale: B05 hands a validated local artifact to `backupd`; publication and storage credentials belong there. B08 later composes the lifecycle, B10 wires service-specific settings, and B12 owns CI/release delivery.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add exact runtime dependencies `@aws-sdk/client-s3: "3.1159.0"` and `@aws-sdk/lib-storage: "3.1159.0"` through npm and regenerate only `backupd/package-lock.json`.
  Rationale: Both are the current official matching release, support the project Node 24 runtime, and `lib-storage` declares a peer range beginning at the same client version. Exact pins follow the package's existing reproducibility convention. Do not add an S3 signing library, retry library, checksum package, test framework, or runtime loader.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Treat configuration as one explicit trust boundary and never use the SDK default credential or region provider chains.
  Rationale: `backupd` reads required endpoint, region, bucket, access key, secret key, site, environment, image digest, and Git revision from an injected environment object; production constructs explicit static credentials and rejects missing or malformed values. This prevents accidental instance-metadata/shared-profile access and makes B10's service-only secret wiring auditable. Secret values never enter errors, results, logs, test output, manifests, keys, or metadata.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Require an HTTPS origin with no user information, query, fragment, or non-root path in production, use virtual-hosted bucket addressing (`forcePathStyle: false`), and permit insecure loopback plus path style only through an explicit test constructor.
  Rationale: Scaleway production access is HTTPS and its bucket endpoints support virtual-hosted requests. The S3 emulator needs `http://127.0.0.1:<ephemeral>` and path style. No environment flag may weaken production transport validation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use read-only `HeadBucket` as destination preflight before capture interruption.
  Rationale: It proves the configured endpoint, signing region, credentials, and bucket are reachable under the required bucket-level access without creating a probe object or requiring delete permission. It cannot prove future writes, SSE-ONE, retention, or checksum behavior; those limitations remain explicit.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Derive immutable keys as `snapshots/v1/<site>/<environment>/<runId>/archive.tar` and `snapshots/v1/<site>/<environment>/<runId>/manifest.json`.
  Rationale: Site/environment are validated lowercase path segments and B05's run ID is a canonical UUID. The run ID supplies collision resistance; the fixed versioned prefix permits future formats without a mutable pointer. B06 never lists for a “latest” object, chooses another key on collision, overwrites an unrelated object, or deletes/prunes a completed object.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use a deterministic version-one JSON manifest with every field required by `BACKUP.md` and compare its exact serialized bytes during reconciliation.
  Rationale: The manifest records format/version; run identity; site/environment; UTC capture timestamp; capture interval; supervisor/window/source identity; archive key, byte length, and full-file SHA-256; Strapi and Node versions; release identity; application image digest; and Git revision. Fixed property order plus one trailing newline makes retries byte-stable. It contains no content excerpts, archive metadata extras, credentials, endpoint, bucket, or secrets.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Define capture time as B04 `acceptedAt`, capture interval start as B04 `startedAt`, and capture interval end as `exportClosedAt`.
  Rationale: `acceptedAt` occurs only after normal serving has stopped cleanly and is the conservative freshness timestamp for the coherent writer-exclusion interval. `startedAt` captures the beginning of the bounded interruption, while `exportClosedAt` proves output/process ownership closed. `servingRecoveredAt` is also recorded as recovery evidence but does not change capture age.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Derive part size as the larger of 5 MiB and `ceil(byteLength / 1000)` rounded upward to a whole MiB, while rejecting a result above 5 GiB; pass upload concurrency four.
  Rationale: This produces at most 1,000 parts, meets the S3 5-MiB non-final-part minimum, stays within the S3 5-GiB part maximum, and keeps memory bounded by approximately four parts. At the 75-GiB B05 maximum the chosen part size is 77 MiB and the upload uses 998 parts, so the maximum working buffer is about 308 MiB plus bounded SDK overhead.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Configure the S3 client with at most three attempts per SDK request and bounded handler timeouts, while one non-resetting publication deadline governs the whole operation.
  Rationale: `maxAttempts` is three by default and may be configured only from one through three. Connection timeout is 10 seconds, inactivity/socket timeout is 120 seconds, request timeout is 600 seconds with timeout rejection enabled, and every command/upload also receives an abort boundary clipped to the original six-hour publication window. SDK backoff cannot extend that deadline.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Reserve the final 60 seconds of the six-hour window for abort cleanup and read-only exact reconciliation.
  Rationale: Mutation stops at `acceptedAt + 6 hours - 60 seconds`; the uploader is aborted and settled, then HEAD/GET reconciliation may run only until the original deadline. Restart, retry, or a new publisher instance never calculates a new deadline. B07 later persists it; B08 supplies it unchanged.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Request SDK SHA-256 transfer checksums with `requestChecksumCalculation: "WHEN_REQUIRED"`, `responseChecksumValidation: "WHEN_SUPPORTED"`, archive `ChecksumAlgorithm: "SHA256"` plus `ChecksumType: "COMPOSITE"`, and manifest `ChecksumAlgorithm: "SHA256"`.
  Rationale: The explicit algorithm asks the SDK/provider to protect request transfer without depending on a default algorithm. HEAD requests use `ChecksumMode: "ENABLED"` and returned values are retained only as opaque transport evidence. B05's lowercase full-file SHA-256 remains the recovery hash in the manifest; ETag, custom metadata, and composite checksum never substitute for it.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Commit both objects conditionally with `IfNoneMatch: "*"` and resolve conditional conflict or lost acknowledgement by the same exact identity.
  Rationale: Archive upload supplies the condition through `Upload`, including multipart completion; manifest uses `PutObjectCommand`. Before mutation and after any uncertain response, B06 checks exact keys. Matching archive length plus run/window/hash metadata permits archive reuse; matching manifest HEAD plus exact GET bytes proves completion. Any mismatch is `remote_collision` or `remote_inconsistent`, never an overwrite or a new key.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Never delete remote objects, list for retention, create bucket policy, set SSE, or configure lifecycle/versioning/Object Lock.
  Rationale: Remote retention, encryption policy, versioning, incomplete-transfer lifecycle, and recovery access are operator-owned. `leavePartsOnError: false` and explicit abort clean only the task's current unfinished multipart upload; that is not completed-backup pruning.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Copy the already validated static credential pair only at S3 client construction.
  Rationale: The configuration result remains frozen and auditable, but AWS SDK 3.1159.0 may attach internal feature metadata to its resolved credential value. A copy is not a fallback provider chain and does not expose, transform, trim, or log either secret.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Require byte-for-byte canonical manifest encoding in the decoder in addition to exact field/value checks.
  Rationale: Deterministic canonical bytes reject duplicate JSON fields, alternate ordering, trailing data, and noncanonical formatting without adding another parser dependency. Remote reconciliation already requires these exact bytes, so decoder and publication authority remain aligned.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Bind every publication request to an unexported `WeakMap` authority created only by `createSnapshotPublicationRequest`.
  Rationale: The authority holds copied B05 archive, capture, attribution, keys, canonical manifest bytes, fingerprint, and original deadline. `publish` and `reconcile` reject fabricated provenance or any changed public field before remote access and use a fresh authority copy thereafter, so caller mutation during later local awaits cannot redirect or authorize publication. This keeps B07's future durable reconstruction behind the same constructor rather than accepting structural casts.
  Date/Author: 2026-10-29 / Codex worker remediation cycle 1

- Decision: Treat caller cancellation and `now >= mutationDeadline` as synchronous admission failures after each awaited local authority step and immediately before both remote mutations.
  Rationale: Timer dispatch may lag the cutoff. Rechecking after open/stat/fingerprint and directly before `beginArchiveUpload` and manifest PUT preserves the fixed final reserve; cancellation is checked with precedence. Preflight similarly rechecks cancellation and its absolute 30-second deadline after the store returns.
  Date/Author: 2026-10-29 / Codex worker remediation cycle 1

## Outcomes & Retrospective

Worker implementation and validation are complete and independently approved. `backupd` now has exact AWS SDK 3.1159.0 dependencies, strict static-credential production configuration, deterministic version-one manifests, immutable run keys, B05 file-identity authorization, archive-first multipart publication, manifest-last commitment, exact reconciliation, bounded cancellation/deadlines, and no remote deletion/latest/pruning behavior.

Canonical formatting, Biome, strict TypeScript, and the complete native suite pass after remediation with 74 tests, zero failures, and zero skips. New deterministic probes prove corrupted bytes, changed run/capture/attribution fields, and structurally fabricated requests cause zero store calls; cutoff or cancellation reached during local stat causes no remote mutation; and a preflight store that ignores abort cannot return success at the absolute boundary. Independent review replayed stronger mutations across every named public field for both publish and reconcile and confirmed zero store calls before approval. The real SDK integration still proves signed HeadBucket preflight, 5-MiB multipart behavior, unchanged archive bytes, exact archive HEAD attribution, manifest PUT/HEAD/GET bytes, idempotent repeat, conditional archive and manifest race refusal without replacement, and exact multipart abort cleanup. Cancellation-after-manifest-commit fresh reconciliation and both lost-ack paths remain green. The 75-GiB boundary chooses 77-MiB parts and 998 parts. `npm ci` and dependency inspection passed; no generated artifacts, B06 containers, `/tmp/b06-*` directories, commits, or staged files remain. `BACKUP.md` retains SHA-256 `6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533`. Live Scaleway checksum behavior, SSE-ONE/private policy, production credentials, and retention remain explicitly unperformed external prerequisites.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; `HEAD` and `origin/backup-system` are both `c57102d433b268363b1e1d7f98f47a32d69ea504`, the pushed B05 commit. Do not switch branches. The unrelated untracked `.agents/skills/imagen/scripts/` directory must remain unread, unformatted, unstaged, and unchanged.

`backupd/` is a private ESM TypeScript package run directly by Node v24.20.0. Local imports use explicit `.ts`, type-only imports are explicit, and TypeScript remains erasable with strict no-emit checking. `backupd/src/main.ts` is intentionally empty; B06 adds reusable publication modules but does not start a daemon or schedule work. B08 later composes these modules, and B10 packages and configures them.

`backupd/src/archive-validator.ts` defines `ValidatedArchive`. Its `archivePath` points to the exact unchanged Strapi `.tar`; `byteLength` and lowercase `sha256` cover the full file; `capture` is an exact B04 captured terminal; and `fileIdentity` contains bigint device, inode, size, modified time, and change time. `backupd/src/staging-manager.ts` retains the allocation after validation and alone owns cleanup. B06 consumes the result but never changes staging state or deletes the local file.

An immutable object key is a key that this application may create once but never replace. A completion manifest is the small JSON object whose confirmed presence makes its archive a completed recovery point. A lone archive is intentionally incomplete. Reconciliation means reading remote object facts after a response was lost or a retry began and accepting only evidence tied to the exact expected run. An ETag is provider object metadata, not a portable content hash. A composite checksum combines multipart checksums and is not the same value as hashing the complete local `.tar` byte stream once.

The publication window begins at the capture terminal's `acceptedAt` and ends exactly six hours later. This is wall-clock state so it survives restart. Within one process, timers abort work at the remaining duration and every awaited result rechecks the absolute time. B06 does not persist that timestamp; B07 later does. B06 does not decide when to retry; B08 later invokes the idempotent publisher while the unchanged deadline permits it.

## Configuration and Trust Boundary

Create `backupd/src/object-storage-config.ts`. It reads an injected `NodeJS.ProcessEnv` and owns only these B06 production settings:

    BACKUPD_S3_ENDPOINT
    BACKUPD_S3_REGION
    BACKUPD_S3_BUCKET
    BACKUPD_S3_ACCESS_KEY_ID
    BACKUPD_S3_SECRET_ACCESS_KEY
    BACKUPD_SNAPSHOT_SITE
    BACKUPD_SNAPSHOT_ENVIRONMENT
    BACKUPD_APPLICATION_IMAGE_DIGEST
    BACKUPD_GIT_REVISION
    BACKUPD_UPLOAD_CONCURRENCY           default 4
    BACKUPD_S3_MAX_ATTEMPTS              default 3, allowed 1..3
    BACKUPD_PUBLICATION_WINDOW_SECONDS   default 21600

The endpoint must be a canonical HTTPS origin with root path and no embedded credentials, query, or fragment. Region, bucket, site, and environment use bounded ASCII validation; site/environment must each be a safe lowercase key segment. Access/secret keys are required bounded strings but are never trimmed, echoed, or retained in an error. Image digest must be `sha256:` plus 64 lowercase hex characters. Git revision is a 7-to-64-character lowercase hexadecimal commit identifier. The publication window must be a safe integer longer than the fixed 60-second final-reconciliation reserve; implementation defaults to 21,600 seconds and B07/B08 must preserve the calculated deadline rather than re-read a new value for an existing run. Concurrency must be a positive safe integer from one through four and defaults to four; four is also the maximum authorized initial resource use.

`createS3Client` passes explicit endpoint, region, credentials, `forcePathStyle: false`, `maxAttempts`, checksum settings, and request-handler timeouts. It does not enable dualstack, acceleration, ARN regions, default credentials, proxy discovery, signed URLs, or logging middleware. A separate test-only factory accepts an already validated loopback endpoint, path style, and dummy static credentials; production environment parsing cannot select that mode.

Configuration errors use stable code `configuration_invalid` and have no raw value in their message. AWS errors remain causes. No diagnostic includes a credential, endpoint query, authorization header, request body, archive bytes, manifest bytes, or full SDK error serialization.

## Immutable Keys and Versioned Manifest

Create `backupd/src/snapshot-manifest.ts`. It owns key derivation, capture/publication deadline calculation, part sizing, manifest construction, deterministic serialization, bounded decoding for reconciliation, and pure validation of attribution against B05.

The semantic version-one manifest is:

    export interface SnapshotManifestV1 {
      readonly version: 1;
      readonly kind: "strapi-export-snapshot";
      readonly runId: string;
      readonly site: string;
      readonly environment: string;
      readonly capture: {
        readonly capturedAt: string;
        readonly intervalStartedAt: string;
        readonly intervalCompletedAt: string;
        readonly servingRecoveredAt: string;
        readonly supervisorInstanceId: string;
        readonly captureWindowId: string;
        readonly sourceVolumeId: string;
      };
      readonly application: {
        readonly releaseId: string;
        readonly imageDigest: string;
        readonly gitRevision: string;
        readonly nodeVersion: string;
        readonly strapiVersion: string;
      };
      readonly archive: {
        readonly format: "strapi-export-tar";
        readonly key: string;
        readonly byteLength: number;
        readonly sha256: string;
      };
    }

`capturedAt` is terminal `acceptedAt`, `intervalStartedAt` is terminal `startedAt`, `intervalCompletedAt` is captured outcome `exportClosedAt`, and `servingRecoveredAt` is the captured outcome's health-confirmed timestamp. All must be canonical UTC strings with consistent order: started no later than accepted, accepted no later than export close, export close no later than serving recovery, and serving recovery no later than terminal completion. Release ID, Node version, Strapi version, source volume, supervisor, and capture window are derived only from the B05 captured terminal. Deployment attribution supplies site, environment, image digest, and Git revision; it cannot replace capture identity. Strapi version in B05 metadata and the capture identity must already match, and B06 preserves that value.

Serialize only this exact shape with fixed construction order and one final newline. Reject a manifest above 65,536 bytes, even though the expected object is much smaller. Unknown/duplicate/missing fields, noncanonical timestamps, unsafe numbers, invalid hashes, key mismatch, or attribution mismatch fail. Remote GET reconciliation compares exact bytes first and may parse only to classify a safe mismatch; it never logs returned content.

`calculateMultipartPartSize(byteLength)` uses integer-safe arithmetic, the 5-MiB minimum, 5-GiB maximum, one-MiB rounding, and 1,000-part ceiling. It returns both part size and calculated part count. With `80_530_636_800` bytes it must return `80_740_352` bytes (77 MiB) and 998 parts. No test allocates a 75-GiB file.

## Publication State and Material Event Ordering

Create `backupd/src/snapshot-publisher.ts` for domain ordering and `backupd/src/s3-snapshot-store.ts` for AWS SDK calls. The publisher depends on a narrow `SnapshotStore` interface implemented by the S3 module so process-free unit tests can deterministically simulate lost acknowledgements, collisions, cancellation, and failures. The interface is not a second storage abstraction for future providers; it isolates the untrusted network boundary and current AWS SDK integration.

The public publisher exposes:

    export interface SnapshotPublicationRequest {
      readonly archive: ValidatedArchive;
      readonly attribution: {
        readonly site: string;
        readonly environment: string;
        readonly imageDigest: string;
        readonly gitRevision: string;
      };
      readonly keys: {
        readonly archiveKey: string;
        readonly manifestKey: string;
      };
      readonly manifest: SnapshotManifestV1;
      readonly manifestBytes: Uint8Array;
      readonly publicationDeadlineAt: string;
    }

    export type ReconciledSnapshot =
      | { readonly status: "absent" }
      | {
          readonly status: "archive-confirmed";
          readonly archive: RemoteObjectEvidence;
        }
      | {
          readonly status: "published";
          readonly archive: RemoteObjectEvidence;
          readonly manifest: RemoteObjectEvidence;
        };

    export interface PublishedSnapshot {
      readonly status: "published" | "already-published";
      readonly request: SnapshotPublicationRequest;
      readonly archive: RemoteObjectEvidence;
      readonly manifest: RemoteObjectEvidence;
    }

    export interface SnapshotPublisher {
      preflight(options?: { readonly signal?: AbortSignal }): Promise<void>;
      reconcile(
        request: SnapshotPublicationRequest,
        options?: { readonly signal?: AbortSignal },
      ): Promise<ReconciledSnapshot>;
      publish(
        request: SnapshotPublicationRequest,
        options?: { readonly signal?: AbortSignal },
      ): Promise<PublishedSnapshot>;
    }

`createSnapshotPublicationRequest` is the only constructor for a request. It validates the B05 result, attribution, keys, manifest bytes, and exact deadline `acceptedAt + configured publication window`. B07 may later serialize equivalent durable fields, but a reconstructed request must pass the same validation.

`preflight` sends only `HeadBucketCommand` under the caller signal and a 30-second absolute operation bound. A not-found, forbidden, signing, DNS, TLS, timeout, or other failure is not swallowed. It maps to secret-free destination codes with the SDK error as cause. It does not create/delete a probe, inspect policies, or claim SSE/checksum verification.

`publish` first calls `reconcile`. If the exact manifest and archive are already confirmed, return `already-published`. If only the exact archive exists, skip archive upload. If neither exists, open B05's archive with `O_RDONLY | O_NOFOLLOW`, stat the same handle with bigint values, and require all five fingerprint fields plus `byteLength` still match. Create one read stream from that handle with `autoClose: false`, supply known `ContentLength`, and leave closure to a `finally` block.

The archive upload uses `new Upload` with explicit client, bucket, immutable key, stream body, content length, `ContentType: "application/x-tar"`, `ChecksumAlgorithm: "SHA256"`, `ChecksumType: "COMPOSITE"`, `IfNoneMatch: "*"`, exact run/window/hash metadata, calculated part size, configured queue size, the combined deadline/caller abort controller, and `leavePartsOnError: false`. Metadata is identity evidence only; the `sha256` field is not described as independent remote verification.

Await `Upload.done()`. On caller abort, mutation-deadline expiry, SDK failure, 409, 412, or a possibly lost acknowledgement, call/await `Upload.abort()` when it may still be active, await settlement, close the local handle, and perform one read-only exact reconciliation with a fresh cleanup controller bounded by the earlier of 30 seconds and the original deadline. If the archive now matches, continue only when cancellation has not forbidden new publication; otherwise return the correct cancellation/failure/unknown outcome. If it differs, fail collision. If status cannot be read, report `remote_status_unknown` and retain local staging for B08/B07 policy.

After an apparently successful archive upload, stat the still-open local handle again and require the complete B05 fingerprint unchanged. A changed file fails permanently and no manifest is written. Then HEAD the archive with checksum mode enabled. Require exact content length, content type, run ID, capture-window ID, full-file-hash metadata, and artifact kind. Retain returned ETag, version ID, checksum algorithm/type/value only as opaque evidence. Missing or malformed evidence is an archive-confirmation failure.

Only after exact archive confirmation may the publisher send `PutObjectCommand` for `manifest.json`, with deterministic bytes, exact length, `ContentType: "application/json"`, `ChecksumAlgorithm: "SHA256"`, `IfNoneMatch: "*"`, and run/window/manifest-hash metadata. Compute the manifest-byte SHA-256 locally solely to bind this small object during reconciliation; it is not the archive recovery checksum.

Confirm the manifest with HEAD and GET. HEAD must match length, content type, run/window/kind, and manifest-byte hash metadata. GET uses `IfMatch` when HEAD returned an ETag, requests checksum mode, reads the body through a 65,536-byte bounded async iterator, and requires byte-for-byte equality with the deterministic manifest. Only then return `published`. A lost PUT acknowledgement follows the same HEAD/GET path and may return success. A present manifest with missing/mismatched archive is `remote_inconsistent`; mismatched object identity is `remote_collision`.

No error path publishes a manifest after cancellation unless reconciliation proves that the exact manifest was already committed before cancellation. No method calls `DeleteObject`, enumerates completed objects, chooses a replacement key, writes `latest`, mutates the local `.tar`, or marks scheduling state successful.

## Failure Taxonomy and Cancellation

Define cohesive error classes with literal codes and standard causes. Configuration/policy codes are `configuration_invalid`, `manifest_invalid`, `part_size_invalid`, and `publication_expired`. Local input codes are `local_archive_missing`, `local_archive_unreadable`, and `local_archive_changed`. Remote codes are `destination_unavailable`, `destination_unauthorized`, `remote_collision`, `remote_inconsistent`, `archive_upload_failed`, `archive_confirmation_failed`, `manifest_upload_failed`, `manifest_confirmation_failed`, `multipart_abort_failed`, `publication_cancelled`, and `remote_status_unknown`.

Errors name the phase and code, not credentials, endpoint, bucket, full object key, manifest body, archive metadata, content, or raw SDK message. Preserve the original SDK/filesystem/cancellation cause. If primary failure and multipart abort/handle close both fail, preserve them in `AggregateError` while keeping the stable primary code. Distinguish an expected 404 from authorization, timeout, or transport failure using structured SDK name/status metadata; never treat every HEAD error as absent.

The caller's AbortSignal propagates into preflight, reconciliation, manifest requests, and the managed uploader. Publication mutation also has its own controller at the six-hour deadline minus the 60-second reserve. Listener/timer cleanup is mandatory. Cancellation cannot be turned into a retry loop. A completed exact manifest discovered during post-cancellation reconciliation is truthful success; absent or uncertain status is not.

## Milestone 1: Pin dependencies and prove pure publication policy

Add the two exact AWS SDK dependencies, then create `backupd/src/object-storage-config.ts`, `backupd/src/snapshot-manifest.ts`, `backupd/test/object-storage-config.test.ts`, and `backupd/test/snapshot-manifest.test.ts`. These unit tests start no process and touch no network.

Cover every required/malformed setting without asserting secret values; production HTTPS versus injected loopback test mode; exact default concurrency, attempts, and six-hour deadline; canonical keys; full version-one manifest and deterministic bytes; every required `BACKUP.md` field; timestamp/order, image/Git attribution, and B05 metadata/capture consistency rejection; capture-derived release identity; 5-MiB/1,000-part/5-GiB boundaries; exact 75-GiB result; and safe manifest size/hash parsing. Run `mise run backupd:check` and `mise run backupd:test`. Milestone acceptance is green existing B04/B05 tests plus pure evidence that no SDK request can start from invalid policy.

## Milestone 2: Implement archive-first publication and exact reconciliation

Add `backupd/src/s3-snapshot-store.ts`, `backupd/src/snapshot-publisher.ts`, `backupd/test/snapshot-publisher.test.ts`, and a filesystem-focused integration test only if real file-handle behavior would otherwise be hidden behind the storage fake. Use a minimal scripted `SnapshotStore` fake; do not reproduce the AWS SDK or create a generic storage framework.

Cover preflight failure; absent-to-published command order; exact archive reuse; already-published result; archive mismatch/collision; manifest-without-archive inconsistency; no manifest after archive upload/HEAD/local-fingerprint failure; manifest only after archive confirmation; exact lost archive and manifest acknowledgement reconciliation; 409/412 handling; caller cancellation before/during/after archive; mutation cutoff and final read-only reserve; SDK attempt count passed once rather than an application retry loop; multipart abort failure; remote-status uncertainty; initial and final B05 fingerprint mismatch; exact handle closure; and zero delete/latest/list/prune calls.

Unit tests inspect stable commands/semantic inputs rather than AWS private middleware. Filesystem coverage uses one small `/tmp/b06-*` file with a fabricated but type-correct B05 result tied to that exact file and cleans only its own directory in `finally`. It never invokes Strapi or B05 tar validation again. Milestone acceptance is deterministic state/order coverage without an external process in any unit test.

## Milestone 3: Prove material AWS SDK/storage semantics in isolation

Add `backupd/test/snapshot-publisher.integration.test.ts` and at most one private Docker fixture helper. The suite starts one task-owned `localstack/localstack:4.9.2@sha256:59373b4a27dba3ec15c4db0b7455f0cb68c8a42300e2cbbe362b440f9a131697` container under Rootless Docker, enables only S3, and publishes container port 4566 as `127.0.0.1` on a Docker-assigned ephemeral host port. It uses a unique container name/label, bucket, and run IDs; dummy test credentials; test-only HTTP/path-style config; and unconditional `finally` cleanup of that exact container and temporary directory. It mounts no Docker socket, host project data, or production credentials and requires no prestarted stack.

Use a test-only administrative S3 client to create the unique bucket and inspect unfinished multipart uploads. Production code never creates buckets, lists multipart uploads, or deletes completed objects. Poll readiness with a bounded signed S3 call rather than a fixed sleep.

The real integration cases prove: HeadBucket preflight; a small multipart archive using injected 5-MiB parts and queue size two; unchanged uploaded bytes; archive HEAD identity/length; manifest-last PUT followed by HEAD/GET exact body; repeat publication returning already-published without replacement; a conflicting pre-seeded key rejected without changing its body; and cancellation after the first multipart progress event leaving no active multipart upload because `leavePartsOnError` is false. A separate lost-ack transport simulation remains unit-owned; do not add a proxy/server solely to sever one response.

The emulator may expose checksum response fields and SDK request behavior, but the test must state that it does not establish Scaleway compatibility, bucket SSE-ONE, private policy, or independent remote full-file SHA-256. Do not weaken or skip the integration suite when Docker is available; a missing/unavailable Docker runtime is a validation blocker, not evidence of success.

## Plan of Work

After this plan is approved and before production edits, add this indented line directly beneath the B06 checkbox label in `TODO.md`:

    - Plan: [ExecPlan](.agents/plans/b06-publish-completed-snapshots-to-object-storage.md)

Leave B06 as `- [ ]`. Do not alter its label, scope, acceptance, order, B01–B05, or later tasks. Only the workflow coordinator may check B06 after the reviewer returns both `APPROVED` and `REVIEW_READY`.

Implement Milestones 1, 2, and 3 in order. Keep all 54 existing `backupd` tests green after each milestone. Update Progress, discoveries, decisions, outcomes, evidence, and the bottom revision notes at each stopping point. Use explicit `.ts` local imports, type-only imports, erasable syntax, standard Error causes, AbortSignal propagation, secret-free diagnostics, and no generated JavaScript.

Expected production changes are limited to `backupd/package.json`, `backupd/package-lock.json`, `backupd/src/object-storage-config.ts`, `backupd/src/snapshot-manifest.ts`, `backupd/src/s3-snapshot-store.ts`, and `backupd/src/snapshot-publisher.ts`. Add focused tests and at most cohesive private test helpers. Do not wire `backupd/src/main.ts`, change B05 modules unless an implementation-proven type-only compatibility adjustment is unavoidable, or change `strapid`.

Do not edit `BACKUP.md`, backend/frontend source, content types, schemas, bootstrap, generated CMS artifacts, Dockerfiles, Compose, workflows, release files, README, `.env` files, machine/user environment variables, host configuration, or the unrelated Imagen directory.

## Test Strategy and Ownership

`object-storage-config.test.ts` owns the environment/configuration trust boundary. `snapshot-manifest.test.ts` owns keys, manifest, timestamp relations, deadline, part sizing, and stable serialization. `snapshot-publisher.test.ts` owns publication state/order, local fingerprint authorization, exact reconciliation, cancellation, timeout, and failure taxonomy with no process or network. `snapshot-publisher.integration.test.ts` owns only behavior that can drift at the real SDK/S3 boundary: signing/configuration, managed multipart upload, conditional commit, HEAD/GET semantics, repeat publication, and SDK multipart abort cleanup.

Existing B05 tests remain the sole owner of tar validation, full-file SHA-256 computation, metadata validation, staging writer release, and cleanup. B06 uses a valid result and does not duplicate archive parsing. Existing B04 tests remain the owner of capture/recovery identity. No B06 test runs Strapi, fixture children, backend/frontend suites, a browser, Compose, a shared stack, a fixed host port, or live Scaleway.

Unit tests start no process. The one storage integration dependency is task-owned and isolated. All published test ports bind explicitly to `127.0.0.1` and are Docker-assigned. Test values are obviously dummy; no secret or archive content appears in output. Test volume proves behavior rather than maximizing branches.

## Concrete Steps

Work from `/home/codex/src/us-alb` and reconfirm the protected baseline:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch
    mise exec -- node --version
    docker info --format '{{json .SecurityOptions}}'

Expect `backup-system`, both revisions at `c57102d433b268363b1e1d7f98f47a32d69ea504`, only `?? .agents/skills/imagen/scripts/`, Node `v24.20.0`, and rootless Docker. Stop on a moved baseline or overlapping edit; do not inspect the unrelated directory.

After the approved plan link, install exact dependencies through root-selected npm:

    mise exec -- npm install --prefix backupd --save-exact \
      @aws-sdk/client-s3@3.1159.0 \
      @aws-sdk/lib-storage@3.1159.0
    mise exec -- npm ci --prefix backupd

Expect both direct dependencies at 3.1159.0, peer resolution without warnings, and an npm-generated lockfile. Do not hand-edit integrity/resolution fields.

Format only the changed package, then run applicable canonical validation:

    mise run backupd:format
    mise run backupd:check
    mise run backupd:test

Expect Biome and strict no-emit TypeScript to pass and all existing 54 plus focused B06 unit/integration tests to report zero failures/skips. Record the actual final count. No backend/frontend/Strapi/Compose/image change exists, so their checks, generators, startup, builds, smoke tests, and deployment tests are inapplicable.

Inspect dependency and artifact state:

    mise exec -- npm ls --prefix backupd --depth=0
    mise exec -- npm pkg get dependencies --prefix backupd
    find backupd \
      \( -path 'backupd/node_modules' -o -path 'backupd/dist' -o -path 'backupd/build' \) -prune -o \
      -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.map' -o -name '*.tsbuildinfo' \) -print
    test ! -d backupd/dist
    test ! -d backupd/build

Expect exact AWS packages and existing `tar@7.5.22`, no emitted runtime artifact, and no build directory.

Check integration residue using only B06-owned names/labels:

    find /tmp -maxdepth 1 -type d -name 'b06-*' -print
    docker ps --all \
      --filter 'label=us-alb.test-owner=b06' \
      --format '{{.ID}} {{.Names}}'

Both commands must print nothing. If a failed test left a recorded container, remove only that exact ID after verifying its B06 label; never prune Docker or touch another container.

Finish with protected-input and scope inspection:

    git diff --check
    git diff -- BACKUP.md
    git status --short --branch
    git diff -- TODO.md backupd/package.json backupd/package-lock.json \
      backupd/src backupd/test \
      .agents/plans/b06-publish-completed-snapshots-to-object-storage.md

`git diff -- BACKUP.md` must be empty. Status may contain only B06 files plus the separately preserved untracked Imagen directory. Generated backend/frontend artifacts are inapplicable. Do not use live Scaleway credentials or claim a local checksum test verifies Scaleway.

After reviewer approval, the coordinator stages only B06 package/source/tests, this plan, and B06 tracker bookkeeping; verifies the unrelated directory and later tasks are excluded; commits with exact title `B06 — Publish completed snapshots to object storage`; and pushes to `origin/backup-system` before B07 begins.

## Validation and Acceptance

B06 is accepted when process-free tests show the exact 75-GiB input selects a 77-MiB part and 998 parts, every calculated upload stays within 1,000 parts and S3 part bounds, concurrency is four, requests permit no more than three SDK attempts, and the absolute six-hour deadline never resets across request reconstruction.

B06 is accepted when the version-one manifest deterministically contains every required field: format/version, run identity, site/environment, UTC capture time, capture interval, archive key, byte length, full-file SHA-256, Strapi version, Node/release/source/window identity, image digest, and Git revision. It contains no endpoint, bucket, credentials, content, or arbitrary archive metadata.

B06 is accepted when local-file tests prove upload cannot start unless an `O_NOFOLLOW` handle still matches B05's device/inode/size/mtime/ctime and byte length, and a final mismatch prevents manifest publication. The archive stream is unchanged; no extraction, wrapping, compression, encryption, rewrite, or second content model is introduced.

B06 is accepted when publisher tests prove HeadBucket preflight occurs independently before capture orchestration; archive conditional upload precedes archive HEAD; manifest PUT occurs only after archive confirmation; manifest HEAD and exact bounded GET precede success; and no remote delete, latest pointer, alternative key, overwrite, pruning, bucket administration, retention, or completed-object cleanup exists.

B06 is accepted when exact rerun/lost-ack evidence behaves idempotently: matching archive metadata/length is reused, matching manifest bytes return success, an absent object can be retried within the original deadline, and mismatch/missing archive/unknown status fail honestly. ETag, multipart checksum, and custom metadata are never compared to or described as the B05 full-file SHA-256.

B06 is accepted when cancellation or expiry aborts and settles the managed upload, uses `leavePartsOnError: false`, stops mutation for the final reserve, performs at most one bounded exact reconciliation, never publishes a new manifest afterward, and surfaces abort/reconciliation uncertainty with preserved causes. A manifest already committed before cancellation may be recognized only by exact HEAD/GET evidence.

B06 is accepted when the task-owned rootless-container integration binds only `127.0.0.1` on an ephemeral port and proves real AWS SDK HeadBucket, multipart archive upload, conditional non-overwrite, HEAD identity/length, manifest-last PUT, exact GET, repeat reconciliation, and current-upload multipart abort cleanup. It requires no prestarted stack and leaves no container or `/tmp/b06-*` residue.

Canonical acceptance is green `mise run backupd:check` and `mise run backupd:test`, exact dependency evidence, no emitted artifact, clean residue/scope checks, and byte-identical `BACKUP.md`. Live Scaleway checksum-mode confirmation, SSE-ONE/private-bucket policy, dedicated production credentials, retention/versioning/Object Lock, and provider cleanup policy remain explicitly unperformed external prerequisites for B13; local integration must not claim them. B06 remains unchecked until independent reviewer approval.

## Idempotence and Recovery

Dependency install, formatting, checks, and tests are repeatable. `npm ci` recreates only ignored dependencies. Integration creates a unique bucket/container/run on every execution and removes only its task-owned resources in `finally`.

Publication is naturally resumable because every call begins with exact reconciliation and keys never change. If no object exists, retry can upload within the same deadline. If the archive exists exactly, retry skips it and attempts the manifest. If the exact manifest exists, retry returns already published. A conflict never chooses a new key or overwrites. An uncertain status leaves the B05 artifact retained for later B07/B08 reconciliation.

If archive upload fails before completion, `Upload` aborts its own multipart work. If abort confirmation also fails, preserve both causes and report uncertainty; do not list/delete arbitrary uploads. Operator bucket lifecycle remains the safety net for an unhandled process kill. If local fingerprint changes, permanently fail that request and never publish its manifest.

At publication expiry, mutation has already stopped at the reserve boundary. Reconcile only until the original deadline. Exact manifest evidence is success; exact archive without manifest is incomplete and must not advance freshness; absent, conflicting, or unreadable remote state is failure/unknown. Restart never extends the deadline.

If the integration suite fails, inspect only its recorded container ID, label, host port, and temporary directory. Do not switch to a fixed port, shared emulator, live bucket, Docker prune, or blanket cleanup. If LocalStack differs from Scaleway checksum responses, retain provider-neutral assertions and record the live Scaleway check as external; do not weaken archive/manifest ordering, identity, conditional-write, or abort requirements.

Any plan revision must update every affected section and append a revision note. The work can be resumed from this file alone.

## Artifacts and Notes

Planning established this baseline:

    branch/upstream:            backup-system at c57102d433b268363b1e1d7f98f47a32d69ea504
    Node runtime:               v24.20.0
    existing backupd tests:     54 passing
    existing runtime dependency tar: 7.5.22
    selected AWS SDK packages:  3.1159.0, Node >=20
    integration dependency:     localstack/localstack:4.9.2
    integration image digest:   sha256:59373b4a27dba3ec15c4db0b7455f0cb68c8a42300e2cbbe362b440f9a131697
    protected BACKUP.md:        SHA-256 6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533

Context7 selected the official AWS SDK v3 repository and documented `S3Client({ maxAttempts })`, managed `Upload` options, minimum 5-MiB parts, queue size, `leavePartsOnError`, abort signals, request-handler timeouts, and checksum modes. Exact npm 3.1159.0 inspection additionally established:

    lib-storage internal ceiling:       10,000 parts
    bounded buffer statement:           queueSize * partSize
    PutObject IfNoneMatch:               available
    CompleteMultipartUpload IfNoneMatch: available
    managed abort cleanup:               AbortMultipartUpload when upload ID exists
    checksum request options:            SHA256 and COMPOSITE/FULL_OBJECT types

Worker evidence at handoff:

    exact runtime dependencies: @aws-sdk/client-s3 3.1159.0; @aws-sdk/lib-storage 3.1159.0; tar 7.5.22
    clean install/audit:        npm ci; 49 packages; 0 vulnerabilities
    canonical validation:       backupd format/check/test; 74 passed; 0 failed; 0 skipped
    sizing boundary:            80,530,636,800 bytes -> 80,740,352-byte (77 MiB) parts; 998 parts
    SDK integration:            HeadBucket; multipart archive; HEAD; conditional manifest PUT; HEAD/GET exact bytes
    collision evidence:         pre-existing and raced archive/manifest objects remained byte-identical and were rejected
    reconciliation evidence:    exact archive and manifest lost acknowledgements settled without a second mutation
    local authorization:        O_NOFOLLOW plus dev/ino/size/mtime/ctime before and after streaming; mutation blocked manifest
    cancellation evidence:      progress-triggered abort; exact multipart upload disappeared; no completed authorization
    remediation authority:      corrupted/fabricated/nested-mutated requests made zero store calls
    remediation reserve:        exact cutoff/cancellation during local stat made zero remote mutations
    remediation preflight:      ignored abort plus exact 30-second boundary rejected after await
    dependency/artifacts:       exact npm tree; no emitted JS/maps/tsbuildinfo; no dist/build directory
    residue:                    no labeled B06 container and no /tmp/b06-* directory
    protected input:            BACKUP.md SHA-256 6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533
    worktree:                   only TODO link, B06 plan, backupd dependency/source/test files, plus preserved unrelated Imagen directory
    remote prerequisite:        no live Scaleway call; provider checksum behavior and operator bucket controls remain unverified

## Interfaces and Dependencies

`backupd/src/object-storage-config.ts` exports semantic configuration types and factories without exporting secrets in result inspection:

    export interface ObjectStorageConfig {
      readonly endpoint: URL;
      readonly region: string;
      readonly bucket: string;
      readonly credentials: {
        readonly accessKeyId: string;
        readonly secretAccessKey: string;
      };
      readonly forcePathStyle: boolean;
      readonly maximumAttempts: number;
    }

    export interface SnapshotAttribution {
      readonly site: string;
      readonly environment: string;
      readonly imageDigest: string;
      readonly gitRevision: string;
    }

    export interface PublicationPolicy {
      readonly uploadConcurrency: number;
      readonly publicationWindowMs: number;
      readonly finalReconciliationReserveMs: 60_000;
    }

    export interface BackupPublicationConfig {
      readonly storage: ObjectStorageConfig;
      readonly attribution: SnapshotAttribution;
      readonly publication: PublicationPolicy;
    }

    export function parseBackupPublicationConfig(
      environment?: NodeJS.ProcessEnv,
    ): BackupPublicationConfig;

Tests construct the same three cohesive values through an explicit test factory that permits only an HTTP loopback endpoint and path style. No production `allowHttp` boolean exists. `SnapshotAttribution` deliberately has no release ID; request construction derives that field from `ValidatedArchive.capture.identity.releaseId`.

`backupd/src/snapshot-manifest.ts` exports `SnapshotManifestV1`, `SnapshotPublicationRequest`, key and part-size result types, deterministic request construction, serialization/decoding, and:

    export function calculateMultipartPartSize(byteLength: number): {
      readonly partSize: number;
      readonly partCount: number;
    };

    export function createSnapshotPublicationRequest(
      archive: ValidatedArchive,
      attribution: SnapshotAttribution,
      policy: PublicationPolicy,
    ): SnapshotPublicationRequest;

`createSnapshotPublicationRequest` also registers a private canonical authority snapshot. The publisher's internal `authorizeSnapshotPublicationRequest` reconstruction rejects non-constructor objects and any mutation of the public nested archive, capture, attribution, keys, manifest, bytes, fingerprint, or original deadline before store access. Only a fresh canonical operation copy crosses the storage boundary.

`backupd/src/s3-snapshot-store.ts` imports `S3Client`, `HeadBucketCommand`, `HeadObjectCommand`, `GetObjectCommand`, and `PutObjectCommand` from `@aws-sdk/client-s3`, and `Upload` from `@aws-sdk/lib-storage`. It constructs one client per configured publisher, implements `SnapshotStore`, and exposes no raw client or credential. Test-only bucket creation and multipart listing remain in test code.

`backupd/src/snapshot-publisher.ts` exports `SnapshotPublisher`, `ReconciledSnapshot`, `PublishedSnapshot`, `RemoteObjectEvidence`, and `createSnapshotPublisher`. `RemoteObjectEvidence` contains bucket-independent object key, byte length, opaque ETag/version/checksum fields when present, and confirmed identity fields; it contains no credentials or SDK response object. The production store and publisher preserve causes and accept AbortSignal on every public operation.

B05 remains the local validation/hash/staging authority. B06 rechecks but never changes its result or calls cleanup. B07 later owns collision-resistant run creation, persisted six-hour deadline, durable pending-publication state, and freshness advancement using only `PublishedSnapshot`. B08 calls destination preflight before capture, creates the request after B05 validation, drives retry/reconciliation, and performs staging cleanup without extending the deadline.

B09 maps B06 stable codes and phases to safe telemetry; keys may appear only in bounded traces/logs, never metric labels, and secrets/SDK bodies never escape. B10 passes B06 settings only to `backupd`, packages the runtime dependencies, and provides image/Git/site/environment attribution; it does not give storage credentials to `strapid`, backend, frontend, or Collector. B12 adds the established checks/integration requirements to CI/release without live cloud credentials or a prestarted stack. B13 records the actual configuration names and explicitly performs or records as unperformed the live Scaleway checksum, private bucket, SSE-ONE, policy, retention, and recovery prerequisites.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B06 plan after complete authoritative-input and pushed B05 interface review, the allowed three official Context7 AWS SDK v3 commands, exact npm 3.1159.0 type/source inspection, and rootless Docker/image verification. Self-review removed duplicate caller-supplied release identity so the B05 captured terminal remains its sole authority. The plan fixes exact dependencies, configuration trust boundaries, immutable keys, the complete version-one manifest, B05 fingerprint recheck, 1,000-part sizing, bounded upload/deadline behavior, conditional archive-first/manifest-last publication, exact lost-ack reconciliation, isolated integration coverage, external checksum limits, and later-task boundaries without changing production code, `TODO.md`, or `BACKUP.md`.

Revision note (2026-10-29 / Codex worker): Started the approved implementation at the protected pushed B05 baseline, re-read the governing documents and exact B05 interfaces, refreshed official AWS SDK v3 guidance through Context7, and linked the still-unchecked B06 tracker item before production edits.

Revision note (2026-10-29 / Codex worker): Completed all three implementation milestones and recorded final evidence. The revision captures the SDK credential-annotation and asynchronous cleanup discoveries, the decisions they required, exact 71-test canonical results, dependency/artifact/residue/protected-file checks, conditional race and lost-ack proofs, explicit live-Scaleway limitations, and the remaining independent-review gate without checking B06 or changing later-task ownership.

Revision note (2026-10-29 / Codex worker remediation cycle 1): Addressed all three reviewer findings without changing B06 scope. The plan now records private request authority and provenance validation, explicit post-I/O reserve/cancellation linearization, absolute post-await preflight validation, the new zero-call/zero-mutation adversarial evidence, and clean-install 74-test results while retaining prior lost-ack, post-commit reconciliation, LocalStack, protected-file, and external-Scaleway constraints.

Revision note (2026-10-29 / Codex coordinator): Recorded independent `APPROVED` after the reviewer replayed every mutable-field authority probe through publish and reconcile, exact cutoff/cancellation and abort-ignoring preflight probes, and the full 74-test LocalStack suite; checked B06 and finalized the plan for commit.

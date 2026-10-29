# Implement bounded capture coordination

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B04 — Implement bounded capture coordination` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B04, `backupd` can contact `strapid` over a private Unix-domain socket, verify that it is speaking to the expected supervisor instance, release, and production source, and request one bounded Strapi capture. `strapid` acknowledges the capture only after normal serving has stopped cleanly, runs the standard uncompressed and unencrypted export with every default stage enabled, confirms export output and process ownership are closed, restores a live and healthy serving child, and returns a terminal result tied to the same capture window. A lost requester does not strand Strapi offline: disconnect, cancellation, expiry, or requester failure invalidates the artifact and cancels export, while `strapid` continues recovery independently.

The result is observable entirely through native unit and integration tests. Tests use temporary Unix sockets, task-owned Node fixture children, and loopback HTTP health fixtures on operating-system-assigned ephemeral ports. They demonstrate the 60/600/30/210 phase limits inside one non-resetting 900-second window, acknowledgement and terminal-response ordering, forced-stop rejection, disconnect and cancellation behavior, recovery after failed export, recovery failure, exact identity reconciliation, supervisor replacement, and rejection of unknown or stale results. No test starts Strapi, Docker, Compose, a backend suite, or a prestarted service.

## Progress

- [x] (2026-10-29 13:32Z) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, the pushed B01–B03 plans, and the current B01–B03 implementation.
- [x] (2026-10-29 13:32Z) Confirmed branch `backup-system` and `origin/backup-system` are both at pushed B03 commit `6c609b880540efa19bafcbba469c9ffa89c83fbc`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present.
- [x] (2026-10-29 13:32Z) Consulted current Node.js 24 Unix-socket and HTTP lifecycle documentation through Context7 and verified success/disconnect event ordering plus socket unlink behavior under exact Node v24.20.0.
- [x] (2026-10-29 13:32Z) Created this self-contained B04 ExecPlan with the versioned wire contract, ownership, deadlines, material event orderings, test boundaries, validation, and later-task boundaries.
- [x] (2026-10-29 13:47Z) Self-reviewed the complete plan against B04 and `BACKUP.md`; made provisional admission and intentional-shutdown linearization explicit, bounded preflight, and corrected forced serving confirmation to remain inside the 60-second shutdown allocation.
- [x] (2026-10-29) Re-read the approved plan and authoritative worker inputs at pushed B03 commit `6c609b880540efa19bafcbba469c9ffa89c83fbc`; added the B04 plan link beneath the unchecked task without changing `BACKUP.md` or the protected Imagen directory.
- [x] (2026-10-29) Implemented and formatted the version-one shared contract, non-resetting capture budget, coordinator, bounded Unix-socket HTTP server, and destructive-timeout `backupd` client without dependencies or generated runtime output.
- [x] (2026-10-29) Integrated capture-cycle and intentional-shutdown arbitration into main while retaining B03 as the only serving/export child and B02 workspace owner; added process-free runtime request preflight and generation-stable serving confirmation.
- [x] (2026-10-29) Added focused unit tests plus Unix-socket and exact fixture-child integration tests. Canonical format/check passed; full native suites passed with 62 `strapid` and 9 `backupd` tests; focused expiry, forced-stop, output/workspace ordering, disconnect/reconciliation, main re-arm, and shutdown-without-restart cases passed.
- [x] (2026-10-29) Remediation cycle 1: implemented post-await monotonic export/recovery deadline checks, strict independent `backupd` response reconstruction plus NDJSON media/framing enforcement, and one idempotent per-window terminal-delivery promise. Deterministic focused probes and full canonical validation pass with 69 `strapid` and 11 `backupd` tests; residue, artifact, dependency, protected-file, scope, and diff checks are clean.
- [x] (2026-10-29) Remediation cycle 2: require an empty NDJSON trailing buffer before a transport-loss terminal can authorize capture, catch that framing failure inside the once-settled loss path, and cover it with process-free and real abrupt Unix-socket regressions. Focused tests and canonical validation pass with 69 `strapid` and 13 `backupd` tests; residue, artifact, dependency, protected-file, scope, and diff checks are clean.
- [x] (2026-10-29) Obtained independent reviewer approval after remediation cycle 2; the workflow coordinator checked B04 and finalized review bookkeeping.

## Surprises & Discoveries

- Observation: B03 already preserves the exact unsafe-export ownership needed by B04.
  Evidence: `strapid/src/strapi-supervisor.ts` publishes `ActiveExportOperation` before workspace preparation, returns bounded `recovery-failed` without releasing the B02 workspace when close/group absence is unconfirmed, and permits cleanup only through `reconfirmOwnedChildExit`. B04 must call this API rather than add a second child or workspace owner.

- Observation: B03's current normal monitor does not learn about an intentional capture stop.
  Evidence: `superviseStrapi` waits on the serving-loss promise associated with the old child. `stopServing` deliberately suppresses the unexpected-loss observer, so a capture can stop and restart serving while the main loop remains attached to a promise that will never report the new generation. B04 needs an explicit capture-cycle event in the application composition so normal monitoring is re-armed after recovery.

- Observation: A held HTTP response can distinguish terminal completion from premature loss without treating every request `close` as cancellation.
  Evidence: On Node v24.20.0, a normal Unix-socket response emitted `finish` with `writableEnded=true` and `writableFinished=true`, then `close`; a client destroyed after the first line caused response `close` with both flags false. Incoming request `close` occurred in both cases with `request.complete=true`, so response/internal terminal state, not request `close` alone, must own invalidation.

- Observation: Node's ordinary HTTP timeout options do not abort work on their own.
  Evidence: Node 24 documentation states that client `timeout`/`setTimeout` only emit `timeout`; code must destroy the request. A server's default request timeout concerns receiving the request, not the duration of the response. B04 therefore uses explicit body/header limits, disables response inactivity timeout for an admitted window, and uses independent monotonic timers for capture phases and client response lifetime.

- Observation: Node removes a Unix socket path on normal server close, but an abrupt process failure can leave an address that must not be blindly deleted.
  Evidence: The exact-runtime probe found the server-created path absent after `server.close()`. Startup recovery must still treat an existing path conservatively: fail on a non-socket, probe a socket, reject a live listener, and unlink only an exact socket that refuses connection.

- Observation: Admission preflight needed an outer abort boundary in addition to aborting the health probe.
  Evidence: The runtime inspector includes asynchronous filesystem inspection and does not accept a signal. The implementation now races that promise against the same disconnect/shutdown/10-second admission signal, so a delayed inspection cannot authorize interruption after its window; its eventual result is observed but ignored.

- Observation: The main-loop re-arm regression is observable only after a complete capture cycle.
  Evidence: A fixture integration capture recovered generation two, then intentionally ended that exact serving group. Main observed the new generation's loss and started generation three, proving the abandoned pre-capture loss promise is not reused.

- Observation: A scheduled deadline callback is not itself an authorization boundary.
  Evidence: A promise can settle after its absolute cutoff before the event loop dispatches the timer. Remediation tests drive the injected clock to 301 ms after a 300 ms export cutoff and 501 ms after a 500 ms recovery cutoff; explicit post-await clock reads now prevent both late results from authorizing `captured` or healthy recovery.

- Observation: State-idempotent terminal commit did not imply transport-idempotent terminal delivery.
  Evidence: Shutdown and normal recovery could both receive the same committed record and independently call the observer. The active window now owns one lazily-created delivery promise; a delayed-observer shutdown/recovery race observes exactly one call and one `supervisor-shutdown` terminal.

- Observation: Compile-time shared types do not validate untrusted `backupd` wire data.
  Evidence: Type assertions and object spreading preserved unknown response fields and admitted incomplete variant checks. The client now independently reconstructs every status/record/outcome from exact keys, validates budget relationships and staging ownership, and owns incremental NDJSON media type, UTF-8, newline, ordering, size, and envelope checks.

- Observation: A decoded terminal record is not authorizing evidence while any later received bytes remain outside a complete NDJSON line.
  Evidence: The normal response-end path checked the trailing buffer, but transport loss read the already-decoded terminal directly. A real Unix-socket response containing accepted and captured lines followed by partial `{"type"` therefore exposed the terminal before validating the response-wide framing. Both normal end and loss now use the same complete-framing check; the loss callback catches and settles a framing error exactly once.

## Decision Log

- Decision: Use protocol version 1 over one private Unix socket with four endpoints and no TCP listener or web framework.
  Rationale: `GET /v1/status` establishes current identity/readiness, `POST /v1/captures` holds the capture response, `GET /v1/captures/:windowId` reconciles an exact window, and `DELETE /v1/captures/:windowId` requests explicit cancellation. Node's built-in HTTP parser, JSON, and `socketPath` provide all required behavior. Unix filesystem permissions are the transport access boundary; B10 later owns the shared volume, group, and Compose wiring.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use newline-delimited JSON for the held capture response: zero or one `accepted` record followed by exactly one `terminal` record.
  Rationale: The server must not acknowledge a capture before clean serving shutdown, while the requester needs a stable capture-window identity and a terminal result after recovery. The client supplies the collision-resistant window ID, so reconciliation remains possible even if the connection fails before acknowledgement. A forced/failed stop produces a terminal invalid result without an accepted record; a valid export can begin only after the accepted record is logically emitted.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Generate a new `supervisorInstanceId` with `crypto.randomUUID()` on every `strapid` process start, and require a client-generated UUID `captureWindowId` plus expected release and source identities on every capture.
  Rationale: A process restart necessarily loses in-memory capture ownership. Exact instance/window matching makes that loss explicit: a new supervisor returns `supervisor_replaced` for an old instance and can never confirm the old window. Expected release/source matching also prevents a preflight against one deployment from authorizing a capture after local replacement.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Treat release and source-volume identities as required opaque deployment inputs, and derive runtime identity/readiness locally.
  Rationale: B10 later supplies the application image digest/Git revision as `STRAPID_RELEASE_ID` and the project source-volume identity as `STRAPID_SOURCE_VOLUME_ID` without container-management access. B04 validates these as bounded non-secret tokens. Runtime preflight confirms Node v24.20.0, Strapi 5.52.0, fixed B02 executable/application paths, absolute data/configuration paths, writable workspace/staging roots, and current serving health. It never exposes environment values or filesystem contents.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Start one monotonic capture clock immediately before stopping serving, and never reallocate unused phase time.
  Rationale: Preflight occurs while serving remains available and is outside backend interruption. From the interruption start, clean shutdown has at most 60 seconds; export has at most 600 seconds from its actual start and never beyond the point that preserves later reserves; exporter termination has at most 30 seconds; recovery has at most 210 seconds from its actual start and never beyond the absolute 900-second deadline. Fast earlier phases shorten the outage instead of enlarging later phases, and every retry derives time from the original deadline.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Split the 30-second exporter termination reserve into 25 seconds for `SIGTERM` and 5 seconds for `SIGKILL` confirmation, use the same 5-second confirmation inside the 60-second serving-stop allocation, and reserve the same final 30 seconds inside recovery for cleanup of a failed serving attempt.
  Rationale: B03 requires separate graceful and forced bounds. Export termination is 25/5 and capture serving stop is 55/5, so forced confirmation never extends either authoritative allocation. The 5-second value matches B03's existing normal-supervision default and is a technical nested split, not a claim of measured performance. The configuration owner validates it as positive and strictly less than both the serving-stop and exporter-termination allocations.
  Date/Author: 2026-10-29 / Codex planner

- Decision: A capture becomes `captured` only after B03 reports zero export exit following output/process-group/workspace closure and after replacement serving passes live-child plus `/_health` recovery.
  Rationale: An accepted window, CLI zero exit, archive presence, or service recovery alone is insufficient. Disconnect, explicit cancellation, expiry, forced serving stop, nonzero/signal exit, output failure, supervisor shutdown, or identity change permanently invalidates the window. B05 must still validate the archive, so B04's `captured` result is necessary evidence, not independent upload authorization.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Make internal terminalization, not socket `finish`, the cancellation cutoff.
  Rationale: The server records the exact terminal result atomically before attempting the final response write. A connection loss before that transition invalidates the active window; a loss afterward is a lost acknowledgement and must be reconciled by identity. `finish` proves Node handed bytes to the transport, not that `backupd` received them.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep capture recovery independent of the request connection but subordinate to intentional container shutdown.
  Rationale: Disconnect/cancel/expiry abort only export eligibility and the exporter; the coordinator continues recovery under its own remaining deadline. A `SIGTERM`/`SIGINT` to `strapid` instead marks `supervisor-shutdown`, stops new HTTP admission, and delegates active-child shutdown to B03 without starting serving again. This preserves B03's intentional-shutdown guarantee.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep one active and one most-recent terminal window in memory for the current supervisor instance.
  Rationale: B04 needs immediate lost-ack reconciliation but does not own durable scheduling/publication state; B07 and B08 do. Exact older IDs become `unknown_window`, which is safely unusable rather than guessed. The one-pending-artifact policy means no unbounded in-memory history is needed.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Share protocol shapes at compile time without adding a third runtime package.
  Rationale: `strapid/src/capture-contract.ts` is the versioned semantic authority. `backupd/src/capture-client.ts` uses an explicit type-only import from that file, which Node erases and therefore does not create a runtime service dependency. Server request validation and client response validation remain separate because each is a distinct untrusted JSON boundary; a real cross-package Unix-socket integration test prevents codec drift. A third package or generated artifact would add more tooling and packaging complexity than this small contract warrants.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Let coordination failure degrade capture availability, not ordinary Strapi availability.
  Rationale: `strapid` starts and monitors serving before accepting captures and never contacts `backupd` or the Collector. Missing/invalid capture identity settings, runtime-preflight failure, or socket-bind failure produces a secret-free local error and rejects/unavailable capture coordination without stopping a healthy serving child. B10 must still provide valid settings and validate the deployed socket.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add no dependency and change no backend, frontend, schema, Compose, image, CI, release, or environment file in B04.
  Rationale: Node built-ins and B03 are sufficient. B05–B09 own later backup behavior, B10 owns containers/settings/volumes, and B12 owns CI/release. There is no backend/frontend change, so generated API artifacts and Strapi startup validation are inapplicable.
  Date/Author: 2026-10-29 / Codex planner

## Outcomes & Retrospective

Worker implementation and remediation cycles 1–2 are complete, canonically validated, and independently approved. The delivered version-one contract, one-clock 60/600/30/210 budget, Unix-socket transport, exact identity reconciliation, strict independent client decoding, client cancellation/timeout policy, B03-only child ownership, single terminal delivery, and main capture/shutdown arbitration are covered by 69 passing `strapid` and 13 passing `backupd` tests.

The fixture evidence confirms acceptance only after graceful serving stop; exact `--no-encrypt --no-compress` export invocation with no stage filter; descendant/output and B02 workspace closure before `captured`; zero exporter spawns after forced serving stop; expiry/cancellation followed by healthy recovery; no serving recovery after unconfirmed export ownership; monitor re-arm against the recovered generation; and no replacement during intentional shutdown. Remediation evidence proves that timer-dispatch lag cannot authorize export completion at 301 ms past a 300 ms cutoff or recovery at 501 ms past a 500 ms cutoff, while exact-boundary 300/500 ms results remain valid; a shutdown/recovery race with a delayed observer performs one terminal call and retains `supervisor-shutdown`. Process-free adversarial client tests reject unknown fields, invalid variants/optionals/budgets/staging paths/timestamps, wrong media types, incomplete or misordered NDJSON, and a decoded terminal followed by unterminated trailing data. Real Unix-socket tests confirm that abrupt loss after that adversarial trailing fragment cannot authorize `captured`, while held NDJSON order, exact reconciliation, explicit DELETE, 16-KiB request rejection, mode `0660`, socket removal, and preservation of a non-socket path remain covered. Independent review reproduced the exact deadline, duplicate-delivery, strict-decoder, and abrupt-loss cases before approval. B05 archive validation/staging ownership, storage, scheduling, telemetry, containers, and release work remain intentionally unimplemented. B04 is checked only after that approval.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; both `HEAD` and `origin/backup-system` are `6c609b880540efa19bafcbba469c9ffa89c83fbc`, the pushed B03 commit. Do not switch branches. The unrelated untracked `.agents/skills/imagen/scripts/` directory must remain unread, unformatted, unstaged, and unchanged.

`strapid/` and `backupd/` are independent private ESM TypeScript packages executed directly by Node v24.20.0. Local imports spell `.ts`, type imports use `import type`, and syntax remains erasable under strict no-emit TypeScript. B04 adds no loader, transpiler, emitted JavaScript, nested runtime pin, or npm dependency.

`strapid/src/strapi-supervisor.ts` is the only child owner. It exposes serving start/stop, export, serving-loss observation, retained-owner reconfirmation, shutdown, and a snapshot. Export admission publishes its internal operation before any await. A successful `runExport` returns only after direct `close`, process-group disappearance, closed output, the B02 callback, and workspace cleanup. `recovery-failed` retains unsafe ownership and blocks serving. B04 may extend this module only with a read-only `confirmServingReady` method that reuses B03's live-child plus health checker; it must not spawn, signal, or clean children elsewhere.

`strapid/src/strapi-runtime.ts` owns fixed runtime paths and B02 workspace validation. Refactor its existing private validation into an exported process-free `validateStrapiWorkspaceRequest` and add an injected/testable runtime-inspection function rather than duplicating archive-path or environment rules. `runExport` continues to use `withStrapiDataTransferWorkspace` unchanged.

`strapid/src/main.ts` currently owns normal startup, unexpected-loss recovery, and signals. B04 adds capture cycles to that composition. The application loop must observe a capture-start event before the coordinator calls `stopServing`, suspend its ordinary loss/restart branch while the capture owns lifecycle changes, and re-arm `waitForServingLoss` against the recovered generation after a healthy terminal result. On capture recovery failure it exits nonzero; on intentional signal it invalidates the window, stops HTTP admission, calls B03 shutdown, and never recovers serving.

A Unix-domain socket is a filesystem-named local connection, not a TCP port. The initial socket path is `/coordination/strapid.sock`; B10 later mounts the project-scoped coordination volume and supplies shared nonroot permissions. B04 validates an absolute socket path, creates only its parent directory, sets the created socket to mode `0660`, and publishes no host or container port.

The B04 composition reads `STRAPID_COORDINATION_SOCKET_PATH` with that default and reads required `STRAPID_RELEASE_ID` and `STRAPID_SOURCE_VOLUME_ID`. Empty or malformed identities make capture status unavailable and reject capture, but do not stop serving. B10 later passes the real values to `strapid`; B04 neither invents a production identity nor changes an `.env` file.

## Minimal Shared Wire Contract, Version 1

Create `strapid/src/capture-contract.ts` as the semantic protocol authority. It defines only plain erasable TypeScript types, constants, bounded validators, and JSON encoders/decoders. It contains no supervisor, filesystem, or HTTP behavior. `backupd/src/capture-client.ts` imports these types with `import type` and independently validates received unknown JSON at its trust boundary.

Every body or response record has `version: 1`. UUID fields must be canonical UUID strings. `releaseId` and `sourceVolumeId` are nonempty visible-ASCII tokens of at most 256 bytes and may contain digest/Git/Compose punctuation but no whitespace or control characters. Node/Strapi versions are nonempty visible-ASCII tokens of at most 64 bytes and must match the runtime inspection exactly. JSON bodies are UTF-8, use `application/json`, and are limited to 16 KiB. Held responses use `application/x-ndjson`; every record is one complete JSON object of at most 16 KiB followed by `\n`, the total held response is at most 32 KiB, and no output/content diagnostic is included.

The identity carried on every window record is:

    export interface CaptureIdentity {
      readonly supervisorInstanceId: string;
      readonly captureWindowId: string;
      readonly releaseId: string;
      readonly sourceVolumeId: string;
      readonly nodeVersion: string;
      readonly strapiVersion: string;
    }

`GET /v1/status` returns HTTP 200 and one `CaptureServiceStatus` JSON object with this semantic union:

    export type CaptureServiceStatus =
      | {
          readonly version: 1;
          readonly runtimeReady: true;
          readonly supervisorInstanceId: string;
          readonly releaseId: string;
          readonly sourceVolumeId: string;
          readonly nodeVersion: string;
          readonly strapiVersion: string;
          readonly supervisorState: SupervisorState;
          readonly healthyServing: boolean;
          readonly budget: CaptureBudgetPolicy;
          readonly activeCaptureWindowId?: string;
        }
      | {
          readonly version: 1;
          readonly runtimeReady: false;
          readonly supervisorInstanceId: string;
          readonly reason:
            | "configuration_invalid"
            | "runtime_unavailable"
            | "serving_unavailable";
        };

The ready variant contains the current identity inputs, the authoritative total plus four phase allocations, and the technical forced-confirmation split in milliseconds. The unavailable variant contains no secret path, environment value, or exception prose. This endpoint may perform a short live-child/health confirmation when no capture owns the supervisor; capture admission always repeats the check.

`POST /v1/captures` accepts exactly:

    export interface CaptureRequest {
      readonly version: 1;
      readonly captureWindowId: string;
      readonly expectedSupervisorInstanceId: string;
      readonly expectedReleaseId: string;
      readonly expectedSourceVolumeId: string;
      readonly expectedNodeVersion: string;
      readonly expectedStrapiVersion: string;
      readonly archiveBasePath: string;
    }

The client obtains expected values from `GET /v1/status`. The archive base is an absolute descendant of `/staging` and is validated through B02 before interruption. B05 later owns allocating that run-specific directory, capacity, size enforcement, and cleanup. The supervised Strapi export creates its archive at that base; B04 does not allocate the directory, validate archive contents, hash, upload, adopt, or delete the artifact.

Before a window is admitted, malformed/oversized/media-type requests return 400/413/415; an identity mismatch or duplicate/stale window returns 409; an active different window returns 409 `capture_busy`; and unavailable runtime/health returns 503. These are ordinary JSON errors and do not stop serving. Once admitted, the response is HTTP 200 NDJSON and remains open through recovery.

After, and only after, `stopServing` returns `graceful` within the shutdown deadline, write this first record:

    export interface CaptureAcceptedRecord {
      readonly version: 1;
      readonly type: "accepted";
      readonly identity: CaptureIdentity;
      readonly archiveBasePath: string;
      readonly startedAt: string;
      readonly deadlineAt: string;
      readonly acceptedAt: string;
    }

A forced/failed/late serving stop never emits `accepted` and never starts export. The server still holds an attached response through recovery when possible and emits the terminal invalid or recovery-failed record.

The terminal record is:

    export type CaptureInvalidReason =
      | "client_disconnected"
      | "client_cancelled"
      | "window_expired"
      | "forced_serving_stop"
      | "serving_stop_failed"
      | "export_failed"
      | "export_cancelled"
      | "export_setup_failed";

    export type CaptureTerminalOutcome =
      | {
          readonly status: "captured";
          readonly exportClosedAt: string;
          readonly servingRecoveredAt: string;
        }
      | {
          readonly status: "invalid";
          readonly reason: CaptureInvalidReason;
          readonly servingRecoveredAt: string;
        }
      | {
          readonly status: "recovery-failed";
          readonly captureReason?: CaptureInvalidReason;
          readonly reason:
            | "export_ownership_unconfirmed"
            | "serving_ownership_unconfirmed"
            | "serving_recovery_failed"
            | "recovery_expired";
        }
      | {
          readonly status: "supervisor-shutdown";
        };

    export interface CaptureTerminalRecord {
      readonly version: 1;
      readonly type: "terminal";
      readonly identity: CaptureIdentity;
      readonly archiveBasePath: string;
      readonly startedAt: string;
      readonly deadlineAt: string;
      readonly acceptedAt?: string;
      readonly completedAt: string;
      readonly outcome: CaptureTerminalOutcome;
    }

Only an exact current-instance/current-window `captured` record is eligible input to B05 archive validation. It is not by itself permission to upload. `invalid`, `recovery-failed`, `supervisor-shutdown`, malformed, unknown, or supervisor-replaced outcomes are permanently ineligible, even if an archive later appears or current serving is healthy.

`GET /v1/captures/:captureWindowId?supervisorInstanceId=<uuid>` returns the exact active phase or terminal record for the current/most-recent window. An active record includes only identity, archive base, timestamps, and one phase from `preflight`, `stopping`, `exporting`, `terminating-export`, or `recovering`; it cannot claim capture success. A different instance returns 409 `supervisor_replaced` with only the current instance ID. An unknown exact window under the current instance returns 404 `unknown_window`. Never substitute the latest record for the requested ID.

The status shape is:

    export interface CaptureActiveRecord {
      readonly version: 1;
      readonly type: "active";
      readonly identity: CaptureIdentity;
      readonly archiveBasePath: string;
      readonly startedAt?: string;
      readonly deadlineAt?: string;
      readonly acceptedAt?: string;
      readonly phase:
        | "preflight"
        | "stopping"
        | "exporting"
        | "terminating-export"
        | "recovering";
    }

    export type CaptureWindowStatus =
      | CaptureActiveRecord
      | CaptureTerminalRecord
      | {
          readonly version: 1;
          readonly type: "unusable";
          readonly reason: "unknown_window" | "supervisor_replaced";
          readonly currentSupervisorInstanceId: string;
        };

`DELETE /v1/captures/:captureWindowId` accepts a small JSON body containing `version` and `supervisorInstanceId`. It returns 202 when it invalidates the exact active window, 200 when that exact window is already terminal, 409 for replacement/mismatch, and 404 for unknown. Cancellation is idempotent and affects export eligibility only; recovery continues.

`backupd/src/capture-client.ts` exposes status, start, reconcile, and cancel methods using `http.request({ socketPath, ... })`, `Connection: close`, explicit content length, an AbortSignal, response-size limits, and independent wall timers that destroy timed-out requests. Status/cancel requests default to 10 seconds. A held capture request defaults to the advertised 900-second server window plus the server's 10-second admission-preflight bound plus 10 seconds of transport grace, for 920 seconds at the defaults; these client-side allowances cannot extend the server's interruption deadline. All values are constructor-injected for tests, and a caller AbortSignal can end them earlier. Capture parsing enforces record order and identity: `captured` requires a prior accepted record on the same live response or the exact terminal record from reconciliation. A transport loss before terminal returns `reconciliation-required` with the exact identity rather than success. One immediate exact status lookup may resolve a lost terminal acknowledgement; active, unknown, replaced, or malformed status remains non-authorizing.

## Capture Budget and Deadline Ownership

Create `strapid/src/capture-budget.ts` with a pure `CaptureBudgetPolicy`, configuration parser, and monotonic `CaptureTimeline`. Initial configurable defaults are exactly:

    totalWindowMs:             900_000
    servingShutdownMs:          60_000
    exportExecutionMs:         600_000
    exporterTerminationMs:      30_000
    recoveryMs:                210_000
    forcedConfirmationMs:        5_000

The configuration boundary reads `STRAPID_CAPTURE_WINDOW_SECONDS`, `STRAPID_SERVING_SHUTDOWN_SECONDS`, `STRAPID_EXPORT_SECONDS`, `STRAPID_EXPORT_TERMINATION_SECONDS`, `STRAPID_RECOVERY_SECONDS`, and `STRAPID_FORCE_CONFIRMATION_SECONDS`, without mutating any environment. Validate positive finite integer seconds, `servingShutdown + exportExecution + exporterTermination + recovery === totalWindow`, and `0 < forcedConfirmation < min(servingShutdown, exporterTermination) < recovery`. Malformed configuration disables capture admission but does not stop normal serving. Tests inject millisecond policies directly; production converts seconds once.

Use `performance.now()` for enforcement and `Date` only for informational UTC wire timestamps. At interruption start `S`, set the immutable overall deadline `S + totalWindowMs`. Derive, never extend, phase deadlines as follows:

    shutdownDeadline = min(S + servingShutdownMs, overallDeadline)
    exportDeadline = min(exportStarted + exportExecutionMs,
                         overallDeadline - exporterTerminationMs - recoveryMs)
    terminationDeadline = min(terminationStarted + exporterTerminationMs,
                              overallDeadline - recoveryMs)
    recoveryDeadline = min(recoveryStarted + recoveryMs, overallDeadline)

Unused phase time is not added to a later phase. A retry calls `remaining(deadline)` against the same monotonic value; it never constructs a new full phase deadline. One timer expires export at `exportDeadline`. The coordinator disposes every timer on terminalization.

For B03 exporter cancellation, pass `gracefulTimeoutMs = exporterTerminationMs - forcedConfirmationMs`, `forcedTimeoutMs = forcedConfirmationMs`, and a small injected poll interval. For capture serving stop, pass `gracefulTimeoutMs = servingShutdownMs - forcedConfirmationMs` and `forcedTimeoutMs = forcedConfirmationMs`; the 55/5 defaults remain wholly inside the 60-second phase. A forced result is invalid and never consumes export work. Recovery begins only after safe serving-stop ownership is known.

For recovery, reserve the final exporter-termination allocation inside the 210-second recovery phase for cleanup of an unhealthy replacement. Each `startServing` call receives `startupTimeoutMs = remainingRecovery - exporterTerminationMs`, clipped positive, and the same 25/5 termination bounds. Early safe failure may retry after an abortable, deadline-clipped 500-millisecond delay; an unhealthy live attempt consumes the remaining health allowance and cleanup reserve. No retry begins without enough time for cleanup. An unconfirmed group stops retries immediately.

## Capture Lifecycle and Material Event Ordering

Create `strapid/src/capture-coordinator.ts`. It owns one active `CaptureWindow`, one most-recent terminal record, one supervisor-instance UUID, the monotonic timeline, window invalidation, and recovery sequencing. It never spawns or signals a child directly.

Admission performs these steps while serving remains available. First synchronously reserve one provisional admission token keyed by the requested instance/window so a second request cannot pass during asynchronous preflight. Validate exact expected identities, run B02 runtime/request preflight, require `supervisor.snapshot().state === "serving"`, and call the new B03 `confirmServingReady` method with an injected health policy bounded to 10 seconds. The server uses an independent abortable 10-second admission timer, so runtime inspection plus health cannot hold an unadmitted request indefinitely; this time is outside and cannot extend the 900-second interruption window. A disconnect, cancellation, or admission expiry during this provisional phase aborts preflight and releases the token without stopping serving or creating a reconcilable capture. After successful health, synchronously promote the token to the active `preflight` window, publish the capture-start event for the main monitor, and only then perform the first lifecycle await. This is the capture admission point.

Create the independent timeline immediately after promotion and set phase `stopping` before calling B03. A clean graceful stop observed no later than the immutable shutdown deadline permits the `accepted` record. Deliver that small record through an injected asynchronous observer and wait for its write attempt; if the response closes or the write fails before completion, invalidate the window and skip export. Only a still-valid accepted window changes phase to `exporting`. A forced result, thrown stop, late result, disconnect, cancellation, or supervisor shutdown makes the window invalid. Forced or failed stop never calls `runExport`; if ownership is resolved, proceed to recovery.

Call `supervisor.runExport` with the exact B02 request:

    operation supplied by B03: "export"
    filePath: request.archiveBasePath
    arguments: ["--no-encrypt", "--no-compress"]
    environment: inherited absolute runtime environment

Do not pass `--only`, `--exclude`, stage names, compression, or encryption values; omitting filters selects all standard Strapi stages. Supply a streaming output sink that drains and discards chunks without retaining or logging them. B09 later replaces this sink with secret filtering, advisory aggregation, bounded buffering, and OTEL forwarding.

The export AbortSignal fires on the earliest of explicit cancellation, response disconnect before terminal commit, export deadline, overall expiry, or supervisor shutdown. Once invalidated, success cannot be restored even if the child exits zero. `runExport` itself owns close, output closure, group disappearance, workspace cleanup, and cancellation precedence. A `recovery-failed` export result terminalizes recovery failure and never starts serving. Any safely resolved zero/nonzero/signal/cancelled result proceeds to recovery; only zero with no prior invalidation remains capture-valid.

Recovery changes phase to `recovering` and no longer depends on the request, response, or `backupd`. It calls B03 `startServing` with remaining deadline-derived health/termination bounds. Safe early failures may retry from `recovery-required`; unconfirmed ownership or deadline exhaustion produces `recovery-failed`. A live child plus successful `/_health` before the recovery deadline produces healthy recovery. The coordinator then terminalizes exactly once: `captured` only for a still-valid zero export, otherwise `invalid` with healthy recovery. Commit the terminal record internally first, invoke/await the response sink's terminal write attempt second, and resolve the capture-cycle observer used by main third. A missing/closed response makes the sink a no-op and cannot delay recovery or alter the committed result.

Response/socket close before terminal commit calls `invalidate("client_disconnected")` once. Close after terminal commit is a lost acknowledgement and does not alter the result. `request.close` after a complete body is ignored as a cancellation signal. Explicit DELETE records `client_cancelled`; export timer records `window_expired`; first invalidation reason wins. The terminal record remains available for exact reconciliation until another window is admitted or this supervisor exits.

A new `strapid` process creates a new supervisor instance and has no previous terminal record. A query with the old instance returns `supervisor_replaced`; a query with the new instance and old window returns `unknown_window`. Neither response can become captured through current health or a later exporter exit.

## Milestone 1: Establish protocol, configuration, and client boundaries

Add `strapid/src/capture-contract.ts`, `strapid/src/capture-budget.ts`, and `backupd/src/capture-client.ts`. Refactor `strapid/src/strapi-runtime.ts` only enough to expose process-free request/runtime preflight, and extend `StrapiSupervisor` with `confirmServingReady` that checks the current child generation before and after the existing health helper. Do not add another health implementation.

Add process-free tests in `strapid/test/capture-budget.test.ts`, `strapid/test/capture-contract.test.ts`, and `backupd/test/capture-client.test.ts`. They establish default relationships, dynamic phase deadlines, non-resetting retries, malformed configuration, UUID/token/body/record validation, accepted/terminal ordering, exact identity matching, and the rule that only exact `captured` can proceed to B05 validation. Unit tests use fake clock values and start no server or child.

Milestone acceptance is green `mise run strapid:check`, `mise run strapid:test`, `mise run backupd:check`, and `mise run backupd:test`, with no emitted output. At this point no HTTP server or child orchestration exists, but both packages agree on the exact version-1 shapes and deadline policy.

## Milestone 2: Implement one bounded capture independently of HTTP

Add `strapid/src/capture-coordinator.ts` with injected supervisor, runtime inspector, clock/timer factory, identities, budget, health policies, output sink, and event observer. The production factory supplies B03, `performance.now`, `Date`, `setTimeout`, `randomUUID`, fixed runtime paths, and the discard sink. Tests may inject time and observers, but not a second child owner.

Use pure unit tests for invalidation precedence and terminal eligibility. Add `strapid/test/capture-coordinator.integration.test.ts` with B03's real test supervisor and task-owned fixture children for cross-boundary behavior that fakes cannot prove. Cover clean stop/accepted/export/output-close/recovery ordering, exact standard arguments, forced-stop rejection with zero exporter spawns, client cancellation during export, export expiry and bounded termination, nonzero export followed by healthy recovery, output callback failure, disconnect-independent recovery, and recovery failure. Reuse the existing B03 fixture modes and helpers rather than duplicating process-group assertions.

The successful fixture writes a final output marker from a descendant before closure; the test records that marker before the coordinator commits `captured`. Every scenario checks exact PIDs/workspaces in `finally`. HTTP is not involved in this milestone, so failures localize to lifecycle orchestration.

Milestone acceptance is a coordinator that can be driven directly, always returns serving to healthy state after safely resolved invalid captures, never starts export after forced stop, never starts serving while B03 ownership is unresolved, and never resets a deadline.

## Milestone 3: Add the Unix-socket server, cross-package client, and application composition

Add `strapid/src/capture-http.ts`. Create `node:http` with `requestTimeout: 10_000`, `headersTimeout: 10_000`, `keepAliveTimeout: 5_000`, `maxHeaderSize: 8_192`, and `server.timeout = 0`. For an admitted held response, explicitly disable socket inactivity timeout. Parse a maximum 16-KiB body, reject unsupported method/path/media type, and write `Cache-Control: no-store`, `Connection: close`, and the correct JSON/NDJSON content type.

Start only on the absolute configured socket path. If the path exists, `lstat` must show a socket; probe it with a short Unix-socket request. A successful connection means another listener owns it and startup fails. `ECONNREFUSED` permits unlinking only that exact socket and one bind retry. A regular file, symlink, unexpected error, or changed identity is never deleted. After listen, set mode `0660`. Normal close awaits `server.close`, ends/destroys task-owned connections as appropriate, and verifies the created socket is gone.

The POST handler registers response `close` before admission and delegates lifecycle work to the coordinator. It may write `accepted` only from the coordinator's post-stop event. It commits terminal state in the coordinator first, then attempts the final line and `end`. Response close with no internal terminal invokes invalidation; close after terminal does not. Handler rejection before admission returns a bounded JSON error. After admission, errors become a terminal outcome/status record rather than an unrelated second response.

Add `backupd/test/capture-client.integration.test.ts`. It starts the real Unix server under a short `mkdtemp` path and uses the production `backupd` client. Cover status/preflight, held accepted/terminal parsing, normal terminal close, premature client destruction and exact reconciliation, explicit DELETE, response/body limits, busy admission, exact stale-window rejection, and replacement by a new server instance. This is the authoritative server/client serialization compatibility test; do not duplicate it in both packages.

Refactor `strapid/src/main.ts` to compose normal supervision and capture cycles. Start serving and health first. Start the socket whenever its path and transport configuration are safe; missing identity or failed runtime inspection is represented by `runtimeReady: false` and 503 capture admission, while socket bind failure leaves serving monitored without coordination. The monitor races unexpected serving loss, capture-cycle start, and process shutdown. Capture start is published synchronously before stop so the normal monitor yields lifecycle ownership. After a healthy capture terminal, re-arm loss monitoring against the recovered child. Recovery failure ends main nonzero.

The first `SIGTERM`/`SIGINT` sets the application shutdown flag, synchronously stops new HTTP admission, and invokes `beginSupervisorShutdown`; that method synchronously freezes/rejects any provisional admission, commits `supervisor-shutdown` for an admitted window, aborts export work, and prevents recovery before returning its completion promise. Main then invokes B03 `shutdown` immediately, without awaiting the coordinator first. Await the coordinator's terminal response attempt, B03 shutdown, and HTTP close together; after the response is ended, destroy only remaining task-owned sockets if needed. The coordinator treats any in-flight stop/export/start result after the shutdown mark as dominated, performs no serving restart, and resolves the capture-cycle observer. Later signals coalesce onto the same promises.

Update `strapid/test/main.integration.test.ts` rather than duplicating its signal test. Prove normal startup still needs no client or Collector, an idle socket does not affect serving, one admitted cycle returns monitoring to the recovered generation, and intentional shutdown during capture starts no replacement. HTTP health fixtures bind only `127.0.0.1:0`; coordination uses only the temporary Unix path.

Milestone acceptance is a complete local protocol: the real client can hold a capture request through fixture export and recovery, a destroyed client cannot strand serving or produce a usable result, and exact status reconciliation distinguishes terminal, active, unknown, and replaced windows.

## Plan of Work

After this plan is approved and before production edits, add this indented line directly beneath the B04 checkbox label in `TODO.md`:

    - Plan: [ExecPlan](.agents/plans/b04-implement-bounded-capture-coordination.md)

Leave B04 as `- [ ]`. Do not alter its label, order, acceptance text, B01–B03, or later tasks. Only the workflow coordinator may check B04 after the reviewer returns both `APPROVED` and `REVIEW_READY`.

Implement Milestone 1 first and keep both packages green. Implement the coordinator without HTTP next so deadline and lifecycle defects are not hidden behind transport behavior. Add Unix transport and main composition only after the direct coordinator scenarios pass. Use targeted patches and update this living plan at every stopping point.

Expected task-owned production changes are limited to `strapid/src/capture-contract.ts`, `capture-budget.ts`, `capture-coordinator.ts`, `capture-http.ts`, narrow extensions to `strapi-runtime.ts`, `strapi-supervisor.ts`, and `main.ts`, plus `backupd/src/capture-client.ts`. Add corresponding focused tests and only the fixture/test-helper changes required by those scenarios. Package manifests and lockfiles should remain unchanged because no dependency is added.

Do not edit `BACKUP.md`, backend/frontend source, schemas, bootstrap, generated CMS artifacts, Dockerfiles, Compose, workflows, release files, README, `.env` files, machine/user environment variables, or host configuration. Do not inspect, format, stage, or modify the unrelated Imagen directory.

## Test Strategy and Ownership

Unit tests start no process, server, or child. `capture-budget.test.ts` owns arithmetic/configuration. `capture-contract.test.ts` owns server-side request validation and terminal eligibility. `capture-client.test.ts` owns client decoding, ordering, size, timeout, and identity policy using injected streams/functions rather than a live server.

`capture-coordinator.integration.test.ts` owns B03 lifecycle integration with task-owned fixture children. It does not duplicate B03's process-group mechanics; it observes only capture-level ordering and results. `capture-client.integration.test.ts` owns Unix HTTP semantics and cross-package wire compatibility. `main.integration.test.ts` owns application signal/capture-monitor interaction. Existing B02/B03 tests remain authoritative for workspace paths, child close/group disappearance, health request internals, and intentional child shutdown.

All socket tests create one short task-owned directory under `/tmp`, use no TCP coordination port, and remove the exact socket/directory in `finally`. Any health fixture binds `127.0.0.1` with port `0` and closes its server. Every child fixture has a finite self-expiry and exact PID/PGID cleanup. No test invokes real Strapi, reads production data, uses Docker, or requires a prestarted stack.

The planned additions are approximately eighteen `strapid` cases and eight `backupd` cases, initially targeting about 60 passing `strapid` tests from the current 42 and 8 passing `backupd` tests from the current zero. Preserve meaningful scenario splits and update this plan with the actual stable counts rather than shaping coverage to estimates.

## Concrete Steps

Work from `/home/codex/src/us-alb` and reconfirm the protected baseline:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch
    mise exec -- node --version

Expect `backup-system`, both revisions at `6c609b880540efa19bafcbba469c9ffa89c83fbc`, only `?? .agents/skills/imagen/scripts/`, and `v24.20.0`. Stop if the baseline moved or an overlapping edit appears.

After recording the approved plan link, implement and format only both daemon packages:

    mise run strapid:format
    mise run backupd:format

Run all applicable canonical package validation:

    mise run strapid:check
    mise run strapid:test
    mise run backupd:check
    mise run backupd:test

Expect Biome and strict no-emit TypeScript checks to pass for both packages, all existing 42 B03 tests to remain green, every new unit/integration case to pass, and no fixture process, workspace, timer, server, or socket to remain. Record exact final counts in Progress and Artifacts and Notes.

Prove that B04 introduced no generated runtime or dependency:

    find strapid backupd \
      \( -path '*/node_modules' -o -path '*/dist' -o -path '*/build' \) -prune -o \
      -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print
    test ! -d strapid/dist
    test ! -d strapid/build
    test ! -d backupd/dist
    test ! -d backupd/build
    mise exec -- npm ls --prefix strapid --depth=0
    mise exec -- npm ls --prefix backupd --depth=0

The `find` command must print nothing; directory checks succeed; both dependency trees remain the existing Biome, Node types, and TypeScript development toolchain.

Finish with protected-input and scope inspection:

    git diff --check
    git diff -- BACKUP.md
    git status --short --branch
    git diff -- TODO.md strapid backupd .agents/plans/b04-implement-bounded-capture-coordination.md

`git diff -- BACKUP.md` must be empty. Status may contain only B04 files plus the separately preserved untracked Imagen directory. Do not run backend/frontend generators, builds, tests, Strapi startup, image builds, Compose rendering, browser checks, smoke tests, or deployment tests because B04 changes none of those areas.

Do not commit or push during planning or worker implementation. After review approval, the coordinator stages only B04 code/tests, this plan, and B04's tracker bookkeeping; verifies the unrelated directory and later tasks are excluded; commits with exact title `B04 — Implement bounded capture coordination`; and pushes to `origin/backup-system` before B05 begins.

## Validation and Acceptance

B04 is accepted when status over the Unix socket reports one current supervisor instance and exact release/source/runtime readiness, and a capture request with any mismatched identity is rejected before the interruption clock or serving stop. Only one capture is admitted. The socket has no TCP listener, body/header bounds are enforced, long response inactivity is explicitly permitted, and normal close removes the socket.

B04 is accepted when the first response record appears only after B03 returns a graceful serving stop within 60 seconds. Forced, failed, late, disconnected, cancelled, expired, or supervisor-shutdown windows never start export or never remain eligible, as appropriate. The invoked export argument vector contains exactly the B02 CLI/export/file arguments plus `--no-encrypt` and `--no-compress`, with no stage filter, compression, encryption, shell, npm, or npx.

B04 is accepted when export execution is capped at 600 seconds, cancellation/expiry has at most the 30-second 25/5 termination split, and recovery has at most 210 seconds, all under the original 900-second monotonic deadline. Unit evidence shows phase/retry deadlines never reset. Integration evidence shows output and descendants close before `captured`, and unsafe ownership yields `recovery-failed` without a concurrent serving start.

B04 is accepted when every safely resolved capture path attempts recovery independently of the request. A requester destroyed during export causes cancellation and invalidation, but fixture serving returns healthy and the exact status is terminal invalid. A recovery failure is terminal `recovery-failed`, never captured. Intentional container shutdown remains distinct and starts no replacement.

B04 is accepted when the production `backupd` client parses accepted/terminal records, uses explicit destructive timeouts, and reconciles only the exact instance/window. Current exact captured may proceed to B05 validation; active returns pending; malformed, invalid, recovery-failed, unknown, and supervisor-replaced are unusable. A new healthy supervisor cannot turn an old partial archive into success.

All code remains ESM TypeScript with explicit `.ts` local imports, type-only imports, erasable syntax, cancellation propagation, preserved causes, and secret-free diagnostics. Unit tests start no process. Integration starts only task-owned fixture children and temporary Unix/loopback servers. No backend, frontend, content type, schema, Strapi version, CMS pipeline, bootstrap, `NEXT_PUBLIC_APP_VERSION`, image, Compose, CI/release, `.env`, machine/user environment, or `BACKUP.md` change is present. B04 remains unchecked until independent reviewer approval.

## Idempotence and Recovery

All checks/tests are repeatable. Tests use unique UUIDs, short `mkdtemp` socket directories, injected millisecond budgets, and exact cleanup in `finally`. Re-running never adopts an archive or removes staging. Never use broad process-name kills, globs for destructive cleanup, Docker prune, or repository-wide reset/clean commands.

On server startup, remove only an exact stale socket after `lstat` confirms socket type and a connection probe returns `ECONNREFUSED`. If a listener responds, a path is not a socket, identity changes during probing, or an unexpected error occurs, stop capture-server startup and leave the path untouched. Ordinary serving remains monitored.

On client disconnect, do not destroy the coordinator promise. Invalidate the window, cancel export if present, and await recovery/status internally. If the response is gone, commit the terminal record for reconciliation and suppress only the impossible write. On retry, exact status is safe; replaying POST does not start a second capture.

If exporter exit is unconfirmed, leave B03's retained handle, safe-exit gate, and workspace intact. Do not clean or reuse staging and do not start serving. `reconfirmOwnedChildExit` remains B03's only later non-destructive release path. B05/B08 may later decide operational retry/reconciliation; B04 reports the current recovery failure honestly.

If recovery expires after ownership was safely resolved, retain terminal recovery failure and let main exit nonzero after closing coordination. Do not report capture success because an archive exists. If intentional process shutdown occurs, mark the window invalid, stop new requests, delegate to B03 shutdown, and do not run capture recovery.

Any plan revision must update all affected sections and append a revision note. The work can be resumed from this file alone.

## Artifacts and Notes

Planning established this baseline:

    branch/upstream:      backup-system at 6c609b880540efa19bafcbba469c9ffa89c83fbc
    Node runtime:         v24.20.0
    existing strapid:     42 passing native tests
    existing backupd:     0 native tests
    Strapi version:       5.52.0
    protected BACKUP.md:  SHA-256 6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533

The disposable exact-runtime Unix-socket probe observed:

    normal:    response finish ended=true finished=true; then response close
    premature: response close ended=false finished=false
    request:   close occurred for both normal and premature completed requests
    shutdown:  server.close removed the created Unix socket path

The probe used one exact `/tmp/b04-http-probe-*` directory, removed it, changed no repository file, and left no listener. This evidence selects response/internal-terminal state rather than incoming request close as the cancellation owner.

Worker validation evidence:

    mise run strapid:format    pass; 25 files already formatted
    mise run strapid:check     pass; Biome plus strict no-emit TypeScript
    mise run strapid:test      pass; 69 tests, 0 failed/skipped
    mise run backupd:format    pass; 7 files formatted
    mise run backupd:check     pass; Biome plus strict no-emit TypeScript
    mise run backupd:test      pass; 13 tests, 0 failed/skipped

Focused cases passed for non-resetting deadline arithmetic, post-await export/recovery clock cutoffs at 300/301 and 500/501 ms, one delayed terminal delivery under shutdown/recovery overlap, strict client variant/budget/optional decoding, NDJSON media/framing/order, fully framed terminal loss, adversarial terminal-plus-partial abrupt loss, export expiry, forced serving stop with zero exporter spawns, exact output/workspace-before-terminal ordering, disconnect and DELETE invalidation with independent recovery, stale/replaced reconciliation, recovered-generation monitoring, and intentional shutdown during export. The first `strapid` full regression run had one transient clean-capture timing failure; that exact case passed twice in isolation and the complete rerun passed all 69 tests. The invoked B02 argument vector was exactly `strapi.js export --file <base> --no-encrypt --no-compress`; no stage filters were present. Final residue checks found no B04 Unix-socket directories, B02 workspaces, or fixture child/process groups. Artifact inspection found no emitted JavaScript/build directories and both dependency trees remain the existing Biome, Node types, and TypeScript toolchain. `BACKUP.md` retained SHA-256 `6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533`; `git diff --check` passed; B04 is still unchecked; nothing is staged, committed, or pushed; and the unrelated Imagen directory remains outside every read/format/stage operation.

## Interfaces and Dependencies

B04 uses only Node built-ins: `node:http`, `node:net` as needed for stale-socket probing, `node:crypto` for UUIDs, `node:fs/promises`, `node:path`, `node:perf_hooks`, and timers. It adds no npm package.

`capture-contract.ts` owns version-1 shapes and bounded server validators. `capture-budget.ts` owns configuration relationships and monotonic phase calculations. `capture-coordinator.ts` owns admission, one active window, invalidation, deadline timers, B03 calls, recovery, and terminal records. `capture-http.ts` owns routes, body/response framing, transport lifecycle, socket creation/removal, and response-close notification. `capture-client.ts` owns `backupd` request framing, client timeouts, NDJSON decoding, exact reconciliation, and typed unusable results. `main.ts` owns application-level normal/capture/shutdown arbitration.

The narrow B02/B03 extensions are:

    export function validateStrapiWorkspaceRequest(
      request: StrapiWorkspaceRequest,
    ): void;

    export type CaptureRuntimeInspection =
      | {
          readonly ready: true;
          readonly nodeVersion: string;
          readonly strapiVersion: string;
        }
      | {
          readonly ready: false;
          readonly reason: "configuration_invalid" | "runtime_unavailable";
        };

    export interface CaptureRuntimeInspector {
      inspect(request: StrapiWorkspaceRequest): Promise<CaptureRuntimeInspection>;
    }

    // Method added to StrapiSupervisor.
    confirmServingReady(
      health: ServingHealthPolicy,
      signal?: AbortSignal,
    ): Promise<void>;

The production inspector uses fixed B02 paths and effective absolute environment paths; tests inject filesystem behavior. `confirmServingReady` snapshots the exact active child and generation, calls the existing `waitForServingHealth`, and rechecks state/identity afterward. It has no transition and cannot make an unavailable child healthy by itself.

The coordinator interface is semantically:

    export interface CaptureResponseObserver {
      accepted(record: CaptureAcceptedRecord): Promise<void>;
      terminal(record: CaptureTerminalRecord): Promise<void>;
    }

    export interface CaptureCycle {
      readonly identity: CaptureIdentity;
      readonly terminal: Promise<CaptureTerminalRecord>;
    }

    export interface CaptureCoordinator {
      readonly supervisorInstanceId: string;
      getServiceStatus(signal?: AbortSignal): Promise<CaptureServiceStatus>;
      beginCapture(
        request: CaptureRequest,
        observer: CaptureResponseObserver,
        admissionSignal: AbortSignal,
      ): Promise<CaptureTerminalRecord>;
      getWindowStatus(
        supervisorInstanceId: string,
        captureWindowId: string,
      ): CaptureWindowStatus;
      cancel(
        supervisorInstanceId: string,
        captureWindowId: string,
      ): boolean;
      waitForCycleStart(): Promise<CaptureCycle>;
      beginSupervisorShutdown(): Promise<void>;
    }

`beginCapture` has only one caller per admitted HTTP request. `waitForCycleStart` is published synchronously at admission and is consumed by the main monitor so it yields normal lifecycle ownership before `stopServing`. Calling `beginSupervisorShutdown` is idempotent and performs its admission freeze, invalidation, and no-restart mark synchronously before returning a promise for terminal-response completion; main starts B03 shutdown without first awaiting that promise.

The public client interface is semantically:

    export interface CaptureClient {
      getStatus(signal?: AbortSignal): Promise<CaptureServiceStatus>;
      startCapture(
        request: CaptureRequest,
        options?: {
          readonly signal?: AbortSignal;
          readonly onAccepted?: (record: CaptureAcceptedRecord) => void;
        },
      ): Promise<
        | CaptureTerminalRecord
        | {
            readonly status: "reconciliation-required";
            readonly identity: CaptureIdentity;
          }
      >;
      reconcile(
        identity: CaptureIdentity,
        signal?: AbortSignal,
      ): Promise<CaptureWindowStatus>;
      cancel(
        identity: Pick<
          CaptureIdentity,
          "supervisorInstanceId" | "captureWindowId"
        >,
        signal?: AbortSignal,
      ): Promise<void>;
    }

B05 consumes cancellation and captured/path ownership but owns capacity, allocation, archive limit, tar/metadata/hash validation, partial cleanup, and the rule that staging is never cleaned while B03 may write. B06 owns object storage and manifest publication; a B04 result never performs storage I/O. B07 owns scheduling and durable state; B04 reconciliation is in-memory and instance-scoped. B08 owns destination/capacity preflight ordering and the full backup lifecycle. B09 replaces the discard sink with safe observability. B10 embeds/wires both daemons, the socket volume and permissions, settings, release/source identities, and container entrypoint. B04 does not implement any of those later concerns early.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B04 plan after complete authoritative-input review, pushed B03 API/ordering inspection, Context7 Node 24 Unix-socket research, and an exact-runtime HTTP lifecycle probe. The plan fixes the version-1 wire contract, identities, one non-resetting 900-second timeline with 60/600/30/210 allocations, B03/main arbitration, disconnect/terminal cutoff, independent recovery, exact stale-result rejection, isolated test strategy, validation, and later-task boundaries without changing `BACKUP.md`, `TODO.md`, or production code.

Revision note (2026-10-29 / Codex planner): Self-review made the admission and terminal linearization points explicit, completed the ready/unavailable and active/terminal/unusable wire unions, separated intentional supervisor shutdown from healthy-recovery invalid outcomes, added exact client timeout/size policy and narrow B02/B03 interfaces, bounded admission preflight, kept serving escalation inside its 60-second allocation, and clarified that main observes a terminal cycle only after the final response write has been attempted.

Revision note (2026-10-29 / Codex worker): Began implementation from the approved pushed B03 baseline, re-read all authoritative inputs and current B03 production/tests, and recorded the required unchecked B04 tracker link. No production behavior had changed at this stopping point.

Revision note (2026-10-29 / Codex worker): Implemented Milestones 1–3 and added focused process-free, fixture-child, Unix-socket cross-package, and main-arbitration coverage. Focused checks exposed and corrected abortability of asynchronous admission inspection, immediate exact reconciliation after transport loss, and re-arming normal monitoring against the recovered serving generation. Full canonical validation and final evidence recording remain pending.

Revision note (2026-10-29 / Codex worker): Completed canonical validation with 62 passing `strapid` and 9 passing `backupd` tests. Final hardening made accepted/export admission honor the preserved recovery reserve, prevented an expired window from spawning, serialized one immediate loss reconciliation, closed coordination on main-level recovery failure, verified socket mode/removal and non-socket preservation, and recorded clean artifact/dependency/process/workspace/protected-file evidence. Implementation is ready for independent review; B04 remains unchecked.

Revision note (2026-10-29 / Codex worker, remediation cycle 1): Addressed all three reviewer findings without changing the approved protocol: added explicit post-export and post-recovery monotonic authorization checks, replaced permissive client casts/spreads with strict independent decoders and an incremental NDJSON framing owner, and converged shutdown/recovery terminal writes on one active-window delivery promise. Deterministic focused boundary and race tests pass; full canonical validation and final evidence are pending.

Revision note (2026-10-29 / Codex worker, remediation cycle 1 validation): Completed full canonical validation with 69 passing `strapid` and 11 passing `backupd` tests. Exact clock-boundary, delayed single-delivery race, adversarial strict-decoder, media-type, and newline-framing probes pass; no emitted artifacts, dependency changes, fixture processes/groups, workspaces, or sockets remain; protected-file and scoped-diff checks pass; B04 remains unchecked and nothing is staged, committed, or pushed.

Revision note (2026-10-29 / Codex worker, remediation cycle 2): Closed the sole remaining authorization gap by making the abrupt transport-loss path prove response-wide NDJSON framing before accepting an already-decoded terminal and by catching framing failure inside the idempotent loss settlement. A process-free decoder regression preserves fully framed terminal behavior while rejecting trailing partial bytes, and a real Unix-socket adversarial response now proves abrupt loss cannot return `captured`. Focused tests pass; full canonical validation and final evidence are pending.

Revision note (2026-10-29 / Codex worker, remediation cycle 2 validation): Completed canonical format/check/test with 69 passing `strapid` and 13 passing `backupd` tests. The two focused framing probes pass independently; an initial transient clean-capture timing failure passed twice in isolation and on the full rerun. No emitted artifacts, dependency changes, fixture processes/groups, workspaces, or sockets remain; `BACKUP.md`, the unchecked B04 tracker state, the protected Imagen directory, scoped diff, and staging state are preserved; nothing was committed or pushed.

Revision note (2026-10-29 / Codex coordinator): Recorded independent `APPROVED` after the reviewer reproduced exact-boundary deadline behavior, single terminal delivery, strict decoder rejection, malformed-tail loss rejection, and fully framed terminal-loss acceptance; canonical validation remained green at 69 `strapid` and 13 `backupd` tests. Checked B04 and finalized the plan for commit.

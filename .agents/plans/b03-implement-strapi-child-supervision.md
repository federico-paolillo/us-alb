# Implement Strapi child supervision

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B03 — Implement Strapi child supervision` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B03, `strapid` can start the compiled Strapi CLI as its serving child, notice a serving failure, restart only after the old process group is confirmed gone, and declare recovery complete only after the replacement child is still alive and its built-in `/_health` route returns a successful HTTP response. The same supervisor exposes an exclusive export primitive for B04: serving must first be stopped, an export and its ordinary subprocesses are owned as one Linux process group, and serving cannot start again until the export child has emitted `close` and that entire process group has disappeared.

The behavior is demonstrated without running Strapi or a project stack. Native integration tests start only task-owned Node fixture children. They show direct-child exit and stdio closure, descendant termination, graceful-to-forced escalation, spawn failure, cancellation, live-child plus HTTP health, export/serving exclusion, restart ordering, and intentional `SIGTERM`/`SIGINT` shutdown. HTTP fixtures bind only to `127.0.0.1` on an operating-system-assigned ephemeral port. Normal `strapid` startup invokes no `backupd`, Collector, socket, or remote service.

## Progress

- [x] (2026-10-29 12:27Z) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, and the completed B01/B02 plans and implementation.
- [x] (2026-10-29 12:27Z) Confirmed branch `backup-system` and its upstream are both at pushed B02 commit `5c647cf91d8a641358cf959906907d40bc214b2a`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present.
- [x] (2026-10-29 12:27Z) Consulted current Node.js 24 documentation through Context7, inspected the installed Strapi 5.52.0 `/_health` implementation, and prototyped detached Linux process-group behavior under the exact Node v24.20.0 runtime.
- [x] (2026-10-29 12:27Z) Created this self-contained B03 ExecPlan with concrete ownership, state transitions, event orderings, interfaces, fixture protocols, validation, and later-task boundaries.
- [x] (2026-10-29 12:31Z) Added the approved B03 plan link beneath the unchecked B03 item in `TODO.md` without changing later queue items.
- [x] (2026-10-29 12:43Z) Implemented and formatted the process-group, health, lifecycle, supervisor, and main modules without changing B02's workspace contract.
- [x] (2026-10-29 12:44Z) Added pure lifecycle coverage and task-owned fixture-child integration coverage for close/group ordering, health, exclusion, cancellation, retained-workspace recovery, unexpected loss, and intentional shutdown.
- [x] (2026-10-29 12:46Z) Passed `strapid:check`, all 38 native tests, artifact/dependency inspection, exact PID/workspace residue checks, `git diff --check`, `BACKUP.md` preservation, and scoped diff review.
- [x] (2026-10-29 13:08Z) Completed remediation cycle 1 under design-approved revision 5: absolute monotonic health request deadlines, admission-time `ActiveExportOperation` ownership, deterministic preparation/shutdown/retention/cleanup tests, 42 passing native tests, canonical checks, and residue/scope inspection.
- [x] (2026-10-29 13:19Z) Completed remediation cycle 2: replaced the timing-dependent unconfirmed-shutdown regression with a narrow controlled boundary over a real managed fixture group, proved pending direct wait/workspace callback/gate state, corrected stale retrospective evidence, passed five focused repetitions plus 42 full tests, and completed residue/protected-file/scope checks.
- [x] (2026-10-29 14:20Z) Obtained independent reviewer approval after remediation cycle 2; the coordinator checked B03 and finalized review bookkeeping.

## Surprises & Discoveries

- Observation: A near-zero forced-confirmation timeout does not deterministically prove the direct-exit-pending ordering.
  Evidence: Reviewer finding 1 in remediation cycle 2 identified that Linux may deliver `SIGKILL`, reap the direct child, and publish Node exit events before a `0.001` millisecond bound is observed. The regression needs a narrow test-only boundary immediately before export shutdown termination while retaining the real managed fixture group and real exact cleanup.

- Observation: `ClientRequest.setTimeout` measures socket inactivity, so a slow-drip 2xx response can outlive the fixed startup deadline.
  Evidence: Reviewer finding 1 identified that the initial health implementation reset effective waiting on response activity and did not recheck the monotonic deadline after response drain. Revision 5 requires an independent wall-clock timer clipped to the remaining startup budget.

- Observation: Publishing export ownership only after workspace preparation leaves shutdown without the operation it must invalidate and await.
  Evidence: Reviewer finding 2 identified an await window between `exporting` admission and child publication. The approved revision-5 protocol moves a unique active export operation into supervisor state synchronously before workspace creation and makes both callback and shutdown converge on its idempotent retention record and terminal-result control.

- Observation: Intentional shutdown must be rechecked around a loss-driven replacement, not only during initial startup.
  Evidence: Composition review found that a signal can arrive after `waitForServingLoss` resolves but while replacement health polling is pending. The monitor now treats that replacement exactly like initial startup: shutdown wins before and after every await, and stale supervisor generations cannot publish readiness or restart again.

- Observation: Finite-lifetime signal fixtures need a referenced expiry timer, and a final event must exit from the stdout write callback.
  Evidence: The first focused process-group run showed an ignore-SIGTERM fixture leaving naturally because its only timer was unreferenced, while `process.exit()` could discard the tail-close JSON write. Keeping the 30-second expiry referenced and exiting after the write callback makes the fixture both bounded and deterministic.

- Observation: B02's workspace callback already provides the required cleanup boundary, but B03 must make its meaning stronger than direct-child exit alone.
  Evidence: `strapid/src/strapi-runtime.ts` removes the unique workspace only after the callback promise settles, and its comment requires B03 to settle on child `close`. Node 24 documents that `close` follows `exit` or spawn `error` and means the child's stdio streams have closed. B03 must additionally prove the detached process group no longer exists before settling that callback.

- Observation: The installed Strapi health route has a stable machine-observable status and no response-body contract is needed.
  Evidence: `backend/node_modules/@strapi/core/dist/services/server/index.js` registers all methods at `/_health` and returns HTTP 204. B03 can accept any 2xx response while draining the response, but it must separately require the managed serving child to remain live.

- Observation: `detached: true` supplies the required Linux ownership boundary when the child is still referenced and is invoked without a shell.
  Evidence: A disposable Node v24.20.0 prototype spawned a detached child that spawned its own child. `/proc` reported the direct child as process-group and session leader and the descendant in the same group; `process.kill(-childPid, "SIGTERM")` terminated both, and a later group probe with signal `0` returned `ESRCH`. The observed identities were structurally `child PID = child PGID = child SID` and `grandchild PGID = child PID`.

- Observation: AbortSignal cancellation on `child_process.spawn` is not sufficient for this design.
  Evidence: Node documents that aborting a spawned child emits an `AbortError` and applies the configured kill signal to the direct child. B03 must instead signal the negative process-group ID, escalate independently, and confirm group disappearance; the caller's cancellation may initiate cleanup but may not cancel the safety-critical cleanup itself.

## Decision Log

- Decision: Support the deployed Linux process model explicitly and use one detached process group per serving or export child.
  Rationale: On Linux, `spawn(..., { detached: true, shell: false })` makes the child a new process-group/session leader, and ordinary descendants inherit that group. Signaling `-pid` reaches the owned group without a shell, Docker socket, host process API, or custom traversal. The production factory will reject a non-Linux platform rather than claim an unproved equivalent. The child is never `unref()`ed. Strapi is invoked directly and is not expected to call `setsid`; discovery that it deliberately escapes the group is a blocker, not a reason to weaken exit confirmation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Treat direct-child `close` and confirmed process-group disappearance as one indivisible completion condition.
  Rationale: `exit` can precede stdio closure, and a direct child can exit while a descendant remains. A successful or failed CLI exit is safe for workspace cleanup and serving restart only after both conditions hold. `ESRCH` from `process.kill(-pgid, 0)` means the group is absent; `EPERM` or another probe failure is not absence and therefore becomes a recovery failure.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Put graceful `SIGTERM`, bounded wait, `SIGKILL`, bounded confirmation, and lingering-descendant cleanup in one low-level process-group owner.
  Rationale: Every serving and export path then uses the same safety rule. Cancellation and outer health timeouts trigger this owner but do not interrupt its confirmation work. If confirmation still fails after escalation, the owner preserves the cause and process-group ID in a typed, secret-free error; the supervisor records `recovery-failed` and refuses to spawn serving.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use one `StrapiSupervisor` instance and one pure lifecycle transition function as the sole serving/export ownership authority.
  Rationale: A state change is made synchronously before any spawn or await, so two overlapping calls cannot both pass admission. The supervisor holds at most one `ManagedProcessGroup`, and every start, stop, export, recovery, and shutdown path goes through the same transition owner. No filesystem lock, second supervisor, or parallel export runner is needed inside one `strapid` process.
  Date/Author: 2026-10-29 / Codex planner

- Decision: B03 exposes `startServing`, `stopServing`, `runExport`, `waitForServingLoss`, `reconfirmOwnedChildExit`, and `shutdown`, but does not expose a capture-window orchestration method.
  Rationale: These primitives make overlap impossible and preserve all exit ordering while leaving B04 responsible for socket admission, the absolute 900-second window, 60/600/30/210 allocation, connection cancellation/expiry, capture identity, response lifetime, and the complete stop-export-recover result protocol. B03's methods accept caller-supplied health and termination bounds so B04 can later derive them from one non-resetting deadline.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep B03's normal-startup timings as private composition defaults, separate from capture budgets.
  Rationale: B03 needs a bounded standalone main before B04 exists, but it must not claim ownership of B04's agreed allocation. `main.ts` will use a 120-second health window, 2-second request timeout, 500-millisecond retry interval, 30-second graceful container-shutdown wait, 5-second forced confirmation wait, and 50-millisecond group-probe interval. These are uncalibrated normal-supervision defaults, not the capture budget or a production guarantee. B04 will supply capture-specific bounds, and B10 will own service configuration and container stop integration.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Require both a live direct child and a complete 2xx `/_health` response for readiness.
  Rationale: A health endpoint can respond from an unrelated or stale listener, while a live process can be hung or not yet ready. The health loop checks the owned child's live flag before each attempt and after the drained response. It retries connection failures, request timeout, and non-2xx responses only until its fixed health deadline or caller cancellation.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep child output out of supervision errors and make export output a required streaming callback boundary.
  Rationale: Serving output may inherit the parent streams. Export stdout/stderr must be drained immediately to avoid child blockage, but B09 later owns filtering, advisory parsing, bounded buffering, and telemetry. B03 therefore accepts non-throwing chunk callbacks for export and never includes arguments, environment values, output, archive paths, or diagnostic contents in errors. If a callback throws, supervision cancels and confirms the export group before preserving that cause.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Do not change Compose, the backend image, CI/release files, or generated API artifacts in B03.
  Rationale: B10 embeds `strapid` and changes the image/Compose entrypoint, while B12 owns CI/release. B03 changes only the existing `strapid` package, its tests/fixtures, `TODO.md` for the approved-plan link, and this plan. No backend/frontend source or API contract changes, so `be:openapi`, `fe:openapi`, and `be:types` are inapplicable.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep the additional scenario splits that make Node report 38 total tests rather than shaping the suite to the planning estimate of 27.
  Rationale: The native runner counts nested zero/nonzero/signal/spawn/output and individual health outcomes separately. Implementation review also justified distinct unexpected-loss and retained-workspace reconfirmation scenarios. These remain focused at their owning boundaries and directly prove material B03 risks.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Adopt the reviewer-approved revision-5 `ActiveExportOperation` protocol for remediation cycle 1.
  Rationale: One admission-time operation supplies a linearization owner before any await, makes intentional shutdown dominate provisional ordinary outcomes, ensures no-child branches await exact workspace cleanup, and lets either bounded shutdown termination or the workspace callback perform one idempotent retention handoff without releasing an unsafe writer. It preserves the B02 callback API and does not add a mutex.
  Date/Author: 2026-10-29 / Codex worker, design approved by reviewer

- Decision: Control only the export-shutdown termination call in the cycle-2 ordering regression, and expose only a read-only retained-operation test snapshot.
  Rationale: Throwing the typed unconfirmed error at that single test boundary leaves the real managed child and its real `wait()` pending deterministically. A narrow snapshot can prove direct wait, workspace callback, and safe-exit gate remain pending without replacing process-group behavior or introducing a production fake; existing integration tests continue to own real Linux signaling and disappearance semantics.
  Date/Author: 2026-10-29 / Codex worker

## Outcomes & Retrospective

Implementation and worker validation are complete. `strapid` now owns direct detached Linux child groups, proves direct `close` plus negative-PGID `ESRCH`, escalates bounded termination, gates health on a live child plus drained loopback 2xx response, serializes serving/export state, preserves B02 workspace ownership through unresolved export termination, and suppresses restarts during intentional shutdown. The planned public supervisor interfaces remain intact; the composition helper is additionally exported only so the fixture main can exercise the real signal path.

Remediation cycle 1 closed both blocking review findings using design-approved revision 5. Health requests now have an activity-independent monotonic timer clipped to the startup deadline and recheck that deadline after response drain. Export admission now publishes one generation-owned operation before workspace preparation; its pre-spawn linearization, shutdown-dominating terminal flag, idempotent retention handoff, safe-exit gate, explicitly observed workspace promise, and cleanup-delayed ordinary results prevent preparation/spawn and shutdown races without changing B02's API or adding a mutex. Unsafe shutdown leaves `shutting-down`, the exact owner, and workspace retained; only proved close plus group absence can release cleanup.

Remediation cycle 2 made the unsafe-shutdown ordering proof deterministic without replacing the real process-group owner. A test-only boundary immediately before export shutdown termination injects `ProcessGroupExitUnconfirmedError` while the real fixture direct child and descendant remain live. A narrow read-only inspection proves retention owns the exact PID/workspace while direct wait, workspace callback, and safe-exit gate are pending; after exact group cleanup, direct wait settles but callback/gate remain pending until the test removes only that exact workspace. Existing real-process tests continue to prove Linux signaling, escalation, PGID inheritance, and disappearance.

The 42-test native suite demonstrates forced descendant termination, health acceptance/rejection including slow-drip responses, mutual exclusion, cancellation, cleanup-before-restart, unexpected loss, bounded recovery failure with a retained workspace, later non-destructive reconfirmation, preparation/shutdown linearization, and real `SIGTERM` shutdown without replacement. Independent review approved the implementation after reproducing both original defects, rerunning canonical validation, repeating the controlled retention case ten times, and confirming the separate real Linux process-group coverage. B04 still owns capture-window/socket protocol and budgets, B05 owns staging/archive policy, B09 owns output filtering and telemetry, and B10 owns container integration. B03 is checked only after that approval.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; at planning time both `HEAD` and `origin/backup-system` are `5c647cf91d8a641358cf959906907d40bc214b2a`, the pushed B02 commit. Do not switch branches. The unrelated untracked `.agents/skills/imagen/scripts/` directory must remain unread, unformatted, unstaged, and unchanged.

`strapid/` is a private ESM TypeScript package executed directly by Node v24.20.0 with native type stripping. Relative local imports include `.ts`, type-only dependencies use `import type`, and syntax must remain erasable under the existing strict `strapid/tsconfig.json`. There is no loader, transpiler, generated JavaScript, nested runtime pin, or runtime npm dependency.

`strapid/src/strapi-runtime.ts` is B02's application/workspace authority. It fixes the immutable application at `/strapi`, Node at `/nodejs/bin/node`, the Strapi CLI at `/strapi/node_modules/@strapi/strapi/bin/strapi.js`, disk staging at `/staging`, and workspaces below `/tmp/strapi-workspaces`. `withStrapiDataTransferWorkspace` validates absolute data/configuration paths, creates the compiled-application symlinks, passes a `StrapiCliInvocation` to a callback, and removes the workspace only after that callback settles. B03 must call it for export and settle the callback only after child `close` plus process-group disappearance. Do not duplicate its fixed paths or alter its validation/cleanup contract.

A process group is a Linux kernel grouping used to signal a process and its ordinary descendants together. B03 creates a group by spawning the direct child with `detached: true`; because the resulting child PID is also its process-group ID, `process.kill(-pid, signal)` targets that group. Signal `0` does not terminate anything; it probes whether the group exists. Only `ESRCH` confirms absence. A process that deliberately creates another session can escape, but `strapid` executes the owned Strapi CLI directly without a shell, and the fixture tests prove the inheritance used by ordinary Node subprocesses.

The B03 lifecycle states are `stopped`, `starting-serving`, `serving`, `stopping-serving`, `exporting`, `recovery-required`, `recovery-failed`, `shutting-down`, and `terminated`. `stopped` is a clean restartable state with no owned process group. `recovery-required` also has no owned group but records that serving is absent and must be restored. `recovery-failed` means disappearance of an owned group could not be confirmed; no serving start is allowed until an explicit re-probe proves it gone. `terminated` is final and is used after intentional process shutdown.

The allowed material transitions are:

    stopped or recovery-required -> starting-serving -> serving
    starting-serving -> recovery-required       when startup/health fails after confirmed cleanup
    starting-serving -> recovery-failed         when cleanup cannot be confirmed
    serving -> stopping-serving -> stopped      for an explicit clean or forced-but-confirmed stop
    serving -> recovery-required                after an unexpected, fully confirmed exit
    serving -> recovery-failed                  after an unexpected exit with unconfirmed group state
    stopped -> exporting -> stopped             after any CLI result or cancellation with confirmed exit
    exporting -> recovery-failed                when export group exit cannot be confirmed
    recovery-failed -> recovery-required        only after explicit close-and-group confirmation
    any nonterminal state -> shutting-down -> terminated

No transition permits `serving` and `exporting` at once. A forced serving stop is reported distinctly so B04 can abort capture even though the group is safely gone. A nonzero or signaled export result is a failed export but returns to clean `stopped` after exit confirmation, allowing B04 to recover serving. An unconfirmed result does not.

## Milestone 1: Own direct children and their process groups

Add `strapid/src/process-group.ts`. This module is the only production source file that imports `spawn` from `node:child_process` or sends negative-PID signals; integration tests and task-owned fixtures may import `spawn` only to launch or create their fixture trees. The module validates positive finite termination values, rejects non-Linux operation in the production path, invokes an absolute executable with an argument array and `shell: false`, sets `detached: true`, ignores stdin, and either inherits serving stdout/stderr or pipes export stdout/stderr to supplied chunk callbacks. It never calls `unref` and never invokes a shell, npm, npx, or a command string.

Define these semantic interfaces. Exact readonly placement may follow the existing style, but names and behavior should remain stable:

    export interface ProcessTerminationBounds {
      gracefulTimeoutMs: number;
      forcedTimeoutMs: number;
      pollIntervalMs: number;
    }

    export interface ChildCommand {
      role: "serving" | "export";
      executable: string;
      arguments: readonly string[];
      cwd: string;
      environment: NodeJS.ProcessEnv;
      output:
        | { mode: "inherit" }
        | {
            mode: "pipe";
            onStdout: (chunk: Uint8Array) => void;
            onStderr: (chunk: Uint8Array) => void;
          };
    }

    export type ChildCloseResult =
      | { status: "exited"; exitCode: number }
      | { status: "signaled"; signal: NodeJS.Signals };

    export interface ManagedCompletion {
      close: ChildCloseResult;
      termination: "natural" | "graceful" | "forced";
    }

    export interface ManagedProcessGroup {
      readonly pid: number;
      readonly role: ChildCommand["role"];
      isDirectChildLive(): boolean;
      wait(): Promise<ManagedCompletion>;
      terminate(bounds: ProcessTerminationBounds): Promise<ManagedCompletion>;
      reconfirmExit(): Promise<boolean>;
    }

    export function spawnManagedProcessGroup(
      command: ChildCommand,
      naturalExitCleanupBounds: ProcessTerminationBounds,
    ): ManagedProcessGroup;

Define `ChildSpawnError`, `ChildOutputError`, and `ProcessGroupExitUnconfirmedError` as ordinary Error subclasses with `cause` where applicable. `ProcessGroupExitUnconfirmedError` exposes only the numeric process-group ID and role; its message must not echo the executable, arguments, environment, output, or file paths.

Install `error`, `exit`, and `close` listeners immediately. Record `exit` only as diagnostic state; resolve the direct close result from `close`, because stdio can remain open after `exit`. If spawn fails, `pid` is undefined and Node emits `error` followed by `close`; reject with `ChildSpawnError` preserving the original error as `cause`, and do not invent a process group.

For natural exit, react to the earlier direct-child `exit` event rather than waiting indefinitely for `close`: probe the group, and if it remains, begin the same `SIGTERM` then `SIGKILL` sequence so a descendant that inherited a pipe cannot prevent `close` forever. Completion still waits for the later direct-child `close` event and group absence. If the group is already absent by the time both conditions are observed, return `termination: "natural"`; otherwise record whether graceful or forced group cleanup was required. For explicit termination, begin the sequence immediately. Because direct close may already have happened, the group probe remains authoritative for descendants. A caller AbortSignal may request `terminate`, but once termination starts its two bounded confirmation phases are not aborted by the caller.

Use a monotonic elapsed-time calculation and never reset one phase's deadline inside a polling retry. A signal call that returns `ESRCH` is success for group absence. A signal-0 probe returning normally means the group remains. `EPERM`, invalid signaling, or expiry after `SIGKILL` throws `ProcessGroupExitUnconfirmedError`. Multiple `wait` or `terminate` calls share one internal completion/termination promise so signals and cleanup cannot race. After such a failure, retain event listeners and close state. `reconfirmExit` sends no destructive signal and returns true only when the direct `close` event has been observed and a signal-0 group probe returns `ESRCH`; either condition alone remains unsafe.

At the end of this milestone, `test/process-group.integration.test.ts` and `strapid/fixtures/child-process.ts` prove exit-before-close/output ordering, typed spawn failure and zero/nonzero/signal results, and forced group termination including an ordinary descendant. One fixture exits its direct parent while a descendant still owns stdout; the process-group owner must initiate bounded cleanup, observe the later `close`, and never resolve on `exit` alone. The forced descendant test records both PIDs through newline-delimited JSON, ignores `SIGTERM` in both processes, forces escalation, and confirms both individual PIDs and the negative process-group probe report `ESRCH` before the test ends.

## Milestone 2: Add health and the exclusive supervisor lifecycle

Add `strapid/src/health.ts`. Export `ServingHealthPolicy` with `endpoint`, `startupTimeoutMs`, `requestTimeoutMs`, and `retryIntervalMs`, plus `waitForServingHealth(child, policy, signal?)`. Production uses `http://127.0.0.1:<PORT>/_health`; validate the endpoint as plain `http:` with hostname `127.0.0.1`, no credentials, no query, and exactly `/_health`. Tests use the same host on an OS-assigned ephemeral port.

Issue GET requests with `node:http`, no shared agent, and a per-request timeout that destroys the request rather than merely observing Node's `timeout` event. Drain every response with `resume()` and wait for completion. Return only when the status is 200 through 299 and `child.isDirectChildLive()` is still true after the response. Retry refused connections, request timeouts, and non-2xx results until the one fixed startup deadline. Fail immediately on caller cancellation or known child close. Preserve the final machine error as the cause of a secret-free `ServingHealthError`; do not include headers or bodies.

Add `strapid/src/lifecycle-policy.ts` with the `SupervisorState`, `LifecycleEvent`, and pure `transitionLifecycle(current, event)` owner for the allowed transitions in Context and Orientation. Invalid transitions throw `LifecycleConflictError` before process creation. Keep state names as a discriminated string union, not an enum. Unit tests in `test/lifecycle-policy.test.ts` cover only rules that an OS integration cannot deterministically create: an export-exit confirmation failure moves to `recovery-failed` and blocks serving, explicit later close-plus-group confirmation permits `recovery-required`, and shutdown is terminal. Do not duplicate ordinary integration assertions here.

Add `strapid/src/strapi-supervisor.ts`. It owns exactly one active `ManagedProcessGroup`, uses the pure transition function, and exposes:

    export interface ServingOptions {
      health: ServingHealthPolicy;
      termination: ProcessTerminationBounds;
      signal?: AbortSignal;
    }

    export interface ExportOutput {
      onStdout: (chunk: Uint8Array) => void;
      onStderr: (chunk: Uint8Array) => void;
    }

    export interface ExportOptions {
      termination: ProcessTerminationBounds;
      output: ExportOutput;
      signal?: AbortSignal;
    }

    export type ServingStopResult =
      | { status: "graceful"; close: ChildCloseResult }
      | { status: "forced"; close: ChildCloseResult };

    export type ExportResult =
      | { status: "succeeded"; close: { status: "exited"; exitCode: 0 } }
      | { status: "failed"; close: ChildCloseResult }
      | { status: "cancelled"; close: ChildCloseResult }
      | { status: "recovery-failed"; cause: StrapiRecoveryError };

    export type ServingLoss =
      | { status: "recovery-required"; close: ChildCloseResult }
      | { status: "recovery-failed"; cause: Error };

    export interface SupervisorSnapshot {
      state: SupervisorState;
      activeRole?: "serving" | "export";
      activePid?: number;
    }

    export class StrapiSupervisor {
      snapshot(): SupervisorSnapshot;
      startServing(options: ServingOptions): Promise<void>;
      waitForServingLoss(): Promise<ServingLoss>;
      stopServing(termination: ProcessTerminationBounds): Promise<ServingStopResult>;
      runExport(
        request: Omit<StrapiWorkspaceRequest, "operation">,
        options: ExportOptions,
      ): Promise<ExportResult>;
      reconfirmOwnedChildExit(): Promise<boolean>;
      shutdown(termination: ProcessTerminationBounds): Promise<void>;
    }

Import `StrapiWorkspaceRequest` as a type with an explicit `.ts` module specifier. `runExport` supplies `operation: "export"` itself and calls `withStrapiDataTransferWorkspace`. The workspace callback spawns exactly the provided direct Node-to-Strapi invocation and settles only after managed completion. This preserves B02's cleanup-after-close contract and prevents B04 from bypassing the validated `--file` position. B04 later supplies `--no-encrypt`, `--no-compress`, the run-specific staging base, output handling, and cancellation.

`startServing` uses `/nodejs/bin/node`, the existing absolute Strapi CLI, argument `start`, cwd `/strapi`, and the inherited environment. It changes state before spawning. If health fails, it terminates and confirms the child group before returning a recovery error. If termination is confirmed, state becomes `recovery-required`; if not, state becomes `recovery-failed` and retains the managed handle, including direct-close state and group identity, for `reconfirmOwnedChildExit`.

After health succeeds, attach one serving-loss observer keyed to that exact managed-child generation. An unexpected loss can move `serving` to `recovery-required` only after direct `close` and group absence. An observer that runs after `stopServing` or `shutdown` sees the changed state/generation and must not schedule or report a restart. `waitForServingLoss` reports the observation; it never starts a child itself.

`stopServing` synchronously changes `serving` to `stopping-serving`, requests group termination, and returns whether `SIGKILL` escalation was required. It reaches `stopped` only after confirmed completion. The forced result is safe from concurrency but is not a valid capture stop; B04 owns that later policy decision.

`runExport` is admitted only from `stopped`. It changes to `exporting` before creating the workspace. Starting serving, another export, or shutdown-triggered restart cannot pass at the same time. Zero exit returns `succeeded`; nonzero or signal returns `failed`; AbortSignal cancellation requests bounded group termination and returns `cancelled` only after confirmation. Once cancellation is observed it wins result classification even if the child races to exit zero, because B04 must never accept an invalidated window. All three confirmed outcomes return to `stopped`. Workspace/spawn/output errors preserve their causes.

If bounded export termination cannot confirm both close and group absence, return `recovery-failed` to the caller and transition immediately to the matching state, but do not settle B02's workspace callback. Keep that callback pending behind an internal safe-exit gate, keep draining its pipes, retain the managed handle and workspace promise, and reject every new spawn. This surfaces recovery failure within the bounded operation while still preserving B02's rule that its cleanup cannot race a possible writer.

`reconfirmOwnedChildExit` is legal only in `recovery-failed`. It calls the retained handle's non-destructive confirmation, which requires both the recorded direct `close` event and `ESRCH` for the negative PGID. If either is missing, leave state and ownership unchanged and return false. For a retained export, successful confirmation releases the safe-exit gate and awaits B02 workspace cleanup before clearing the owner and transitioning to `recovery-required`. A cleanup error is preserved and reported, but because child close and group absence are already proven it does not authorize retaining a false writer claim. Thus a process that exits later can be recovered without ever allowing concurrent access or removing its workspace early.

`shutdown` first changes state to `shutting-down`, invalidating every serving-loss observer before awaiting anything. If a child is active, terminate its group using the supplied bounds. If this confirms a previously retained export, release its safe-exit gate and await workspace cleanup. Never call `startServing` from this path. End in `terminated`; if close plus disappearance cannot be confirmed, reject with the typed cause so main exits unsuccessfully, but still do not restart or remove the retained workspace.

For integration only, export a narrowly named `strapiSupervisorTestHooks.create` factory that can replace the serving command and map the already-validated B02 export invocation to a fixture command. It must not alter lifecycle transitions, process-group logic, health logic, workspace paths, or production factory defaults. Production callers use `createStrapiSupervisor()` with fixed Strapi commands.

At the end of this milestone, `test/health.integration.test.ts` uses an in-process HTTP server bound to `127.0.0.1` port `0` plus a task-owned live child to prove 204 success and to prove that a dead child, 503 response, or hung request cannot establish health. `test/strapi-supervisor.integration.test.ts` proves a serving child rejects export, an active export rejects serving, export child plus descendant disappearance precedes serving restart, cancellation terminates the export tree, a health failure cleans the failed serving group before a later retry, and every test cleans exact fixture PIDs in `finally`.

## Milestone 3: Wire independent normal startup and intentional shutdown

Replace the no-op `strapid/src/main.ts` with a small composition root. Parse only `PORT` for the loopback health URL, accepting decimal integers 1 through 65535 and defaulting to 65101. Do not add a socket, backup configuration, telemetry configuration, capture setting, storage credential, or environment-file mutation. Create the production supervisor, start serving with the private normal-supervision defaults recorded in the Decision Log, and wait for either a serving loss or an intentional signal.

On one unexpected serving loss with confirmed group absence, call `startServing` once and require live-child plus health success. Continue monitoring after a successful recovery so a later distinct loss can be handled. If a recovery attempt itself fails, report one secret-free error and let main finish with nonzero `process.exitCode`; do not spin in an immediate retry loop. An unconfirmed group failure exits nonzero without starting a replacement. This normal monitor uses no `backupd` or Collector availability check.

Install `SIGTERM` and `SIGINT` listeners before starting serving. The first signal synchronously sets one shutdown guard, calls `shutdown`, and suppresses all loss-driven restarts, including a signal that arrives while startup health polling is still pending. The startup operation must notice its stale generation/shutdown state after each await and must not overwrite `shutting-down` or start another child. Coalesce subsequent handled signals rather than starting parallel cleanup. After confirmed cleanup, let the event loop drain naturally with exit code zero. On cleanup failure, set exit code one. Do not call `process.exit()` before child close/group confirmation and do not reinstall Node's default handler mid-cleanup.

Add `strapid/fixtures/supervisor-main.ts`, used only by `test/main.integration.test.ts`. The harness starts an ephemeral loopback health server, uses the real supervisor and process-group implementation with a fixture serving command, and emits newline-delimited JSON containing only event names and fixture PIDs. The integration test sends `SIGTERM` to the harness after readiness, then proves the serving group exited, the harness exited cleanly, and exactly one serving child was started. Repeat signal-handler logic through an injected signal name or a second focused run for `SIGINT` only if that adds coverage without duplicating the same shutdown path; one signal exercises the shared handler, while the lifecycle unit test owns the terminal policy.

At the end of this milestone, `mise exec -- npm start --prefix strapid` is not run on the host because its fixed `/strapi` runtime does not exist there and B10 has not embedded `strapid` in the backend image. Startup behavior is instead established by the composition-harness integration test. B10 later copies the package and changes the image/Compose entrypoint; B03 does not change either.

## Plan of Work

After this plan is approved and before implementation, modify `TODO.md` directly beneath the B03 checkbox label to add:

    - Plan: [ExecPlan](.agents/plans/b03-implement-strapi-child-supervision.md)

Leave B03 as `- [ ]`. Do not alter its label, order, scope, acceptance text, later tasks, or the checked B01/B02 entries. Only the coordinator may check B03 after the reviewer returns both `APPROVED` and `REVIEW_READY`.

Implement Milestone 1 first so all later code has one proven child boundary. Add the fixture outside `test/` because Node's default test discovery treats TypeScript files below `test/` as tests. Extend `strapid/tsconfig.json` include patterns with `fixtures/**/*.ts` so fixture source is strictly type-checked, but do not add it to production source or create emitted JavaScript.

Implement Milestone 2 on top of the managed process group. Keep the lifecycle reducer pure and small, and keep all active-handle storage in `StrapiSupervisor`. Use generation identity and synchronous pre-await transitions rather than a general-purpose mutex. Reuse `strapi-runtime.ts` rather than copying layout constants or workspace code.

Implement Milestone 3 last. Keep `main.ts` a composition root: production command construction, private normal-operation timing defaults, signal registration, one-at-a-time recovery, and exit-code ownership belong there; process details remain in the lower modules.

During implementation, maintain this plan at each stopping point. Record discoveries and exact validation counts. Do not edit `BACKUP.md`, `backend/`, `frontend/`, `compose.yml`, `compose.prod.yml`, Dockerfiles, workflows, release files, `.env` files, machine/user environment variables, content types, bootstrap, or the unrelated Imagen scripts.

## Fixture Protocol and Test Ownership

`strapid/fixtures/child-process.ts` accepts only explicit test modes and numeric delay/exit arguments. It writes newline-delimited JSON events such as `ready`, `descendant`, and `tail-closed` to stdout; stderr contains no environment or content. Required modes are: immediate zero/nonzero exit; a parent that exits while a descendant briefly retains stdout and emits a final marker; an idle child that exits on `SIGTERM`; and a parent plus descendant that both ignore `SIGTERM` so the supervisor must send group `SIGKILL`. Every mode has a finite self-expiry safeguard so a failed test cannot leave a permanent process.

`test/process-group.integration.test.ts` owns the Node/OS semantics: direct spawn, error/close ordering, stdio closure, natural result classification, negative-PGID signaling, graceful/forced result classification, and descendant disappearance. `test/health.integration.test.ts` owns HTTP request semantics and the combined child/response predicate. `test/strapi-supervisor.integration.test.ts` owns mutual exclusion, export cancellation, workspace callback ordering, health-failure cleanup, and restart admission. `test/main.integration.test.ts` owns real signal-to-shutdown behavior and non-restart. `test/lifecycle-policy.test.ts` owns only unconfirmable-group and terminal-state rules that cannot be induced safely and deterministically at the OS boundary.

The existing `test/strapi-runtime.test.ts` remains the sole owner of workspace layout, absolute path validation, duplicate file-option rejection, and cleanup failure aggregation. Do not repeat those assertions. No unit test may spawn a process. No integration test may invoke Strapi, Docker, Compose, a prestarted stack, a fixed port, or a non-task-owned dependency.

The planned suite adds eleven test cases to the existing sixteen, for an expected initial total of 27 passing tests. If Node reports a different count because an implementation-worthy case is split or consolidated, update this plan with the exact reason and final count rather than shaping code to a number.

## Concrete Steps

Work from `/home/codex/src/us-alb` and reconfirm the protected baseline:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch
    mise exec -- node --version

Expect `backup-system`, both revisions at `5c647cf91d8a641358cf959906907d40bc214b2a`, only `?? .agents/skills/imagen/scripts/`, and `v24.20.0`. Stop if the branch moved, B02 is no longer pushed, or an overlapping worktree edit appears.

After adding the approved plan link, implement with targeted patches. Run package formatting only after reviewing its scope:

    mise run strapid:format

Then run the applicable canonical daemon validation:

    mise run strapid:check
    mise run strapid:test

`strapid:check` must report a clean Biome check and strict `tsc --noEmit`. `strapid:test` must discover the existing workspace tests plus the new unit/integration tests, report zero failures, and leave no fixture child alive. The first implementation target is 27 passing tests as described above; record the actual stable count in Progress and Artifacts and Notes.

Prove no compilation artifact or runtime-loader path was introduced:

    find strapid -path 'strapid/node_modules' -prune -o -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print
    test ! -d strapid/dist
    test ! -d strapid/build
    mise exec -- npm ls --prefix strapid --depth=0

The `find` command must print nothing. The directory checks must succeed. `npm ls` must show only the existing development toolchain and no new runtime dependency, loader, shell helper, process-tree package, HTTP framework, or test framework.

Inspect scope and protected inputs:

    git diff --check
    git diff -- BACKUP.md
    git status --short --branch
    git diff -- TODO.md strapid .agents/plans/b03-implement-strapi-child-supervision.md

`git diff -- BACKUP.md` must be empty. Status may contain only B03 files plus the preserved untracked Imagen directory. There is no backend or frontend change, so do not run or retain `be:openapi`, `fe:openapi`, `be:types`, backend startup, image builds, or frontend checks merely for reassurance.

Do not commit or push in this planning-only or worker phase. The configured workflow coordinator owns reviewer-approved bookkeeping, the task commit, and push.

## Validation and Acceptance

B03 is accepted when fixture integration proves a direct child is invoked with no shell as a detached Linux process-group leader, its ordinary descendant shares that group, `close` waits for inherited output closure, and group termination escalates from `SIGTERM` to `SIGKILL` within injected bounds. A completed operation must include a direct close result and an `ESRCH` group probe. Spawn and output failures preserve causes without secret-bearing diagnostics.

B03 is accepted when the supervisor demonstrably owns at most one child group. Export while serving, serving while exporting, a second export, and restart from `recovery-failed` are rejected before spawn. A clean or failed export permits restart only after the export callback settles, workspace cleanup follows that settlement, and fixture descendant PIDs are absent. Cancellation terminates and confirms the export group before returning. A simulated unconfirmed-exit lifecycle event blocks restart and workspace cleanup until explicit later confirmation proves both direct close and group absence.

B03 is accepted when serving readiness requires both conditions. A live fixture child plus HTTP 204 succeeds; HTTP 204 with a dead child fails; a live child plus 503, refusal, a hung response, or an activity-producing slow-drip response fails within the fixed monotonic health window. Each request has an absolute timer clipped to the remaining startup deadline, and a drained 2xx response is accepted only after rechecking that deadline. Failed startup cleans and confirms the attempted child group before a retry. An unexpected serving exit can cause one recovery start only after the old group is gone.

B03 is accepted when a real `SIGTERM` delivered to the fixture main sets shutdown intent before child cleanup, terminates the serving group, starts no replacement, and allows the harness to exit cleanly. `SIGINT` uses the same handler. Failure to confirm shutdown returns a nonzero outcome and still never starts serving. Normal startup and recovery perform no request to `backupd`, Collector, object storage, Docker, or a control socket.

All `strapid` code must remain idiomatic ESM TypeScript with explicit `.ts` local imports, type-only imports, erasable syntax, strict checking, direct Node built-ins, cancellation propagation, and preserved causes. Unit tests start no process. Integration HTTP binds only `127.0.0.1:0`. No test runs Strapi or becomes a smoke, backend, end-to-end, browser, or deployment test.

Canonical acceptance is green `mise run strapid:check` and `mise run strapid:test`, plus clean artifact and scoped-diff inspection. `BACKUP.md`, Strapi 5.52.0, frontend SSR/ISR and CMS pipeline, bootstrap, `NEXT_PUBLIC_APP_VERSION`, Compose, backend packaging, CI/release, environment files, host configuration, and later-task ownership remain unchanged. B03 remains unchecked until independent reviewer approval.

## Material Event Orderings

For normal startup, register signal handlers, transition `stopped -> starting-serving`, spawn the serving group, and poll health. Only a still-live child followed by a drained 2xx response permits `starting-serving -> serving`. On health failure, terminate and confirm the group before `recovery-required`; unconfirmed exit goes to `recovery-failed`.

For an explicit serving stop, transition to `stopping-serving` before sending any signal. Send group `SIGTERM`, wait for direct close plus group absence, escalate to group `SIGKILL` only after the graceful bound, and confirm again. Transition to `stopped` only after confirmation and return whether escalation occurred. B04 must later reject a capture when escalation was required.

For export, transition `stopped -> exporting` and synchronously publish one generation-owned `ActiveExportOperation` before workspace creation or any await. That operation owns the workspace promise and exact identity when known, child handle, safe-exit gate, retention handoff, provisional ordinary result, shutdown-dominating flag, and public terminal result. After preparation, one synchronous pre-spawn turn validates state, generation, cancellation, and operation identity, then spawns and publishes the direct child without an intervening await. If shutdown invalidated the operation first, no child is spawned and `cancelled-before-start` remains hidden until B02 removes the exact workspace and shutdown reaches `terminated`. On natural result, cancellation, or output failure, do not expose an ordinary result until direct close plus group disappearance are confirmed, the workspace callback settles, B02 cleanup finishes, and ownership/state release completes. A serving start attempted at any earlier point fails admission.

For an exporter or subprocess that cannot be confirmed gone, the operation's idempotent retention handoff records the exact child, workspace, gate, workspace promise, and cause. It conditionally transitions `exporting -> recovery-failed`, settles public `recovery-failed` boundedly, and leaves the callback pending on the unresolved gate. If intentional shutdown initiated the bounded termination, shutdown performs this handoff itself before rejecting, leaves state `shutting-down`, and clears neither ownership nor operation; the later callback observes the same record. Unsafe shutdown never releases the gate or reaches `terminated`. Outside that failed-shutdown terminal path, a later `reconfirmOwnedChildExit` may release cleanup and transition to `recovery-required` only after direct `close`, negative-PGID `ESRCH`, and workspace cleanup; it does not assume that elapsed time means exit.

For an unexpected serving loss, the managed completion first cleans any lingering descendants. The observer reports `recovery-required` only after confirmed group absence. Main may then attempt one replacement and health check. For intentional shutdown, set `shutting-down` before signaling; the same observer becomes stale and cannot initiate recovery.

## Idempotence and Recovery

Formatting, checks, and tests are repeatable. Fixtures use unique `mkdtemp` directories and ephemeral ports, record exact PIDs, and clean in `finally`. Each fixture has a finite self-expiry, but the parent still attempts group `SIGKILL` and absence confirmation on test failure. Never use broad `pkill`, `killall`, process-name matching, Docker prune, or repository-wide cleanup.

If a test reports a remaining PID, inspect only that recorded PID and PGID. Retry the same bounded group cleanup, confirm identity before signaling where possible, and stop if it is no longer the task-owned fixture. Do not weaken the absence assertion or leave a detached fixture running.

If a workspace remains, first verify no recorded fixture group exists. Remove only the exact unique directory below `/tmp/strapi-workspaces` after ownership is clear. Preserve B02's cleanup errors and do not add a broad startup sweep; automatic orphan workspace/staging adoption or cleanup belongs to later lifecycle design and could race a writer.

If a health integration test fails intermittently, do not choose a fixed port or add sleeps. Wait for the `listening` event from `server.listen({ host: "127.0.0.1", port: 0 })`, use the returned address, and coordinate fixture readiness through JSON events or promises. All timeouts should be generous enough for CI but injected and short in focused tests.

If process-group behavior differs on the target Linux runtime, stop and record `/proc` identities and Node version. Do not fall back to direct-child-only signaling, a shell command, an external process-tree package, Docker control, or concurrent serving. A platform that cannot prove group ownership is a blocker to B03 acceptance.

Plan revisions must update every affected section and add a bottom revision note. Implementation can be resumed from this file alone.

## Artifacts and Notes

Planning recorded these authoritative facts:

    active/upstream commit: 5c647cf91d8a641358cf959906907d40bc214b2a
    project runtime:         Node v24.20.0
    Strapi version:          5.52.0
    Strapi health:           /_health returns HTTP 204
    child close:             follows exit/error and closed stdio
    signal 0:                no effect; ESRCH means target absent

The disposable process-group prototype produced:

    child PID = child PGID = child SID
    descendant PGID = child PID
    groupGoneAfterNegativePidSIGTERM = true

This prototype changed no repository file and left no process running. It proves the exact runtime's ordinary group inheritance; the committed integration fixture will preserve this evidence as repeatable validation.

Worker validation evidence on Node v24.20.0:

    mise run strapid:format  -> 17 files formatted, no further fixes
    mise run strapid:check   -> Biome clean; strict tsc --noEmit clean
    mise run strapid:test    -> 42 passed, 0 failed, 0 skipped

The fixture suite confirmed direct and descendant PGIDs, natural/graceful/forced close classification, exact descendant and process-group disappearance, live-child plus 204 success, dead-child/503/hung/refused/slow-drip rejection, serving/export exclusion, cancellation, cleanup-before-restart, unexpected loss, the retained-workspace recovery gate, and one-start `SIGTERM` shutdown. Revision-5 tests additionally proved zero spawn after shutdown wins paused preparation, `cancelled-before-start` only after exact workspace removal and `terminated`, bounded unconfirmed-shutdown retention with no shutdown completion or gate release, preserved pre-shutdown recovery reconfirmation, setup-failure cause preservation, and normal success only after exact cleanup plus `stopped`. Artifact inspection found no emitted JavaScript, `dist`, or `build`; `npm ls --depth=0` showed only Biome, Node types, and TypeScript. Exact fixture-process and `/tmp/strapi-workspaces` residue checks printed nothing. `git diff --check` passed, `BACKUP.md` remained byte-identical at SHA-256 `6c7bcfa0368a9453a3e315bc6492f458b012c63dc66a6d67f8a0ba2f58190533`, and scoped status contained only B03 files plus the separately preserved unrelated Imagen artifact.

Cycle-2 evidence: the controlled unconfirmed-shutdown ordering test passed five consecutive focused runs before the full suite. It asserted bounded shutdown rejection and bounded public `recovery-failed`, `shutting-down`, the exact active PID/workspace, a live direct child and descendant before cleanup, `directWaitSettled: false`, `workspaceSettled: false`, and `safeExitGateReleased: false`. After exact group termination it asserted direct wait settled while workspace/gate remained pending, then removed only the recorded workspace. The subsequent canonical run remained 42 passed with zero failures or skips and left no fixture PID, PGID, or workspace residue.

## Interfaces and Dependencies

B03 adds no npm dependency. Use only `node:child_process`, `node:events`, `node:http`, `node:process`, timers, URLs, and the existing B02 modules. Node's documented `close` event, direct `spawn`, signal handling, AbortSignal, and HTTP request APIs are sufficient.

`process-group.ts` owns OS process identity, event ordering, signal delivery, and confirmation. `health.ts` owns only bounded loopback HTTP readiness combined with a live-child predicate and activity-independent monotonic request deadlines. `lifecycle-policy.ts` owns allowed state transitions without I/O. `strapi-supervisor.ts` owns the one active handle, the private admission-time `ActiveExportOperation`, B02 workspace callback, state/generation ordering, retention handoff, shutdown dominance, and public result mapping. `main.ts` owns production composition, normal-only timing defaults, signal registration, monitoring, and process exit code. No sibling production module may send a child signal or spawn Strapi independently.

Errors cross boundaries with causes intact. `ChildSpawnError` wraps spawn failure; `ChildOutputError` wraps a streaming consumer failure after safe termination; `ProcessGroupExitUnconfirmedError` means concurrency safety is unresolved; `ServingHealthError` wraps the last health failure; `LifecycleConflictError` means the requested transition was illegal; and a supervisor-level `StrapiRecoveryError` wraps a lower failure while stating whether an owned group may remain. Messages use role/state/PID only and remain safe for later telemetry.

B04 will call the B03 primitives with one capture deadline, phase-specific remaining bounds, private-socket cancellation, and recovery orchestration. It will decide capture validity, forced-stop rejection, flags, result identities, and response semantics. B05 owns staging allocation, size cancellation, archive validation, and safe cleanup after B03 releases writer ownership. B09 owns filtering and telemetry. B10 owns embedding, entrypoint, Compose, volumes, settings, and stop behavior. B13 owns the manual import interface. B03 must neither implement nor constrain those later protocols beyond exposing the safe state and result types above.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B03 plan after full authoritative-input review, Context7 Node 24 research, installed Strapi 5.52.0 health inspection, and an exact-runtime Linux process-group prototype. The plan resolves single-supervisor ownership, close-plus-group confirmation, bounded escalation, cancellation safety, health semantics, signal ordering, fixture coverage, B02 workspace reuse, and B04/B05/B09/B10/B13 boundaries without changing `BACKUP.md` or production code.

Revision note (2026-10-29 / Codex planner): Tightened direct-exit ordering during plan self-review so a descendant-held stdio pipe cannot deadlock completion: direct `exit` now initiates bounded group cleanup, while only the later `close` plus confirmed group absence completes ownership. Also made cancellation precedence, startup-time shutdown suppression, test-only spawn use, and pinned-toolchain inspection explicit.

Revision note (2026-10-29 / Codex worker): Began implementation on the protected B02 baseline, linked the approved plan from the still-unchecked B03 queue item, and recorded Milestone 1 as the next active stopping point.

Revision note (2026-10-29 / Codex worker): Recorded and corrected the first fixture-protocol discovery: ignored-signal children now remain alive until their finite self-expiry, and final tail output is flushed before exit.

Revision note (2026-10-29 / Codex worker): Closed the loss-driven replacement shutdown race discovered during composition review and added a deterministic bounded-confirmation scenario for the retained export workspace invariant.

Revision note (2026-10-29 / Codex worker): Completed all three implementation milestones and worker validation, recorded the actual 38-test count and acceptance evidence, summarized remaining later-task ownership, and left review completion and the B03 checkbox to the workflow coordinator.

Revision note (2026-10-29 / Codex worker): Began remediation cycle 1 by recording both blocking reviewer findings and the design-approved revision-5 absolute-health-deadline and admission-time export-operation ownership protocol before implementation.

Revision note (2026-10-29 / Codex worker): Completed remediation cycle 1 by implementing revision 5, adding deterministic slow-drip, pre-spawn shutdown, unconfirmed shutdown-retention, exact-cleanup visibility, and setup-failure tests, and recording green 42-test canonical validation plus clean residue and protected-file evidence.

Revision note (2026-10-29 / Codex worker): Began remediation cycle 2 by recording the timing-dependent regression finding, selecting a single test-only shutdown-termination ordering boundary over the real managed group, and correcting the stale Outcomes test count from 38 to 42.

Revision note (2026-10-29 / Codex worker): Completed remediation cycle 2 with a deterministic real-child retention ordering proof, five focused repetitions, green 42-test canonical validation, exact cleanup/residue evidence, and no change to the B03 checkbox or protected files.

Revision note (2026-10-29 / Codex coordinator): Recorded independent `REVIEW APPROVED` after canonical checks, 42 passing tests, ten controlled-retention repetitions, separate real process-group verification, and clean residue/scope inspection; checked B03 and finalized the plan for commit.

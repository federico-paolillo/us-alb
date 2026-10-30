import { randomUUID } from "node:crypto";

import type {
  CaptureAcceptedRecord,
  CaptureIdentity,
  CaptureRequest,
  CaptureServiceStatus,
  CaptureTerminalRecord,
  CaptureWindowStatus,
} from "../../strapid/src/capture-contract.ts";
import type { ValidatedArchive } from "./archive-validator.ts";
import {
  CaptureAdmissionRejectedError,
  type CaptureClient,
} from "./capture-client.ts";
import type {
  RunDispatchResult,
  RunLifecycleRequest,
  RunLifecycleResult,
} from "./daily-scheduler.ts";
import { restorePendingPublicationRequest } from "./durable-state.ts";
import type {
  BackupPublicationConfig,
  PublicationPolicy,
} from "./object-storage-config.ts";
import type { RunRequest } from "./run-admission.ts";
import type { SchedulePolicy } from "./schedule-policy.ts";
import {
  createSnapshotPublicationRequest,
  type SnapshotPublicationRequest,
} from "./snapshot-manifest.ts";
import {
  type FinalPublicationReconciliation,
  type PublishedSnapshot,
  SnapshotPublicationError,
  type SnapshotPublisher,
} from "./snapshot-publisher.ts";
import type {
  ReopenedRetainedArchive,
  StagingAllocation,
  StagingManager,
} from "./staging-manager.ts";
import {
  type CaptureWriterDisposition,
  StagingError,
} from "./staging-policy.ts";
import {
  type StateRepository,
  StateRepositoryError,
} from "./state-repository.ts";

const RECONCILIATION_INTERVAL_MS = 250;

export type BackupLifecycleState =
  | "starting"
  | "idle"
  | "preflighting"
  | "capturing"
  | "validating"
  | "pending-publication"
  | "publishing"
  | "cleaning"
  | "stopping"
  | "stopped"
  | "failed";

export type BackupDaemonEventCode =
  | "startup-state-invalid"
  | "staging-occupied"
  | "staging-mismatch"
  | "destination-preflight-failed"
  | "supervisor-unavailable"
  | "capture-invalid"
  | "capture-ownership-unknown"
  | "validation-failed"
  | "state-transition-failed"
  | "publication-pending"
  | "publication-expired"
  | "remote-status-unknown"
  | "cleanup-failed"
  | "shutdown-cancellation"
  | "shutdown-timeout";

export interface BackupDaemonEvent {
  readonly code: BackupDaemonEventCode;
  readonly phase: string;
  readonly trigger?: RunLifecycleRequest["trigger"];
  readonly runId?: string;
  readonly captureWindowId?: string;
  readonly classification?: string;
}

export type BackupObservedPhase =
  | "preflight"
  | "capture"
  | "validation"
  | "publication"
  | "cleanup"
  | "state";

export type ObservedOutcome =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "pending"
  | "expired";

export interface BackupLifecycleObserver {
  runStarted(event: {
    readonly trigger: RunLifecycleRequest["trigger"];
    readonly runId?: string;
  }): void;
  runIdentified(event: {
    readonly runId: string;
    readonly captureWindowId?: string;
  }): void;
  phaseStarted(event: { readonly phase: BackupObservedPhase }): void;
  phaseFinished(event: {
    readonly phase: BackupObservedPhase;
    readonly outcome: ObservedOutcome;
    readonly failureCode?: BackupDaemonEventCode;
  }): void;
  freshnessConfirmed(event: { readonly capturedAt: string }): void;
  runFinished(event: {
    readonly outcome: RunLifecycleResult;
    readonly failureCode?: BackupDaemonEventCode;
  }): void;
}

export class BackupDaemonError extends Error {
  readonly code: BackupDaemonEventCode;
  readonly event: BackupDaemonEvent;

  constructor(event: BackupDaemonEvent, cause?: unknown) {
    super(
      `Backup lifecycle failed (${event.code})`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "BackupDaemonError";
    this.code = event.code;
    this.event = Object.freeze({ ...event });
  }
}

export interface StartupClassification {
  readonly status: "idle" | "pending-publication";
  readonly runId?: string;
  readonly archiveStatus?: ReopenedRetainedArchive["status"];
}

export interface BackupLifecycleCoordinatorOptions {
  readonly captureClient: CaptureClient;
  readonly stagingManager: StagingManager;
  readonly snapshotPublisher: SnapshotPublisher;
  readonly stateRepository: StateRepository;
  readonly schedulePolicy: SchedulePolicy;
  readonly publicationConfig: BackupPublicationConfig;
  readonly dispatchPendingPublication: (
    runId: string,
  ) => RunRequest<RunDispatchResult>;
  readonly uuid?: () => string;
  readonly now?: () => number;
  readonly setTimer?: (callback: () => void, delay: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
  readonly onEvent?: (event: BackupDaemonEvent) => void;
  readonly onError?: (error: unknown) => void;
  readonly observer?: Partial<BackupLifecycleObserver>;
}

interface ActiveCapture {
  readonly generation: number;
  readonly identity: CaptureIdentity;
  readonly controller: AbortController;
}

function sameIdentity(left: CaptureIdentity, right: CaptureIdentity): boolean {
  return (
    left.supervisorInstanceId === right.supervisorInstanceId &&
    left.captureWindowId === right.captureWindowId &&
    left.releaseId === right.releaseId &&
    left.sourceVolumeId === right.sourceVolumeId &&
    left.nodeVersion === right.nodeVersion &&
    left.strapiVersion === right.strapiVersion
  );
}

function acceptedFromStatus(
  status: Extract<CaptureWindowStatus, { readonly type: "active" }>,
): CaptureAcceptedRecord | undefined {
  if (
    status.startedAt === undefined ||
    status.deadlineAt === undefined ||
    status.acceptedAt === undefined
  ) {
    return undefined;
  }
  return {
    version: 1,
    type: "accepted",
    identity: status.identity,
    archiveBasePath: status.archiveBasePath,
    startedAt: status.startedAt,
    deadlineAt: status.deadlineAt,
    acceptedAt: status.acceptedAt,
  };
}

function terminalMatchesAcceptance(
  terminal: CaptureTerminalRecord,
  accepted: CaptureAcceptedRecord,
): boolean {
  return (
    sameIdentity(terminal.identity, accepted.identity) &&
    terminal.archiveBasePath === accepted.archiveBasePath &&
    terminal.startedAt === accepted.startedAt &&
    terminal.deadlineAt === accepted.deadlineAt &&
    terminal.acceptedAt === accepted.acceptedAt
  );
}

function linkedController(...signals: readonly AbortSignal[]): {
  readonly controller: AbortController;
  dispose(): void;
} {
  const controller = new AbortController();
  const listeners = signals.map((signal) => {
    const listener = () => controller.abort(signal.reason);
    if (signal.aborted) listener();
    else signal.addEventListener("abort", listener, { once: true });
    return { signal, listener };
  });
  return {
    controller,
    dispose() {
      for (const { signal, listener } of listeners) {
        signal.removeEventListener("abort", listener);
      }
    },
  };
}

function isDurabilityUnconfirmed(error: unknown): boolean {
  return (
    error instanceof StateRepositoryError &&
    error.code === "state_durability_unconfirmed"
  );
}

export class BackupLifecycleCoordinator {
  private readonly captureClient: CaptureClient;
  private readonly stagingManager: StagingManager;
  private readonly snapshotPublisher: SnapshotPublisher;
  private readonly stateRepository: StateRepository;
  private readonly schedulePolicy: SchedulePolicy;
  private readonly publicationConfig: BackupPublicationConfig;
  private readonly dispatchPendingPublication: BackupLifecycleCoordinatorOptions["dispatchPendingPublication"];
  private readonly uuid: () => string;
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, delay: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;
  private readonly onEvent: (event: BackupDaemonEvent) => void;
  private readonly onError: (error: unknown) => void;
  private readonly observer: Partial<BackupLifecycleObserver>;
  private readonly stopController = new AbortController();
  private captureAdmissionGeneration = 0;
  private current: Promise<RunLifecycleResult> | undefined;
  private finalizing: Promise<void> | undefined;
  private pendingWake: Promise<void> | undefined;
  private pendingTimer: unknown;
  private pendingGeneration = 0;
  private cutoffWakeHandledRun: string | undefined;
  private retainedAllocation: StagingAllocation | undefined;
  private retainedRunId: string | undefined;
  private activeCapture: ActiveCapture | undefined;
  private cancellation: Promise<void> | undefined;
  private stopped = false;
  private failureRecorded = false;
  private lifecycleState: BackupLifecycleState = "starting";
  private observedPhase: BackupObservedPhase | undefined;
  private lastFailureCode: BackupDaemonEventCode | undefined;

  constructor(options: BackupLifecycleCoordinatorOptions) {
    this.captureClient = options.captureClient;
    this.stagingManager = options.stagingManager;
    this.snapshotPublisher = options.snapshotPublisher;
    this.stateRepository = options.stateRepository;
    this.schedulePolicy = options.schedulePolicy;
    this.publicationConfig = options.publicationConfig;
    this.dispatchPendingPublication = options.dispatchPendingPublication;
    this.uuid = options.uuid ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.setTimer =
      options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer =
      options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
    this.onEvent = options.onEvent ?? (() => undefined);
    this.onError = options.onError ?? (() => undefined);
    this.observer = options.observer ?? {};
  }

  get state(): BackupLifecycleState {
    return this.lifecycleState;
  }

  get hasTerminalFailure(): boolean {
    return this.failureRecorded;
  }

  async classifyStartup(): Promise<StartupClassification> {
    if (this.stopped) {
      throw this.failure("shutdown-cancellation", "startup");
    }
    try {
      const state = await this.stateRepository.load();
      if (this.stopController.signal.aborted) {
        throw this.failure("shutdown-cancellation", "startup");
      }
      if (state.pendingPublication === null) {
        await this.stagingManager.assertEmptyForStartup();
        this.transition("idle");
        return { status: "idle" };
      }
      const request = restorePendingPublicationRequest(
        state.pendingPublication,
        this.publicationConfig.publication,
      );
      const reopened = await this.stagingManager.reopenRetainedArchive(
        request.archive,
      );
      this.retainedRunId = request.archive.runId;
      this.retainedAllocation =
        reopened.status === "reopened" ? reopened.allocation : undefined;
      this.transition("pending-publication");
      return {
        status: "pending-publication",
        runId: request.archive.runId,
        archiveStatus: reopened.status,
      };
    } catch (error) {
      this.transition("failed");
      if (error instanceof BackupDaemonError) throw error;
      if (error instanceof StagingError) {
        throw this.failure(
          error.code === "staging_recovery_mismatch"
            ? "staging-mismatch"
            : "staging-occupied",
          "startup-staging",
          error,
        );
      }
      throw this.failure("startup-state-invalid", "startup-state", error);
    }
  }

  runLifecycle(
    request: RunLifecycleRequest,
    signal: AbortSignal,
  ): Promise<RunLifecycleResult> {
    const isPending = request.pendingPublication !== undefined;
    if (this.stopped) {
      return Promise.resolve("retryable-failure");
    }
    if (
      this.current !== undefined ||
      this.lifecycleState === "failed" ||
      (isPending && this.lifecycleState !== "pending-publication") ||
      (!isPending && this.lifecycleState !== "idle")
    ) {
      return Promise.resolve("terminal-failure");
    }
    this.lastFailureCode = undefined;
    this.observedPhase = undefined;
    const resumedRunId = request.pendingPublication?.request.archive.runId;
    this.observe("runStarted", {
      trigger: request.trigger,
      ...(resumedRunId === undefined ? {} : { runId: resumedRunId }),
    });
    if (resumedRunId !== undefined) {
      this.observe("runIdentified", { runId: resumedRunId });
    }
    const captureGeneration = isPending
      ? undefined
      : ++this.captureAdmissionGeneration;
    const linked = linkedController(signal, this.stopController.signal);
    const operation = this.executeLifecycle(
      request,
      linked.controller.signal,
      captureGeneration,
    )
      .then((result) => {
        this.finishObservedPhase(
          result === "completed"
            ? "succeeded"
            : result === "publication-pending"
              ? "pending"
              : result === "retryable-failure" && this.stopped
                ? "cancelled"
                : "failed",
          this.lastFailureCode,
        );
        this.observe("runFinished", {
          outcome: result,
          ...(this.lastFailureCode === undefined
            ? {}
            : { failureCode: this.lastFailureCode }),
        });
        return result;
      })
      .catch((error: unknown) => {
        this.transition("failed");
        this.onError(error);
        this.observe("runFinished", {
          outcome: "terminal-failure",
          ...(this.lastFailureCode === undefined
            ? {}
            : { failureCode: this.lastFailureCode }),
        });
        return "terminal-failure" as const;
      })
      .finally(() => {
        linked.dispose();
        if (this.current === operation) this.current = undefined;
        if (!this.stopped && this.lifecycleState !== "failed") {
          this.transition(
            this.retainedRunId === undefined ? "idle" : "pending-publication",
          );
        }
      });
    this.current = operation;
    return operation;
  }

  async armPendingPublication(): Promise<void> {
    this.clearPendingTimer();
    if (this.stopped) return;
    const generation = ++this.pendingGeneration;
    const state = await this.stateRepository.load();
    if (this.stopped || generation !== this.pendingGeneration) return;
    const pending = state.pendingPublication;
    if (pending === null) {
      this.cutoffWakeHandledRun = undefined;
      this.retainedRunId = undefined;
      this.retainedAllocation = undefined;
      if (this.lifecycleState === "pending-publication")
        this.transition("idle");
      return;
    }
    const deadline = Date.parse(pending.publicationDeadlineAt);
    const mutationCutoff =
      deadline -
      this.publicationConfig.publication.finalReconciliationReserveMs;
    const cutoffWake =
      this.cutoffWakeHandledRun === pending.runId
        ? Number.POSITIVE_INFINITY
        : Math.max(this.now(), mutationCutoff);
    const wakeAt = Math.min(
      Math.max(this.now(), Date.parse(pending.notBefore)),
      cutoffWake,
      deadline,
    );
    this.pendingTimer = this.setTimer(
      () => {
        if (this.stopped || generation !== this.pendingGeneration) return;
        this.pendingTimer = undefined;
        const operation = this.handlePendingWake(
          pending.runId,
          generation,
        ).catch(this.onError);
        const tracked = operation.finally(() => {
          if (this.pendingWake === tracked) this.pendingWake = undefined;
        });
        this.pendingWake = tracked;
      },
      Math.max(0, wakeAt - this.now()),
    );
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.captureAdmissionGeneration += 1;
    this.transition("stopping");
    this.clearPendingTimer();
    const active = this.activeCapture;
    this.stopController.abort(
      this.failure("shutdown-cancellation", "shutdown"),
    );
    active?.controller.abort(this.stopController.signal.reason);
    if (active !== undefined) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2_000);
      timer.unref();
      this.cancellation = this.captureClient
        .cancel(active.identity, controller.signal)
        .catch((error: unknown) => this.onError(error))
        .finally(() => clearTimeout(timer));
    }
  }

  async waitForIdle(): Promise<void> {
    const active = this.current;
    const finalizing = this.finalizing;
    const cancellation = this.cancellation;
    const pendingWake = this.pendingWake;
    const operations: Promise<unknown>[] = [];
    if (active !== undefined) operations.push(active);
    if (finalizing !== undefined) operations.push(finalizing);
    if (cancellation !== undefined) operations.push(cancellation);
    if (pendingWake !== undefined) operations.push(pendingWake);
    await Promise.allSettled(operations);
    if (this.stopped && this.lifecycleState !== "failed") {
      this.transition("stopped");
    }
  }

  private async executeLifecycle(
    request: RunLifecycleRequest,
    signal: AbortSignal,
    captureGeneration: number | undefined,
  ): Promise<RunLifecycleResult> {
    if (request.pendingPublication !== undefined) {
      const runId = request.pendingPublication.request.archive.runId;
      if (this.retainedRunId !== runId) {
        this.transition("failed");
        return "terminal-failure";
      }
      return await this.publishPending(
        request.pendingPublication.request,
        signal,
        request.trigger,
      );
    }
    if (captureGeneration === undefined) {
      this.transition("failed");
      return "terminal-failure";
    }
    return await this.captureAndPublish(request, signal, captureGeneration);
  }

  private async captureAndPublish(
    lifecycleRequest: RunLifecycleRequest,
    signal: AbortSignal,
    generation: number,
  ): Promise<RunLifecycleResult> {
    const runId = this.uuid();
    const captureWindowId = this.uuid();
    this.observe("runIdentified", { runId, captureWindowId });
    this.transition("preflighting");
    if (!this.captureAdmissionIsCurrent(generation, signal)) {
      return "retryable-failure";
    }
    let status: CaptureServiceStatus;
    try {
      status = await this.captureClient.getStatus(signal);
      if (
        !status.runtimeReady ||
        !status.healthyServing ||
        status.activeCaptureWindowId !== undefined
      ) {
        throw new Error("Supervisor is not ready for capture");
      }
    } catch {
      if (!this.captureAdmissionIsCurrent(generation, signal)) {
        return "retryable-failure";
      }
      this.emit({
        code: "supervisor-unavailable",
        phase: "supervisor-status",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "retryable-failure";
    }
    if (!this.captureAdmissionIsCurrent(generation, signal)) {
      return "retryable-failure";
    }
    try {
      await this.snapshotPublisher.preflight({ signal });
    } catch {
      if (!this.captureAdmissionIsCurrent(generation, signal)) {
        return "retryable-failure";
      }
      this.emit({
        code: "destination-preflight-failed",
        phase: "destination-preflight",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "retryable-failure";
    }
    if (!this.captureAdmissionIsCurrent(generation, signal)) {
      return "retryable-failure";
    }

    let allocation: StagingAllocation;
    try {
      allocation = await this.stagingManager.allocate(runId);
    } catch (error) {
      if (
        error instanceof StagingError &&
        (error.code === "insufficient_capacity" ||
          error.code === "staging_unavailable")
      ) {
        this.emit({
          code: "staging-occupied",
          phase: "staging-allocation",
          trigger: lifecycleRequest.trigger,
          runId,
          captureWindowId,
          classification: error.code,
        });
        return "retryable-failure";
      }
      this.transition("failed");
      throw this.failure("staging-occupied", "staging-allocation", error, {
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
        classification:
          error instanceof StagingError ? error.code : "ownership-unknown",
      });
    }
    if (!this.captureAdmissionIsCurrent(generation, signal)) {
      return await this.cleanupInvalidatedCaptureAdmission(
        allocation,
        runId,
        captureWindowId,
        lifecycleRequest.trigger,
        signal.reason ?? this.stopController.signal.reason,
      );
    }

    const identity: CaptureIdentity = {
      supervisorInstanceId: status.supervisorInstanceId,
      captureWindowId,
      releaseId: status.releaseId,
      sourceVolumeId: status.sourceVolumeId,
      nodeVersion: status.nodeVersion,
      strapiVersion: status.strapiVersion,
    };
    const captureRequest: CaptureRequest = {
      version: 1,
      captureWindowId,
      expectedSupervisorInstanceId: identity.supervisorInstanceId,
      expectedReleaseId: identity.releaseId,
      expectedSourceVolumeId: identity.sourceVolumeId,
      expectedNodeVersion: identity.nodeVersion,
      expectedStrapiVersion: identity.strapiVersion,
      archiveBasePath: allocation.archiveBasePath,
    };
    if (!this.captureAdmissionIsCurrent(generation, signal)) {
      return await this.cleanupInvalidatedCaptureAdmission(
        allocation,
        runId,
        captureWindowId,
        lifecycleRequest.trigger,
        signal.reason ?? this.stopController.signal.reason,
      );
    }
    const captureBoundary = linkedController(signal);
    this.activeCapture = {
      generation,
      identity,
      controller: captureBoundary.controller,
    };
    this.transition("capturing");
    let accepted: CaptureAcceptedRecord | undefined;
    let watcherInstalled = false;
    const installWatcher = (record: CaptureAcceptedRecord) => {
      if (watcherInstalled) return;
      if (
        !sameIdentity(record.identity, identity) ||
        record.archiveBasePath !== allocation.archiveBasePath
      ) {
        throw new Error("Capture acceptance identity mismatch");
      }
      accepted = record;
      this.stagingManager.watchCaptureSize(
        allocation,
        identity,
        this.captureClient,
        (cause) => captureBoundary.controller.abort(cause),
      );
      watcherInstalled = true;
    };

    let terminal: CaptureTerminalRecord | undefined;
    try {
      const startCapture = this.captureClient.startCapture(captureRequest, {
        signal: captureBoundary.controller.signal,
        onAccepted: installWatcher,
      });
      const started = await startCapture;
      terminal =
        "type" in started && started.type === "terminal"
          ? started
          : await this.reconcileCapture(
              identity,
              allocation,
              status.budget.totalWindowMs,
              captureBoundary.controller.signal,
              installWatcher,
            );
      if (
        terminal.acceptedAt !== undefined &&
        accepted === undefined &&
        !watcherInstalled
      ) {
        installWatcher({
          version: 1,
          type: "accepted",
          identity: terminal.identity,
          archiveBasePath: terminal.archiveBasePath,
          startedAt: terminal.startedAt,
          deadlineAt: terminal.deadlineAt,
          acceptedAt: terminal.acceptedAt,
        });
      }
    } catch (error) {
      if (
        error instanceof CaptureAdmissionRejectedError &&
        accepted === undefined &&
        !watcherInstalled &&
        this.activeCapture?.generation === generation
      ) {
        this.activeCapture = undefined;
        return await this.cleanupRejectedCaptureAdmission(
          allocation,
          runId,
          captureWindowId,
          lifecycleRequest.trigger,
          error,
        );
      }
      this.transition("failed");
      this.emit({
        code: "capture-ownership-unknown",
        phase:
          accepted === undefined && !watcherInstalled
            ? "capture-reconciliation"
            : "capture-terminal",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "terminal-failure";
    } finally {
      captureBoundary.dispose();
      if (this.activeCapture?.generation === generation)
        this.activeCapture = undefined;
    }

    if (terminal.acceptedAt === undefined && accepted === undefined) {
      try {
        await this.safeCleanup(allocation, runId, lifecycleRequest.trigger);
      } catch {
        return "terminal-failure";
      }
      this.emit({
        code: "capture-invalid",
        phase: "capture-not-started",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "terminal-failure";
    }
    if (
      accepted !== undefined &&
      !terminalMatchesAcceptance(terminal, accepted)
    ) {
      this.transition("failed");
      this.emit({
        code: "capture-ownership-unknown",
        phase: "capture-identity",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "terminal-failure";
    }

    let disposition: CaptureWriterDisposition;
    try {
      disposition = await this.stagingManager.recordCaptureTerminal(
        allocation,
        terminal,
      );
    } catch {
      this.transition("failed");
      this.emit({
        code: "capture-ownership-unknown",
        phase: "writer-release",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "terminal-failure";
    }
    if (disposition === "unconfirmed") {
      this.transition("failed");
      this.emit({
        code: "capture-ownership-unknown",
        phase: "writer-release",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "terminal-failure";
    }
    if (terminal.outcome.status !== "captured") {
      try {
        await this.safeCleanup(allocation, runId, lifecycleRequest.trigger);
      } catch {
        return "terminal-failure";
      }
      this.emit({
        code: "capture-invalid",
        phase: "capture-terminal",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
        classification: terminal.outcome.status,
      });
      return "terminal-failure";
    }

    this.transition("validating");
    let archive: ValidatedArchive;
    try {
      archive = await this.stagingManager.validateArchive(
        allocation,
        terminal,
        {
          signal,
        },
      );
    } catch {
      try {
        await this.safeCleanup(allocation, runId, lifecycleRequest.trigger);
      } catch {
        return "terminal-failure";
      }
      this.emit({
        code: "validation-failed",
        phase: "archive-validation",
        trigger: lifecycleRequest.trigger,
        runId,
        captureWindowId,
      });
      return "terminal-failure";
    }

    const publicationRequest = createSnapshotPublicationRequest(
      archive,
      this.publicationConfig.attribution,
      this.publicationConfig.publication,
    );
    this.retainedAllocation = allocation;
    this.retainedRunId = runId;
    this.transition("pending-publication");
    this.startObservedPhase("state");
    try {
      await this.stateRepository.setPendingPublication(
        publicationRequest,
        new Date(this.now()).toISOString(),
        this.schedulePolicy.automaticRetryDelayMs,
      );
    } catch (error) {
      if (
        !isDurabilityUnconfirmed(error) ||
        !(await this.pendingTransitionWasCommitted(publicationRequest))
      ) {
        this.transition("failed");
        this.emit({
          code: "state-transition-failed",
          phase: "pending-state",
          trigger: lifecycleRequest.trigger,
          runId,
          captureWindowId,
        });
        this.finishObservedPhase("failed", "state-transition-failed");
        return "terminal-failure";
      }
    }
    this.finishObservedPhase("succeeded");
    return await this.publishPending(
      publicationRequest,
      signal,
      lifecycleRequest.trigger,
    );
  }

  private async reconcileCapture(
    identity: CaptureIdentity,
    allocation: StagingAllocation,
    totalWindowMs: number,
    signal: AbortSignal,
    installWatcher: (record: CaptureAcceptedRecord) => void,
  ): Promise<CaptureTerminalRecord> {
    let deadline = this.now() + totalWindowMs;
    let transportFailures = 0;
    while (!signal.aborted && this.now() < deadline) {
      let status: CaptureWindowStatus;
      try {
        status = await this.captureClient.reconcile(identity, signal);
        transportFailures = 0;
      } catch (error) {
        transportFailures += 1;
        if (transportFailures >= 3) throw error;
        await this.delay(RECONCILIATION_INTERVAL_MS, signal);
        continue;
      }
      if (status.type === "unusable") {
        throw new Error("Capture reconciliation became unusable");
      }
      if (
        !sameIdentity(status.identity, identity) ||
        status.archiveBasePath !== allocation.archiveBasePath
      ) {
        throw new Error("Capture reconciliation identity mismatch");
      }
      if (status.type === "terminal") return status;
      const accepted = acceptedFromStatus(status);
      if (accepted !== undefined) {
        installWatcher(accepted);
        deadline = Date.parse(accepted.deadlineAt);
      } else if (status.deadlineAt !== undefined) {
        deadline = Date.parse(status.deadlineAt);
      }
      await this.delay(RECONCILIATION_INTERVAL_MS, signal);
    }
    throw signal.reason ?? new Error("Capture reconciliation expired");
  }

  private async publishPending(
    request: SnapshotPublicationRequest,
    signal: AbortSignal,
    trigger: RunLifecycleRequest["trigger"],
  ): Promise<RunLifecycleResult> {
    this.transition("publishing");
    let published: PublishedSnapshot;
    try {
      published = await this.snapshotPublisher.publish(request, { signal });
    } catch (error) {
      const terminal =
        error instanceof SnapshotPublicationError &&
        (error.code === "remote_collision" ||
          error.code === "remote_inconsistent" ||
          error.code === "local_archive_changed");
      if (terminal) {
        this.transition("failed");
        this.emit({
          code: "remote-status-unknown",
          phase: "publication",
          trigger,
          runId: request.archive.runId,
          classification: error.code,
        });
        return "terminal-failure";
      }
      this.finishObservedPhase("pending");
      this.transition("pending-publication");
      this.emit({
        code: "publication-pending",
        phase: "publication",
        trigger,
        runId: request.archive.runId,
      });
      await this.armPendingPublication().catch(this.onError);
      return "publication-pending";
    }
    return await this.finishPublished(request, published, trigger);
  }

  private async finishPublished(
    request: SnapshotPublicationRequest,
    published: PublishedSnapshot,
    trigger?: RunLifecycleRequest["trigger"],
  ): Promise<RunLifecycleResult> {
    this.transition("cleaning");
    if (this.retainedAllocation !== undefined) {
      try {
        await this.stagingManager.cleanup(this.retainedAllocation);
      } catch {
        this.transition("failed");
        this.emit({
          code: "cleanup-failed",
          phase: "post-publication-cleanup",
          trigger,
          runId: request.archive.runId,
        });
        return "terminal-failure";
      }
      this.retainedAllocation = undefined;
    }
    try {
      this.startObservedPhase("state");
      await this.stateRepository.recordPublishedSnapshot(
        request.archive.runId,
        published,
        new Date(this.now()).toISOString(),
      );
    } catch (error) {
      if (
        !isDurabilityUnconfirmed(error) ||
        !(await this.publishedTransitionWasCommitted(request))
      ) {
        this.transition("failed");
        this.emit({
          code: "state-transition-failed",
          phase: "freshness-state",
          trigger,
          runId: request.archive.runId,
        });
        this.finishObservedPhase("failed", "state-transition-failed");
        return "terminal-failure";
      }
    }
    this.finishObservedPhase("succeeded");
    this.observe("freshnessConfirmed", {
      capturedAt: request.manifest.capture.capturedAt,
    });
    this.retainedRunId = undefined;
    this.transition("idle");
    return "completed";
  }

  private async safeCleanup(
    allocation: StagingAllocation,
    runId: string,
    trigger: RunLifecycleRequest["trigger"],
  ): Promise<void> {
    this.transition("cleaning");
    try {
      await this.stagingManager.cleanup(allocation);
    } catch (error) {
      this.transition("failed");
      throw this.failure("cleanup-failed", "capture-cleanup", error, {
        trigger,
        runId,
      });
    }
  }

  private captureAdmissionIsCurrent(
    generation: number,
    signal: AbortSignal,
  ): boolean {
    return (
      generation === this.captureAdmissionGeneration &&
      !this.stopped &&
      !signal.aborted &&
      this.lifecycleState === "preflighting"
    );
  }

  private async cleanupInvalidatedCaptureAdmission(
    allocation: StagingAllocation,
    runId: string,
    captureWindowId: string,
    trigger: RunLifecycleRequest["trigger"],
    shutdownCause: unknown,
  ): Promise<RunLifecycleResult> {
    try {
      await this.stagingManager.cleanup(allocation);
    } catch (cleanupCause) {
      this.transition("failed");
      throw this.failure(
        "cleanup-failed",
        "capture-admission-cleanup",
        new AggregateError(
          [
            shutdownCause ?? new Error("Capture admission was invalidated"),
            cleanupCause,
          ],
          "Capture admission cleanup failed",
        ),
        { trigger, runId, captureWindowId },
      );
    }
    this.emit({
      code: "capture-invalid",
      phase: "capture-admission",
      trigger,
      runId,
      captureWindowId,
      classification: "shutdown-before-start",
    });
    return "retryable-failure";
  }

  private async cleanupRejectedCaptureAdmission(
    allocation: StagingAllocation,
    runId: string,
    captureWindowId: string,
    trigger: RunLifecycleRequest["trigger"],
    rejection: CaptureAdmissionRejectedError,
  ): Promise<RunLifecycleResult> {
    this.transition("cleaning");
    try {
      await this.stagingManager.cleanup(allocation);
    } catch (cleanupCause) {
      this.transition("failed");
      throw this.failure(
        "cleanup-failed",
        "capture-admission-cleanup",
        new AggregateError(
          [rejection, cleanupCause],
          "Rejected capture admission cleanup failed",
        ),
        { trigger, runId, captureWindowId },
      );
    }
    this.emit({
      code: "capture-invalid",
      phase: "capture-admission",
      trigger,
      runId,
      captureWindowId,
      classification: rejection.reason,
    });
    return "retryable-failure";
  }

  private async handlePendingWake(
    runId: string,
    generation: number,
  ): Promise<void> {
    if (this.stopped || generation !== this.pendingGeneration) return;
    const state = await this.stateRepository.load();
    const pending = state.pendingPublication;
    if (pending === null || pending.runId !== runId) {
      await this.armPendingPublication();
      return;
    }
    if (this.now() >= Date.parse(pending.publicationDeadlineAt)) {
      await this.finalizeExpired(runId, generation);
      return;
    }
    const mutationCutoff =
      Date.parse(pending.publicationDeadlineAt) -
      this.publicationConfig.publication.finalReconciliationReserveMs;
    if (this.now() >= mutationCutoff) this.cutoffWakeHandledRun = runId;
    const dispatched = this.dispatchPendingPublication(runId);
    if (dispatched.status === "skipped") {
      if (dispatched.reason === "active") {
        await this.waitForCurrent();
        if (!this.stopped) {
          await this.delay(
            RECONCILIATION_INTERVAL_MS,
            this.stopController.signal,
          );
        }
      }
    } else {
      await dispatched.completion;
    }
    if (!this.stopped && generation === this.pendingGeneration) {
      await this.armPendingPublication();
    }
  }

  private async finalizeExpired(
    runId: string,
    generation: number,
  ): Promise<void> {
    if (this.finalizing !== undefined) return await this.finalizing;
    const operation = (async () => {
      await this.waitForCurrent();
      if (this.stopped || generation !== this.pendingGeneration) return;
      const state = await this.stateRepository.load();
      const pending = state.pendingPublication;
      if (
        pending === null ||
        pending.runId !== runId ||
        this.now() < Date.parse(pending.publicationDeadlineAt)
      ) {
        await this.armPendingPublication();
        return;
      }
      const request = restorePendingPublicationRequest(
        pending,
        this.publicationConfig.publication,
      );
      const boundary = linkedController(this.stopController.signal);
      let result: FinalPublicationReconciliation;
      try {
        result = await this.snapshotPublisher.reconcileFinal(request, {
          signal: boundary.controller.signal,
        });
      } catch {
        if (this.stopped) return;
        if (!(await this.cleanupRetainedForFinal(runId))) return;
        if (
          !(await this.clearPendingTransition(runId, "remote-status-unknown"))
        ) {
          return;
        }
        this.retainedRunId = undefined;
        this.transition("idle");
        this.emit({
          code: "remote-status-unknown",
          phase: "final-reconciliation",
          runId,
        });
        return;
      } finally {
        boundary.dispose();
      }
      if (this.stopped) return;
      if (result.status === "published") {
        await this.finishPublished(request, result.published);
        return;
      }
      if (!(await this.cleanupRetainedForFinal(runId))) return;
      if (!(await this.clearPendingTransition(runId, "expired"))) return;
      this.retainedRunId = undefined;
      this.transition("idle");
      this.emit({
        code: "publication-expired",
        phase: "final-reconciliation",
        runId,
        classification: result.status,
      });
    })();
    const tracked = operation.finally(() => {
      if (this.finalizing === tracked) this.finalizing = undefined;
    });
    this.finalizing = tracked;
    return await tracked;
  }

  private async cleanupRetainedForFinal(runId: string): Promise<boolean> {
    if (this.retainedAllocation === undefined) return true;
    this.transition("cleaning");
    try {
      await this.stagingManager.cleanup(this.retainedAllocation);
      this.retainedAllocation = undefined;
      return true;
    } catch {
      this.transition("failed");
      this.emit({
        code: "cleanup-failed",
        phase: "expired-cleanup",
        runId,
      });
      return false;
    }
  }

  private async pendingTransitionWasCommitted(
    request: SnapshotPublicationRequest,
  ): Promise<boolean> {
    try {
      const state = await this.stateRepository.reload();
      const pending = state.pendingPublication;
      return (
        pending?.runId === request.archive.runId &&
        pending.archiveKey === request.keys.archiveKey &&
        pending.manifestKey === request.keys.manifestKey &&
        pending.acceptedAt === request.archive.capture.acceptedAt &&
        pending.publicationDeadlineAt === request.publicationDeadlineAt
      );
    } catch {
      return false;
    }
  }

  private async publishedTransitionWasCommitted(
    request: SnapshotPublicationRequest,
  ): Promise<boolean> {
    try {
      const state = await this.stateRepository.reload();
      return (
        state.pendingPublication === null &&
        state.lastCompletedSnapshot?.runId === request.archive.runId &&
        state.lastCompletedSnapshot.capturedAt ===
          request.manifest.capture.capturedAt &&
        state.lastCompletedSnapshot.archiveKey === request.keys.archiveKey &&
        state.lastCompletedSnapshot.manifestKey === request.keys.manifestKey
      );
    } catch {
      return false;
    }
  }

  private async clearPendingTransition(
    runId: string,
    reason: "expired" | "remote-status-unknown",
  ): Promise<boolean> {
    try {
      await this.stateRepository.clearPendingWithoutSuccess(runId, reason);
      return true;
    } catch (error) {
      if (isDurabilityUnconfirmed(error)) {
        try {
          const state = await this.stateRepository.reload();
          if (
            state.pendingPublication === null &&
            state.lastCompletedSnapshot?.runId !== runId
          ) {
            return true;
          }
        } catch {
          // The state remains untrusted and the daemon fails closed below.
        }
      }
      this.transition("failed");
      this.emit({
        code: "state-transition-failed",
        phase: "pending-clear",
        runId,
        classification: reason,
      });
      return false;
    }
  }

  private async waitForCurrent(): Promise<void> {
    const current = this.current;
    if (current !== undefined) await current;
  }

  private delay(milliseconds: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const timer = this.setTimer(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, milliseconds);
      const abort = () => {
        this.clearTimer(timer);
        reject(signal.reason);
      };
      signal.addEventListener("abort", abort, { once: true });
    });
  }

  private clearPendingTimer(): void {
    this.pendingGeneration += 1;
    if (this.pendingTimer !== undefined) {
      this.clearTimer(this.pendingTimer);
      this.pendingTimer = undefined;
    }
  }

  private transition(next: BackupLifecycleState): void {
    if (
      this.lifecycleState === "stopping" &&
      next !== "stopped" &&
      next !== "failed"
    ) {
      return;
    }
    const nextPhase = this.phaseForState(next);
    if (this.observedPhase !== nextPhase) {
      this.finishObservedPhase(
        next === "failed"
          ? "failed"
          : next === "stopping" || next === "stopped"
            ? "cancelled"
            : "succeeded",
        next === "failed" ? this.lastFailureCode : undefined,
      );
      if (nextPhase !== undefined) {
        this.observedPhase = nextPhase;
        this.observe("phaseStarted", { phase: nextPhase });
      }
    }
    if (next === "failed") this.failureRecorded = true;
    this.lifecycleState = next;
  }

  private emit(event: BackupDaemonEvent): void {
    if (event.code !== "publication-pending") {
      this.lastFailureCode = event.code;
    }
    this.onEvent(Object.freeze({ ...event }));
  }

  private phaseForState(
    state: BackupLifecycleState,
  ): BackupObservedPhase | undefined {
    if (state === "preflighting") return "preflight";
    if (state === "capturing") return "capture";
    if (state === "validating") return "validation";
    if (state === "publishing") return "publication";
    if (state === "cleaning") return "cleanup";
    return undefined;
  }

  private finishObservedPhase(
    outcome: ObservedOutcome,
    failureCode?: BackupDaemonEventCode,
  ): void {
    const phase = this.observedPhase;
    if (phase === undefined) return;
    this.observedPhase = undefined;
    this.observe("phaseFinished", {
      phase,
      outcome,
      ...(failureCode === undefined ? {} : { failureCode }),
    });
  }

  private startObservedPhase(phase: BackupObservedPhase): void {
    if (this.observedPhase === phase) return;
    this.finishObservedPhase("succeeded");
    this.observedPhase = phase;
    this.observe("phaseStarted", { phase });
  }

  private observe<Method extends keyof BackupLifecycleObserver>(
    method: Method,
    event: Parameters<BackupLifecycleObserver[Method]>[0],
  ): void {
    try {
      const observer = this.observer[method] as
        | ((value: typeof event) => void)
        | undefined;
      observer?.(event);
    } catch {
      // Telemetry is an observer and cannot affect lifecycle authority.
    }
  }

  private failure(
    code: BackupDaemonEventCode,
    phase: string,
    cause?: unknown,
    fields: Partial<
      Pick<
        BackupDaemonEvent,
        "trigger" | "runId" | "captureWindowId" | "classification"
      >
    > = {},
  ): BackupDaemonError {
    const event = Object.freeze({ code, phase, ...fields });
    this.emit(event);
    return new BackupDaemonError(event, cause);
  }
}

export function createBackupLifecycleCoordinator(
  options: BackupLifecycleCoordinatorOptions,
): BackupLifecycleCoordinator {
  return new BackupLifecycleCoordinator(options);
}

export type { PublicationPolicy };

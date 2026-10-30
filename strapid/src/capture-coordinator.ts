import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import { CaptureTimeline, validateCaptureBudget } from "./capture-budget.ts";
import type {
  CaptureAcceptedRecord,
  CaptureActiveRecord,
  CaptureBudgetPolicy,
  CaptureIdentity,
  CaptureInvalidReason,
  CaptureRequest,
  CaptureServiceStatus,
  CaptureTerminalOutcome,
  CaptureTerminalRecord,
  CaptureWindowStatus,
} from "./capture-contract.ts";
import {
  validateCanonicalUuid,
  validateIdentityToken,
} from "./capture-contract.ts";
import type { ServingHealthPolicy } from "./health.ts";
import type { ProcessTerminationBounds } from "./process-group.ts";
import type {
  CaptureRuntimeInspection,
  CaptureRuntimeInspector,
} from "./strapi-runtime.ts";
import type {
  ExportOptions,
  ExportResult,
  ServingOptions,
  ServingStopResult,
  StrapiSupervisor,
  SupervisorSnapshot,
} from "./strapi-supervisor.ts";
import { StrapiRecoveryError } from "./strapi-supervisor.ts";

export interface CaptureResponseObserver {
  accepted(record: CaptureAcceptedRecord): Promise<void>;
  terminal(record: CaptureTerminalRecord): Promise<void>;
}

export interface CaptureCycle {
  readonly identity: CaptureIdentity;
  readonly terminal: Promise<CaptureTerminalRecord>;
}

export type CaptureObservedPhase =
  | "preflight"
  | "stop-serving"
  | "export"
  | "recover-serving";

export type CaptureObservedOutcome = "succeeded" | "failed" | "cancelled";

export interface CaptureCoordinatorObserver {
  admitted(event: { readonly identity: CaptureIdentity }): void;
  phaseStarted(event: { readonly phase: CaptureObservedPhase }): void;
  phaseFinished(event: {
    readonly phase: CaptureObservedPhase;
    readonly outcome: CaptureObservedOutcome;
  }): void;
  outputClosed(event: { readonly identity: CaptureIdentity }): void;
  terminal(event: {
    readonly identity: CaptureIdentity;
    readonly outcome: CaptureTerminalOutcome;
  }): void;
}

export interface CaptureOutputSession {
  readonly output: {
    readonly onStdout: (chunk: Uint8Array) => void;
    readonly onStderr: (chunk: Uint8Array) => void;
  };
  close(): void;
}

export class CaptureAdmissionError extends Error {
  readonly statusCode: 409 | 503;
  readonly code:
    | "capture_busy"
    | "identity_mismatch"
    | "stale_window"
    | "runtime_unavailable"
    | "serving_unavailable"
    | "admission_cancelled";

  constructor(
    statusCode: 409 | 503,
    code:
      | "capture_busy"
      | "identity_mismatch"
      | "stale_window"
      | "runtime_unavailable"
      | "serving_unavailable"
      | "admission_cancelled",
  ) {
    super(code);
    this.name = "CaptureAdmissionError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface CaptureCoordinatorOptions {
  readonly supervisor: CaptureSupervisor | StrapiSupervisor;
  readonly runtimeInspector: CaptureRuntimeInspector;
  readonly budget: CaptureBudgetPolicy;
  readonly releaseId: string;
  readonly sourceVolumeId: string;
  readonly servingHealth: ServingHealthPolicy;
  readonly exportEnvironment?: NodeJS.ProcessEnv;
  readonly supervisorInstanceId?: string;
  readonly now?: () => number;
  readonly wallNow?: () => Date;
  readonly admissionTimeoutMs?: number;
  readonly retryIntervalMs?: number;
  readonly output?: {
    readonly onStdout: (chunk: Uint8Array) => void;
    readonly onStderr: (chunk: Uint8Array) => void;
  };
  readonly createOutputSession?: (
    identity: CaptureIdentity,
  ) => CaptureOutputSession;
  readonly observer?: Partial<CaptureCoordinatorObserver>;
}

export interface CaptureSupervisor {
  snapshot(): SupervisorSnapshot;
  confirmServingReady(
    health: ServingHealthPolicy,
    signal?: AbortSignal,
  ): Promise<void>;
  stopServing(
    termination: ProcessTerminationBounds,
  ): Promise<ServingStopResult>;
  runExport(
    request: {
      readonly filePath: string;
      readonly arguments?: readonly string[];
      readonly environment?: NodeJS.ProcessEnv;
    },
    options: ExportOptions,
  ): Promise<ExportResult>;
  startServing(options: ServingOptions): Promise<void>;
}

interface ProvisionalAdmission {
  readonly windowId: string;
  readonly controller: AbortController;
}

interface ActiveWindow {
  readonly request: CaptureRequest;
  readonly identity: CaptureIdentity;
  readonly timeline: CaptureTimeline;
  readonly startedAt: string;
  readonly deadlineAt: string;
  readonly controller: AbortController;
  readonly terminalDeferred: PromiseWithResolvers<CaptureTerminalRecord>;
  readonly observer: CaptureResponseObserver;
  terminalDelivery?: Promise<void>;
  phase: CaptureActiveRecord["phase"];
  acceptedAt?: string;
  invalidReason?: CaptureInvalidReason;
  terminal?: CaptureTerminalRecord;
  outputSession: CaptureOutputSession;
  outputSessionClosed?: boolean;
  observedPhase?: CaptureObservedPhase;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Operation aborted", "AbortError");
}

function timeoutSignal(milliseconds: number): {
  readonly signal: AbortSignal;
  dispose(): void;
} {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(new DOMException("Deadline expired", "TimeoutError")),
    Math.max(0, milliseconds),
  );
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortReason(signal));
      },
      { once: true },
    );
  });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const aborted = () => reject(abortReason(signal));
    signal.addEventListener("abort", aborted, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener("abort", aborted);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", aborted);
        reject(error);
      },
    );
  });
}

function terminationBounds(
  total: number,
  forced: number,
): ProcessTerminationBounds {
  return {
    gracefulTimeoutMs: Math.max(1, total - forced),
    forcedTimeoutMs: forced,
    pollIntervalMs: Math.min(50, Math.max(1, forced / 5)),
  };
}

export class CaptureCoordinator {
  readonly supervisorInstanceId: string;

  private readonly now: () => number;
  private readonly wallNow: () => Date;
  private readonly output: CaptureCoordinatorOptions["output"];
  private provisional?: ProvisionalAdmission;
  private active?: ActiveWindow;
  private recent?: CaptureTerminalRecord;
  private shuttingDown = false;
  private cycleWaiter = Promise.withResolvers<CaptureCycle>();
  private readonly options: CaptureCoordinatorOptions;
  private readonly configurationValid: boolean;
  private readonly observer: Partial<CaptureCoordinatorObserver>;

  constructor(options: CaptureCoordinatorOptions) {
    this.options = options;
    validateCaptureBudget(options.budget);
    this.supervisorInstanceId = validateCanonicalUuid(
      options.supervisorInstanceId ?? randomUUID(),
      "supervisorInstanceId",
    );
    let configurationValid = true;
    try {
      validateIdentityToken(options.releaseId, "releaseId");
      validateIdentityToken(options.sourceVolumeId, "sourceVolumeId");
    } catch {
      configurationValid = false;
    }
    this.configurationValid = configurationValid;
    this.now = options.now ?? performance.now.bind(performance);
    this.wallNow = options.wallNow ?? (() => new Date());
    this.output = options.output ?? {
      onStdout: () => undefined,
      onStderr: () => undefined,
    };
    this.observer = options.observer ?? {};
  }

  async getServiceStatus(signal?: AbortSignal): Promise<CaptureServiceStatus> {
    if (!this.configurationValid) {
      return this.unavailable("configuration_invalid");
    }
    if (this.shuttingDown) {
      return this.unavailable("serving_unavailable");
    }
    const request = this.preflightRequest("/staging/.strapid-status");
    const runtime = await this.options.runtimeInspector.inspect(request);
    if (!runtime.ready) return this.unavailable(runtime.reason);
    if (this.active === undefined && this.provisional === undefined) {
      try {
        await this.options.supervisor.confirmServingReady(
          this.options.servingHealth,
          signal,
        );
      } catch {
        return this.unavailable("serving_unavailable");
      }
    }
    const snapshot = this.options.supervisor.snapshot();
    return {
      version: 1,
      runtimeReady: true,
      supervisorInstanceId: this.supervisorInstanceId,
      releaseId: this.options.releaseId,
      sourceVolumeId: this.options.sourceVolumeId,
      nodeVersion: runtime.nodeVersion,
      strapiVersion: runtime.strapiVersion,
      supervisorState: snapshot.state,
      healthyServing: snapshot.state === "serving" && this.active === undefined,
      budget: this.options.budget,
      ...(this.active === undefined
        ? {}
        : { activeCaptureWindowId: this.active.identity.captureWindowId }),
    };
  }

  beginCapture(
    request: CaptureRequest,
    observer: CaptureResponseObserver,
    admissionSignal: AbortSignal,
  ): Promise<CaptureTerminalRecord> {
    this.reserveAdmission(request);
    this.observe("phaseStarted", { phase: "preflight" });
    return this.executeCapture(request, observer, admissionSignal);
  }

  getWindowStatus(
    supervisorInstanceId: string,
    captureWindowId: string,
  ): CaptureWindowStatus {
    if (supervisorInstanceId !== this.supervisorInstanceId) {
      return {
        version: 1,
        type: "unusable",
        reason: "supervisor_replaced",
        currentSupervisorInstanceId: this.supervisorInstanceId,
      };
    }
    if (this.active?.identity.captureWindowId === captureWindowId) {
      return this.activeRecord(this.active);
    }
    if (this.recent?.identity.captureWindowId === captureWindowId) {
      return this.recent;
    }
    return {
      version: 1,
      type: "unusable",
      reason: "unknown_window",
      currentSupervisorInstanceId: this.supervisorInstanceId,
    };
  }

  cancel(supervisorInstanceId: string, captureWindowId: string): boolean {
    if (
      supervisorInstanceId !== this.supervisorInstanceId ||
      this.active?.identity.captureWindowId !== captureWindowId
    ) {
      return false;
    }
    this.invalidate(this.active, "client_cancelled");
    return true;
  }

  disconnect(captureWindowId: string): void {
    if (this.provisional?.windowId === captureWindowId) {
      this.provisional.controller.abort();
      return;
    }
    if (this.active?.identity.captureWindowId === captureWindowId) {
      this.invalidate(this.active, "client_disconnected");
    }
  }

  waitForCycleStart(): Promise<CaptureCycle> {
    return this.cycleWaiter.promise;
  }

  async beginSupervisorShutdown(): Promise<void> {
    if (!this.shuttingDown) {
      this.shuttingDown = true;
      this.provisional?.controller.abort();
      const active = this.active;
      if (active !== undefined) {
        let terminal = active.terminal;
        if (terminal === undefined) {
          active.controller.abort();
          this.closeOutputSession(active);
          this.finishObservedPhase(active, "cancelled");
          const outcome = {
            status: "supervisor-shutdown",
          } as const;
          terminal = this.commitTerminal(active, outcome);
          this.observe("terminal", { identity: active.identity, outcome });
        }
        await this.deliverTerminal(active);
        active.terminalDeferred.resolve(terminal);
        if (this.active === active) this.active = undefined;
      }
    }
    await this.active?.terminalDeferred.promise;
  }

  private reserveAdmission(request: CaptureRequest): void {
    if (this.shuttingDown || !this.configurationValid) {
      throw new CaptureAdmissionError(503, "serving_unavailable");
    }
    if (this.provisional !== undefined || this.active !== undefined) {
      throw new CaptureAdmissionError(409, "capture_busy");
    }
    if (this.recent?.identity.captureWindowId === request.captureWindowId) {
      throw new CaptureAdmissionError(409, "stale_window");
    }
    const controller = new AbortController();
    this.provisional = { windowId: request.captureWindowId, controller };
  }

  private async executeCapture(
    request: CaptureRequest,
    observer: CaptureResponseObserver,
    admissionSignal: AbortSignal,
  ): Promise<CaptureTerminalRecord> {
    const provisional = this.provisional;
    if (provisional === undefined) {
      throw new CaptureAdmissionError(409, "capture_busy");
    }
    const admissionTimer = timeoutSignal(
      this.options.admissionTimeoutMs ?? 10_000,
    );
    const signal = AbortSignal.any([
      provisional.controller.signal,
      admissionSignal,
      admissionTimer.signal,
    ]);
    try {
      const runtime = await abortable(
        this.options.runtimeInspector.inspect(
          this.preflightRequest(request.archiveBasePath),
        ),
        signal,
      );
      if (!runtime.ready) {
        throw new CaptureAdmissionError(503, "runtime_unavailable");
      }
      this.assertExpectedIdentity(request, runtime);
      if (this.options.supervisor.snapshot().state !== "serving") {
        throw new CaptureAdmissionError(503, "serving_unavailable");
      }
      await this.options.supervisor.confirmServingReady(
        {
          ...this.options.servingHealth,
          startupTimeoutMs: Math.min(
            this.options.servingHealth.startupTimeoutMs,
            this.options.admissionTimeoutMs ?? 10_000,
          ),
        },
        signal,
      );
      if (signal.aborted || this.shuttingDown) {
        throw new CaptureAdmissionError(503, "admission_cancelled");
      }

      const startedMonotonic = this.now();
      const startedWall = this.wallNow();
      const timeline = new CaptureTimeline(
        this.options.budget,
        startedMonotonic,
      );
      const identity: CaptureIdentity = {
        supervisorInstanceId: this.supervisorInstanceId,
        captureWindowId: request.captureWindowId,
        releaseId: this.options.releaseId,
        sourceVolumeId: this.options.sourceVolumeId,
        nodeVersion: runtime.nodeVersion,
        strapiVersion: runtime.strapiVersion,
      };
      const active: ActiveWindow = {
        request,
        identity,
        timeline,
        startedAt: startedWall.toISOString(),
        deadlineAt: new Date(
          startedWall.getTime() + this.options.budget.totalWindowMs,
        ).toISOString(),
        controller: new AbortController(),
        terminalDeferred: Promise.withResolvers<CaptureTerminalRecord>(),
        observer,
        phase: "preflight",
        outputSession: this.createOutputSession(identity),
        observedPhase: "preflight",
      };
      this.provisional = undefined;
      this.active = active;
      const cycleWaiter = this.cycleWaiter;
      this.cycleWaiter = Promise.withResolvers<CaptureCycle>();
      cycleWaiter.resolve({
        identity,
        terminal: active.terminalDeferred.promise,
      });
      this.observe("admitted", { identity });
      this.finishObservedPhase(active, "succeeded");
      return await this.runActiveCapture(active, observer);
    } catch (error) {
      if (this.active === undefined) {
        this.observe("phaseFinished", {
          phase: "preflight",
          outcome: signal.aborted ? "cancelled" : "failed",
        });
      }
      if (this.provisional === provisional) this.provisional = undefined;
      if (error instanceof CaptureAdmissionError) throw error;
      if (signal.aborted) {
        throw new CaptureAdmissionError(503, "admission_cancelled");
      }
      throw new CaptureAdmissionError(503, "serving_unavailable");
    } finally {
      admissionTimer.dispose();
    }
  }

  private async runActiveCapture(
    active: ActiveWindow,
    observer: CaptureResponseObserver,
  ): Promise<CaptureTerminalRecord> {
    let captureReason: CaptureInvalidReason | undefined;
    let exportClosedAt: string | undefined;
    try {
      active.phase = "stopping";
      this.startObservedPhase(active, "stop-serving");
      const stop = await this.options.supervisor.stopServing(
        terminationBounds(
          this.options.budget.servingShutdownMs,
          this.options.budget.forcedConfirmationMs,
        ),
      );
      if (this.shuttingDown || active.terminal !== undefined) {
        return await active.terminalDeferred.promise;
      }
      if (this.now() > active.timeline.deadlines.shutdown) {
        this.invalidate(active, "serving_stop_failed");
        this.finishObservedPhase(active, "failed");
      } else if (stop.status === "forced") {
        this.invalidate(active, "forced_serving_stop");
        this.finishObservedPhase(active, "failed");
      } else {
        this.finishObservedPhase(active, "succeeded");
        active.acceptedAt = this.wallNow().toISOString();
        const accepted: CaptureAcceptedRecord = {
          version: 1,
          type: "accepted",
          identity: active.identity,
          archiveBasePath: active.request.archiveBasePath,
          startedAt: active.startedAt,
          deadlineAt: active.deadlineAt,
          acceptedAt: active.acceptedAt,
        };
        const acceptanceDeadline =
          active.timeline.deadlines.overall -
          this.options.budget.exporterTerminationMs -
          this.options.budget.recoveryMs;
        const acceptanceExpiry = setTimeout(
          () => this.invalidate(active, "window_expired"),
          active.timeline.remaining(acceptanceDeadline, this.now()),
        );
        try {
          await abortable(
            observer.accepted(accepted),
            active.controller.signal,
          );
        } catch {
          if (active.invalidReason === undefined) {
            this.invalidate(active, "client_disconnected");
          }
        } finally {
          clearTimeout(acceptanceExpiry);
        }
      }
      if (active.invalidReason === undefined) {
        active.phase = "exporting";
        this.startObservedPhase(active, "export");
        const exportDeadline = active.timeline.exportDeadline(this.now());
        const exportRemaining = active.timeline.remaining(
          exportDeadline,
          this.now(),
        );
        if (exportRemaining <= 0) {
          this.invalidate(active, "window_expired");
        }
        const expiry = setTimeout(
          () => this.invalidate(active, "window_expired"),
          exportRemaining,
        );
        try {
          const result =
            active.invalidReason === undefined
              ? await this.options.supervisor.runExport(
                  {
                    filePath: active.request.archiveBasePath,
                    arguments: ["--no-encrypt", "--no-compress"],
                    environment: this.options.exportEnvironment,
                  },
                  {
                    termination: terminationBounds(
                      this.options.budget.exporterTerminationMs,
                      this.options.budget.forcedConfirmationMs,
                    ),
                    output: active.outputSession.output,
                    signal: active.controller.signal,
                  },
                )
              : undefined;
          if (result !== undefined) {
            exportClosedAt = this.wallNow().toISOString();
            if (
              this.now() > exportDeadline &&
              active.invalidReason === undefined
            ) {
              this.invalidate(active, "window_expired");
            }
          }
          if (result?.status === "recovery-failed") {
            return await this.finish(active, {
              status: "recovery-failed",
              ...(active.invalidReason === undefined
                ? {}
                : { captureReason: active.invalidReason }),
              reason: "export_ownership_unconfirmed",
            });
          }
          if (
            result !== undefined &&
            result.status !== "succeeded" &&
            active.invalidReason === undefined
          ) {
            this.invalidate(
              active,
              result.status === "cancelled" ||
                result.status === "cancelled-before-start"
                ? "export_cancelled"
                : result.cause === undefined
                  ? "export_failed"
                  : "export_setup_failed",
            );
          }
        } finally {
          clearTimeout(expiry);
          this.closeOutputSession(active);
          this.finishObservedPhase(
            active,
            active.invalidReason === undefined ? "succeeded" : "failed",
          );
        }
      } else {
        this.closeOutputSession(active);
      }
      captureReason = active.invalidReason;

      if (this.shuttingDown || active.terminal !== undefined) {
        return await active.terminalDeferred.promise;
      }
      active.phase = "recovering";
      this.startObservedPhase(active, "recover-serving");
      const recovered = await this.recoverServing(active);
      if (!recovered.ok) {
        this.finishObservedPhase(active, "failed");
        return await this.finish(active, {
          status: "recovery-failed",
          ...(captureReason === undefined ? {} : { captureReason }),
          reason: recovered.reason,
        });
      }
      this.finishObservedPhase(active, "succeeded");
      const servingRecoveredAt = this.wallNow().toISOString();
      const outcome: CaptureTerminalOutcome =
        captureReason === undefined && exportClosedAt !== undefined
          ? {
              status: "captured",
              exportClosedAt,
              servingRecoveredAt,
            }
          : {
              status: "invalid",
              reason: captureReason ?? "export_failed",
              servingRecoveredAt,
            };
      return await this.finish(active, outcome);
    } catch (error) {
      this.finishObservedPhase(active, "failed");
      if (this.shuttingDown || active.terminal !== undefined) {
        return await active.terminalDeferred.promise;
      }
      const owned =
        error instanceof StrapiRecoveryError && error.ownedGroupMayRemain;
      if (!owned && this.options.supervisor.snapshot().state !== "serving") {
        try {
          active.phase = "recovering";
          this.startObservedPhase(active, "recover-serving");
          const recovered = await this.recoverServing(active);
          if (recovered.ok) {
            this.finishObservedPhase(active, "succeeded");
            return await this.finish(active, {
              status: "invalid",
              reason: active.invalidReason ?? "serving_stop_failed",
              servingRecoveredAt: this.wallNow().toISOString(),
            });
          }
        } catch {
          this.finishObservedPhase(active, "failed");
          // The terminal result below remains non-authorizing.
        }
      }
      return await this.finish(active, {
        status: "recovery-failed",
        ...(active.invalidReason === undefined
          ? {}
          : { captureReason: active.invalidReason }),
        reason: owned
          ? "serving_ownership_unconfirmed"
          : "serving_recovery_failed",
      });
    }
  }

  private async recoverServing(active: ActiveWindow): Promise<
    | { readonly ok: true }
    | {
        readonly ok: false;
        readonly reason:
          | "serving_ownership_unconfirmed"
          | "serving_recovery_failed"
          | "recovery_expired";
      }
  > {
    const deadline = active.timeline.recoveryDeadline(this.now());
    while (!this.shuttingDown) {
      const remaining = active.timeline.remaining(deadline, this.now());
      const healthAllowance =
        remaining - this.options.budget.exporterTerminationMs;
      if (healthAllowance <= 0)
        return { ok: false, reason: "recovery_expired" };
      try {
        await this.options.supervisor.startServing({
          health: {
            ...this.options.servingHealth,
            startupTimeoutMs: healthAllowance,
          },
          termination: terminationBounds(
            this.options.budget.exporterTerminationMs,
            this.options.budget.forcedConfirmationMs,
          ),
        });
        if (this.shuttingDown) return { ok: false, reason: "recovery_expired" };
        if (this.now() > deadline) {
          return { ok: false, reason: "recovery_expired" };
        }
        return { ok: true };
      } catch (error) {
        if (error instanceof StrapiRecoveryError && error.ownedGroupMayRemain) {
          return { ok: false, reason: "serving_ownership_unconfirmed" };
        }
        if (active.timeline.remaining(deadline, this.now()) <= 500) {
          return { ok: false, reason: "serving_recovery_failed" };
        }
        await delay(
          Math.min(
            this.options.retryIntervalMs ?? 500,
            active.timeline.remaining(deadline, this.now()),
          ),
        );
      }
    }
    return { ok: false, reason: "recovery_expired" };
  }

  private async finish(
    active: ActiveWindow,
    outcome: CaptureTerminalOutcome,
  ): Promise<CaptureTerminalRecord> {
    this.closeOutputSession(active);
    this.finishObservedPhase(
      active,
      outcome.status === "captured"
        ? "succeeded"
        : outcome.status === "supervisor-shutdown"
          ? "cancelled"
          : "failed",
    );
    const terminal = this.commitTerminal(active, outcome);
    this.observe("terminal", { identity: active.identity, outcome });
    await this.deliverTerminal(active);
    active.terminalDeferred.resolve(terminal);
    if (this.active === active) this.active = undefined;
    return terminal;
  }

  private deliverTerminal(active: ActiveWindow): Promise<void> {
    const terminal = active.terminal;
    if (terminal === undefined) {
      throw new Error("Cannot deliver an uncommitted capture terminal");
    }
    active.terminalDelivery ??= Promise.resolve()
      .then(() => active.observer.terminal(terminal))
      .catch(() => {
        // Terminal state was committed before transport acknowledgement.
      });
    return active.terminalDelivery;
  }

  private commitTerminal(
    active: ActiveWindow,
    outcome: CaptureTerminalOutcome,
  ): CaptureTerminalRecord {
    if (active.terminal !== undefined) return active.terminal;
    const terminal: CaptureTerminalRecord = {
      version: 1,
      type: "terminal",
      identity: active.identity,
      archiveBasePath: active.request.archiveBasePath,
      startedAt: active.startedAt,
      deadlineAt: active.deadlineAt,
      ...(active.acceptedAt === undefined
        ? {}
        : { acceptedAt: active.acceptedAt }),
      completedAt: this.wallNow().toISOString(),
      outcome,
    };
    active.terminal = terminal;
    this.recent = terminal;
    return terminal;
  }

  private createOutputSession(identity: CaptureIdentity): CaptureOutputSession {
    try {
      return (
        this.options.createOutputSession?.(identity) ?? {
          output: this.output ?? {
            onStdout: () => undefined,
            onStderr: () => undefined,
          },
          close: () => undefined,
        }
      );
    } catch {
      return {
        output: { onStdout: () => undefined, onStderr: () => undefined },
        close: () => undefined,
      };
    }
  }

  private closeOutputSession(active: ActiveWindow): void {
    if (active.outputSessionClosed) return;
    active.outputSessionClosed = true;
    try {
      active.outputSession.close();
    } catch {
      // Output telemetry is advisory and cannot alter capture authority.
    }
    this.observe("outputClosed", { identity: active.identity });
  }

  private startObservedPhase(
    active: ActiveWindow,
    phase: CaptureObservedPhase,
  ): void {
    this.finishObservedPhase(active, "succeeded");
    active.observedPhase = phase;
    this.observe("phaseStarted", { phase });
  }

  private finishObservedPhase(
    active: ActiveWindow,
    outcome: CaptureObservedOutcome,
  ): void {
    const phase = active.observedPhase;
    if (phase === undefined) return;
    active.observedPhase = undefined;
    this.observe("phaseFinished", { phase, outcome });
  }

  private observe<Method extends keyof CaptureCoordinatorObserver>(
    method: Method,
    event: Parameters<CaptureCoordinatorObserver[Method]>[0],
  ): void {
    try {
      const observer = this.observer[method] as
        | ((value: typeof event) => void)
        | undefined;
      observer?.(event);
    } catch {
      // Observers are never capture decision inputs.
    }
  }

  private invalidate(active: ActiveWindow, reason: CaptureInvalidReason): void {
    active.invalidReason ??= reason;
    if (active.phase === "exporting") active.phase = "terminating-export";
    if (!active.controller.signal.aborted) active.controller.abort(reason);
  }

  private assertExpectedIdentity(
    request: CaptureRequest,
    runtime: Extract<CaptureRuntimeInspection, { readonly ready: true }>,
  ): void {
    if (
      request.expectedSupervisorInstanceId !== this.supervisorInstanceId ||
      request.expectedReleaseId !== this.options.releaseId ||
      request.expectedSourceVolumeId !== this.options.sourceVolumeId ||
      request.expectedNodeVersion !== runtime.nodeVersion ||
      request.expectedStrapiVersion !== runtime.strapiVersion
    ) {
      throw new CaptureAdmissionError(409, "identity_mismatch");
    }
  }

  private preflightRequest(filePath: string) {
    return {
      operation: "export" as const,
      filePath,
      arguments: ["--no-encrypt", "--no-compress"],
      environment: this.options.exportEnvironment,
    };
  }

  private unavailable(
    reason:
      | "configuration_invalid"
      | "runtime_unavailable"
      | "serving_unavailable",
  ): CaptureServiceStatus {
    return {
      version: 1,
      runtimeReady: false,
      supervisorInstanceId: this.supervisorInstanceId,
      reason,
    };
  }

  private activeRecord(active: ActiveWindow): CaptureActiveRecord {
    return {
      version: 1,
      type: "active",
      identity: active.identity,
      archiveBasePath: active.request.archiveBasePath,
      startedAt: active.startedAt,
      deadlineAt: active.deadlineAt,
      ...(active.acceptedAt === undefined
        ? {}
        : { acceptedAt: active.acceptedAt }),
      phase: active.phase,
    };
  }
}

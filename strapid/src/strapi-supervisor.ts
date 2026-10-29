import type { ServingHealthPolicy } from "./health.ts";
import { waitForServingHealth } from "./health.ts";
import type { LifecycleEvent, SupervisorState } from "./lifecycle-policy.ts";
import {
  LifecycleConflictError,
  transitionLifecycle,
} from "./lifecycle-policy.ts";
import type {
  ChildCloseResult,
  ChildCommand,
  ManagedCompletion,
  ManagedProcessGroup,
  ProcessTerminationBounds,
} from "./process-group.ts";
import {
  ProcessGroupExitUnconfirmedError,
  spawnManagedProcessGroup,
} from "./process-group.ts";
import type {
  StrapiCliInvocation,
  StrapiWorkspaceRequest,
} from "./strapi-runtime.ts";
import {
  STRAPI_APPLICATION_ROOT,
  STRAPI_CLI,
  STRAPI_NODE_EXECUTABLE,
  withStrapiDataTransferWorkspace,
} from "./strapi-runtime.ts";

export interface ServingOptions {
  readonly health: ServingHealthPolicy;
  readonly termination: ProcessTerminationBounds;
  readonly signal?: AbortSignal;
}

export interface ExportOutput {
  readonly onStdout: (chunk: Uint8Array) => void;
  readonly onStderr: (chunk: Uint8Array) => void;
}

export interface ExportOptions {
  readonly termination: ProcessTerminationBounds;
  readonly output: ExportOutput;
  readonly signal?: AbortSignal;
}

export type ServingStopResult =
  | { readonly status: "graceful"; readonly close: ChildCloseResult }
  | { readonly status: "forced"; readonly close: ChildCloseResult };

export type ExportResult =
  | {
      readonly status: "succeeded";
      readonly close: { readonly status: "exited"; readonly exitCode: 0 };
    }
  | {
      readonly status: "failed";
      readonly close?: ChildCloseResult;
      readonly cause?: unknown;
    }
  | { readonly status: "cancelled"; readonly close: ChildCloseResult }
  | { readonly status: "cancelled-before-start" }
  | { readonly status: "recovery-failed"; readonly cause: StrapiRecoveryError };

export type ServingLoss =
  | { readonly status: "recovery-required"; readonly close: ChildCloseResult }
  | { readonly status: "recovery-failed"; readonly cause: Error };

export interface SupervisorSnapshot {
  readonly state: SupervisorState;
  readonly activeRole?: "serving" | "export";
  readonly activePid?: number;
}

export class StrapiRecoveryError extends Error {
  readonly ownedGroupMayRemain: boolean;

  constructor(
    role: ChildCommand["role"],
    ownedGroupMayRemain: boolean,
    cause: unknown,
  ) {
    super(
      ownedGroupMayRemain
        ? `${role} recovery failed with process ownership unresolved`
        : `${role} recovery failed after process ownership was resolved`,
      { cause },
    );
    this.name = "StrapiRecoveryError";
    this.ownedGroupMayRemain = ownedGroupMayRemain;
  }
}

interface SupervisorCommandFactory {
  createServingCommand(): ChildCommand;
  createExportCommand(
    invocation: StrapiCliInvocation,
    output: ExportOutput,
  ): ChildCommand;
}

interface RetainedExportOwnership {
  readonly child: ManagedProcessGroup;
  readonly workspace: string;
  readonly gate: PromiseWithResolvers<void>;
  readonly workspacePromise: Promise<ManagedCompletion | undefined>;
  readonly cause: StrapiRecoveryError;
}

interface ActiveExportOperation {
  readonly generation: number;
  readonly safeExitGate: PromiseWithResolvers<void>;
  readonly retentionReady: PromiseWithResolvers<RetainedExportOwnership>;
  readonly terminalResult: PromiseWithResolvers<ExportResult>;
  workspace?: string;
  workspacePromise?: Promise<ManagedCompletion | undefined>;
  child?: ManagedProcessGroup;
  retained?: RetainedExportOwnership;
  provisionalResult?: ExportResult;
  terminalSettled: boolean;
  shutdownDominates: boolean;
  cancelled: boolean;
  directWaitSettled: boolean;
  workspaceSettled: boolean;
  safeExitGateReleased: boolean;
}

interface ExportOperationTestSnapshot {
  readonly workspace?: string;
  readonly childPid?: number;
  readonly retained: boolean;
  readonly directWaitSettled: boolean;
  readonly workspaceSettled: boolean;
  readonly safeExitGateReleased: boolean;
}

const inspectExportOperation = Symbol("inspectExportOperation");

interface SupervisorTestOptions {
  readonly createServingCommand: () => ChildCommand;
  readonly createExportCommand: (
    invocation: StrapiCliInvocation,
    output: ExportOutput,
  ) => ChildCommand;
  readonly beforeExportSpawn?: (
    invocation: StrapiCliInvocation,
  ) => Promise<void>;
  readonly beforeExportShutdownTermination?: (
    child: ManagedProcessGroup,
  ) => void;
}

const productionCommands: SupervisorCommandFactory = {
  createServingCommand(): ChildCommand {
    return {
      role: "serving",
      executable: STRAPI_NODE_EXECUTABLE,
      arguments: [STRAPI_CLI, "start"],
      cwd: STRAPI_APPLICATION_ROOT,
      environment: { ...process.env },
      output: { mode: "inherit" },
    };
  },
  createExportCommand(
    invocation: StrapiCliInvocation,
    output: ExportOutput,
  ): ChildCommand {
    return {
      role: "export",
      executable: invocation.executable,
      arguments: invocation.arguments,
      cwd: invocation.cwd,
      environment: invocation.environment,
      output: { mode: "pipe", ...output },
    };
  },
};

export class StrapiSupervisor {
  private state: SupervisorState = "stopped";
  private readonly commands: SupervisorCommandFactory;
  private active: ManagedProcessGroup | undefined;
  private generation = 0;
  private servingLoss: PromiseWithResolvers<ServingLoss> | undefined;
  private activeExportOperation: ActiveExportOperation | undefined;
  private readonly beforeExportSpawn:
    | ((invocation: StrapiCliInvocation) => Promise<void>)
    | undefined;
  private readonly beforeExportShutdownTermination:
    | ((child: ManagedProcessGroup) => void)
    | undefined;

  constructor(
    commands: SupervisorCommandFactory = productionCommands,
    beforeExportSpawn?: (invocation: StrapiCliInvocation) => Promise<void>,
    beforeExportShutdownTermination?: (child: ManagedProcessGroup) => void,
  ) {
    this.commands = commands;
    this.beforeExportSpawn = beforeExportSpawn;
    this.beforeExportShutdownTermination = beforeExportShutdownTermination;
  }

  snapshot(): SupervisorSnapshot {
    let activePid: number | undefined;
    try {
      activePid = this.active?.pid;
    } catch {
      activePid = undefined;
    }
    return {
      state: this.state,
      ...(this.active === undefined
        ? {}
        : { activeRole: this.active.role, activePid }),
    };
  }

  async startServing(options: ServingOptions): Promise<void> {
    this.apply("start-serving");
    const generation = ++this.generation;
    let child: ManagedProcessGroup;
    try {
      child = spawnManagedProcessGroup(
        this.commands.createServingCommand(),
        options.termination,
      );
    } catch (cause) {
      this.apply("serving-start-failed");
      throw new StrapiRecoveryError("serving", false, cause);
    }
    this.active = child;

    try {
      await waitForServingHealth(child, options.health, options.signal);
    } catch (healthFailure) {
      if (!this.isCurrent(generation, child, "starting-serving")) {
        throw healthFailure;
      }
      try {
        await child.terminate(options.termination);
      } catch (terminationFailure) {
        if (terminationFailure instanceof ProcessGroupExitUnconfirmedError) {
          this.apply("ownership-unconfirmed");
          throw new StrapiRecoveryError("serving", true, terminationFailure);
        }
        this.active = undefined;
        this.apply("serving-start-failed");
        throw new StrapiRecoveryError("serving", false, terminationFailure);
      }
      this.active = undefined;
      this.apply("serving-start-failed");
      throw new StrapiRecoveryError("serving", false, healthFailure);
    }

    if (!this.isCurrent(generation, child, "starting-serving")) {
      throw new LifecycleConflictError(this.state, "serving-health-confirmed");
    }
    this.apply("serving-health-confirmed");
    const servingLoss = Promise.withResolvers<ServingLoss>();
    this.servingLoss = servingLoss;
    void child.wait().then(
      (completion) =>
        this.observeServingCompletion(
          generation,
          child,
          servingLoss,
          completion,
        ),
      (error) =>
        this.observeServingFailure(generation, child, servingLoss, error),
    );
  }

  waitForServingLoss(): Promise<ServingLoss> {
    if (this.state !== "serving" || this.servingLoss === undefined) {
      throw new LifecycleConflictError(this.state, "serving-lost");
    }
    return this.servingLoss.promise;
  }

  async confirmServingReady(
    health: ServingHealthPolicy,
    signal?: AbortSignal,
  ): Promise<void> {
    if (this.state !== "serving") {
      throw new LifecycleConflictError(this.state, "serving-health-confirmed");
    }
    const child = this.requireActive("serving");
    const generation = this.generation;
    await waitForServingHealth(child, health, signal);
    if (!this.isCurrent(generation, child, "serving")) {
      throw new LifecycleConflictError(this.state, "serving-health-confirmed");
    }
  }

  async stopServing(
    termination: ProcessTerminationBounds,
  ): Promise<ServingStopResult> {
    this.apply("stop-serving");
    const child = this.requireActive("serving");
    let completion: ManagedCompletion;
    try {
      completion = await child.terminate(termination);
    } catch (cause) {
      if (cause instanceof ProcessGroupExitUnconfirmedError) {
        this.apply("ownership-unconfirmed");
        throw new StrapiRecoveryError("serving", true, cause);
      }
      this.active = undefined;
      this.apply("serving-stopped");
      throw new StrapiRecoveryError("serving", false, cause);
    }
    this.active = undefined;
    this.apply("serving-stopped");
    return completion.termination === "forced"
      ? { status: "forced", close: completion.close }
      : { status: "graceful", close: completion.close };
  }

  async runExport(
    request: Omit<StrapiWorkspaceRequest, "operation">,
    options: ExportOptions,
  ): Promise<ExportResult> {
    this.apply("start-export");
    const operation: ActiveExportOperation = {
      generation: ++this.generation,
      safeExitGate: Promise.withResolvers<void>(),
      retentionReady: Promise.withResolvers<RetainedExportOwnership>(),
      terminalResult: Promise.withResolvers<ExportResult>(),
      terminalSettled: false,
      shutdownDominates: false,
      cancelled: options.signal?.aborted ?? false,
      directWaitSettled: false,
      workspaceSettled: false,
      safeExitGateReleased: false,
      ...(options.signal?.aborted
        ? {
            provisionalResult: {
              status: "cancelled-before-start" as const,
            },
          }
        : {}),
    };
    this.activeExportOperation = operation;

    const workspacePromise = withStrapiDataTransferWorkspace(
      { ...request, operation: "export" },
      (invocation) => this.runInExportWorkspace(operation, invocation, options),
    );
    operation.workspacePromise = workspacePromise;
    void workspacePromise.then(
      (completion) =>
        this.observeExportWorkspace(operation, {
          ok: true,
          completion,
        }),
      (cause: unknown) =>
        this.observeExportWorkspace(operation, { ok: false, cause }),
    );
    return operation.terminalResult.promise;
  }

  async reconfirmOwnedChildExit(): Promise<boolean> {
    if (this.state !== "recovery-failed") {
      throw new LifecycleConflictError(this.state, "owned-exit-reconfirmed");
    }
    const child = this.requireActive();
    if (!(await child.reconfirmExit())) {
      return false;
    }

    let cleanupFailure: unknown;
    const operation = this.activeExportOperation;
    if (operation?.retained !== undefined) {
      this.releaseSafeExitGate(operation);
      try {
        await operation.workspacePromise;
      } catch (error) {
        cleanupFailure = error;
      }
      this.activeExportOperation = undefined;
    }
    this.active = undefined;
    this.apply("owned-exit-reconfirmed");
    if (cleanupFailure !== undefined) {
      throw cleanupFailure;
    }
    return true;
  }

  async shutdown(termination: ProcessTerminationBounds): Promise<void> {
    this.apply("shutdown-requested");
    ++this.generation;
    const exportOperation = this.activeExportOperation;
    if (exportOperation !== undefined) {
      exportOperation.shutdownDominates = true;
      exportOperation.cancelled = true;
      await this.shutdownExport(exportOperation, termination);
      return;
    }

    const child = this.active;
    let safeFailure: unknown;

    if (child !== undefined) {
      try {
        await child.terminate(termination);
      } catch (cause) {
        if (cause instanceof ProcessGroupExitUnconfirmedError) {
          throw new StrapiRecoveryError(child.role, true, cause);
        }
        safeFailure = cause;
      }
    }

    this.active = undefined;
    this.apply("shutdown-complete");
    if (safeFailure !== undefined) {
      throw new StrapiRecoveryError("export", false, safeFailure);
    }
  }

  private async runInExportWorkspace(
    operation: ActiveExportOperation,
    invocation: StrapiCliInvocation,
    options: ExportOptions,
  ): Promise<ManagedCompletion | undefined> {
    operation.workspace = invocation.cwd;
    await this.beforeExportSpawn?.(invocation);

    if (
      !this.isCurrentExportOperation(operation) ||
      operation.cancelled ||
      options.signal?.aborted
    ) {
      operation.cancelled = true;
      operation.provisionalResult = { status: "cancelled-before-start" };
      return undefined;
    }

    const child = spawnManagedProcessGroup(
      this.commands.createExportCommand(invocation, options.output),
      options.termination,
    );
    operation.child = child;
    this.active = child;

    const cancel = () => {
      operation.cancelled = true;
      void child.terminate(options.termination).catch((cause: unknown) => {
        if (cause instanceof ProcessGroupExitUnconfirmedError) {
          this.retainExportOwnership(operation, cause);
        }
      });
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) {
      cancel();
    }

    try {
      const completion = await child.wait();
      operation.directWaitSettled = true;
      if (operation.retained !== undefined) {
        await operation.retained.gate.promise;
        return undefined;
      }
      operation.provisionalResult = this.classifyExportCompletion(
        operation,
        completion,
      );
      return completion;
    } catch (cause) {
      operation.directWaitSettled = true;
      if (!(cause instanceof ProcessGroupExitUnconfirmedError)) {
        operation.provisionalResult = { status: "failed", cause };
        throw cause;
      }
      const retained = this.retainExportOwnership(operation, cause);
      await retained.gate.promise;
      return undefined;
    } finally {
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  private observeExportWorkspace(
    operation: ActiveExportOperation,
    outcome:
      | {
          readonly ok: true;
          readonly completion: ManagedCompletion | undefined;
        }
      | { readonly ok: false; readonly cause: unknown },
  ): void {
    operation.workspaceSettled = true;
    if (operation.retained !== undefined || operation.shutdownDominates) {
      return;
    }

    this.releaseExportOperation(operation);
    if (this.state === "exporting") {
      this.apply("export-finished");
    }

    if (!outcome.ok) {
      operation.provisionalResult = {
        status: "failed",
        cause: outcome.cause,
      };
      this.settleExportResult(operation, operation.provisionalResult);
      return;
    }

    const completion = outcome.completion;
    if (operation.child === undefined || completion === undefined) {
      this.settleExportResult(
        operation,
        operation.provisionalResult ?? { status: "cancelled-before-start" },
      );
      return;
    }
    if (operation.cancelled) {
      operation.provisionalResult = this.classifyExportCompletion(
        operation,
        completion,
      );
    }
    this.settleExportResult(
      operation,
      operation.provisionalResult ??
        this.classifyExportCompletion(operation, completion),
    );
  }

  private retainExportOwnership(
    operation: ActiveExportOperation,
    cause: ProcessGroupExitUnconfirmedError,
  ): RetainedExportOwnership {
    if (operation.retained !== undefined) {
      return operation.retained;
    }
    if (
      operation.child === undefined ||
      operation.workspace === undefined ||
      operation.workspacePromise === undefined
    ) {
      throw new Error("Cannot retain incomplete export ownership");
    }

    const recoveryError = new StrapiRecoveryError("export", true, cause);
    const retained: RetainedExportOwnership = {
      child: operation.child,
      workspace: operation.workspace,
      gate: operation.safeExitGate,
      workspacePromise: operation.workspacePromise,
      cause: recoveryError,
    };
    operation.retained = retained;
    operation.provisionalResult = {
      status: "recovery-failed",
      cause: recoveryError,
    };
    operation.retentionReady.resolve(retained);
    if (this.state === "exporting") {
      this.apply("ownership-unconfirmed");
    }
    this.settleExportResult(operation, operation.provisionalResult);
    return retained;
  }

  private async shutdownExport(
    operation: ActiveExportOperation,
    termination: ProcessTerminationBounds,
  ): Promise<void> {
    let completion: ManagedCompletion | undefined;
    let safeFailure: unknown;
    const child = operation.child;

    if (operation.retained !== undefined) {
      if (!(await operation.retained.child.reconfirmExit())) {
        throw operation.retained.cause;
      }
      this.releaseSafeExitGate(operation);
    } else if (child !== undefined) {
      try {
        this.beforeExportShutdownTermination?.(child);
        completion = await child.terminate(termination);
      } catch (cause) {
        if (cause instanceof ProcessGroupExitUnconfirmedError) {
          const retained = this.retainExportOwnership(operation, cause);
          await operation.retentionReady.promise;
          throw retained.cause;
        }
        safeFailure = cause;
      }
    }

    try {
      await operation.workspacePromise;
    } catch (error) {
      safeFailure ??= error;
    }

    this.releaseExportOperation(operation);
    this.apply("shutdown-complete");
    if (!operation.terminalSettled) {
      if (child === undefined) {
        this.settleExportResult(operation, {
          status: "cancelled-before-start",
        });
      } else if (completion !== undefined) {
        this.settleExportResult(operation, {
          status: "cancelled",
          close: completion.close,
        });
      } else {
        this.settleExportResult(operation, {
          status: "failed",
          cause: safeFailure,
        });
      }
    }
    if (safeFailure !== undefined) {
      throw new StrapiRecoveryError("export", false, safeFailure);
    }
  }

  private isCurrentExportOperation(operation: ActiveExportOperation): boolean {
    return (
      this.state === "exporting" &&
      this.generation === operation.generation &&
      this.activeExportOperation === operation
    );
  }

  private releaseExportOperation(operation: ActiveExportOperation): void {
    if (this.activeExportOperation === operation) {
      this.activeExportOperation = undefined;
    }
    if (this.active === operation.child) {
      this.active = undefined;
    }
  }

  private settleExportResult(
    operation: ActiveExportOperation,
    result: ExportResult,
  ): void {
    if (operation.terminalSettled) {
      return;
    }
    operation.terminalSettled = true;
    operation.terminalResult.resolve(result);
  }

  private releaseSafeExitGate(operation: ActiveExportOperation): void {
    operation.safeExitGateReleased = true;
    operation.safeExitGate.resolve();
  }

  private classifyExportCompletion(
    operation: ActiveExportOperation,
    completion: ManagedCompletion,
  ): ExportResult {
    if (operation.cancelled) {
      return { status: "cancelled", close: completion.close };
    }
    if (
      completion.close.status === "exited" &&
      completion.close.exitCode === 0
    ) {
      return {
        status: "succeeded",
        close: { status: "exited", exitCode: 0 },
      };
    }
    return { status: "failed", close: completion.close };
  }

  private apply(event: LifecycleEvent): void {
    this.state = transitionLifecycle(this.state, event);
  }

  [inspectExportOperation](): ExportOperationTestSnapshot | undefined {
    const operation = this.activeExportOperation;
    if (operation === undefined) {
      return undefined;
    }
    return {
      workspace: operation.workspace,
      childPid: operation.child?.pid,
      retained: operation.retained !== undefined,
      directWaitSettled: operation.directWaitSettled,
      workspaceSettled: operation.workspaceSettled,
      safeExitGateReleased: operation.safeExitGateReleased,
    };
  }

  private isCurrent(
    generation: number,
    child: ManagedProcessGroup,
    state: SupervisorState,
  ): boolean {
    return (
      this.generation === generation &&
      this.active === child &&
      this.state === state
    );
  }

  private requireActive(role?: ChildCommand["role"]): ManagedProcessGroup {
    if (
      this.active === undefined ||
      (role !== undefined && this.active.role !== role)
    ) {
      throw new Error("Lifecycle state has no matching active child");
    }
    return this.active;
  }

  private observeServingCompletion(
    generation: number,
    child: ManagedProcessGroup,
    loss: PromiseWithResolvers<ServingLoss>,
    completion: ManagedCompletion,
  ): void {
    if (!this.isCurrent(generation, child, "serving")) {
      return;
    }
    this.active = undefined;
    this.apply("serving-lost");
    loss.resolve({
      status: "recovery-required",
      close: completion.close,
    });
  }

  private observeServingFailure(
    generation: number,
    child: ManagedProcessGroup,
    loss: PromiseWithResolvers<ServingLoss>,
    error: unknown,
  ): void {
    if (!this.isCurrent(generation, child, "serving")) {
      return;
    }
    const cause =
      error instanceof Error ? error : new Error("Serving supervision failed");
    if (error instanceof ProcessGroupExitUnconfirmedError) {
      this.apply("ownership-unconfirmed");
      loss.resolve({ status: "recovery-failed", cause });
      return;
    }
    this.active = undefined;
    this.apply("serving-lost");
    loss.resolve({ status: "recovery-failed", cause });
  }
}

export function createStrapiSupervisor(): StrapiSupervisor {
  return new StrapiSupervisor();
}

export const strapiSupervisorTestHooks = {
  create(options: SupervisorTestOptions): StrapiSupervisor {
    return new StrapiSupervisor(
      options,
      options.beforeExportSpawn,
      options.beforeExportShutdownTermination,
    );
  },
  inspectExportOperation(
    supervisor: StrapiSupervisor,
  ): ExportOperationTestSnapshot | undefined {
    return supervisor[inspectExportOperation]();
  },
};

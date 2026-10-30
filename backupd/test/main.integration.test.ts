import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";

import type {
  CaptureIdentity,
  CaptureServiceStatus,
  CaptureTerminalRecord,
} from "../../strapid/src/capture-contract.ts";
import type { BackupDaemonConfig } from "../src/backup-config.ts";
import { BackupDaemonError } from "../src/backup-lifecycle.ts";
import {
  CaptureAdmissionRejectedError,
  type CaptureClient,
} from "../src/capture-client.ts";
import type {
  BackupDaemonDependencies,
  BackupDaemonSignalHost,
} from "../src/main.ts";
import { runBackupDaemon } from "../src/main.ts";
import type { BackupPublicationConfig } from "../src/object-storage-config.ts";
import { latestDueSlot, parseSchedulePolicy } from "../src/schedule-policy.ts";
import type {
  FinalPublicationReconciliation,
  PublishedSnapshot,
  ReconciledSnapshot,
  SnapshotPublisher,
} from "../src/snapshot-publisher.ts";
import type {
  ArchiveSizeWatch,
  ReopenedRetainedArchive,
  StagingAllocation,
  StagingManager,
} from "../src/staging-manager.ts";
import { StagingError } from "../src/staging-policy.ts";
import type { StateRepository } from "../src/state-repository.ts";
import { createStateRepository } from "../src/state-repository.ts";
import type { BackupTelemetry } from "../src/telemetry.ts";
import { fixtureAttribution, fixturePolicy } from "./snapshot-fixture.ts";

type Signal = "SIGTERM" | "SIGINT" | "SIGUSR2";

class ControlledSignalHost implements BackupDaemonSignalHost {
  private readonly listeners = new Map<Signal, Set<() => void>>();

  on(signal: Signal, listener: () => void): void {
    const current = this.listeners.get(signal) ?? new Set();
    current.add(listener);
    this.listeners.set(signal, current);
  }

  off(signal: Signal, listener: () => void): void {
    this.listeners.get(signal)?.delete(listener);
  }

  emit(signal: Signal): void {
    for (const listener of [...(this.listeners.get(signal) ?? [])]) listener();
  }

  count(signal: Signal): number {
    return this.listeners.get(signal)?.size ?? 0;
  }
}

class MainStaging implements StagingManager {
  cleanupCount = 0;
  watchCount = 0;
  allocateCount = 0;
  allocationGate: Promise<void> | undefined;

  async assertEmptyForStartup(): Promise<void> {}

  async reopenRetainedArchive(): Promise<ReopenedRetainedArchive> {
    throw new Error("unexpected retained archive");
  }

  async allocate(runId: string): Promise<StagingAllocation> {
    this.allocateCount += 1;
    await this.allocationGate;
    const runDirectory = `/staging/runs/${runId}`;
    return {
      runId,
      runDirectory,
      archiveBasePath: `${runDirectory}/strapi-export`,
      archivePath: `${runDirectory}/strapi-export.tar`,
    };
  }

  watchCaptureSize(): ArchiveSizeWatch {
    this.watchCount += 1;
    return { violation: undefined, async stop() {} };
  }

  async recordCaptureTerminal(): Promise<"released"> {
    return "released";
  }

  async validateArchive(): Promise<never> {
    throw new Error("invalid terminal must not validate");
  }

  async cleanup(): Promise<void> {
    this.cleanupCount += 1;
  }
}

class PreflightOnlyPublisher implements SnapshotPublisher {
  preflightCount = 0;

  async preflight(): Promise<void> {
    this.preflightCount += 1;
  }

  async reconcile(): Promise<ReconciledSnapshot> {
    throw new Error("unexpected reconciliation");
  }

  async reconcileFinal(): Promise<FinalPublicationReconciliation> {
    throw new Error("unexpected final reconciliation");
  }

  async publish(): Promise<PublishedSnapshot> {
    throw new Error("unexpected publication");
  }
}

function publicationConfig(): BackupPublicationConfig {
  return {
    storage: {
      endpoint: new URL("https://s3.example.test"),
      region: "fr-par",
      bucket: "backups",
      credentials: { accessKeyId: "unused", secretAccessKey: "unused" },
      forcePathStyle: false,
      maximumAttempts: 3,
    },
    attribution: fixtureAttribution,
    publication: fixturePolicy,
  };
}

function config(shutdownTimeoutMs = 1_000): BackupDaemonConfig {
  return {
    captureClient: { socketPath: "/unused/strapid.sock" },
    schedule: parseSchedulePolicy({}),
    staging: {
      stagingRoot: "/staging",
      minimumFreeBytes: 2n,
      maximumArchiveBytes: 1n,
      metadataMaximumBytes: 65_536,
      sizePollIntervalMs: 5,
    },
    publication: publicationConfig(),
    shutdownTimeoutMs,
  };
}

function noTelemetry(): BackupTelemetry {
  return {
    observer: {},
    onEvent: () => undefined,
    runInContext: async (_request, operation) => await operation(),
    traceHeaders: () => ({}),
    startFreshness: () => undefined,
    close: async () => undefined,
  };
}

function readyStatus(): CaptureServiceStatus {
  return {
    version: 1,
    runtimeReady: true,
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    nodeVersion: "v24.20.0",
    strapiVersion: "5.52.0",
    supervisorState: "serving",
    healthyServing: true,
    budget: {
      totalWindowMs: 900_000,
      servingShutdownMs: 30_000,
      exportExecutionMs: 780_000,
      exporterTerminationMs: 30_000,
      recoveryMs: 50_000,
      forcedConfirmationMs: 10_000,
    },
  };
}

function cancellableCapture(): {
  readonly client: CaptureClient;
  readonly counts: {
    starts: number;
    cancels: number;
    startedIdentity?: CaptureIdentity;
    cancelledIdentity?: Pick<
      CaptureIdentity,
      "supervisorInstanceId" | "captureWindowId"
    >;
  };
} {
  const counts: {
    starts: number;
    cancels: number;
    startedIdentity?: CaptureIdentity;
    cancelledIdentity?: Pick<
      CaptureIdentity,
      "supervisorInstanceId" | "captureWindowId"
    >;
  } = { starts: 0, cancels: 0 };
  const client: CaptureClient = {
    async getStatus() {
      return readyStatus();
    },
    async startCapture(request, options) {
      counts.starts += 1;
      const captureIdentity: CaptureIdentity = {
        supervisorInstanceId: request.expectedSupervisorInstanceId,
        captureWindowId: request.captureWindowId,
        releaseId: request.expectedReleaseId,
        sourceVolumeId: request.expectedSourceVolumeId,
        nodeVersion: request.expectedNodeVersion,
        strapiVersion: request.expectedStrapiVersion,
      };
      counts.startedIdentity = captureIdentity;
      const accepted = {
        version: 1 as const,
        type: "accepted" as const,
        identity: captureIdentity,
        archiveBasePath: request.archiveBasePath,
        startedAt: "2026-10-29T00:00:00.000Z",
        deadlineAt: "2026-10-29T00:15:00.000Z",
        acceptedAt: "2026-10-29T00:00:01.000Z",
      };
      options?.onAccepted?.(accepted);
      return await new Promise<CaptureTerminalRecord>((resolve) => {
        const finish = () =>
          resolve({
            ...accepted,
            type: "terminal",
            completedAt: "2026-10-29T00:00:04.000Z",
            outcome: {
              status: "invalid",
              reason: "client_cancelled",
              servingRecoveredAt: "2026-10-29T00:00:03.000Z",
            },
          });
        if (options?.signal?.aborted) finish();
        else options?.signal?.addEventListener("abort", finish, { once: true });
      });
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel(cancelledIdentity) {
      counts.cancels += 1;
      counts.cancelledIdentity = cancelledIdentity;
    },
  };
  return { client, counts };
}

async function waitFor(
  condition: () => boolean,
  description: string,
  timeoutMs = 1_000,
): Promise<void> {
  const started = performance.now();
  const deadline = started + timeoutMs;
  while (performance.now() < deadline) {
    if (condition()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 1));
  }
  throw new Error(
    `Timed out after ${Math.round(performance.now() - started)}ms waiting for ${description}`,
  );
}

test("main coalesces manual admission and performs bounded safe signal shutdown", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-main-"));
  const daemonConfig = config();
  const stateRepository = createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
  });
  await stateRepository.skipAutomaticRequest(
    latestDueSlot(new Date().toISOString(), daemonConfig.schedule),
  );
  const signals = new ControlledSignalHost();
  const capture = cancellableCapture();
  const staging = new MainStaging();
  const publisher = new PreflightOnlyPublisher();
  const forced: number[] = [];
  const dependencies: BackupDaemonDependencies = {
    captureClient: capture.client,
    stagingManager: staging,
    snapshotPublisher: publisher,
    stateRepository,
  };
  let telemetryClosed = 0;
  const telemetry: BackupTelemetry = {
    ...noTelemetry(),
    async close() {
      assert.equal(staging.cleanupCount, 1);
      telemetryClosed += 1;
    },
  };
  try {
    const running = runBackupDaemon({
      config: daemonConfig,
      dependencies,
      telemetry,
      signalHost: signals,
      forcedExit: (code) => forced.push(code),
    });
    await waitFor(
      () => signals.count("SIGUSR2") === 1,
      "manual signal admission",
    );
    signals.emit("SIGUSR2");
    signals.emit("SIGUSR2");
    await waitFor(
      () => capture.counts.starts === 1 && staging.watchCount === 1,
      "one accepted capture and size watcher",
    );
    signals.emit("SIGTERM");
    assert.equal(await running, 0);
    assert.equal(capture.counts.starts, 1);
    assert.equal(capture.counts.cancels, 1);
    assert.deepEqual(
      capture.counts.cancelledIdentity,
      capture.counts.startedIdentity,
    );
    assert.equal(staging.cleanupCount, 1);
    assert.equal(publisher.preflightCount, 1);
    assert.deepEqual(forced, []);
    assert.equal(telemetryClosed, 1);
    assert.equal(signals.count("SIGUSR2"), 0);
    assert.equal(signals.count("SIGTERM"), 0);
    assert.equal(signals.count("SIGINT"), 0);
    assert.equal((await stateRepository.load()).schedule.retry, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("throwing reporting cannot replace rejected shutdown or leak late failures", async () => {
  const root = await mkdtemp(join(tmpdir(), "b09-main-scheduler-rejection-"));
  const daemonConfig = config();
  const baseRepository = createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
  });
  await baseRepository.skipAutomaticRequest(
    latestDueSlot(new Date().toISOString(), daemonConfig.schedule),
  );
  const deferredRead =
    Promise.withResolvers<Awaited<ReturnType<StateRepository["load"]>>>();
  let manualRequested = false;
  let manualLoadCount = 0;
  const stateRepository = new Proxy(baseRepository, {
    get(target, property, receiver) {
      if (property === "load") {
        return async () => {
          if (manualRequested) {
            manualLoadCount += 1;
            if (manualLoadCount === 2) return await deferredRead.promise;
          }
          return await target.load();
        };
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const staging = new MainStaging();
  const signals = new ControlledSignalHost();
  const errors: unknown[] = [];
  const closeDeadlines: number[] = [];
  const schedulerFailure = new Error("controlled scheduler completion failure");
  const telemetryFailure = new Error("controlled telemetry close failure");
  const reporterFailure = new Error("controlled error reporter failure");
  const unhandled: unknown[] = [];
  const uncaught: unknown[] = [];
  const unhandledListener = (error: unknown) => unhandled.push(error);
  const uncaughtListener = (error: unknown) => uncaught.push(error);
  const initialUnhandledListeners = process.listenerCount("unhandledRejection");
  const initialUncaughtListeners = process.listenerCount(
    "uncaughtExceptionMonitor",
  );
  process.on("unhandledRejection", unhandledListener);
  process.on("uncaughtExceptionMonitor", uncaughtListener);
  const telemetry: BackupTelemetry = {
    ...noTelemetry(),
    async close(deadline) {
      closeDeadlines.push(deadline);
      throw telemetryFailure;
    },
  };
  const captureClient: CaptureClient = {
    async getStatus() {
      return readyStatus();
    },
    async startCapture() {
      throw new CaptureAdmissionRejectedError(503, "serving_unavailable");
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel() {
      throw new Error("rejected admission must not be cancelled");
    },
  };
  let running: Promise<number> | undefined;
  try {
    running = runBackupDaemon({
      config: daemonConfig,
      dependencies: {
        captureClient,
        stagingManager: staging,
        snapshotPublisher: new PreflightOnlyPublisher(),
        stateRepository,
      },
      telemetry,
      signalHost: signals,
      forcedExit: () => assert.fail("must not force exit"),
      onError(error) {
        errors.push(error);
        throw reporterFailure;
      },
    });
    await waitFor(
      () => signals.count("SIGUSR2") === 1,
      "manual signal admission",
    );
    manualRequested = true;
    signals.emit("SIGUSR2");
    await waitFor(
      () => staging.cleanupCount === 1 && manualLoadCount === 2,
      "scheduler completion state read",
    );
    const shutdownStartedAt = Date.now();
    signals.emit("SIGTERM");
    deferredRead.reject(schedulerFailure);

    assert.equal(await running, 1);
    assert.equal(closeDeadlines.length, 1);
    assert.ok((closeDeadlines[0] as number) > shutdownStartedAt);
    assert.ok(
      (closeDeadlines[0] as number) <=
        shutdownStartedAt + daemonConfig.shutdownTimeoutMs,
    );
    assert.equal(errors.includes(schedulerFailure), true);
    assert.equal(errors.includes(telemetryFailure), true);
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(unhandled, []);
    assert.deepEqual(uncaught, []);
  } finally {
    signals.emit("SIGTERM");
    deferredRead.reject(schedulerFailure);
    await running?.catch(() => undefined);
    process.off("unhandledRejection", unhandledListener);
    process.off("uncaughtExceptionMonitor", uncaughtListener);
    assert.equal(
      process.listenerCount("unhandledRejection"),
      initialUnhandledListeners,
    );
    assert.equal(
      process.listenerCount("uncaughtExceptionMonitor"),
      initialUncaughtListeners,
    );
    await rm(root, { recursive: true, force: true });
  }
});

test("graceful shutdown waits for invalidated allocation cleanup and automatic retry state", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-main-admission-stop-"));
  const daemonConfig = config(2_000);
  const baseRepository = createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
  });
  const finishEntered = Promise.withResolvers<void>();
  const finishGate = Promise.withResolvers<void>();
  const stateRepository: StateRepository = {
    load: () => baseRepository.load(),
    reload: () => baseRepository.reload(),
    claimAutomaticAttempt: (...args) =>
      baseRepository.claimAutomaticAttempt(...args),
    skipAutomaticRequest: (...args) =>
      baseRepository.skipAutomaticRequest(...args),
    async finishAutomaticAttempt(...args) {
      finishEntered.resolve();
      await finishGate.promise;
      return await baseRepository.finishAutomaticAttempt(...args);
    },
    setPendingPublication: (...args) =>
      baseRepository.setPendingPublication(...args),
    claimPendingPublicationAttempt: (...args) =>
      baseRepository.claimPendingPublicationAttempt(...args),
    recordPublishedSnapshot: (...args) =>
      baseRepository.recordPublishedSnapshot(...args),
    clearPendingWithoutSuccess: (...args) =>
      baseRepository.clearPendingWithoutSuccess(...args),
  };
  const staging = new MainStaging();
  const allocationGate = Promise.withResolvers<void>();
  staging.allocationGate = allocationGate.promise;
  const signals = new ControlledSignalHost();
  let starts = 0;
  let cancels = 0;
  const captureClient: CaptureClient = {
    async getStatus() {
      return readyStatus();
    },
    async startCapture() {
      starts += 1;
      throw new Error("capture must not start");
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel() {
      cancels += 1;
    },
  };
  const forced: number[] = [];
  try {
    let settled = false;
    const running = runBackupDaemon({
      config: daemonConfig,
      dependencies: {
        captureClient,
        stagingManager: staging,
        snapshotPublisher: new PreflightOnlyPublisher(),
        stateRepository,
      },
      telemetry: noTelemetry(),
      signalHost: signals,
      forcedExit: (code) => forced.push(code),
    }).finally(() => {
      settled = true;
    });
    await waitFor(() => staging.allocateCount === 1, "paused allocation");
    signals.emit("SIGTERM");
    allocationGate.resolve();
    await finishEntered.promise;
    assert.equal(settled, false);
    assert.equal(staging.cleanupCount, 1);
    assert.equal(starts, 0);
    assert.equal(cancels, 0);
    finishGate.resolve();
    assert.equal(await running, 0);
    const state = await baseRepository.load();
    assert.equal(state.schedule.retry?.attemptsStarted, 1);
    assert.deepEqual(forced, []);
  } finally {
    allocationGate.resolve();
    finishGate.resolve();
    await rm(root, { recursive: true, force: true });
  }
});

test("unsafe allocation rejection during shutdown fails the daemon without cleanup guesses", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-main-allocation-failure-"));
  const stateRepository = createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
  });
  const staging = new MainStaging();
  const allocationGate = Promise.withResolvers<void>();
  staging.allocationGate = allocationGate.promise;
  const allocationFailure = new StagingError("cleanup_failed");
  const signals = new ControlledSignalHost();
  const errors: unknown[] = [];
  let starts = 0;
  let cancels = 0;
  const captureClient: CaptureClient = {
    async getStatus() {
      return readyStatus();
    },
    async startCapture() {
      starts += 1;
      throw new Error("capture must not start");
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel() {
      cancels += 1;
    },
  };
  const forced: number[] = [];
  try {
    const running = runBackupDaemon({
      config: config(),
      dependencies: {
        captureClient,
        stagingManager: staging,
        snapshotPublisher: new PreflightOnlyPublisher(),
        stateRepository,
      },
      telemetry: noTelemetry(),
      signalHost: signals,
      forcedExit: (code) => forced.push(code),
      onError: (error) => errors.push(error),
    });
    await waitFor(
      () => staging.allocateCount === 1,
      "unsafe paused allocation",
    );
    signals.emit("SIGTERM");
    allocationGate.reject(allocationFailure);
    assert.equal(await running, 1);
    assert.equal(starts, 0);
    assert.equal(cancels, 0);
    assert.equal(staging.cleanupCount, 0);
    assert.deepEqual(forced, []);
    const failure = errors.find((error) => error instanceof BackupDaemonError);
    assert.ok(failure instanceof BackupDaemonError);
    assert.equal(failure.cause, allocationFailure);
  } finally {
    allocationGate.resolve();
    await rm(root, { recursive: true, force: true });
  }
});

test("definite admission rejection creates automatic retry debt but no manual debt", async () => {
  for (const trigger of ["automatic", "manual"] as const) {
    const root = await mkdtemp(join(tmpdir(), `b08-main-rejected-${trigger}-`));
    const daemonConfig = config();
    const stateRepository = createStateRepository({
      stateRoot: root,
      publicationPolicy: fixturePolicy,
    });
    if (trigger === "manual") {
      await stateRepository.skipAutomaticRequest(
        latestDueSlot(new Date().toISOString(), daemonConfig.schedule),
      );
    }
    const staging = new MainStaging();
    const publisher = new PreflightOnlyPublisher();
    const signals = new ControlledSignalHost();
    let starts = 0;
    const captureClient: CaptureClient = {
      async getStatus() {
        return readyStatus();
      },
      async startCapture() {
        starts += 1;
        throw new CaptureAdmissionRejectedError(503, "serving_unavailable");
      },
      async reconcile() {
        throw new Error("unexpected reconciliation");
      },
      async cancel() {
        throw new Error("rejected admission must not be cancelled");
      },
    };
    let running: Promise<number> | undefined;
    try {
      running = runBackupDaemon({
        config: daemonConfig,
        dependencies: {
          captureClient,
          stagingManager: staging,
          snapshotPublisher: publisher,
          stateRepository,
        },
        telemetry: noTelemetry(),
        signalHost: signals,
        forcedExit: () => assert.fail("must not force exit"),
      });
      await waitFor(
        () => signals.count("SIGUSR2") === 1,
        "manual signal admission",
      );
      if (trigger === "manual") {
        signals.emit("SIGUSR2");
        await waitFor(
          () => staging.cleanupCount === 1,
          "rejected admission cleanup",
        );
      }
      const state = await stateRepository.load();
      if (trigger === "automatic") {
        assert.equal(state.schedule.retry?.attemptsStarted, 1);
      } else {
        assert.equal(state.schedule.retry, null);
      }
      assert.equal(starts, 1);
      assert.equal(staging.cleanupCount, 1);
      assert.equal(staging.watchCount, 0);
      assert.equal(publisher.preflightCount, 1);
      signals.emit("SIGTERM");
      assert.equal(await running, 0);
    } finally {
      signals.emit("SIGTERM");
      await running;
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("main invokes the forced-exit boundary when owned work cannot settle", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-main-timeout-"));
  const daemonConfig = config(1_000);
  const stateRepository = createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
  });
  await stateRepository.skipAutomaticRequest(
    latestDueSlot(new Date().toISOString(), daemonConfig.schedule),
  );
  const signals = new ControlledSignalHost();
  const staging = new MainStaging();
  let starts = 0;
  const captureClient: CaptureClient = {
    async getStatus() {
      return readyStatus();
    },
    async startCapture(request, options) {
      starts += 1;
      options?.onAccepted?.({
        version: 1,
        type: "accepted",
        identity: {
          supervisorInstanceId: request.expectedSupervisorInstanceId,
          captureWindowId: request.captureWindowId,
          releaseId: request.expectedReleaseId,
          sourceVolumeId: request.expectedSourceVolumeId,
          nodeVersion: request.expectedNodeVersion,
          strapiVersion: request.expectedStrapiVersion,
        },
        archiveBasePath: request.archiveBasePath,
        startedAt: "2026-10-29T00:00:00.000Z",
        deadlineAt: "2026-10-29T00:15:00.000Z",
        acceptedAt: "2026-10-29T00:00:01.000Z",
      });
      return await new Promise<CaptureTerminalRecord>(() => undefined);
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel() {},
  };
  const forced: number[] = [];
  let shutdownTimer: (() => void) | undefined;
  try {
    const running = runBackupDaemon({
      config: daemonConfig,
      dependencies: {
        captureClient,
        stagingManager: staging,
        snapshotPublisher: new PreflightOnlyPublisher(),
        stateRepository,
      },
      telemetry: noTelemetry(),
      signalHost: signals,
      forcedExit: (code) => forced.push(code),
      setTimer: (callback) => {
        shutdownTimer = callback;
        return callback;
      },
      clearTimer: () => undefined,
    });
    await waitFor(
      () => signals.count("SIGUSR2") === 1,
      "manual signal admission",
    );
    signals.emit("SIGUSR2");
    await waitFor(
      () => starts === 1 && staging.watchCount === 1,
      "unsettled capture ownership",
    );
    signals.emit("SIGTERM");
    assert.notEqual(shutdownTimer, undefined);
    shutdownTimer?.();
    assert.equal(await running, 1);
    assert.deepEqual(forced, [1]);
    assert.equal(staging.cleanupCount, 0);
    assert.equal(signals.count("SIGTERM"), 0);
    assert.equal(signals.count("SIGINT"), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { pathToFileURL } from "node:url";

import {
  type BackupDaemonConfig,
  parseBackupDaemonConfig,
} from "./backup-config.ts";
import {
  type BackupLifecycleCoordinator,
  createBackupLifecycleCoordinator,
} from "./backup-lifecycle.ts";
import { type CaptureClient, createCaptureClient } from "./capture-client.ts";
import {
  createDailyScheduler,
  type DailyScheduler,
} from "./daily-scheduler.ts";
import { createS3SnapshotStore } from "./s3-snapshot-store.ts";
import {
  createSnapshotPublisher,
  type SnapshotPublisher,
} from "./snapshot-publisher.ts";
import {
  createStagingManager,
  type StagingManager,
} from "./staging-manager.ts";
import {
  createStateRepository,
  type StateRepository,
} from "./state-repository.ts";
import { type BackupTelemetry, createBackupTelemetry } from "./telemetry.ts";

type DaemonSignal = "SIGTERM" | "SIGINT" | "SIGUSR2";
type SignalListener = () => void;

export interface BackupDaemonSignalHost {
  on(signal: DaemonSignal, listener: SignalListener): void;
  off(signal: DaemonSignal, listener: SignalListener): void;
}

export interface BackupDaemonDependencies {
  readonly captureClient: CaptureClient;
  readonly stagingManager: StagingManager;
  readonly snapshotPublisher: SnapshotPublisher;
  readonly stateRepository: StateRepository;
}

export interface RunBackupDaemonOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly config?: BackupDaemonConfig;
  readonly dependencies?: BackupDaemonDependencies;
  readonly telemetry?: BackupTelemetry;
  readonly signalHost?: BackupDaemonSignalHost;
  readonly forcedExit?: (code: number) => void;
  readonly onError?: (error: unknown) => void;
  readonly setTimer?: (callback: () => void, delay: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
}

function createDependencies(
  config: BackupDaemonConfig,
  telemetry: BackupTelemetry,
): BackupDaemonDependencies {
  const store = createS3SnapshotStore(config.publication.storage);
  return {
    captureClient: createCaptureClient({
      ...config.captureClient,
      traceHeaders: () => telemetry.traceHeaders(),
    }),
    stagingManager: createStagingManager(config.staging),
    snapshotPublisher: createSnapshotPublisher(
      store,
      config.publication.publication,
    ),
    stateRepository: createStateRepository({
      publicationPolicy: config.publication.publication,
    }),
  };
}

function secretFreeError(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) {
    return `backupd failed (${String(error.code)})`;
  }
  return "backupd failed";
}

export async function runBackupDaemon(
  options: RunBackupDaemonOptions = {},
): Promise<number> {
  const config =
    options.config ??
    parseBackupDaemonConfig(options.environment ?? process.env);
  const telemetry =
    options.telemetry ??
    createBackupTelemetry({
      environment: options.environment ?? process.env,
      serviceVersion: config.publication.attribution.gitRevision,
      deploymentEnvironment: config.publication.attribution.environment,
    });
  const dependencies =
    options.dependencies ?? createDependencies(config, telemetry);
  const signalHost = options.signalHost ?? process;
  const forcedExit = options.forcedExit ?? ((code) => process.exit(code));
  const onError = options.onError ?? (() => undefined);
  const safeReport = (error: unknown): void => {
    try {
      onError(error);
    } catch {
      // Reporting is observational and cannot alter daemon authority.
    }
  };
  const setTimer =
    options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
  const clearTimer =
    options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
  const daemonController = new AbortController();

  let scheduler!: DailyScheduler;
  let coordinator!: BackupLifecycleCoordinator;
  let manualInstalled = false;
  let stopping = false;
  let shutdownPromise: Promise<number> | undefined;
  let shutdownDeadline: number | undefined;
  let resolveTermination!: () => void;
  const termination = new Promise<void>((resolve) => {
    resolveTermination = resolve;
  });

  const dispatchPending = (runId: string) =>
    scheduler === undefined
      ? ({ status: "skipped", reason: "not-ready" } as const)
      : scheduler.requestPendingPublication(runId);

  coordinator = createBackupLifecycleCoordinator({
    captureClient: dependencies.captureClient,
    stagingManager: dependencies.stagingManager,
    snapshotPublisher: dependencies.snapshotPublisher,
    stateRepository: dependencies.stateRepository,
    schedulePolicy: config.schedule,
    publicationConfig: config.publication,
    dispatchPendingPublication: dispatchPending,
    onError: safeReport,
    onEvent: (event) => telemetry.onEvent(event),
    observer: telemetry.observer,
  });
  scheduler = createDailyScheduler({
    policy: config.schedule,
    stateRepository: dependencies.stateRepository,
    runLifecycle: (request) =>
      telemetry.runInContext(request, () =>
        coordinator.runLifecycle(request, daemonController.signal),
      ),
    onError: safeReport,
  });

  const manualSignal = () => {
    const request = scheduler.requestManual();
    if (request.status === "started") {
      void request.completion.catch(safeReport);
    }
  };
  const removeManual = () => {
    if (!manualInstalled) return;
    signalHost.off("SIGUSR2", manualSignal);
    manualInstalled = false;
  };

  const finishShutdown = (): Promise<number> => {
    if (shutdownPromise !== undefined) return shutdownPromise;
    if (shutdownDeadline === undefined) {
      shutdownDeadline = Date.now() + config.shutdownTimeoutMs;
    }
    const deadline = shutdownDeadline;
    shutdownPromise = new Promise<number>((resolve) => {
      let settled = false;
      const finish = (code: number) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        resolve(code);
      };
      const timer = setTimer(
        () => {
          if (settled) return;
          settled = true;
          forcedExit(1);
          resolve(1);
        },
        Math.max(0, deadline - Date.now()),
      );
      void Promise.all([coordinator.waitForIdle(), scheduler.waitForIdle()])
        .then(
          () => (coordinator.hasTerminalFailure ? 1 : 0),
          (error) => {
            safeReport(error);
            return 1;
          },
        )
        .then(async (code) => {
          try {
            await telemetry.close(deadline - 100);
          } catch (error) {
            safeReport(error);
          }
          finish(code);
        })
        .catch((error) => {
          // Only an unexpected shutdown-coordination defect can reach here.
          safeReport(error);
          finish(1);
        });
    });
    return shutdownPromise;
  };

  const terminate = () => {
    if (stopping) return;
    stopping = true;
    shutdownDeadline = Date.now() + config.shutdownTimeoutMs;
    removeManual();
    scheduler.stop();
    coordinator.stop();
    daemonController.abort(new Error("Backup daemon is stopping"));
    resolveTermination();
    void finishShutdown();
  };

  signalHost.on("SIGTERM", terminate);
  signalHost.on("SIGINT", terminate);
  try {
    try {
      telemetry.startFreshness(dependencies.stateRepository);
      await coordinator.classifyStartup();
      if (stopping) return await finishShutdown();
      await scheduler.start();
      if (stopping) return await finishShutdown();
      await coordinator.armPendingPublication();
      if (stopping) return await finishShutdown();
      signalHost.on("SIGUSR2", manualSignal);
      manualInstalled = true;
    } catch (error) {
      safeReport(error);
      terminate();
      return await finishShutdown().then(() => 1);
    }
    await termination;
    return await finishShutdown();
  } finally {
    removeManual();
    signalHost.off("SIGTERM", terminate);
    signalHost.off("SIGINT", terminate);
  }
}

const directEntry =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (directEntry) {
  void runBackupDaemon()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      process.stderr.write(`${secretFreeError(error)}\n`);
      process.exitCode = 1;
    });
}

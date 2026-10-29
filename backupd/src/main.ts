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
  readonly signalHost?: BackupDaemonSignalHost;
  readonly forcedExit?: (code: number) => void;
  readonly onError?: (error: unknown) => void;
  readonly setTimer?: (callback: () => void, delay: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
}

function createDependencies(
  config: BackupDaemonConfig,
): BackupDaemonDependencies {
  const store = createS3SnapshotStore(config.publication.storage);
  return {
    captureClient: createCaptureClient(config.captureClient),
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
  const dependencies = options.dependencies ?? createDependencies(config);
  const signalHost = options.signalHost ?? process;
  const forcedExit = options.forcedExit ?? ((code) => process.exit(code));
  const onError = options.onError ?? (() => undefined);
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
    onError,
  });
  scheduler = createDailyScheduler({
    policy: config.schedule,
    stateRepository: dependencies.stateRepository,
    runLifecycle: (request) =>
      coordinator.runLifecycle(request, daemonController.signal),
    onError,
  });

  const manualSignal = () => {
    const request = scheduler.requestManual();
    if (request.status === "started") {
      void request.completion.catch(onError);
    }
  };
  const removeManual = () => {
    if (!manualInstalled) return;
    signalHost.off("SIGUSR2", manualSignal);
    manualInstalled = false;
  };

  const finishShutdown = (): Promise<number> => {
    if (shutdownPromise !== undefined) return shutdownPromise;
    shutdownPromise = new Promise<number>((resolve) => {
      let settled = false;
      const finish = (code: number) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        resolve(code);
      };
      const timer = setTimer(() => {
        if (settled) return;
        settled = true;
        forcedExit(1);
        resolve(1);
      }, config.shutdownTimeoutMs);
      void Promise.all([
        coordinator.waitForIdle(),
        scheduler.waitForIdle(),
      ]).then(
        () => finish(coordinator.hasTerminalFailure ? 1 : 0),
        (error) => {
          onError(error);
          finish(1);
        },
      );
    });
    return shutdownPromise;
  };

  const terminate = () => {
    if (stopping) return;
    stopping = true;
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
      await coordinator.classifyStartup();
      if (stopping) return await finishShutdown();
      await scheduler.start();
      if (stopping) return await finishShutdown();
      await coordinator.armPendingPublication();
      if (stopping) return await finishShutdown();
      signalHost.on("SIGUSR2", manualSignal);
      manualInstalled = true;
    } catch (error) {
      onError(error);
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

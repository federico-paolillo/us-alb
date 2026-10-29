import { pathToFileURL } from "node:url";

import {
  DEFAULT_CAPTURE_BUDGET,
  parseCaptureBudget,
} from "./capture-budget.ts";
import { CaptureCoordinator } from "./capture-coordinator.ts";
import {
  type CaptureHttpServer,
  startCaptureHttpServer,
} from "./capture-http.ts";
import type { ServingHealthPolicy } from "./health.ts";
import type { ProcessTerminationBounds } from "./process-group.ts";
import { createCaptureRuntimeInspector } from "./strapi-runtime.ts";
import {
  createStrapiSupervisor,
  type StrapiSupervisor,
} from "./strapi-supervisor.ts";

const NORMAL_TERMINATION: ProcessTerminationBounds = {
  gracefulTimeoutMs: 30_000,
  forcedTimeoutMs: 5_000,
  pollIntervalMs: 50,
};

export interface SupervisorMainOptions {
  readonly supervisor: StrapiSupervisor;
  readonly health: ServingHealthPolicy;
  readonly termination: ProcessTerminationBounds;
  readonly onServingReady?: () => void;
  readonly startCaptureCoordination?: () => Promise<
    | {
        readonly coordinator: CaptureCoordinator;
        readonly server: CaptureHttpServer;
      }
    | undefined
  >;
  readonly testShutdownRequested?: Promise<void>;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    return 65_101;
  }
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error("PORT must be a decimal integer from 1 through 65535");
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be a decimal integer from 1 through 65535");
  }
  return port;
}

export async function superviseStrapi(
  options: SupervisorMainOptions,
): Promise<void> {
  const shutdownRequested = Promise.withResolvers<void>();
  let shuttingDown = false;
  let shutdownPromise: Promise<void> | undefined;
  let capture:
    | {
        readonly coordinator: CaptureCoordinator;
        readonly server: CaptureHttpServer;
      }
    | undefined;

  const requestShutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    const coordinationShutdown = capture?.coordinator.beginSupervisorShutdown();
    const supervisorShutdown = options.supervisor.shutdown(options.termination);
    const serverShutdown = capture?.server.close();
    shutdownPromise = Promise.all([
      coordinationShutdown,
      supervisorShutdown,
      serverShutdown,
    ]).then(() => undefined);
    shutdownRequested.resolve();
  };

  process.on("SIGTERM", requestShutdown);
  process.on("SIGINT", requestShutdown);
  void options.testShutdownRequested?.then(requestShutdown);

  try {
    try {
      await options.supervisor.startServing({
        health: options.health,
        termination: options.termination,
      });
    } catch (error) {
      if (!shuttingDown) {
        throw error;
      }
      await shutdownPromise;
      return;
    }
    options.onServingReady?.();
    capture = await options.startCaptureCoordination?.();
    if (shuttingDown) {
      await Promise.all([
        shutdownPromise,
        capture?.coordinator.beginSupervisorShutdown(),
        capture?.server.close(),
      ]);
      return;
    }

    while (!shuttingDown) {
      const outcome = await Promise.race([
        options.supervisor.waitForServingLoss().then((loss) => ({
          type: "loss" as const,
          loss,
        })),
        shutdownRequested.promise.then(() => ({ type: "shutdown" as const })),
        ...(capture === undefined
          ? []
          : [
              capture.coordinator.waitForCycleStart().then((cycle) => ({
                type: "capture" as const,
                cycle,
              })),
            ]),
      ]);

      if (outcome.type === "shutdown") {
        await shutdownPromise;
        return;
      }
      if (outcome.type === "capture") {
        const terminal = await outcome.cycle.terminal;
        if (terminal.outcome.status === "supervisor-shutdown") {
          await shutdownPromise;
          return;
        }
        if (terminal.outcome.status === "recovery-failed") {
          requestShutdown();
          await shutdownPromise;
          throw new Error("Capture recovery failed");
        }
        options.onServingReady?.();
        continue;
      }
      if (outcome.loss.status === "recovery-failed") {
        throw outcome.loss.cause;
      }

      if (shuttingDown) {
        await shutdownPromise;
        return;
      }
      try {
        await options.supervisor.startServing({
          health: options.health,
          termination: options.termination,
        });
      } catch (error) {
        if (!shuttingDown) {
          throw error;
        }
        await shutdownPromise;
        return;
      }
      if (shuttingDown) {
        await shutdownPromise;
        return;
      }
      options.onServingReady?.();
    }
  } finally {
    process.off("SIGTERM", requestShutdown);
    process.off("SIGINT", requestShutdown);
  }
}

async function main(): Promise<void> {
  const port = parsePort(process.env.PORT);
  const supervisor = createStrapiSupervisor();
  await superviseStrapi({
    supervisor,
    health: {
      endpoint: `http://127.0.0.1:${port}/_health`,
      startupTimeoutMs: 120_000,
      requestTimeoutMs: 2_000,
      retryIntervalMs: 500,
    },
    termination: NORMAL_TERMINATION,
    startCaptureCoordination: async () => {
      let budget = DEFAULT_CAPTURE_BUDGET;
      let captureConfigurationValid = true;
      try {
        budget = parseCaptureBudget(process.env);
      } catch {
        captureConfigurationValid = false;
      }
      const coordinator = new CaptureCoordinator({
        supervisor,
        runtimeInspector: createCaptureRuntimeInspector(),
        budget,
        releaseId: captureConfigurationValid
          ? (process.env.STRAPID_RELEASE_ID ?? "")
          : "",
        sourceVolumeId: process.env.STRAPID_SOURCE_VOLUME_ID ?? "",
        servingHealth: {
          endpoint: `http://127.0.0.1:${port}/_health`,
          startupTimeoutMs: 10_000,
          requestTimeoutMs: 2_000,
          retryIntervalMs: 500,
        },
        exportEnvironment: { ...process.env },
      });
      try {
        const server = await startCaptureHttpServer(
          process.env.STRAPID_COORDINATION_SOCKET_PATH ??
            "/coordination/strapid.sock",
          coordinator,
        );
        return { coordinator, server };
      } catch {
        return undefined;
      }
    },
  });
}

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  import.meta.url === pathToFileURL(entrypoint).href
) {
  void main().catch((error: unknown) => {
    process.exitCode = 1;
    const message = error instanceof Error ? error.message : "strapid failed";
    console.error(message);
  });
}

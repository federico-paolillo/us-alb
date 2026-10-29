import { pathToFileURL } from "node:url";

import type { ServingHealthPolicy } from "./health.ts";
import type { ProcessTerminationBounds } from "./process-group.ts";
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

  const requestShutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    shutdownPromise = options.supervisor.shutdown(options.termination);
    shutdownRequested.resolve();
  };

  process.on("SIGTERM", requestShutdown);
  process.on("SIGINT", requestShutdown);

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

    while (!shuttingDown) {
      const outcome = await Promise.race([
        options.supervisor.waitForServingLoss().then((loss) => ({
          type: "loss" as const,
          loss,
        })),
        shutdownRequested.promise.then(() => ({ type: "shutdown" as const })),
      ]);

      if (outcome.type === "shutdown") {
        await shutdownPromise;
        return;
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
  await superviseStrapi({
    supervisor: createStrapiSupervisor(),
    health: {
      endpoint: `http://127.0.0.1:${port}/_health`,
      startupTimeoutMs: 120_000,
      requestTimeoutMs: 2_000,
      retryIntervalMs: 500,
    },
    termination: NORMAL_TERMINATION,
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

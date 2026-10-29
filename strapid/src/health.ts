import { request } from "node:http";
import { performance } from "node:perf_hooks";

import type { ManagedProcessGroup } from "./process-group.ts";

export interface ServingHealthPolicy {
  readonly endpoint: string;
  readonly startupTimeoutMs: number;
  readonly requestTimeoutMs: number;
  readonly retryIntervalMs: number;
}

export class ServingHealthError extends Error {
  constructor(cause: unknown) {
    super("Serving child did not become healthy", { cause });
    this.name = "ServingHealthError";
  }
}

class HealthStatusError extends Error {
  constructor(statusCode: number) {
    super(`Health request returned status ${statusCode}`);
    this.name = "HealthStatusError";
  }
}

class HealthRequestTimeoutError extends Error {
  constructor() {
    super("Health request timed out");
    this.name = "HealthRequestTimeoutError";
  }
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function validatePolicy(policy: ServingHealthPolicy): URL {
  assertPositiveFinite("startupTimeoutMs", policy.startupTimeoutMs);
  assertPositiveFinite("requestTimeoutMs", policy.requestTimeoutMs);
  assertPositiveFinite("retryIntervalMs", policy.retryIntervalMs);

  const endpoint = new URL(policy.endpoint);
  const port = Number(endpoint.port);
  if (
    endpoint.protocol !== "http:" ||
    endpoint.hostname !== "127.0.0.1" ||
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    endpoint.pathname !== "/_health" ||
    endpoint.search !== "" ||
    endpoint.hash !== "" ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error(
      "Serving health endpoint must be loopback HTTP /_health with an explicit port",
    );
  }
  return endpoint;
}

function cancellationCause(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Operation aborted", "AbortError");
}

function requestHealth(
  endpoint: URL,
  requestDeadline: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (outcome: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(deadlineTimer);
      signal?.removeEventListener("abort", abort);
      outcome();
    };
    const abort = () => {
      const cause =
        signal === undefined ? undefined : cancellationCause(signal);
      healthRequest.destroy(cause instanceof Error ? cause : undefined);
      settle(() => reject(cause));
    };
    const healthRequest = request(
      endpoint,
      { agent: false, method: "GET" },
      (response) => {
        response.resume();
        response.once("error", (error) => settle(() => reject(error)));
        response.once("end", () => {
          const statusCode = response.statusCode ?? 0;
          if (statusCode >= 200 && statusCode <= 299) {
            settle(resolve);
          } else {
            settle(() => reject(new HealthStatusError(statusCode)));
          }
        });
      },
    );

    const deadlineTimer = setTimeout(
      () => {
        const error = new HealthRequestTimeoutError();
        healthRequest.destroy(error);
        settle(() => reject(error));
      },
      Math.max(0, requestDeadline - performance.now()),
    );
    healthRequest.once("error", (error) => settle(() => reject(error)));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    healthRequest.end();
  });
}

function abortableDelay(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancellationCause(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      reject(signal === undefined ? undefined : cancellationCause(signal));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function waitForServingHealth(
  child: Pick<ManagedProcessGroup, "isDirectChildLive">,
  policy: ServingHealthPolicy,
  signal?: AbortSignal,
): Promise<void> {
  const endpoint = validatePolicy(policy);
  const deadline = performance.now() + policy.startupTimeoutMs;
  let lastFailure: unknown = new Error("No health response was received");

  while (true) {
    if (signal?.aborted) {
      throw new ServingHealthError(cancellationCause(signal));
    }
    if (!child.isDirectChildLive()) {
      throw new ServingHealthError(new Error("Serving child closed"));
    }

    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      throw new ServingHealthError(lastFailure);
    }

    try {
      const requestDeadline = Math.min(
        deadline,
        performance.now() + policy.requestTimeoutMs,
      );
      await requestHealth(endpoint, requestDeadline, signal);
      if (performance.now() >= deadline) {
        throw new HealthRequestTimeoutError();
      }
      if (!child.isDirectChildLive()) {
        throw new Error("Serving child closed after health response");
      }
      return;
    } catch (error) {
      if (signal?.aborted) {
        throw new ServingHealthError(cancellationCause(signal));
      }
      lastFailure = error;
    }

    const retryRemaining = deadline - performance.now();
    if (retryRemaining <= 0) {
      throw new ServingHealthError(lastFailure);
    }
    try {
      await abortableDelay(
        Math.min(policy.retryIntervalMs, retryRemaining),
        signal,
      );
    } catch (error) {
      throw new ServingHealthError(error);
    }
  }
}

import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import type { Server } from "node:http";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CaptureCoordinator } from "../src/capture-coordinator.ts";
import type { CaptureHttpServer } from "../src/capture-http.ts";
import { superviseStrapi } from "../src/main.ts";
import type { ChildCommand } from "../src/process-group.ts";
import {
  type StrapiSupervisor,
  type SupervisorObserver,
  strapiSupervisorTestHooks,
} from "../src/strapi-supervisor.ts";

const HARNESS = fileURLToPath(
  new URL("../fixtures/supervisor-main.ts", import.meta.url),
);
const CHILD_FIXTURE = fileURLToPath(
  new URL("../fixtures/child-process.ts", import.meta.url),
);

interface HarnessEvent {
  readonly event: string;
  readonly pid?: number;
  readonly starts?: number;
}

function isMissingProcess(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ESRCH"
  );
}

function forceOwnedGroupExit(processGroupId: number): void {
  try {
    process.kill(-processGroupId, "SIGKILL");
  } catch (error) {
    if (!isMissingProcess(error)) {
      throw error;
    }
  }
}

async function waitForReady(child: ChildProcess): Promise<HarnessEvent> {
  assert(child.stdout !== null);
  let buffer = "";
  for await (const chunk of child.stdout) {
    buffer += Buffer.from(chunk).toString("utf8");
    const lineEnd = buffer.indexOf("\n");
    if (lineEnd >= 0) {
      return JSON.parse(buffer.slice(0, lineEnd)) as HarnessEvent;
    }
  }
  throw new Error("Supervisor harness closed before readiness");
}

function waitForClose(child: ChildProcess): Promise<{
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

test(
  "SIGTERM shuts down the serving group without starting a replacement",
  { timeout: 10_000 },
  async () => {
    const harness = spawn(process.execPath, [HARNESS], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    harness.stderr?.resume();
    let servingPid: number | undefined;
    try {
      const ready = await waitForReady(harness);
      assert.equal(ready.event, "ready");
      assert.equal(ready.starts, 1);
      assert.equal(typeof ready.pid, "number");
      servingPid = ready.pid;

      assert.equal(harness.kill("SIGTERM"), true);
      const closed = await waitForClose(harness);
      assert.deepEqual(closed, { code: 0, signal: null });
      assert.throws(
        () => process.kill(servingPid as number, 0),
        (error: unknown) => isMissingProcess(error),
      );
      assert.throws(
        () => process.kill(-(servingPid as number), 0),
        (error: unknown) => isMissingProcess(error),
      );
    } finally {
      if (servingPid !== undefined) {
        forceOwnedGroupExit(servingPid);
      }
      if (harness.exitCode === null && harness.signalCode === null) {
        harness.kill("SIGKILL");
        await waitForClose(harness).catch(() => undefined);
      }
    }
  },
);

const CAPTURE_TERMINATION = {
  gracefulTimeoutMs: 200,
  forcedTimeoutMs: 500,
  pollIntervalMs: 10,
};
const CAPTURE_BUDGET = {
  totalWindowMs: 3_000,
  servingShutdownMs: 500,
  exportExecutionMs: 700,
  exporterTerminationMs: 500,
  recoveryMs: 1_300,
  forcedConfirmationMs: 100,
};

async function createHealthServer(): Promise<{
  readonly server: Server;
  readonly endpoint: string;
}> {
  const server = createServer((_request, response) =>
    response.writeHead(204).end(),
  );
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address();
  assert(address !== null && typeof address !== "string");
  return { server, endpoint: `http://127.0.0.1:${address.port}/_health` };
}

async function closeHealthServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function unexpectedRecoverySupervisor(
  recovery: "succeeded" | "failed" | "cancelled",
): {
  readonly supervisor: StrapiSupervisor;
  readonly recoveryEntered: Promise<void>;
} {
  let servingStarts = 0;
  let lossDelivered = false;
  const recoveryEntered = Promise.withResolvers<void>();
  const recoveryGate = Promise.withResolvers<void>();
  const supervisor = {
    async startServing() {
      servingStarts += 1;
      if (servingStarts === 1) return;
      recoveryEntered.resolve();
      if (recovery === "failed") throw new Error("controlled recovery failure");
      if (recovery === "cancelled") await recoveryGate.promise;
    },
    async waitForServingLoss() {
      if (!lossDelivered) {
        lossDelivered = true;
        return {
          status: "recovery-required" as const,
          close: { status: "exited" as const, exitCode: 1 },
        };
      }
      return await new Promise<never>(() => undefined);
    },
    async shutdown() {
      if (recovery === "cancelled") {
        recoveryGate.reject(new Error("controlled shutdown cancellation"));
      }
    },
  } as unknown as StrapiSupervisor;
  return { supervisor, recoveryEntered: recoveryEntered.promise };
}

function recoveryObserver(
  events: string[],
  onStarted?: () => void,
): Partial<SupervisorObserver> {
  return {
    recoveryStarted(event) {
      events.push(`started:${event.source}`);
      onStarted?.();
    },
    recoveryFinished(event) {
      events.push(`finished:${event.source}:${event.outcome}`);
    },
  };
}

test("unexpected serving recovery observes one successful terminal outcome", async () => {
  const controlled = unexpectedRecoverySupervisor("succeeded");
  const shutdown = Promise.withResolvers<void>();
  const events: string[] = [];
  let ready = 0;
  await superviseStrapi({
    supervisor: controlled.supervisor,
    health: {
      endpoint: "http://127.0.0.1:1/_health",
      startupTimeoutMs: 1,
      requestTimeoutMs: 1,
      retryIntervalMs: 1,
    },
    termination: CAPTURE_TERMINATION,
    observer: recoveryObserver(events),
    testShutdownRequested: shutdown.promise,
    onServingReady() {
      ready += 1;
      if (ready === 2) shutdown.resolve();
    },
  });
  assert.deepEqual(events, [
    "started:unexpected-serving-loss",
    "finished:unexpected-serving-loss:succeeded",
  ]);
});

test("unexpected serving recovery observes one failed terminal outcome", async () => {
  const controlled = unexpectedRecoverySupervisor("failed");
  const events: string[] = [];
  await assert.rejects(
    superviseStrapi({
      supervisor: controlled.supervisor,
      health: {
        endpoint: "http://127.0.0.1:1/_health",
        startupTimeoutMs: 1,
        requestTimeoutMs: 1,
        retryIntervalMs: 1,
      },
      termination: CAPTURE_TERMINATION,
      observer: recoveryObserver(events),
    }),
    /controlled recovery failure/,
  );
  assert.deepEqual(events, [
    "started:unexpected-serving-loss",
    "finished:unexpected-serving-loss:failed",
  ]);
});

test("unexpected serving recovery observes one cancelled terminal outcome", async () => {
  const controlled = unexpectedRecoverySupervisor("cancelled");
  const shutdown = Promise.withResolvers<void>();
  const events: string[] = [];
  await superviseStrapi({
    supervisor: controlled.supervisor,
    health: {
      endpoint: "http://127.0.0.1:1/_health",
      startupTimeoutMs: 1,
      requestTimeoutMs: 1,
      retryIntervalMs: 1,
    },
    termination: CAPTURE_TERMINATION,
    observer: recoveryObserver(events, () => shutdown.resolve()),
    testShutdownRequested: shutdown.promise,
  });
  await controlled.recoveryEntered;
  assert.deepEqual(events, [
    "started:unexpected-serving-loss",
    "finished:unexpected-serving-loss:cancelled",
  ]);
});

function fixtureCommand(
  role: ChildCommand["role"],
  mode: string,
  output: Extract<ChildCommand["output"], { readonly mode: "pipe" }>,
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = { ...process.env },
  arguments_: readonly string[] = [],
): ChildCommand {
  return {
    role,
    executable: process.execPath,
    arguments: [CHILD_FIXTURE, mode, ...arguments_],
    cwd,
    environment,
    output,
  };
}

test("capture recovery re-arms main monitoring against the recovered generation", async () => {
  const health = await createHealthServer();
  const shutdownRequested = Promise.withResolvers<void>();
  const firstReady = Promise.withResolvers<void>();
  const secondReady = Promise.withResolvers<void>();
  const thirdReady = Promise.withResolvers<void>();
  let servingStarts = 0;
  let readyCount = 0;
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () => {
      ++servingStarts;
      return fixtureCommand("serving", "idle-graceful", {
        mode: "pipe",
        onStdout: () => undefined,
        onStderr: () => undefined,
      });
    },
    createExportCommand: (invocation, output) =>
      fixtureCommand(
        "export",
        "exit",
        { mode: "pipe", ...output },
        invocation.cwd,
        invocation.environment,
        ["0"],
      ),
  });
  const coordinator = new CaptureCoordinator({
    supervisor,
    runtimeInspector: {
      async inspect() {
        return {
          ready: true,
          nodeVersion: process.version,
          strapiVersion: "5.52.0",
        };
      },
    },
    budget: CAPTURE_BUDGET,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    servingHealth: {
      endpoint: health.endpoint,
      startupTimeoutMs: 500,
      requestTimeoutMs: 100,
      retryIntervalMs: 20,
    },
    exportEnvironment: {
      ENV_PATH: "/run/secrets/backend.env",
      DATABASE_FILENAME: "/data/cms.db",
      SERVER_PUBLIC_FOLDER: "/data/public",
    },
  });
  const server: CaptureHttpServer = {
    socketPath: "/tmp/b04-main-test.sock",
    async close() {},
  };
  const main = superviseStrapi({
    supervisor,
    health: {
      endpoint: health.endpoint,
      startupTimeoutMs: 500,
      requestTimeoutMs: 100,
      retryIntervalMs: 20,
    },
    termination: CAPTURE_TERMINATION,
    startCaptureCoordination: async () => ({ coordinator, server }),
    testShutdownRequested: shutdownRequested.promise,
    onServingReady: () => {
      ++readyCount;
      if (readyCount === 1) firstReady.resolve();
      if (readyCount === 2) secondReady.resolve();
      if (readyCount === 3) thirdReady.resolve();
    },
  });
  try {
    await firstReady.promise;
    const terminal = await coordinator.beginCapture(
      {
        version: 1,
        captureWindowId: "22222222-2222-4222-8222-222222222222",
        expectedSupervisorInstanceId: coordinator.supervisorInstanceId,
        expectedReleaseId: "release-1",
        expectedSourceVolumeId: "source-1",
        expectedNodeVersion: process.version,
        expectedStrapiVersion: "5.52.0",
        archiveBasePath: "/staging/b04-main/export",
      },
      { async accepted() {}, async terminal() {} },
      new AbortController().signal,
    );
    assert.equal(terminal.outcome.status, "captured");
    await secondReady.promise;
    const recoveredPid = supervisor.snapshot().activePid;
    assert.equal(typeof recoveredPid, "number");
    process.kill(-(recoveredPid as number), "SIGTERM");
    await thirdReady.promise;
    assert.equal(servingStarts, 3);
    assert.notEqual(supervisor.snapshot().activePid, recoveredPid);
    shutdownRequested.resolve();
    await main;
    assert.equal(supervisor.snapshot().state, "terminated");
  } finally {
    shutdownRequested.resolve();
    await main.catch(() => undefined);
    await closeHealthServer(health.server);
  }
});

test("intentional shutdown during export terminalizes without a serving replacement", async () => {
  const health = await createHealthServer();
  const shutdownRequested = Promise.withResolvers<void>();
  const firstReady = Promise.withResolvers<void>();
  const exportReady = Promise.withResolvers<void>();
  let exportOutput = "";
  let servingStarts = 0;
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () => {
      ++servingStarts;
      return fixtureCommand("serving", "idle-graceful", {
        mode: "pipe",
        onStdout: () => undefined,
        onStderr: () => undefined,
      });
    },
    createExportCommand: (invocation, output) =>
      fixtureCommand(
        "export",
        "idle-tree",
        {
          mode: "pipe",
          onStdout: (chunk) => {
            exportOutput += Buffer.from(chunk).toString("utf8");
            if (exportOutput.includes('"event":"ready"')) exportReady.resolve();
            output.onStdout(chunk);
          },
          onStderr: output.onStderr,
        },
        invocation.cwd,
        invocation.environment,
      ),
  });
  const coordinator = new CaptureCoordinator({
    supervisor,
    runtimeInspector: {
      async inspect() {
        return {
          ready: true,
          nodeVersion: process.version,
          strapiVersion: "5.52.0",
        };
      },
    },
    budget: CAPTURE_BUDGET,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    servingHealth: {
      endpoint: health.endpoint,
      startupTimeoutMs: 500,
      requestTimeoutMs: 100,
      retryIntervalMs: 20,
    },
    exportEnvironment: {
      ENV_PATH: "/run/secrets/backend.env",
      DATABASE_FILENAME: "/data/cms.db",
      SERVER_PUBLIC_FOLDER: "/data/public",
    },
  });
  const server: CaptureHttpServer = {
    socketPath: "/tmp/b04-main-shutdown-test.sock",
    async close() {},
  };
  const main = superviseStrapi({
    supervisor,
    health: {
      endpoint: health.endpoint,
      startupTimeoutMs: 500,
      requestTimeoutMs: 100,
      retryIntervalMs: 20,
    },
    termination: CAPTURE_TERMINATION,
    startCaptureCoordination: async () => ({ coordinator, server }),
    testShutdownRequested: shutdownRequested.promise,
    onServingReady: () => firstReady.resolve(),
  });
  try {
    await firstReady.promise;
    const capture = coordinator.beginCapture(
      {
        version: 1,
        captureWindowId: "22222222-2222-4222-8222-222222222222",
        expectedSupervisorInstanceId: coordinator.supervisorInstanceId,
        expectedReleaseId: "release-1",
        expectedSourceVolumeId: "source-1",
        expectedNodeVersion: process.version,
        expectedStrapiVersion: "5.52.0",
        archiveBasePath: "/staging/b04-main-shutdown/export",
      },
      { async accepted() {}, async terminal() {} },
      new AbortController().signal,
    );
    await exportReady.promise;
    shutdownRequested.resolve();
    const terminal = await capture;
    assert.equal(terminal.outcome.status, "supervisor-shutdown");
    await main;
    assert.equal(servingStarts, 1);
    assert.equal(supervisor.snapshot().state, "terminated");
  } finally {
    shutdownRequested.resolve();
    await main.catch(() => undefined);
    await closeHealthServer(health.server);
  }
});

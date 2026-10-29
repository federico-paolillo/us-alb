import assert from "node:assert/strict";
import { access, rm } from "node:fs/promises";
import type { Server } from "node:http";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { LifecycleConflictError } from "../src/lifecycle-policy.ts";
import type {
  ChildCommand,
  ManagedProcessGroup,
  ProcessTerminationBounds,
} from "../src/process-group.ts";
import { ProcessGroupExitUnconfirmedError } from "../src/process-group.ts";
import type { StrapiCliInvocation } from "../src/strapi-runtime.ts";
import {
  type ExportOutput,
  StrapiRecoveryError,
  type StrapiSupervisor,
  strapiSupervisorTestHooks,
} from "../src/strapi-supervisor.ts";

const FIXTURE = fileURLToPath(
  new URL("../fixtures/child-process.ts", import.meta.url),
);
const TERMINATION: ProcessTerminationBounds = {
  gracefulTimeoutMs: 200,
  forcedTimeoutMs: 1_000,
  pollIntervalMs: 10,
};

interface FixtureEvent {
  readonly event: string;
  readonly pid?: number;
}

class EventCollector {
  private buffer = "";
  readonly events: FixtureEvent[] = [];
  private readonly waiters = new Map<
    string,
    Array<(event: FixtureEvent) => void>
  >();

  consume = (chunk: Uint8Array): void => {
    this.buffer += Buffer.from(chunk).toString("utf8");
    while (this.buffer.includes("\n")) {
      const lineEnd = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, lineEnd);
      this.buffer = this.buffer.slice(lineEnd + 1);
      const event = JSON.parse(line) as FixtureEvent;
      this.events.push(event);
      const waiters = this.waiters.get(event.event) ?? [];
      this.waiters.delete(event.event);
      for (const resolve of waiters) {
        resolve(event);
      }
    }
  };

  waitFor(name: string): Promise<FixtureEvent> {
    const observed = this.events.find((event) => event.event === name);
    if (observed !== undefined) {
      return Promise.resolve(observed);
    }
    return new Promise((resolve) => {
      const waiters = this.waiters.get(name) ?? [];
      waiters.push(resolve);
      this.waiters.set(name, waiters);
    });
  }
}

function isMissingProcess(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ESRCH"
  );
}

function assertPidMissing(pid: number): void {
  assert.throws(
    () => process.kill(pid, 0),
    (error: unknown) => isMissingProcess(error),
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

async function healthServer(initialStatus = 204): Promise<{
  readonly server: Server;
  readonly endpoint: string;
  setStatus(status: number): void;
}> {
  let status = initialStatus;
  const server = createServer((_request, response) => {
    response.writeHead(status).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address();
  assert(address !== null && typeof address !== "string");
  return {
    server,
    endpoint: `http://127.0.0.1:${address.port}/_health`,
    setStatus(nextStatus: number) {
      status = nextStatus;
    },
  };
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}

function servingOptions(endpoint: string, startupTimeoutMs = 500) {
  return {
    health: {
      endpoint,
      startupTimeoutMs,
      requestTimeoutMs: 60,
      retryIntervalMs: 20,
    },
    termination: TERMINATION,
  };
}

function exportRequest() {
  return {
    filePath: "/staging/b03-fixture/export",
    arguments: ["--no-encrypt", "--no-compress"],
    environment: {
      ENV_PATH: "/run/secrets/backend.env",
      DATABASE_FILENAME: "/data/cms.db",
      SERVER_PUBLIC_FOLDER: "/data/public",
    },
  };
}

function fixtureCommand(
  role: ChildCommand["role"],
  invocation: Pick<StrapiCliInvocation, "cwd" | "environment">,
  mode: string,
  output: ExportOutput,
  arguments_: readonly string[] = [],
): ChildCommand {
  return {
    role,
    executable: process.execPath,
    arguments: [FIXTURE, mode, ...arguments_],
    cwd: invocation.cwd,
    environment: invocation.environment,
    output: { mode: "pipe", ...output },
  };
}

function createSupervisor(
  servingEvents: EventCollector,
  exportEvents: EventCollector,
  exportMode: () => {
    readonly mode: string;
    readonly arguments?: readonly string[];
  },
  onExportInvocation?: (invocation: StrapiCliInvocation) => void,
  beforeExportSpawn?: (invocation: StrapiCliInvocation) => Promise<void>,
  beforeExportShutdownTermination?: (child: ManagedProcessGroup) => void,
): StrapiSupervisor {
  return strapiSupervisorTestHooks.create({
    createServingCommand: () =>
      fixtureCommand(
        "serving",
        { cwd: process.cwd(), environment: { ...process.env } },
        "idle-graceful",
        {
          onStdout: servingEvents.consume,
          onStderr: () => undefined,
        },
      ),
    createExportCommand: (invocation, output) => {
      onExportInvocation?.(invocation);
      const selection = exportMode();
      const combinedOutput = {
        onStdout: (chunk: Uint8Array) => {
          exportEvents.consume(chunk);
          output.onStdout(chunk);
        },
        onStderr: output.onStderr,
      };
      return fixtureCommand(
        "export",
        invocation,
        selection.mode,
        combinedOutput,
        selection.arguments,
      );
    },
    beforeExportSpawn,
    beforeExportShutdownTermination,
  });
}

async function shutdownIfNeeded(supervisor: StrapiSupervisor): Promise<void> {
  if (supervisor.snapshot().state !== "terminated") {
    await supervisor.shutdown(TERMINATION).catch(() => undefined);
  }
}

test("rejects export while serving before creating an export child", async () => {
  const health = await healthServer();
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  const supervisor = createSupervisor(servingEvents, exportEvents, () => ({
    mode: "exit",
    arguments: ["0"],
  }));
  try {
    await supervisor.startServing(servingOptions(health.endpoint));
    await assert.rejects(
      supervisor.runExport(exportRequest(), {
        termination: TERMINATION,
        output: { onStdout: () => undefined, onStderr: () => undefined },
      }),
      LifecycleConflictError,
    );
    assert.equal(exportEvents.events.length, 0);
    await supervisor.stopServing(TERMINATION);
  } finally {
    await shutdownIfNeeded(supervisor);
    await closeServer(health.server);
  }
});

test("blocks every competing spawn and confirms export cancellation", async () => {
  const health = await healthServer();
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  const supervisor = createSupervisor(servingEvents, exportEvents, () => ({
    mode: "idle-tree",
  }));
  const cancellation = new AbortController();
  let exportPromise: Promise<unknown> | undefined;
  try {
    exportPromise = supervisor.runExport(exportRequest(), {
      termination: TERMINATION,
      output: { onStdout: () => undefined, onStderr: () => undefined },
      signal: cancellation.signal,
    });
    const descendant = await exportEvents.waitFor("descendant");
    const ready = await exportEvents.waitFor("ready");
    assert.equal(typeof descendant.pid, "number");
    assert.equal(typeof ready.pid, "number");

    await assert.rejects(
      supervisor.startServing(servingOptions(health.endpoint)),
      LifecycleConflictError,
    );
    await assert.rejects(
      supervisor.runExport(exportRequest(), {
        termination: TERMINATION,
        output: { onStdout: () => undefined, onStderr: () => undefined },
      }),
      LifecycleConflictError,
    );

    cancellation.abort();
    const result = await exportPromise;
    assert.deepEqual(result, {
      status: "cancelled",
      close: { status: "exited", exitCode: 0 },
    });
    assertPidMissing(ready.pid as number);
    assertPidMissing(descendant.pid as number);
    assert.equal(supervisor.snapshot().state, "stopped");
  } finally {
    cancellation.abort();
    await shutdownIfNeeded(supervisor);
    await exportPromise?.catch(() => undefined);
    await closeServer(health.server);
  }
});

test("restarts serving only after export descendants and output are gone", async () => {
  const health = await healthServer();
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  let workspace = "";
  const supervisor = createSupervisor(
    servingEvents,
    exportEvents,
    () => ({
      mode: "tail",
      arguments: ["5000"],
    }),
    (invocation) => {
      workspace = invocation.cwd;
    },
  );
  try {
    const result = await supervisor.runExport(exportRequest(), {
      termination: TERMINATION,
      output: { onStdout: () => undefined, onStderr: () => undefined },
    });
    const descendant = await exportEvents.waitFor("descendant");
    assert.equal(result.status, "succeeded");
    assert.equal(
      exportEvents.events.some((event) => event.event === "tail-closed"),
      true,
    );
    assertPidMissing(descendant.pid as number);
    assert.equal(supervisor.snapshot().state, "stopped");
    await assert.rejects(access(workspace), { code: "ENOENT" });

    await supervisor.startServing(servingOptions(health.endpoint));
    assert.equal(supervisor.snapshot().state, "serving");
    await supervisor.stopServing(TERMINATION);
  } finally {
    await shutdownIfNeeded(supervisor);
    await closeServer(health.server);
  }
});

test("shutdown invalidates paused export preparation before spawn", async () => {
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  const preparationReached = Promise.withResolvers<void>();
  const releasePreparation = Promise.withResolvers<void>();
  let workspace = "";
  let spawnCount = 0;
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () =>
      fixtureCommand(
        "serving",
        { cwd: process.cwd(), environment: { ...process.env } },
        "idle-graceful",
        { onStdout: servingEvents.consume, onStderr: () => undefined },
      ),
    createExportCommand: (invocation, output) => {
      ++spawnCount;
      return fixtureCommand("export", invocation, "exit", output, ["0"]);
    },
    beforeExportSpawn: async (invocation) => {
      workspace = invocation.cwd;
      preparationReached.resolve();
      await releasePreparation.promise;
    },
  });

  const exportPromise = supervisor.runExport(exportRequest(), {
    termination: TERMINATION,
    output: { onStdout: exportEvents.consume, onStderr: () => undefined },
  });
  let terminalState = "pending";
  void exportPromise.then(() => {
    terminalState = supervisor.snapshot().state;
  });
  try {
    await preparationReached.promise;
    await access(workspace);
    const shutdownPromise = supervisor.shutdown(TERMINATION);
    assert.equal(supervisor.snapshot().state, "shutting-down");
    assert.equal(terminalState, "pending");
    releasePreparation.resolve();

    await shutdownPromise;
    const result = await exportPromise;
    assert.deepEqual(result, { status: "cancelled-before-start" });
    assert.equal(spawnCount, 0);
    assert.equal(terminalState, "terminated");
    assert.equal(supervisor.snapshot().state, "terminated");
    await assert.rejects(access(workspace), { code: "ENOENT" });
  } finally {
    releasePreparation.resolve();
    if (workspace !== "") {
      await rm(workspace, { recursive: true, force: true });
    }
  }
});

test("unconfirmed shutdown retains the exact spawned export operation", async () => {
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  let workspace = "";
  let directPid: number | undefined;
  let descendantPid: number | undefined;
  const supervisor = createSupervisor(
    servingEvents,
    exportEvents,
    () => ({ mode: "idle-tree" }),
    (invocation) => {
      workspace = invocation.cwd;
    },
    undefined,
    (child) => {
      throw new ProcessGroupExitUnconfirmedError("export", child.pid);
    },
  );
  const exportPromise = supervisor.runExport(exportRequest(), {
    termination: TERMINATION,
    output: { onStdout: () => undefined, onStderr: () => undefined },
  });

  try {
    const direct = await exportEvents.waitFor("ready");
    const descendant = await exportEvents.waitFor("descendant");
    directPid = direct.pid;
    descendantPid = descendant.pid;
    assert.equal(typeof directPid, "number");
    assert.equal(typeof descendantPid, "number");

    const started = Date.now();
    await assert.rejects(supervisor.shutdown(TERMINATION), (error: unknown) => {
      assert(error instanceof StrapiRecoveryError);
      assert.equal(error.ownedGroupMayRemain, true);
      return true;
    });
    assert(Date.now() - started < 1_000);
    const result = await exportPromise;
    assert.equal(result.status, "recovery-failed");
    assert.equal(supervisor.snapshot().state, "shutting-down");
    assert.equal(supervisor.snapshot().activePid, directPid);
    await access(workspace);
    assert.doesNotThrow(() => process.kill(directPid as number, 0));
    assert.doesNotThrow(() => process.kill(descendantPid as number, 0));
    assert.deepEqual(
      strapiSupervisorTestHooks.inspectExportOperation(supervisor),
      {
        workspace,
        childPid: directPid,
        retained: true,
        directWaitSettled: false,
        workspaceSettled: false,
        safeExitGateReleased: false,
      },
    );

    forceOwnedGroupExit(directPid as number);
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      try {
        process.kill(-(directPid as number), 0);
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        if (isMissingProcess(error)) {
          break;
        }
        throw error;
      }
    }
    assert.throws(
      () => process.kill(-(directPid as number), 0),
      (error: unknown) => isMissingProcess(error),
    );
    assertPidMissing(directPid as number);
    assertPidMissing(descendantPid as number);
    const directExitDeadline = Date.now() + 2_000;
    while (
      strapiSupervisorTestHooks.inspectExportOperation(supervisor)
        ?.directWaitSettled !== true &&
      Date.now() < directExitDeadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.deepEqual(
      strapiSupervisorTestHooks.inspectExportOperation(supervisor),
      {
        workspace,
        childPid: directPid,
        retained: true,
        directWaitSettled: true,
        workspaceSettled: false,
        safeExitGateReleased: false,
      },
    );
    await access(workspace);
    await rm(workspace, { recursive: true, force: false });
    await assert.rejects(access(workspace), { code: "ENOENT" });
    assert.equal(supervisor.snapshot().state, "shutting-down");
  } finally {
    if (directPid !== undefined) {
      forceOwnedGroupExit(directPid);
    }
    if (workspace !== "") {
      await rm(workspace, { recursive: true, force: true });
    }
  }
});

test("setup failure is reported only after exact workspace cleanup", async () => {
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  const setupFailure = new Error("fixture setup failed");
  let workspace = "";
  const supervisor = createSupervisor(
    servingEvents,
    exportEvents,
    () => ({ mode: "exit", arguments: ["0"] }),
    undefined,
    async (invocation) => {
      workspace = invocation.cwd;
      throw setupFailure;
    },
  );
  try {
    const result = await supervisor.runExport(exportRequest(), {
      termination: TERMINATION,
      output: { onStdout: () => undefined, onStderr: () => undefined },
    });
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.cause, setupFailure);
    }
    assert.equal(supervisor.snapshot().state, "stopped");
    await assert.rejects(access(workspace), { code: "ENOENT" });
  } finally {
    await shutdownIfNeeded(supervisor);
  }
});

test("cleans a failed serving group before admitting a healthy retry", async () => {
  const health = await healthServer(503);
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  const supervisor = createSupervisor(servingEvents, exportEvents, () => ({
    mode: "exit",
    arguments: ["0"],
  }));
  try {
    await assert.rejects(
      supervisor.startServing(servingOptions(health.endpoint, 180)),
    );
    const failedPid = servingEvents.events.find(
      (event) => event.event === "ready",
    )?.pid;
    assert.equal(typeof failedPid, "number");
    assertPidMissing(failedPid as number);
    assert.equal(supervisor.snapshot().state, "recovery-required");

    health.setStatus(204);
    await supervisor.startServing(servingOptions(health.endpoint));
    assert.equal(supervisor.snapshot().state, "serving");
    await supervisor.stopServing(TERMINATION);
  } finally {
    await shutdownIfNeeded(supervisor);
    await closeServer(health.server);
  }
});

test("reports an unexpected loss only after the old group is gone", async () => {
  const health = await healthServer();
  const servingEvents = new EventCollector();
  let servingStarts = 0;
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () => {
      const first = servingStarts++ === 0;
      return fixtureCommand(
        "serving",
        { cwd: process.cwd(), environment: { ...process.env } },
        first ? "exit-after" : "idle-graceful",
        {
          onStdout: servingEvents.consume,
          onStderr: () => undefined,
        },
        first ? ["100", "7"] : [],
      );
    },
    createExportCommand: (invocation, output) =>
      fixtureCommand("export", invocation, "exit", output, ["0"]),
  });
  try {
    await supervisor.startServing(servingOptions(health.endpoint));
    const oldPid = supervisor.snapshot().activePid;
    assert.equal(typeof oldPid, "number");
    const loss = await supervisor.waitForServingLoss();
    assert.deepEqual(loss, {
      status: "recovery-required",
      close: { status: "exited", exitCode: 7 },
    });
    assertPidMissing(oldPid as number);

    await supervisor.startServing(servingOptions(health.endpoint));
    assert.equal(supervisor.snapshot().state, "serving");
    assert.notEqual(supervisor.snapshot().activePid, oldPid);
    await supervisor.stopServing(TERMINATION);
  } finally {
    await shutdownIfNeeded(supervisor);
    await closeServer(health.server);
  }
});

test("retains an unconfirmed export workspace until later close and group absence", async () => {
  const health = await healthServer();
  const servingEvents = new EventCollector();
  const exportEvents = new EventCollector();
  let workspace = "";
  let directPid: number | undefined;
  const cancellation = new AbortController();
  const supervisor = createSupervisor(
    servingEvents,
    exportEvents,
    () => ({ mode: "ignore-tree" }),
    (invocation) => {
      workspace = invocation.cwd;
    },
  );
  try {
    const exportPromise = supervisor.runExport(exportRequest(), {
      termination: {
        gracefulTimeoutMs: 10,
        forcedTimeoutMs: 0.001,
        pollIntervalMs: 1,
      },
      output: { onStdout: () => undefined, onStderr: () => undefined },
      signal: cancellation.signal,
    });
    const direct = await exportEvents.waitFor("ready");
    const descendant = await exportEvents.waitFor("descendant");
    directPid = direct.pid;
    cancellation.abort();
    const result = await exportPromise;
    assert.equal(result.status, "recovery-failed");
    assert.equal(supervisor.snapshot().state, "recovery-failed");
    assert.notEqual(workspace, "");
    await access(workspace);
    await assert.rejects(
      supervisor.startServing(servingOptions(health.endpoint)),
      LifecycleConflictError,
    );

    const deadline = Date.now() + 2_000;
    let confirmed = false;
    while (!confirmed && Date.now() < deadline) {
      confirmed = await supervisor.reconfirmOwnedChildExit();
      if (!confirmed) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    assert.equal(confirmed, true);
    assert.equal(supervisor.snapshot().state, "recovery-required");
    await assert.rejects(access(workspace), { code: "ENOENT" });
    assertPidMissing(direct.pid as number);
    assertPidMissing(descendant.pid as number);
  } finally {
    cancellation.abort();
    if (
      directPid !== undefined &&
      supervisor.snapshot().state === "recovery-failed"
    ) {
      forceOwnedGroupExit(directPid);
      const cleanupDeadline = Date.now() + 2_000;
      while (
        supervisor.snapshot().state === "recovery-failed" &&
        Date.now() < cleanupDeadline
      ) {
        if (await supervisor.reconfirmOwnedChildExit()) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    await shutdownIfNeeded(supervisor);
    await closeServer(health.server);
  }
});

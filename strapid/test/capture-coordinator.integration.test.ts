import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import type { Server } from "node:http";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { CaptureRequest } from "../src/capture-contract.ts";
import { CaptureCoordinator } from "../src/capture-coordinator.ts";
import {
  createExportOutputSession,
  type ExportAttention,
  type ExportDiagnosticRecord,
} from "../src/export-output.ts";
import type {
  ChildCommand,
  ProcessTerminationBounds,
} from "../src/process-group.ts";
import type { StrapiCliInvocation } from "../src/strapi-runtime.ts";
import {
  type ExportOutput,
  type StrapiSupervisor,
  strapiSupervisorTestHooks,
} from "../src/strapi-supervisor.ts";

const FIXTURE = fileURLToPath(
  new URL("../fixtures/child-process.ts", import.meta.url),
);
const TERMINATION: ProcessTerminationBounds = {
  gracefulTimeoutMs: 200,
  forcedTimeoutMs: 500,
  pollIntervalMs: 10,
};
const BUDGET = {
  totalWindowMs: 5_900,
  servingShutdownMs: 500,
  exportExecutionMs: 2_500,
  exporterTerminationMs: 500,
  recoveryMs: 2_400,
  forcedConfirmationMs: 100,
};

interface FixtureEvent {
  readonly event: string;
  readonly pid?: number;
}

class Events {
  private buffer = "";
  readonly observed: FixtureEvent[] = [];
  private readonly waiters = new Map<
    string,
    Array<(event: FixtureEvent) => void>
  >();

  consume = (chunk: Uint8Array): void => {
    this.buffer += Buffer.from(chunk).toString("utf8");
    while (this.buffer.includes("\n")) {
      const end = this.buffer.indexOf("\n");
      const event = JSON.parse(this.buffer.slice(0, end)) as FixtureEvent;
      this.buffer = this.buffer.slice(end + 1);
      this.observed.push(event);
      for (const resolve of this.waiters.get(event.event) ?? []) resolve(event);
      this.waiters.delete(event.event);
    }
  };

  waitFor(name: string): Promise<FixtureEvent> {
    const event = this.observed.find((candidate) => candidate.event === name);
    if (event !== undefined) return Promise.resolve(event);
    return new Promise((resolve) => {
      const waiters = this.waiters.get(name) ?? [];
      waiters.push(resolve);
      this.waiters.set(name, waiters);
    });
  }
}

async function healthServer(): Promise<{
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

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function command(
  role: ChildCommand["role"],
  mode: string,
  output: ExportOutput,
  invocation?: StrapiCliInvocation,
  arguments_: readonly string[] = [],
): ChildCommand {
  return {
    role,
    executable: process.execPath,
    arguments: [FIXTURE, mode, ...arguments_],
    cwd: invocation?.cwd ?? process.cwd(),
    environment: invocation?.environment ?? { ...process.env },
    output: { mode: "pipe", ...output },
  };
}

function request(supervisorInstanceId: string): CaptureRequest {
  return {
    version: 1,
    captureWindowId: "22222222-2222-4222-8222-222222222222",
    expectedSupervisorInstanceId: supervisorInstanceId,
    expectedReleaseId: "release-1",
    expectedSourceVolumeId: "source-1",
    expectedNodeVersion: process.version,
    expectedStrapiVersion: "5.52.0",
    archiveBasePath: "/staging/b04-fixture/export",
  };
}

function coordinator(
  supervisor: StrapiSupervisor,
  endpoint: string,
  createOutputSession?: ConstructorParameters<
    typeof CaptureCoordinator
  >[0]["createOutputSession"],
): CaptureCoordinator {
  return new CaptureCoordinator({
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
    budget: BUDGET,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    servingHealth: {
      endpoint,
      startupTimeoutMs: 500,
      requestTimeoutMs: 100,
      retryIntervalMs: 20,
    },
    exportEnvironment: {
      ENV_PATH: "/run/secrets/backend.env",
      DATABASE_FILENAME: "/data/cms.db",
      SERVER_PUBLIC_FOLDER: "/data/public",
    },
    retryIntervalMs: 20,
    ...(createOutputSession === undefined ? {} : { createOutputSession }),
  });
}

async function shutdown(supervisor: StrapiSupervisor): Promise<void> {
  if (supervisor.snapshot().state !== "terminated") {
    await supervisor.shutdown(TERMINATION).catch(() => undefined);
  }
}

test("clean capture closes output/workspace before captured and recovers serving", async () => {
  const health = await healthServer();
  const serving = new Events();
  const exporting = new Events();
  let invocation: StrapiCliInvocation | undefined;
  let workspace = "";
  const diagnostics: ExportDiagnosticRecord[] = [];
  const attention: ExportAttention[] = [];
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () =>
      command("serving", "idle-graceful", {
        onStdout: serving.consume,
        onStderr: () => undefined,
      }),
    createExportCommand: (candidate, output) => {
      invocation = candidate;
      workspace = candidate.cwd;
      return command(
        "export",
        "diagnostic-tail",
        {
          onStdout: (chunk) => {
            exporting.consume(chunk);
            output.onStdout(chunk);
          },
          onStderr: output.onStderr,
        },
        candidate,
        ["5000"],
      );
    },
  });
  const capture = coordinator(supervisor, health.endpoint, () =>
    createExportOutputSession({
      onRecord: (record) => diagnostics.push(record),
      onAttention: (event) => attention.push(event),
    }),
  );
  const ordering: string[] = [];
  try {
    await supervisor.startServing({
      health: {
        endpoint: health.endpoint,
        startupTimeoutMs: 500,
        requestTimeoutMs: 100,
        retryIntervalMs: 20,
      },
      termination: TERMINATION,
    });
    const terminal = await capture.beginCapture(
      request(capture.supervisorInstanceId),
      {
        async accepted() {
          ordering.push("accepted");
        },
        async terminal() {
          assert.equal(
            exporting.observed.some((event) => event.event === "tail-closed"),
            true,
          );
          await assert.rejects(access(workspace), { code: "ENOENT" });
          assert.equal(supervisor.snapshot().state, "serving");
          ordering.push("terminal");
        },
      },
      new AbortController().signal,
    );
    assert.equal(terminal.outcome.status, "captured");
    assert.deepEqual(ordering, ["accepted", "terminal"]);
    assert.deepEqual(invocation?.arguments, [
      "/strapi/node_modules/@strapi/strapi/bin/strapi.js",
      "export",
      "--file",
      "/staging/b04-fixture/export",
      "--no-encrypt",
      "--no-compress",
    ]);
    assert.deepEqual(attention, [{ category: "warning" }]);
    assert.equal(
      diagnostics.some((record) =>
        record.message.includes("unfamiliar exporter status"),
      ),
      true,
    );
    assert.equal(
      JSON.stringify(diagnostics).includes("fixture-secret-value"),
      false,
    );
  } finally {
    await shutdown(supervisor);
    await closeServer(health.server);
  }
});

test("forced serving stop emits no acceptance and starts no exporter", async () => {
  const health = await healthServer();
  const serving = new Events();
  let servingStarts = 0;
  let exportStarts = 0;
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () =>
      command(
        "serving",
        servingStarts++ === 0 ? "ignore-tree" : "idle-graceful",
        {
          onStdout: serving.consume,
          onStderr: () => undefined,
        },
      ),
    createExportCommand: (invocation, output) => {
      ++exportStarts;
      return command("export", "exit", output, invocation, ["0"]);
    },
  });
  const capture = coordinator(supervisor, health.endpoint);
  let accepted = false;
  try {
    await supervisor.startServing({
      health: {
        endpoint: health.endpoint,
        startupTimeoutMs: 500,
        requestTimeoutMs: 100,
        retryIntervalMs: 20,
      },
      termination: TERMINATION,
    });
    await serving.waitFor("ready");
    const terminal = await capture.beginCapture(
      request(capture.supervisorInstanceId),
      {
        async accepted() {
          accepted = true;
        },
        async terminal() {},
      },
      new AbortController().signal,
    );
    assert.equal(terminal.outcome.status, "invalid");
    if (terminal.outcome.status === "invalid") {
      assert.equal(terminal.outcome.reason, "forced_serving_stop");
    }
    assert.equal(accepted, false);
    assert.equal(exportStarts, 0);
    assert.equal(supervisor.snapshot().state, "serving");
  } finally {
    await shutdown(supervisor);
    await closeServer(health.server);
  }
});

test("cancellation during export invalidates eligibility but recovery is independent", async () => {
  const health = await healthServer();
  const exporting = new Events();
  const supervisor = strapiSupervisorTestHooks.create({
    createServingCommand: () =>
      command("serving", "idle-graceful", {
        onStdout: () => undefined,
        onStderr: () => undefined,
      }),
    createExportCommand: (invocation, output) =>
      command(
        "export",
        "idle-tree",
        {
          onStdout: (chunk) => {
            exporting.consume(chunk);
            output.onStdout(chunk);
          },
          onStderr: output.onStderr,
        },
        invocation,
      ),
  });
  const capture = coordinator(supervisor, health.endpoint);
  try {
    await supervisor.startServing({
      health: {
        endpoint: health.endpoint,
        startupTimeoutMs: 500,
        requestTimeoutMs: 100,
        retryIntervalMs: 20,
      },
      termination: TERMINATION,
    });
    const capturePromise = capture.beginCapture(
      request(capture.supervisorInstanceId),
      { async accepted() {}, async terminal() {} },
      new AbortController().signal,
    );
    await exporting.waitFor("ready");
    assert.equal(
      capture.cancel(
        capture.supervisorInstanceId,
        request(capture.supervisorInstanceId).captureWindowId,
      ),
      true,
    );
    const terminal = await capturePromise;
    assert.equal(terminal.outcome.status, "invalid");
    if (terminal.outcome.status === "invalid") {
      assert.equal(terminal.outcome.reason, "client_cancelled");
    }
    assert.equal(supervisor.snapshot().state, "serving");
  } finally {
    await shutdown(supervisor);
    await closeServer(health.server);
  }
});

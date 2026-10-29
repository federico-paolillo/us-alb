import assert from "node:assert/strict";
import test from "node:test";

import type { CaptureRequest } from "../src/capture-contract.ts";
import {
  CaptureAdmissionError,
  CaptureCoordinator,
  type CaptureSupervisor,
} from "../src/capture-coordinator.ts";
import type {
  ExportOptions,
  ExportResult,
  SupervisorSnapshot,
} from "../src/strapi-supervisor.ts";
import { StrapiRecoveryError } from "../src/strapi-supervisor.ts";

const BUDGET = {
  totalWindowMs: 1_000,
  servingShutdownMs: 100,
  exportExecutionMs: 300,
  exporterTerminationMs: 100,
  recoveryMs: 500,
  forcedConfirmationMs: 20,
};

class FakeSupervisor implements CaptureSupervisor {
  state: SupervisorSnapshot["state"] = "serving";
  stopCount = 0;
  exportCount = 0;
  startCount = 0;
  exportResult: ExportResult = {
    status: "succeeded",
    close: { status: "exited", exitCode: 0 },
  };
  exportHandler?: (options: ExportOptions) => Promise<ExportResult>;
  startHandler?: () => Promise<void>;

  snapshot(): SupervisorSnapshot {
    return { state: this.state };
  }

  async confirmServingReady(): Promise<void> {}

  async stopServing() {
    ++this.stopCount;
    this.state = "stopped";
    return {
      status: "graceful" as const,
      close: { status: "exited" as const, exitCode: 0 },
    };
  }

  async runExport(
    _request: {
      readonly filePath: string;
      readonly arguments?: readonly string[];
      readonly environment?: NodeJS.ProcessEnv;
    },
    options: ExportOptions,
  ): Promise<ExportResult> {
    ++this.exportCount;
    if (this.exportHandler !== undefined) return this.exportHandler(options);
    return this.exportResult;
  }

  async startServing(): Promise<void> {
    ++this.startCount;
    await this.startHandler?.();
    this.state = "serving";
  }
}

function request(instance: string): CaptureRequest {
  return {
    version: 1,
    captureWindowId: "22222222-2222-4222-8222-222222222222",
    expectedSupervisorInstanceId: instance,
    expectedReleaseId: "release-1",
    expectedSourceVolumeId: "source-1",
    expectedNodeVersion: process.version,
    expectedStrapiVersion: "5.52.0",
    archiveBasePath: "/staging/unit/export",
  };
}

function create(
  supervisor: FakeSupervisor,
  options: {
    readonly inspect?: () => Promise<{
      readonly ready: true;
      readonly nodeVersion: string;
      readonly strapiVersion: string;
    }>;
    readonly now?: () => number;
  } = {},
) {
  return new CaptureCoordinator({
    supervisor,
    runtimeInspector: {
      inspect:
        options.inspect ??
        (async () => ({
          ready: true as const,
          nodeVersion: process.version,
          strapiVersion: "5.52.0",
        })),
    },
    budget: BUDGET,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    servingHealth: {
      endpoint: "http://127.0.0.1:65101/_health",
      startupTimeoutMs: 50,
      requestTimeoutMs: 20,
      retryIntervalMs: 5,
    },
    now: options.now,
  });
}

test("identity mismatch is rejected before serving interruption", async () => {
  const supervisor = new FakeSupervisor();
  const coordinator = create(supervisor);
  await assert.rejects(
    coordinator.beginCapture(
      {
        ...request(coordinator.supervisorInstanceId),
        expectedReleaseId: "other",
      },
      { async accepted() {}, async terminal() {} },
      new AbortController().signal,
    ),
    (error: unknown) =>
      error instanceof CaptureAdmissionError &&
      error.code === "identity_mismatch",
  );
  assert.equal(supervisor.stopCount, 0);
  assert.equal(supervisor.exportCount, 0);
});

test("provisional preflight reserves the sole admission synchronously", async () => {
  const supervisor = new FakeSupervisor();
  const inspection = Promise.withResolvers<{
    readonly ready: true;
    readonly nodeVersion: string;
    readonly strapiVersion: string;
  }>();
  const coordinator = create(supervisor, {
    inspect: () => inspection.promise,
  });
  const first = coordinator.beginCapture(
    request(coordinator.supervisorInstanceId),
    { async accepted() {}, async terminal() {} },
    new AbortController().signal,
  );
  assert.throws(
    () =>
      coordinator.beginCapture(
        {
          ...request(coordinator.supervisorInstanceId),
          captureWindowId: "33333333-3333-4333-8333-333333333333",
        },
        { async accepted() {}, async terminal() {} },
        new AbortController().signal,
      ),
    (error: unknown) =>
      error instanceof CaptureAdmissionError && error.code === "capture_busy",
  );
  inspection.resolve({
    ready: true,
    nodeVersion: process.version,
    strapiVersion: "5.52.0",
  });
  assert.equal((await first).outcome.status, "captured");
});

test("first invalidation reason wins and recovery still completes", async () => {
  const supervisor = new FakeSupervisor();
  const coordinator = create(supervisor);
  const captureRequest = request(coordinator.supervisorInstanceId);
  const terminal = await coordinator.beginCapture(
    captureRequest,
    {
      async accepted() {
        coordinator.disconnect(captureRequest.captureWindowId);
        coordinator.cancel(
          captureRequest.expectedSupervisorInstanceId,
          captureRequest.captureWindowId,
        );
      },
      async terminal() {},
    },
    new AbortController().signal,
  );
  assert.equal(terminal.outcome.status, "invalid");
  if (terminal.outcome.status === "invalid") {
    assert.equal(terminal.outcome.reason, "client_disconnected");
  }
  assert.equal(supervisor.exportCount, 0);
  assert.equal(supervisor.startCount, 1);
  assert.equal(supervisor.state, "serving");
});

test("ordinary success is not observable until terminal response attempt", async () => {
  const supervisor = new FakeSupervisor();
  const coordinator = create(supervisor);
  const releaseTerminal = Promise.withResolvers<void>();
  let settled = false;
  const capture = coordinator.beginCapture(
    request(coordinator.supervisorInstanceId),
    {
      async accepted() {},
      async terminal() {
        await releaseTerminal.promise;
      },
    },
    new AbortController().signal,
  );
  void capture.then(() => {
    settled = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(settled, false);
  assert.equal(supervisor.state, "serving");
  releaseTerminal.resolve();
  assert.equal((await capture).outcome.status, "captured");
});

test("export expiry aborts once and preserves recovery reserve", async () => {
  const supervisor = new FakeSupervisor();
  supervisor.exportHandler = async (options) => {
    await new Promise<void>((resolve) =>
      options.signal?.addEventListener("abort", () => resolve(), {
        once: true,
      }),
    );
    return {
      status: "cancelled",
      close: { status: "exited", exitCode: 0 },
    };
  };
  const coordinator = create(supervisor);
  const terminal = await coordinator.beginCapture(
    request(coordinator.supervisorInstanceId),
    { async accepted() {}, async terminal() {} },
    new AbortController().signal,
  );
  assert.equal(terminal.outcome.status, "invalid");
  if (terminal.outcome.status === "invalid") {
    assert.equal(terminal.outcome.reason, "window_expired");
  }
  assert.equal(supervisor.exportCount, 1);
  assert.equal(supervisor.startCount, 1);
  assert.equal(supervisor.state, "serving");
});

test("unconfirmed export ownership blocks every serving recovery attempt", async () => {
  const supervisor = new FakeSupervisor();
  supervisor.exportResult = {
    status: "recovery-failed",
    cause: new StrapiRecoveryError(
      "export",
      true,
      new Error("fixture ownership unconfirmed"),
    ),
  };
  const coordinator = create(supervisor);
  const terminal = await coordinator.beginCapture(
    request(coordinator.supervisorInstanceId),
    { async accepted() {}, async terminal() {} },
    new AbortController().signal,
  );
  assert.deepEqual(terminal.outcome, {
    status: "recovery-failed",
    reason: "export_ownership_unconfirmed",
  });
  assert.equal(supervisor.startCount, 0);
});

test("post-export monotonic check rejects completion beyond the exact cutoff", async (t) => {
  for (const scenario of [
    { completedAt: 300, expected: "captured" },
    { completedAt: 301, expected: "invalid" },
  ] as const) {
    await t.test(`${scenario.completedAt}ms`, async () => {
      let now = 0;
      const supervisor = new FakeSupervisor();
      supervisor.exportHandler = async () => {
        now = scenario.completedAt;
        return {
          status: "succeeded",
          close: { status: "exited", exitCode: 0 },
        };
      };
      const coordinator = create(supervisor, { now: () => now });
      const terminal = await coordinator.beginCapture(
        request(coordinator.supervisorInstanceId),
        { async accepted() {}, async terminal() {} },
        new AbortController().signal,
      );
      assert.equal(terminal.outcome.status, scenario.expected);
      if (scenario.completedAt === 301) {
        assert.equal(terminal.outcome.status, "invalid");
        if (terminal.outcome.status === "invalid") {
          assert.equal(terminal.outcome.reason, "window_expired");
        }
      }
    });
  }
});

test("post-recovery monotonic check rejects health beyond the exact cutoff", async (t) => {
  for (const scenario of [
    { completedAt: 500, expected: "captured" },
    { completedAt: 501, expected: "recovery-failed" },
  ] as const) {
    await t.test(`${scenario.completedAt}ms`, async () => {
      let now = 0;
      const supervisor = new FakeSupervisor();
      supervisor.startHandler = async () => {
        now = scenario.completedAt;
      };
      const coordinator = create(supervisor, { now: () => now });
      const terminal = await coordinator.beginCapture(
        request(coordinator.supervisorInstanceId),
        { async accepted() {}, async terminal() {} },
        new AbortController().signal,
      );
      assert.equal(terminal.outcome.status, scenario.expected);
      if (scenario.completedAt === 501) {
        assert.deepEqual(terminal.outcome, {
          status: "recovery-failed",
          reason: "recovery_expired",
        });
      }
    });
  }
});

test("shutdown and recovery share one delayed terminal delivery", async () => {
  const supervisor = new FakeSupervisor();
  const recoveryStarted = Promise.withResolvers<void>();
  const releaseRecovery = Promise.withResolvers<void>();
  const terminalStarted = Promise.withResolvers<void>();
  const releaseTerminal = Promise.withResolvers<void>();
  supervisor.startHandler = async () => {
    recoveryStarted.resolve();
    await releaseRecovery.promise;
  };
  const coordinator = create(supervisor);
  let terminalCalls = 0;
  const capture = coordinator.beginCapture(
    request(coordinator.supervisorInstanceId),
    {
      async accepted() {},
      async terminal() {
        ++terminalCalls;
        terminalStarted.resolve();
        await releaseTerminal.promise;
      },
    },
    new AbortController().signal,
  );
  await recoveryStarted.promise;
  const shutdown = coordinator.beginSupervisorShutdown();
  await terminalStarted.promise;
  assert.equal(terminalCalls, 1);
  releaseRecovery.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(terminalCalls, 1);
  releaseTerminal.resolve();
  await shutdown;
  const terminal = await capture;
  assert.equal(terminalCalls, 1);
  assert.deepEqual(terminal.outcome, { status: "supervisor-shutdown" });
  const status = coordinator.getWindowStatus(
    coordinator.supervisorInstanceId,
    terminal.identity.captureWindowId,
  );
  assert.equal(status.type, "terminal");
  if (status.type === "terminal") {
    assert.deepEqual(status.outcome, { status: "supervisor-shutdown" });
  }
});

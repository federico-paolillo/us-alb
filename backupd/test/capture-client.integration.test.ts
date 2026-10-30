import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type {
  CaptureAcceptedRecord,
  CaptureIdentity,
  CaptureRequest,
  CaptureServiceStatus,
  CaptureTerminalRecord,
  CaptureWindowStatus,
} from "../../strapid/src/capture-contract.ts";
import {
  CaptureAdmissionError,
  type CaptureResponseObserver,
} from "../../strapid/src/capture-coordinator.ts";
import {
  type CaptureHttpCoordinator,
  startCaptureHttpServer,
} from "../../strapid/src/capture-http.ts";
import {
  CaptureAdmissionRejectedError,
  CaptureClientProtocolError,
  createCaptureClient,
} from "../src/capture-client.ts";

const supervisorInstanceId = "11111111-1111-4111-8111-111111111111";
const captureWindowId = "22222222-2222-4222-8222-222222222222";

function identity(): CaptureIdentity {
  return {
    supervisorInstanceId,
    captureWindowId,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    nodeVersion: process.version,
    strapiVersion: "5.52.0",
  };
}

function captureRequest(): CaptureRequest {
  return {
    version: 1,
    captureWindowId,
    expectedSupervisorInstanceId: supervisorInstanceId,
    expectedReleaseId: "release-1",
    expectedSourceVolumeId: "source-1",
    expectedNodeVersion: process.version,
    expectedStrapiVersion: "5.52.0",
    archiveBasePath: "/staging/b04-client/export",
  };
}

class FixtureCoordinator implements CaptureHttpCoordinator {
  terminal?: CaptureTerminalRecord;
  disconnected = false;
  cancelled = false;
  active = false;
  readonly completed = Promise.withResolvers<void>();

  async getServiceStatus(): Promise<CaptureServiceStatus> {
    return {
      version: 1,
      runtimeReady: true,
      supervisorInstanceId,
      releaseId: "release-1",
      sourceVolumeId: "source-1",
      nodeVersion: process.version,
      strapiVersion: "5.52.0",
      supervisorState: "serving",
      healthyServing: true,
      budget: {
        totalWindowMs: 900_000,
        servingShutdownMs: 60_000,
        exportExecutionMs: 600_000,
        exporterTerminationMs: 30_000,
        recoveryMs: 210_000,
        forcedConfirmationMs: 5_000,
      },
    };
  }

  async beginCapture(
    request: CaptureRequest,
    observer: CaptureResponseObserver,
  ): Promise<CaptureTerminalRecord> {
    this.active = true;
    const accepted: CaptureAcceptedRecord = {
      version: 1,
      type: "accepted",
      identity: identity(),
      archiveBasePath: request.archiveBasePath,
      startedAt: "2026-10-29T00:00:00.000Z",
      deadlineAt: "2026-10-29T00:15:00.000Z",
      acceptedAt: "2026-10-29T00:00:01.000Z",
    };
    await observer.accepted(accepted);
    await new Promise((resolve) => setTimeout(resolve, 30));
    this.terminal = {
      version: 1,
      type: "terminal",
      identity: identity(),
      archiveBasePath: request.archiveBasePath,
      startedAt: accepted.startedAt,
      deadlineAt: accepted.deadlineAt,
      acceptedAt: accepted.acceptedAt,
      completedAt: "2026-10-29T00:00:03.000Z",
      outcome:
        this.disconnected || this.cancelled
          ? {
              status: "invalid",
              reason: this.disconnected
                ? "client_disconnected"
                : "client_cancelled",
              servingRecoveredAt: "2026-10-29T00:00:03.000Z",
            }
          : {
              status: "captured",
              exportClosedAt: "2026-10-29T00:00:02.000Z",
              servingRecoveredAt: "2026-10-29T00:00:03.000Z",
            },
    };
    this.active = false;
    try {
      await observer.terminal(this.terminal);
    } catch {
      // Reconciliation remains authoritative after a lost response.
    }
    this.completed.resolve();
    return this.terminal;
  }

  getWindowStatus(instance: string, window: string): CaptureWindowStatus {
    if (instance !== supervisorInstanceId) {
      return {
        version: 1,
        type: "unusable",
        reason: "supervisor_replaced",
        currentSupervisorInstanceId: supervisorInstanceId,
      };
    }
    if (window !== captureWindowId || this.terminal === undefined) {
      if (window === captureWindowId && this.active) {
        return {
          version: 1,
          type: "active",
          identity: identity(),
          archiveBasePath: "/staging/b04-client/export",
          phase: "exporting",
        };
      }
      return {
        version: 1,
        type: "unusable",
        reason: "unknown_window",
        currentSupervisorInstanceId: supervisorInstanceId,
      };
    }
    return this.terminal;
  }

  cancel(instance: string, window: string): boolean {
    if (
      instance !== supervisorInstanceId ||
      window !== captureWindowId ||
      !this.active
    ) {
      return false;
    }
    this.cancelled = true;
    return true;
  }

  disconnect(): void {
    this.disconnected = true;
  }
}

class RejectingFixtureCoordinator extends FixtureCoordinator {
  private readonly rejections = [
    new CaptureAdmissionError(409, "capture_busy"),
    new CaptureAdmissionError(503, "serving_unavailable"),
  ];

  override async beginCapture(): Promise<never> {
    throw this.rejections.shift() ?? new Error("unexpected capture request");
  }
}

test("real Unix transport decodes exact 409 and 503 capture admission rejections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b08-client-rejection-"));
  const socketPath = join(directory, "s.sock");
  const responses = [
    { statusCode: 409, reason: "capture_busy" },
    { statusCode: 503, reason: "serving_unavailable" },
  ] as const;
  const server = await startCaptureHttpServer(
    socketPath,
    new RejectingFixtureCoordinator(),
  );
  const client = createCaptureClient({ socketPath });
  try {
    for (const fixture of responses) {
      await assert.rejects(
        client.startCapture(captureRequest()),
        (error: unknown) =>
          error instanceof CaptureAdmissionRejectedError &&
          error.statusCode === fixture.statusCode &&
          error.reason === fixture.reason,
      );
    }
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("trailing bytes after a declared rejection body dominate provisional admission rejection", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b08-client-trailing-"));
  const socketPath = join(directory, "s.sock");
  const body = Buffer.from('{"version":1,"error":"capture_busy"}');
  const server = createNetServer((socket) => {
    let requestBytes = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      requestBytes = Buffer.concat([requestBytes, chunk]);
      if (!requestBytes.includes(Buffer.from("\r\n\r\n"))) return;
      socket.removeAllListeners("data");
      socket.end(
        Buffer.concat([
          Buffer.from(
            `HTTP/1.1 409 Conflict\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`,
          ),
          body,
          Buffer.from("X"),
        ]),
      );
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  const client = createCaptureClient({ socketPath });
  try {
    await assert.rejects(
      client.startCapture(captureRequest()),
      (error: unknown) => !(error instanceof CaptureAdmissionRejectedError),
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      ),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

test("malformed rejection transport remains ownership-ambiguous", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b08-client-ambiguous-"));
  const socketPath = join(directory, "s.sock");
  const fixtures: Array<{
    statusCode: number;
    body: Buffer;
    truncate?: boolean;
  }> = [
    {
      statusCode: 400,
      body: Buffer.from('{"version":1,"error":"invalid_request"}'),
    },
    {
      statusCode: 409,
      body: Buffer.from('{"version":1,"error":"capture_busy","extra":true}'),
    },
    { statusCode: 409, body: Buffer.from([0xff]) },
    { statusCode: 409, body: Buffer.alloc(16 * 1024 + 1, 0x20) },
    {
      statusCode: 409,
      body: Buffer.from('{"version":1,"error":"capture_busy"}'),
      truncate: true,
    },
  ];
  let requestCount = 0;
  const server = createServer((request, response) => {
    request.resume();
    request.once("end", () => {
      const fixture = fixtures[requestCount++] ?? assert.fail("extra request");
      response.writeHead(fixture.statusCode, {
        "Content-Type": "application/json",
        "Content-Length": fixture.body.length + (fixture.truncate ? 1 : 0),
        Connection: "close",
      });
      if (fixture.truncate) {
        const socket = response.socket;
        response.write(fixture.body, () => socket?.destroy());
      } else {
        response.end(fixture.body);
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  const client = createCaptureClient({ socketPath });
  try {
    for (const _fixture of fixtures) {
      await assert.rejects(
        client.startCapture(captureRequest()),
        (error: unknown) => !(error instanceof CaptureAdmissionRejectedError),
      );
    }
    assert.equal(requestCount, fixtures.length);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      ),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

test("real Unix transport holds accepted/terminal records and reconciles exact identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b04-http-"));
  const socketPath = join(directory, "s.sock");
  const coordinator = new FixtureCoordinator();
  const server = await startCaptureHttpServer(socketPath, coordinator);
  const client = createCaptureClient({
    socketPath,
    requestTimeoutMs: 500,
    captureTimeoutMs: 1_000,
  });
  try {
    assert.equal((await stat(socketPath)).mode & 0o777, 0o660);
    const status = await client.getStatus();
    assert.equal(status.runtimeReady, true);
    const accepted: CaptureAcceptedRecord[] = [];
    const terminal = await client.startCapture(captureRequest(), {
      onAccepted: (record) => accepted.push(record),
    });
    assert.equal("type" in terminal && terminal.type, "terminal");
    assert.equal(accepted.length, 1);
    if ("type" in terminal) assert.equal(terminal.outcome.status, "captured");
    const reconciled = await client.reconcile(identity());
    assert.equal(reconciled.type, "terminal");
    const replaced = await client.reconcile({
      ...identity(),
      supervisorInstanceId: "33333333-3333-4333-8333-333333333333",
    });
    assert.deepEqual(replaced, {
      version: 1,
      type: "unusable",
      reason: "supervisor_replaced",
      currentSupervisorInstanceId: supervisorInstanceId,
    });
  } finally {
    await server.close();
    await assert.rejects(access(socketPath), { code: "ENOENT" });
    await rm(directory, { recursive: true, force: true });
  }
});

test("real Unix capture transports only validated W3C trace context", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b09-trace-context-"));
  const socketPath = join(directory, "s.sock");
  const observed: Array<{
    readonly traceparent?: string;
    readonly tracestate?: string;
  }> = [];
  const server = await startCaptureHttpServer(
    socketPath,
    new FixtureCoordinator(),
    {
      async runCapture(headers, operation) {
        observed.push(headers);
        return await operation();
      },
    },
  );
  const client = createCaptureClient({
    socketPath,
    traceHeaders: () => ({
      traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
      tracestate: "vendor=value",
    }),
  });
  try {
    await client.startCapture(captureRequest());
    assert.deepEqual(observed, [
      {
        traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
        tracestate: "vendor=value",
      },
    ]);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("abrupt Unix transport loss rejects a terminal followed by partial trailing data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b04-client-loss-"));
  const socketPath = join(directory, "s.sock");
  const server = createServer((request, response) => {
    request.once("end", () => {
      const accepted = {
        version: 1,
        type: "accepted",
        identity: identity(),
        archiveBasePath: captureRequest().archiveBasePath,
        startedAt: "2026-10-29T00:00:00.000Z",
        deadlineAt: "2026-10-29T00:15:00.000Z",
        acceptedAt: "2026-10-29T00:00:01.000Z",
      };
      const terminal = {
        version: 1,
        type: "terminal",
        identity: identity(),
        archiveBasePath: captureRequest().archiveBasePath,
        startedAt: accepted.startedAt,
        deadlineAt: accepted.deadlineAt,
        acceptedAt: accepted.acceptedAt,
        completedAt: "2026-10-29T00:00:03.000Z",
        outcome: {
          status: "captured",
          exportClosedAt: "2026-10-29T00:00:02.000Z",
          servingRecoveredAt: "2026-10-29T00:00:03.000Z",
        },
      };
      const body = `${JSON.stringify(accepted)}\n${JSON.stringify(terminal)}\n{"type"`;
      const socket = response.socket;
      response.writeHead(200, {
        "Content-Type": "application/x-ndjson",
        "Content-Length": Buffer.byteLength(body) + 1,
        Connection: "close",
      });
      response.write(body, () => socket?.destroy());
    });
    request.resume();
  });
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(socketPath, () => {
      server.off("error", onError);
      resolve();
    });
  });
  const client = createCaptureClient({
    socketPath,
    requestTimeoutMs: 500,
    captureTimeoutMs: 1_000,
  });
  try {
    await assert.rejects(
      client.startCapture(captureRequest()),
      CaptureClientProtocolError,
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
    await rm(directory, { recursive: true, force: true });
  }
});

test("premature requester cancellation is non-authorizing and recovery remains reconcilable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b04-http-"));
  const socketPath = join(directory, "s.sock");
  const coordinator = new FixtureCoordinator();
  const server = await startCaptureHttpServer(socketPath, coordinator);
  const client = createCaptureClient({
    socketPath,
    requestTimeoutMs: 500,
    captureTimeoutMs: 1_000,
  });
  const cancellation = new AbortController();
  try {
    const resultPromise = client.startCapture(captureRequest(), {
      signal: cancellation.signal,
      onAccepted: () => cancellation.abort(),
    });
    const result = await resultPromise;
    assert.deepEqual(result, {
      status: "reconciliation-required",
      identity: identity(),
    });
    await coordinator.completed.promise;
    const reconciled = await client.reconcile(identity());
    assert.equal(reconciled.type, "terminal");
    if (reconciled.type === "terminal") {
      assert.deepEqual(reconciled.outcome, {
        status: "invalid",
        reason: "client_disconnected",
        servingRecoveredAt: "2026-10-29T00:00:03.000Z",
      });
    }
  } finally {
    cancellation.abort();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("explicit DELETE cancellation invalidates the exact active window", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b04-http-"));
  const socketPath = join(directory, "s.sock");
  const coordinator = new FixtureCoordinator();
  const server = await startCaptureHttpServer(socketPath, coordinator);
  const client = createCaptureClient({
    socketPath,
    requestTimeoutMs: 500,
    captureTimeoutMs: 1_000,
  });
  try {
    const terminal = await client.startCapture(captureRequest(), {
      onAccepted: () => {
        void client.cancel(identity());
      },
    });
    assert.equal("type" in terminal && terminal.type, "terminal");
    if ("type" in terminal) {
      assert.deepEqual(terminal.outcome, {
        status: "invalid",
        reason: "client_cancelled",
        servingRecoveredAt: "2026-10-29T00:00:03.000Z",
      });
    }
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("Unix server rejects an oversized declared JSON request before admission", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b04-http-"));
  const socketPath = join(directory, "s.sock");
  const coordinator = new FixtureCoordinator();
  const server = await startCaptureHttpServer(socketPath, coordinator);
  try {
    const statusCode = await new Promise<number>((resolve, reject) => {
      const request = httpRequest(
        {
          socketPath,
          path: "/v1/captures",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": 20_000,
            Connection: "close",
          },
        },
        (response) => {
          response.resume();
          response.once("end", () => resolve(response.statusCode ?? 0));
        },
      );
      request.once("error", reject);
      request.end();
    });
    assert.equal(statusCode, 413);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("Unix server never replaces or deletes a non-socket coordination path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b04-http-"));
  const socketPath = join(directory, "s.sock");
  await writeFile(socketPath, "owned-file");
  try {
    await assert.rejects(
      startCaptureHttpServer(socketPath, new FixtureCoordinator()),
      /not a socket/,
    );
    assert.equal(await readFile(socketPath, "utf8"), "owned-file");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

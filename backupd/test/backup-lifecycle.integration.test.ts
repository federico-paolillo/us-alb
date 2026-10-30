import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type {
  CaptureAcceptedRecord,
  CaptureIdentity,
  CaptureServiceStatus,
  CaptureTerminalRecord,
  CaptureWindowStatus,
} from "../../strapid/src/capture-contract.ts";
import {
  BackupDaemonError,
  createBackupLifecycleCoordinator,
} from "../src/backup-lifecycle.ts";
import {
  CaptureAdmissionRejectedError,
  type CaptureClient,
  CaptureClientProtocolError,
  createCaptureClient,
} from "../src/capture-client.ts";
import type { BackupPublicationConfig } from "../src/object-storage-config.ts";
import { parseSchedulePolicy } from "../src/schedule-policy.ts";
import {
  createSnapshotPublicationRequest,
  type SnapshotPublicationRequest,
  snapshotManifestSha256,
} from "../src/snapshot-manifest.ts";
import type {
  FinalPublicationReconciliation,
  PublishedSnapshot,
  ReconciledSnapshot,
  RemoteObjectEvidence,
  SnapshotPublisher,
} from "../src/snapshot-publisher.ts";
import { SnapshotPublicationError } from "../src/snapshot-publisher.ts";
import type {
  ArchiveSizeWatch,
  ReopenedRetainedArchive,
  StagingAllocation,
  StagingManager,
} from "../src/staging-manager.ts";
import { StagingError } from "../src/staging-policy.ts";
import {
  createStateRepository,
  type StateRepository,
} from "../src/state-repository.ts";
import {
  fixtureArchive,
  fixtureAttribution,
  fixturePolicy,
} from "./snapshot-fixture.ts";

const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const captureWindowId = "22222222-2222-4222-8222-222222222222";
const now = Date.parse("2026-10-29T00:00:05.000Z");

const publicationConfig: BackupPublicationConfig = {
  storage: {
    endpoint: new URL("https://s3.example.test"),
    region: "fr-par",
    bucket: "backups",
    credentials: { accessKeyId: "unused", secretAccessKey: "unused" },
    forcePathStyle: false,
    maximumAttempts: 3,
  },
  attribution: fixtureAttribution,
  publication: fixturePolicy,
};

function identity(): CaptureIdentity {
  return {
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    captureWindowId,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    nodeVersion: "v24.20.0",
    strapiVersion: "5.52.0",
  };
}

function serviceStatus(): CaptureServiceStatus {
  return {
    version: 1,
    runtimeReady: true,
    supervisorInstanceId: identity().supervisorInstanceId,
    releaseId: identity().releaseId,
    sourceVolumeId: identity().sourceVolumeId,
    nodeVersion: identity().nodeVersion,
    strapiVersion: identity().strapiVersion,
    supervisorState: "serving",
    healthyServing: true,
    budget: {
      totalWindowMs: 900_000,
      servingShutdownMs: 30_000,
      exportExecutionMs: 780_000,
      exporterTerminationMs: 30_000,
      recoveryMs: 50_000,
      forcedConfirmationMs: 10_000,
    },
  };
}

function accepted(allocation: StagingAllocation): CaptureAcceptedRecord {
  return {
    version: 1,
    type: "accepted",
    identity: identity(),
    archiveBasePath: allocation.archiveBasePath,
    startedAt: "2026-10-29T00:00:00.000Z",
    deadlineAt: "2026-10-29T00:15:00.000Z",
    acceptedAt: "2026-10-29T00:00:01.000Z",
  };
}

function terminal(
  allocation: StagingAllocation,
  outcome: CaptureTerminalRecord["outcome"] = {
    status: "captured",
    exportClosedAt: "2026-10-29T00:00:02.000Z",
    servingRecoveredAt: "2026-10-29T00:00:03.000Z",
  },
): CaptureTerminalRecord {
  return {
    ...accepted(allocation),
    type: "terminal",
    completedAt: "2026-10-29T00:00:04.000Z",
    outcome,
  };
}

function allocation(id = runId): StagingAllocation {
  const runDirectory = `/staging/runs/${id}`;
  return {
    runId: id,
    runDirectory,
    archiveBasePath: `${runDirectory}/strapi-export`,
    archivePath: `${runDirectory}/strapi-export.tar`,
  };
}

function evidence(request: SnapshotPublicationRequest): {
  archive: RemoteObjectEvidence;
  manifest: RemoteObjectEvidence;
} {
  return {
    archive: {
      key: request.keys.archiveKey,
      byteLength: request.archive.byteLength,
      contentType: "application/x-tar",
      runId: request.archive.runId,
      captureWindowId: request.archive.capture.identity.captureWindowId,
      kind: "strapi-export-archive",
      contentSha256: request.archive.sha256,
    },
    manifest: {
      key: request.keys.manifestKey,
      byteLength: request.manifestBytes.byteLength,
      contentType: "application/json",
      runId: request.archive.runId,
      captureWindowId: request.archive.capture.identity.captureWindowId,
      kind: "strapi-export-manifest",
      contentSha256: snapshotManifestSha256(request.manifestBytes),
    },
  };
}

class RecordingStaging implements StagingManager {
  readonly events: string[];
  readonly owned = allocation();
  watchCount = 0;
  cleanupCount = 0;
  disposition: "released" | "unconfirmed" = "released";
  startup: ReopenedRetainedArchive = {
    status: "reopened",
    allocation: this.owned,
  };
  assertEmptyFailure: Error | undefined;
  allocationGate: Promise<void> | undefined;
  cleanupFailure: Error | undefined;

  constructor(events: string[]) {
    this.events = events;
  }

  async assertEmptyForStartup(): Promise<void> {
    if (this.assertEmptyFailure !== undefined) throw this.assertEmptyFailure;
  }

  async reopenRetainedArchive(): Promise<ReopenedRetainedArchive> {
    this.events.push("retained-staging-reopened");
    return this.startup;
  }

  async allocate(id: string): Promise<StagingAllocation> {
    this.events.push("staging-capacity-confirmed");
    await this.allocationGate;
    return allocation(id);
  }

  watchCaptureSize(): ArchiveSizeWatch {
    this.watchCount += 1;
    this.events.push("capture-accepted");
    return { violation: undefined, async stop() {} };
  }

  async recordCaptureTerminal(): Promise<"released" | "unconfirmed"> {
    this.events.push("serving-recovered");
    return this.disposition;
  }

  async validateArchive(
    owned: StagingAllocation,
    captured: CaptureTerminalRecord,
  ) {
    this.events.push("archive-validated");
    return fixtureArchive({
      runId: owned.runId,
      archivePath: owned.archivePath,
      capture: captured as ReturnType<typeof fixtureArchive>["capture"],
    });
  }

  async cleanup(): Promise<void> {
    this.cleanupCount += 1;
    this.events.push("staging-cleaned");
    if (this.cleanupFailure !== undefined) throw this.cleanupFailure;
  }
}

class RecordingPublisher implements SnapshotPublisher {
  readonly events: string[];
  publishCount = 0;
  finalResult: FinalPublicationReconciliation | undefined;
  finalMode: "absent" | "archive-confirmed" | "published" | undefined;
  publishFailure: Error | undefined;

  constructor(events: string[]) {
    this.events = events;
  }

  async preflight(): Promise<void> {
    this.events.push("destination-preflight");
  }

  async reconcile(): Promise<ReconciledSnapshot> {
    throw new Error("unexpected direct reconciliation");
  }

  async reconcileFinal(
    request: SnapshotPublicationRequest,
  ): Promise<FinalPublicationReconciliation> {
    this.events.push("final-read-only-reconciliation");
    if (this.finalResult !== undefined) return this.finalResult;
    const remote = evidence(request);
    if (this.finalMode === "published") {
      return {
        status: "published",
        published: {
          status: "already-published",
          request,
          ...remote,
        },
      };
    }
    if (this.finalMode === "archive-confirmed") {
      return { status: "archive-confirmed", archive: remote.archive };
    }
    return { status: "absent" };
  }

  async publish(
    request: SnapshotPublicationRequest,
  ): Promise<PublishedSnapshot> {
    this.publishCount += 1;
    if (this.publishFailure !== undefined) throw this.publishFailure;
    this.events.push("remote-archive-confirmed");
    const remote = evidence(request);
    this.events.push("manifest-confirmed");
    return { status: "published", request, ...remote };
  }
}

function directCapture(
  events: string[],
  outcome?: CaptureTerminalRecord["outcome"],
): CaptureClient {
  return {
    async getStatus() {
      return serviceStatus();
    },
    async startCapture(request, options) {
      const owned = allocation(runId);
      assert.equal(request.archiveBasePath, owned.archiveBasePath);
      options?.onAccepted?.(accepted(owned));
      events.push("export-closed");
      return terminal(owned, outcome);
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel() {},
  };
}

function recordingRepository(
  repository: StateRepository,
  events: string[],
): StateRepository {
  return {
    load: () => repository.load(),
    claimAutomaticAttempt: (...args) =>
      repository.claimAutomaticAttempt(...args),
    skipAutomaticRequest: (...args) => repository.skipAutomaticRequest(...args),
    finishAutomaticAttempt: (...args) =>
      repository.finishAutomaticAttempt(...args),
    async setPendingPublication(...args) {
      const state = await repository.setPendingPublication(...args);
      events.push("pending-state-durable");
      return state;
    },
    claimPendingPublicationAttempt: (...args) =>
      repository.claimPendingPublicationAttempt(...args),
    async recordPublishedSnapshot(...args) {
      const state = await repository.recordPublishedSnapshot(...args);
      events.push("freshness-recorded");
      return state;
    },
    clearPendingWithoutSuccess: (...args) =>
      repository.clearPendingWithoutSuccess(...args),
    reload: () => repository.reload(),
  };
}

async function repositoryFixture(root: string): Promise<StateRepository> {
  return createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
  });
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (condition()) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error("condition was not reached");
}

test("fresh lifecycle preserves outage, durability, cleanup, and freshness ordering", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-success-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const publisher = new RecordingPublisher(events);
  const repository = recordingRepository(await repositoryFixture(root), events);
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events),
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: repository,
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => ({
        status: "skipped",
        reason: "not-ready",
      }),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
      observer: {
        freshnessConfirmed() {
          events.push("freshness-observed");
        },
      },
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "completed",
    );
    assert.deepEqual(events, [
      "destination-preflight",
      "staging-capacity-confirmed",
      "capture-accepted",
      "export-closed",
      "serving-recovered",
      "archive-validated",
      "pending-state-durable",
      "remote-archive-confirmed",
      "manifest-confirmed",
      "staging-cleaned",
      "freshness-recorded",
      "freshness-observed",
    ]);
    assert.equal(staging.watchCount, 1);
    const state = await repository.load();
    assert.equal(state.pendingPublication, null);
    assert.equal(state.lastCompletedSnapshot?.runId, runId);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recoverable publication failure finishes its phase once as pending", async () => {
  const root = await mkdtemp(join(tmpdir(), "b09-lifecycle-pending-phase-"));
  const events: string[] = [];
  const phases: Array<{
    readonly phase: string;
    readonly outcome: string;
  }> = [];
  const runs: string[] = [];
  const publisher = new RecordingPublisher(events);
  publisher.publishFailure = new SnapshotPublicationError(
    "archive_upload_failed",
    "archive-upload",
  );
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events),
      stagingManager: new RecordingStaging(events),
      snapshotPublisher: publisher,
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => ({
        status: "skipped",
        reason: "not-ready",
      }),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
      setTimer: (callback) => callback,
      clearTimer: () => undefined,
      observer: {
        phaseFinished(event) {
          phases.push(event);
        },
        runFinished(event) {
          runs.push(event.outcome);
        },
      },
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "publication-pending",
    );
    assert.equal(coordinator.state, "pending-publication");
    assert.deepEqual(
      phases.filter((event) => event.phase === "publication"),
      [{ phase: "publication", outcome: "pending" }],
    );
    assert.deepEqual(runs, ["publication-pending"]);
    coordinator.stop();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shutdown invalidates a paused allocation before capture admission", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-allocation-stop-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const allocationGate = Promise.withResolvers<void>();
  staging.allocationGate = allocationGate.promise;
  let starts = 0;
  let cancels = 0;
  const capture: CaptureClient = {
    async getStatus() {
      return serviceStatus();
    },
    async startCapture() {
      starts += 1;
      throw new Error("capture must not start");
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel() {
      cancels += 1;
    },
  };
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: capture,
      stagingManager: staging,
      snapshotPublisher: new RecordingPublisher(events),
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => assert.fail("must not dispatch"),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
    });
    await coordinator.classifyStartup();
    const lifecycle = coordinator.runLifecycle(
      { trigger: "manual" },
      new AbortController().signal,
    );
    await waitFor(() => events.includes("staging-capacity-confirmed"));
    coordinator.stop();
    allocationGate.resolve();
    assert.equal(await lifecycle, "retryable-failure");
    await coordinator.waitForIdle();
    assert.equal(starts, 0);
    assert.equal(cancels, 0);
    assert.equal(staging.cleanupCount, 1);
    assert.equal(coordinator.hasTerminalFailure, false);
    assert.equal(coordinator.state, "stopped");
  } finally {
    allocationGate.resolve();
    await rm(root, { recursive: true, force: true });
  }
});

test("paused allocation classifies ownership before shutdown cancellation", async () => {
  for (const fixture of [
    { code: "cleanup_failed", expected: "terminal-failure" },
    { code: "insufficient_capacity", expected: "retryable-failure" },
    { code: "staging_unavailable", expected: "retryable-failure" },
  ] as const) {
    const root = await mkdtemp(
      join(tmpdir(), `b08-lifecycle-allocation-${fixture.code}-`),
    );
    const events: string[] = [];
    const staging = new RecordingStaging(events);
    const allocationGate = Promise.withResolvers<void>();
    staging.allocationGate = allocationGate.promise;
    const allocationFailure = new StagingError(fixture.code);
    const errors: unknown[] = [];
    let starts = 0;
    let cancels = 0;
    const ids = [runId, captureWindowId];
    try {
      const coordinator = createBackupLifecycleCoordinator({
        captureClient: {
          async getStatus() {
            return serviceStatus();
          },
          async startCapture() {
            starts += 1;
            throw new Error("capture must not start");
          },
          async reconcile() {
            throw new Error("unexpected reconciliation");
          },
          async cancel() {
            cancels += 1;
          },
        },
        stagingManager: staging,
        snapshotPublisher: new RecordingPublisher(events),
        stateRepository: await repositoryFixture(root),
        schedulePolicy: parseSchedulePolicy({}),
        publicationConfig,
        dispatchPendingPublication: () => assert.fail("must not dispatch"),
        uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
        now: () => now,
        onError: (error) => errors.push(error),
      });
      await coordinator.classifyStartup();
      const lifecycle = coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      );
      await waitFor(() => events.includes("staging-capacity-confirmed"));
      coordinator.stop();
      allocationGate.reject(allocationFailure);
      assert.equal(await lifecycle, fixture.expected);
      await coordinator.waitForIdle();
      assert.equal(starts, 0);
      assert.equal(cancels, 0);
      assert.equal(staging.cleanupCount, 0);
      if (fixture.expected === "terminal-failure") {
        assert.equal(coordinator.state, "failed");
        assert.equal(coordinator.hasTerminalFailure, true);
        const observed = errors[0];
        assert.ok(observed instanceof BackupDaemonError);
        assert.equal(observed.cause, allocationFailure);
      } else {
        assert.equal(coordinator.state, "stopped");
        assert.equal(coordinator.hasTerminalFailure, false);
        assert.deepEqual(errors, []);
      }
    } finally {
      allocationGate.resolve();
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("capture admission linearizes before shutdown and cancellation owns the exact handle", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-capture-stop-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const terminalGate = Promise.withResolvers<CaptureTerminalRecord>();
  const cancelled: CaptureIdentity[] = [];
  let admitted: CaptureIdentity | undefined;
  const capture: CaptureClient = {
    async getStatus() {
      return serviceStatus();
    },
    async startCapture(request, options) {
      admitted = {
        supervisorInstanceId: request.expectedSupervisorInstanceId,
        captureWindowId: request.captureWindowId,
        releaseId: request.expectedReleaseId,
        sourceVolumeId: request.expectedSourceVolumeId,
        nodeVersion: request.expectedNodeVersion,
        strapiVersion: request.expectedStrapiVersion,
      };
      options?.onAccepted?.(accepted(allocation()));
      return await terminalGate.promise;
    },
    async reconcile() {
      throw new Error("unexpected reconciliation");
    },
    async cancel(cancelledIdentity) {
      cancelled.push({ ...identity(), ...cancelledIdentity });
    },
  };
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: capture,
      stagingManager: staging,
      snapshotPublisher: new RecordingPublisher(events),
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => assert.fail("must not dispatch"),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
    });
    await coordinator.classifyStartup();
    const lifecycle = coordinator.runLifecycle(
      { trigger: "manual" },
      new AbortController().signal,
    );
    await waitFor(() => admitted !== undefined);
    coordinator.stop();
    await waitFor(() => cancelled.length === 1);
    assert.deepEqual(cancelled[0], admitted);
    terminalGate.resolve(
      terminal(allocation(), {
        status: "invalid",
        reason: "client_cancelled",
        servingRecoveredAt: "2026-10-29T00:00:03.000Z",
      }),
    );
    assert.equal(await lifecycle, "terminal-failure");
    await coordinator.waitForIdle();
    assert.equal(staging.cleanupCount, 1);
    assert.equal(coordinator.state, "stopped");
  } finally {
    terminalGate.resolve(terminal(allocation()));
    await rm(root, { recursive: true, force: true });
  }
});

test("definite admission rejection cleans exact staging and stays retryable", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-rejected-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const publisher = new RecordingPublisher(events);
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: {
        async getStatus() {
          return serviceStatus();
        },
        async startCapture() {
          throw new CaptureAdmissionRejectedError(409, "capture_busy");
        },
        async reconcile() {
          throw new Error("unexpected reconciliation");
        },
        async cancel() {},
      },
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => assert.fail("must not dispatch"),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "retryable-failure",
    );
    assert.equal(staging.cleanupCount, 1);
    assert.equal(staging.watchCount, 0);
    assert.equal(publisher.publishCount, 0);
    assert.equal(coordinator.hasTerminalFailure, false);
    assert.equal(coordinator.state, "idle");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("trailing rejection bytes retain allocation and fail the lifecycle closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-trailing-"));
  const socketPath = join(root, "capture.sock");
  const rejectionBody = Buffer.from('{"version":1,"error":"capture_busy"}');
  const server = createNetServer((socket) => {
    let requestBytes = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      requestBytes = Buffer.concat([requestBytes, chunk]);
      if (!requestBytes.includes(Buffer.from("\r\n\r\n"))) return;
      socket.removeAllListeners("data");
      if (requestBytes.toString().startsWith("GET /v1/status ")) {
        const statusBody = Buffer.from(
          JSON.stringify({
            ...serviceStatus(),
            budget: {
              totalWindowMs: 900_000,
              servingShutdownMs: 60_000,
              exportExecutionMs: 600_000,
              exporterTerminationMs: 30_000,
              recoveryMs: 210_000,
              forcedConfirmationMs: 5_000,
            },
          }),
        );
        socket.end(
          Buffer.concat([
            Buffer.from(
              `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${statusBody.length}\r\nConnection: close\r\n\r\n`,
            ),
            statusBody,
          ]),
        );
        return;
      }
      socket.end(
        Buffer.concat([
          Buffer.from(
            `HTTP/1.1 409 Conflict\r\nContent-Type: application/json\r\nContent-Length: ${rejectionBody.length}\r\nConnection: close\r\n\r\n`,
          ),
          rejectionBody,
          Buffer.from("X"),
        ]),
      );
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const publisher = new RecordingPublisher(events);
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: createCaptureClient({ socketPath }),
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => assert.fail("must not dispatch"),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "terminal-failure",
    );
    assert.equal(coordinator.state, "failed");
    assert.equal(staging.cleanupCount, 0);
    assert.equal(staging.watchCount, 0);
    assert.equal(publisher.publishCount, 0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      ),
    );
    await rm(root, { recursive: true, force: true });
  }
});

test("ambiguous admission failure retains staging and rejection cleanup aggregates causes", async () => {
  for (const fixture of ["ambiguous", "cleanup-failure"] as const) {
    const root = await mkdtemp(join(tmpdir(), `b08-lifecycle-${fixture}-`));
    const events: string[] = [];
    const staging = new RecordingStaging(events);
    if (fixture === "cleanup-failure") {
      staging.cleanupFailure = new Error("fixture cleanup failure");
    }
    const errors: unknown[] = [];
    const ids = [runId, captureWindowId];
    try {
      const coordinator = createBackupLifecycleCoordinator({
        captureClient: {
          async getStatus() {
            return serviceStatus();
          },
          async startCapture() {
            if (fixture === "ambiguous") {
              throw new CaptureClientProtocolError("fixture ambiguity");
            }
            throw new CaptureAdmissionRejectedError(503, "shutting_down");
          },
          async reconcile() {
            throw new Error("unexpected reconciliation");
          },
          async cancel() {},
        },
        stagingManager: staging,
        snapshotPublisher: new RecordingPublisher(events),
        stateRepository: await repositoryFixture(root),
        schedulePolicy: parseSchedulePolicy({}),
        publicationConfig,
        dispatchPendingPublication: () => assert.fail("must not dispatch"),
        uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
        now: () => now,
        onError: (error) => errors.push(error),
      });
      await coordinator.classifyStartup();
      assert.equal(
        await coordinator.runLifecycle(
          { trigger: "manual" },
          new AbortController().signal,
        ),
        "terminal-failure",
      );
      assert.equal(coordinator.state, "failed");
      if (fixture === "ambiguous") {
        assert.equal(staging.cleanupCount, 0);
      } else {
        assert.equal(staging.cleanupCount, 1);
        const failure = errors[0];
        assert.ok(failure instanceof BackupDaemonError);
        assert.ok(failure.cause instanceof AggregateError);
        assert.equal(failure.cause.errors.length, 2);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("missing capture acknowledgement reconciles exact acceptance and installs one watcher", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-reconcile-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const publisher = new RecordingPublisher(events);
  let reconciliations = 0;
  const capture: CaptureClient = {
    async getStatus() {
      return serviceStatus();
    },
    async startCapture() {
      return { status: "reconciliation-required", identity: identity() };
    },
    async reconcile(): Promise<CaptureWindowStatus> {
      reconciliations += 1;
      if (reconciliations === 1) {
        const record = accepted(allocation());
        return { ...record, type: "active", phase: "exporting" };
      }
      events.push("export-closed");
      return terminal(allocation());
    },
    async cancel() {},
  };
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: capture,
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => ({
        status: "skipped",
        reason: "not-ready",
      }),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
      setTimer: (callback) => {
        queueMicrotask(callback);
        return callback;
      },
      clearTimer: () => undefined,
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "completed",
    );
    assert.equal(staging.watchCount, 1);
    assert.equal(reconciliations, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recovery failure cleans only released output and never performs remote publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-recovery-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  const publisher = new RecordingPublisher(events);
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events, {
        status: "recovery-failed",
        reason: "serving_recovery_failed",
      }),
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => ({
        status: "skipped",
        reason: "not-ready",
      }),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "terminal-failure",
    );
    assert.equal(publisher.publishCount, 0);
    assert.equal(staging.cleanupCount, 1);
    assert.equal((await coordinatorFixtureState(coordinator)).pending, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writer ownership uncertainty retains staging and fails closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-owner-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  staging.disposition = "unconfirmed";
  const publisher = new RecordingPublisher(events);
  const ids = [runId, captureWindowId];
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events, {
        status: "recovery-failed",
        reason: "export_ownership_unconfirmed",
      }),
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => ({
        status: "skipped",
        reason: "not-ready",
      }),
      uuid: () => ids.shift() ?? assert.fail("unexpected UUID"),
      now: () => now,
    });
    await coordinator.classifyStartup();
    assert.equal(
      await coordinator.runLifecycle(
        { trigger: "manual" },
        new AbortController().signal,
      ),
      "terminal-failure",
    );
    assert.equal(coordinator.state, "failed");
    assert.equal(staging.cleanupCount, 0);
    assert.equal(publisher.publishCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("startup refuses unexplained staging without adoption or deletion", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-orphan-"));
  const events: string[] = [];
  const staging = new RecordingStaging(events);
  staging.assertEmptyFailure = new StagingError("staging_occupied");
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events),
      stagingManager: staging,
      snapshotPublisher: new RecordingPublisher(events),
      stateRepository: await repositoryFixture(root),
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => assert.fail("must not dispatch"),
    });
    await assert.rejects(
      coordinator.classifyStartup(),
      (error: unknown) =>
        error instanceof BackupDaemonError && error.code === "staging-occupied",
    );
    assert.equal(staging.cleanupCount, 0);
    assert.equal(coordinator.state, "failed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("restart preserves the original deadline and expiry reconfirms success before freshness", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-restart-"));
  const events: string[] = [];
  const baseRepository = await repositoryFixture(root);
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  await baseRepository.setPendingPublication(
    request,
    request.archive.capture.acceptedAt ?? assert.fail("acceptedAt required"),
    parseSchedulePolicy({}).automaticRetryDelayMs,
  );
  const original = (await baseRepository.load()).pendingPublication;
  assert.notEqual(original, null);
  const staging = new RecordingStaging(events);
  const publisher = new RecordingPublisher(events);
  publisher.finalMode = "published";
  const repository = recordingRepository(baseRepository, events);
  let timerCallback: (() => void) | undefined;
  let dispatches = 0;
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events),
      stagingManager: staging,
      snapshotPublisher: publisher,
      stateRepository: repository,
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => {
        dispatches += 1;
        return { status: "skipped", reason: "not-ready" };
      },
      now: () => Date.parse(request.publicationDeadlineAt),
      setTimer: (callback) => {
        timerCallback = callback;
        return callback;
      },
      clearTimer: () => undefined,
    });
    assert.deepEqual(await coordinator.classifyStartup(), {
      status: "pending-publication",
      runId,
      archiveStatus: "reopened",
    });
    await coordinator.armPendingPublication();
    assert.notEqual(timerCallback, undefined);
    timerCallback?.();
    timerCallback?.();
    await coordinator.waitForIdle();
    const completed = await repository.load();
    assert.equal(completed.pendingPublication, null);
    assert.equal(completed.lastCompletedSnapshot?.runId, runId);
    assert.equal(dispatches, 0);
    assert.equal(
      events.filter((event) => event === "final-read-only-reconciliation")
        .length,
      1,
    );
    assert.ok(
      events.indexOf("staging-cleaned") < events.indexOf("freshness-recorded"),
    );
    assert.equal(original?.acceptedAt, request.archive.capture.acceptedAt);
    assert.equal(
      original?.publicationDeadlineAt,
      request.publicationDeadlineAt,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("expired absent publication is cleaned and cleared without freshness", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-lifecycle-expired-"));
  const events: string[] = [];
  const repository = await repositoryFixture(root);
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  await repository.setPendingPublication(
    request,
    request.archive.capture.acceptedAt ?? assert.fail("acceptedAt required"),
    parseSchedulePolicy({}).automaticRetryDelayMs,
  );
  const publisher = new RecordingPublisher(events);
  publisher.finalMode = "absent";
  let timerCallback: (() => void) | undefined;
  try {
    const coordinator = createBackupLifecycleCoordinator({
      captureClient: directCapture(events),
      stagingManager: new RecordingStaging(events),
      snapshotPublisher: publisher,
      stateRepository: repository,
      schedulePolicy: parseSchedulePolicy({}),
      publicationConfig,
      dispatchPendingPublication: () => assert.fail("must not dispatch"),
      now: () => Date.parse(request.publicationDeadlineAt),
      setTimer: (callback) => {
        timerCallback = callback;
        return callback;
      },
      clearTimer: () => undefined,
    });
    await coordinator.classifyStartup();
    await coordinator.armPendingPublication();
    timerCallback?.();
    await coordinator.waitForIdle();
    const state = await repository.load();
    assert.equal(state.pendingPublication, null);
    assert.equal(state.lastCompletedSnapshot, null);
    assert.deepEqual(events, [
      "retained-staging-reopened",
      "final-read-only-reconciliation",
      "staging-cleaned",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function coordinatorFixtureState(
  coordinator: ReturnType<typeof createBackupLifecycleCoordinator>,
): Promise<{ pending: boolean }> {
  return { pending: coordinator.state === "pending-publication" };
}

import assert from "node:assert/strict";
import {
  access,
  appendFile,
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type {
  CaptureIdentity,
  CaptureTerminalOutcome,
  CaptureTerminalRecord,
} from "../../strapid/src/capture-contract.ts";
import type { CaptureClient } from "../src/capture-client.ts";
import {
  createStagingManager,
  type StagingAllocation,
} from "../src/staging-manager.ts";
import { StagingError, type StagingPolicy } from "../src/staging-policy.ts";
import { fileArchive } from "./snapshot-fixture.ts";

const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const identity: CaptureIdentity = {
  supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
  captureWindowId: "22222222-2222-4222-8222-222222222222",
  releaseId: "release-1",
  sourceVolumeId: "source-1",
  nodeVersion: "v24.20.0",
  strapiVersion: "5.52.0",
};

function policy(stagingRoot: string): StagingPolicy {
  return {
    stagingRoot,
    minimumFreeBytes: 10n,
    maximumArchiveBytes: 5n,
    metadataMaximumBytes: 1024,
    sizePollIntervalMs: 5,
  };
}

function terminal(
  allocation: StagingAllocation,
  outcome: CaptureTerminalOutcome = {
    status: "captured",
    exportClosedAt: "2026-10-29T00:00:02.000Z",
    servingRecoveredAt: "2026-10-29T00:00:03.000Z",
  },
  terminalIdentity: CaptureIdentity = identity,
): CaptureTerminalRecord {
  return {
    version: 1,
    type: "terminal",
    identity: terminalIdentity,
    archiveBasePath: allocation.archiveBasePath,
    startedAt: "2026-10-29T00:00:00.000Z",
    deadlineAt: "2026-10-29T00:15:00.000Z",
    acceptedAt: "2026-10-29T00:00:01.000Z",
    completedAt: "2026-10-29T00:00:04.000Z",
    outcome,
  };
}

function client(cancel: () => Promise<void>): CaptureClient {
  return {
    async getStatus() {
      throw new Error("unused");
    },
    async startCapture() {
      throw new Error("unused");
    },
    async reconcile() {
      throw new Error("unused");
    },
    cancel,
  };
}

function stagingCode(expected: StagingError["code"]) {
  return (error: unknown) =>
    error instanceof StagingError && error.code === expected;
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for staging observation");
}

test("allocation enforces capacity twice and yields one exact run path", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-allocation-"));
  let capacity = 9n;
  const manager = createStagingManager(policy(root), {
    inspectAvailableBytes: async () => capacity,
  });
  try {
    await assert.rejects(
      manager.allocate("not-a-canonical-uuid"),
      stagingCode("configuration_invalid"),
    );
    await assert.rejects(
      manager.allocate(runId),
      stagingCode("insufficient_capacity"),
    );
    capacity = 10n;
    const allocation = await manager.allocate(runId);
    assert.deepEqual(allocation, {
      runId,
      runDirectory: join(root, "runs", runId),
      archiveBasePath: join(root, "runs", runId, "strapi-export"),
      archivePath: join(root, "runs", runId, "strapi-export.tar"),
    });
    await assert.rejects(
      manager.allocate("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      stagingCode("staging_occupied"),
    );
    await assert.rejects(
      manager.cleanup({ ...allocation }),
      stagingCode("writer_unconfirmed"),
    );
    await manager.cleanup(allocation);
    await assert.rejects(access(allocation.runDirectory), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("second capacity failure removes only the newly-created empty run", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-capacity-race-"));
  let checks = 0;
  const manager = createStagingManager(policy(root), {
    inspectAvailableBytes: async () => {
      checks += 1;
      return checks === 1 ? 10n : 9n;
    },
  });
  try {
    await assert.rejects(
      manager.allocate(runId),
      stagingCode("insufficient_capacity"),
    );
    await assert.rejects(access(join(root, "runs", runId)), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pre-existing staging entries are blocked without adoption or deletion", async () => {
  for (const kind of ["file", "directory", "symlink"] as const) {
    const root = await mkdtemp(join(tmpdir(), `b05-orphan-${kind}-`));
    const runs = join(root, "runs");
    const orphan = join(runs, "orphan");
    try {
      await mkdir(runs);
      if (kind === "file") await writeFile(orphan, "partial");
      else if (kind === "directory") await mkdir(orphan);
      else await symlink(root, orphan);
      const manager = createStagingManager(policy(root), {
        inspectAvailableBytes: async () => 10n,
      });
      await assert.rejects(
        manager.allocate(runId),
        stagingCode("staging_occupied"),
      );
      await access(orphan);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("symlink staging roots and runs directories are never followed", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-symlink-root-"));
  try {
    const realRoot = join(root, "real");
    const linkedRoot = join(root, "linked");
    await mkdir(realRoot);
    await symlink(realRoot, linkedRoot);
    const linkedManager = createStagingManager(policy(linkedRoot), {
      inspectAvailableBytes: async () => 10n,
    });
    await assert.rejects(
      linkedManager.allocate(runId),
      stagingCode("staging_unavailable"),
    );

    const runsTarget = join(root, "runs-target");
    await mkdir(runsTarget);
    await symlink(runsTarget, join(realRoot, "runs"));
    const runsManager = createStagingManager(policy(realRoot), {
      inspectAvailableBytes: async () => 10n,
    });
    await assert.rejects(
      runsManager.allocate(runId),
      stagingCode("staging_unavailable"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("size guard observes an existing file, cancels once, and keeps it until release", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-size-"));
  let cancellations = 0;
  const manager = createStagingManager(policy(root), {
    inspectAvailableBytes: async () => 10n,
  });
  try {
    const allocation = await manager.allocate(runId);
    await writeFile(allocation.archivePath, Buffer.alloc(5));
    const watch = manager.watchCaptureSize(
      allocation,
      identity,
      client(async () => {
        cancellations += 1;
      }),
      () => assert.fail("disconnect fallback was not expected"),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(cancellations, 0);
    await appendFile(allocation.archivePath, Buffer.alloc(1));
    await waitFor(() => watch.violation !== undefined);
    assert.deepEqual(watch.violation, { code: "archive_limit_exceeded" });
    assert.equal(cancellations, 1);
    await access(allocation.archivePath);
    const captured = terminal(allocation);
    assert.equal(
      await manager.recordCaptureTerminal(allocation, captured),
      "released",
    );
    await assert.rejects(
      manager.validateArchive(allocation, captured),
      stagingCode("archive_limit_exceeded"),
    );
    await access(allocation.archivePath);
    await manager.cleanup(allocation);
    await assert.rejects(access(allocation.runDirectory), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cancel failure invokes one disconnect fallback for delayed invalid output", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-disconnect-"));
  let cancellations = 0;
  const disconnections: Error[] = [];
  const manager = createStagingManager(policy(root), {
    inspectAvailableBytes: async () => 10n,
  });
  try {
    const allocation = await manager.allocate(runId);
    const watch = manager.watchCaptureSize(
      allocation,
      identity,
      client(async () => {
        cancellations += 1;
        throw new Error("fixture cancellation failure");
      }),
      (cause) => disconnections.push(cause),
    );
    await mkdir(allocation.archivePath);
    await waitFor(() => watch.violation !== undefined);
    assert.deepEqual(watch.violation, { code: "archive_output_invalid" });
    assert.equal(cancellations, 1);
    assert.equal(disconnections.length, 1);
    assert.equal(disconnections[0] instanceof StagingError, true);
    assert.equal(
      (disconnections[0] as StagingError).code,
      "capture_cancellation_failed",
    );
    const failed = terminal(allocation, {
      status: "invalid",
      reason: "export_cancelled",
      servingRecoveredAt: "2026-10-29T00:00:03.000Z",
    });
    await manager.recordCaptureTerminal(allocation, failed);
    await manager.cleanup(allocation);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("mismatched terminal leaves size cancellation live until an exact terminal arrives", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-mismatch-watch-"));
  let cancellations = 0;
  const manager = createStagingManager(policy(root), {
    inspectAvailableBytes: async () => 10n,
  });
  try {
    const allocation = await manager.allocate(runId);
    await writeFile(allocation.archivePath, Buffer.alloc(5));
    const watch = manager.watchCaptureSize(
      allocation,
      identity,
      client(async () => {
        cancellations += 1;
      }),
      () => assert.fail("disconnect fallback was not expected"),
    );
    const mismatch = terminal(allocation, undefined, {
      ...identity,
      captureWindowId: "33333333-3333-4333-8333-333333333333",
    });
    await assert.rejects(
      manager.recordCaptureTerminal(allocation, mismatch),
      stagingCode("capture_identity_mismatch"),
    );
    await appendFile(allocation.archivePath, Buffer.alloc(1));
    await waitFor(() => watch.violation !== undefined);
    assert.deepEqual(watch.violation, { code: "archive_limit_exceeded" });
    assert.equal(cancellations, 1);

    const exact = terminal(allocation);
    assert.equal(
      await manager.recordCaptureTerminal(allocation, exact),
      "released",
    );
    await assert.rejects(
      manager.validateArchive(allocation, exact),
      stagingCode("archive_limit_exceeded"),
    );
    await manager.cleanup(allocation);
    await assert.rejects(access(allocation.runDirectory), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("mismatch stays unresolved and unsafe terminals permanently block cleanup", async () => {
  for (const outcome of [
    { status: "recovery-failed", reason: "export_ownership_unconfirmed" },
    { status: "supervisor-shutdown" },
  ] as const) {
    const root = await mkdtemp(join(tmpdir(), "b05-unconfirmed-"));
    const manager = createStagingManager(policy(root), {
      inspectAvailableBytes: async () => 10n,
    });
    try {
      const allocation = await manager.allocate(runId);
      manager.watchCaptureSize(
        allocation,
        identity,
        client(async () => undefined),
        () => undefined,
      );
      const mismatch = terminal(allocation, outcome, {
        ...identity,
        captureWindowId: "33333333-3333-4333-8333-333333333333",
      });
      await assert.rejects(
        manager.recordCaptureTerminal(allocation, mismatch),
        stagingCode("capture_identity_mismatch"),
      );
      await assert.rejects(
        manager.cleanup(allocation),
        stagingCode("writer_unconfirmed"),
      );
      assert.equal(
        await manager.recordCaptureTerminal(
          allocation,
          terminal(allocation, outcome),
        ),
        "unconfirmed",
      );
      await assert.rejects(
        manager.cleanup(allocation),
        stagingCode("writer_unconfirmed"),
      );
      await access(allocation.runDirectory);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("cleanup preserves its lease on failure and retries the exact directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-cleanup-"));
  const manager = createStagingManager(policy(root), {
    inspectAvailableBytes: async () => 10n,
  });
  const keep = join(root, "keep");
  try {
    await writeFile(keep, "owned by test root");
    const allocation = await manager.allocate(runId);
    const runs = join(root, "runs");
    await chmod(runs, 0o500);
    await assert.rejects(manager.cleanup(allocation), (error: unknown) => {
      assert.equal(error instanceof StagingError, true);
      assert.equal((error as StagingError).code, "cleanup_failed");
      assert.notEqual((error as StagingError).cause, undefined);
      return true;
    });
    await access(allocation.runDirectory);
    await chmod(runs, 0o700);
    await manager.cleanup(allocation);
    await access(keep);
    await assert.rejects(access(allocation.runDirectory), { code: "ENOENT" });
  } finally {
    await chmod(join(root, "runs"), 0o700).catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

test("startup reopens only the exact retained archive and cleanup keeps exact ownership", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-reopen-"));
  const runs = join(root, "runs");
  const runDirectory = join(runs, runId);
  const archiveBasePath = join(runDirectory, "strapi-export");
  const archivePath = `${archiveBasePath}.tar`;
  try {
    await mkdir(runDirectory, { recursive: true, mode: 0o700 });
    await chmod(runDirectory, 0o700);
    const archive = await fileArchive(archivePath, Buffer.from("archive"), {
      runId,
      capture: {
        ...terminal({
          runId,
          runDirectory,
          archiveBasePath,
          archivePath,
        }),
        archiveBasePath,
        outcome: {
          status: "captured",
          exportClosedAt: "2026-10-29T00:00:02.000Z",
          servingRecoveredAt: "2026-10-29T00:00:03.000Z",
        },
      },
    });
    const manager = createStagingManager(policy(root));
    const reopened = await manager.reopenRetainedArchive(archive);
    assert.equal(reopened.status, "reopened");
    if (reopened.status !== "reopened") throw new Error("expected reopen");
    assert.deepEqual(reopened.allocation, {
      runId,
      runDirectory,
      archiveBasePath,
      archivePath,
    });
    await manager.cleanup(reopened.allocation);
    await assert.rejects(access(runDirectory), { code: "ENOENT" });

    const restarted = createStagingManager(policy(root));
    await assert.rejects(
      restarted.reopenRetainedArchive({
        ...archive,
        archivePath: join(root, "wrong", "strapi-export.tar"),
      }),
      stagingCode("staging_recovery_mismatch"),
    );
    assert.deepEqual(await restarted.reopenRetainedArchive(archive), {
      status: "already-cleaned",
      runId,
    });
    await restarted.assertEmptyForStartup();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("startup never reopens a retained archive whose exact fingerprint changed", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-reopen-changed-"));
  const runDirectory = join(root, "runs", runId);
  const archiveBasePath = join(runDirectory, "strapi-export");
  const archivePath = `${archiveBasePath}.tar`;
  try {
    await mkdir(runDirectory, { recursive: true, mode: 0o700 });
    await chmod(runDirectory, 0o700);
    const archive = await fileArchive(archivePath, Buffer.from("archive"), {
      runId,
      capture: {
        ...terminal({ runId, runDirectory, archiveBasePath, archivePath }),
        archiveBasePath,
        outcome: {
          status: "captured",
          exportClosedAt: "2026-10-29T00:00:02.000Z",
          servingRecoveredAt: "2026-10-29T00:00:03.000Z",
        },
      },
    });
    await appendFile(archivePath, "changed");
    const manager = createStagingManager(policy(root));
    await assert.rejects(
      manager.reopenRetainedArchive(archive),
      stagingCode("staging_recovery_mismatch"),
    );
    await access(archivePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("startup staging classification rejects mismatches without changing residue", async () => {
  const root = await mkdtemp(join(tmpdir(), "b08-reopen-mismatch-"));
  const runs = join(root, "runs");
  const runDirectory = join(runs, runId);
  const archiveBasePath = join(runDirectory, "strapi-export");
  const archivePath = `${archiveBasePath}.tar`;
  try {
    await mkdir(runDirectory, { recursive: true, mode: 0o700 });
    await chmod(runDirectory, 0o700);
    const archive = await fileArchive(archivePath, Buffer.from("archive"), {
      runId,
      capture: {
        ...terminal({ runId, runDirectory, archiveBasePath, archivePath }),
        archiveBasePath,
        outcome: {
          status: "captured",
          exportClosedAt: "2026-10-29T00:00:02.000Z",
          servingRecoveredAt: "2026-10-29T00:00:03.000Z",
        },
      },
    });
    await writeFile(join(runDirectory, "foreign"), "do not delete");
    const manager = createStagingManager(policy(root));
    await assert.rejects(
      manager.reopenRetainedArchive(archive),
      stagingCode("staging_recovery_mismatch"),
    );
    await assert.rejects(
      manager.assertEmptyForStartup(),
      stagingCode("staging_occupied"),
    );
    await access(archivePath);
    await access(join(runDirectory, "foreign"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

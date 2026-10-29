import assert from "node:assert/strict";
import {
  chmod,
  lstat,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parseSchedulePolicy } from "../src/schedule-policy.ts";
import {
  createSnapshotPublicationRequest,
  snapshotManifestSha256,
} from "../src/snapshot-manifest.ts";
import type { PublishedSnapshot } from "../src/snapshot-publisher.ts";
import {
  type ArchiveUploadOperation,
  createSnapshotPublisher,
  type RemoteObjectEvidence,
  type SnapshotStore,
} from "../src/snapshot-publisher.ts";
import {
  createStateRepository,
  StateRepositoryError,
  type StateRepositoryHooks,
} from "../src/state-repository.ts";
import {
  fixtureArchive,
  fixtureAttribution,
  fixturePolicy,
} from "./snapshot-fixture.ts";

function shifted(timestamp: string, milliseconds: number): string {
  return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}

function publishedSnapshot(
  runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  captureOffsetMs = 0,
): PublishedSnapshot {
  const base = fixtureArchive();
  const archiveBasePath = `/staging/runs/${runId}/strapi-export`;
  const request = createSnapshotPublicationRequest(
    fixtureArchive({
      runId,
      archivePath: `${archiveBasePath}.tar`,
      metadata: {
        ...base.metadata,
        createdAt: shifted(base.metadata.createdAt, captureOffsetMs),
      },
      capture: {
        ...base.capture,
        archiveBasePath,
        startedAt: shifted(base.capture.startedAt, captureOffsetMs),
        deadlineAt: shifted(base.capture.deadlineAt, captureOffsetMs),
        acceptedAt: shifted(
          base.capture.acceptedAt ?? base.capture.startedAt,
          captureOffsetMs,
        ),
        completedAt: shifted(base.capture.completedAt, captureOffsetMs),
        outcome: {
          status: "captured",
          exportClosedAt: shifted(
            base.capture.outcome.status === "captured"
              ? base.capture.outcome.exportClosedAt
              : base.capture.startedAt,
            captureOffsetMs,
          ),
          servingRecoveredAt: shifted(
            base.capture.outcome.status === "captured"
              ? base.capture.outcome.servingRecoveredAt
              : base.capture.startedAt,
            captureOffsetMs,
          ),
        },
      },
    }),
    fixtureAttribution,
    fixturePolicy,
  );
  return {
    status: "published",
    request,
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

function completeArchiveEvidence(
  request: PublishedSnapshot["request"],
): RemoteObjectEvidence {
  return {
    key: request.keys.archiveKey,
    byteLength: request.archive.byteLength,
    contentType: "application/x-tar",
    runId: request.archive.runId,
    captureWindowId: request.archive.capture.identity.captureWindowId,
    kind: "strapi-export-archive",
    contentSha256: request.archive.sha256,
    etag: '"archive-etag"',
    versionId: "archive-version",
    checksumAlgorithm: "SHA256",
    checksumType: "COMPOSITE",
    checksumValue: Buffer.from(request.archive.sha256, "hex").toString(
      "base64",
    ),
  };
}

function completeManifestEvidence(
  request: PublishedSnapshot["request"],
): RemoteObjectEvidence {
  const sha256 = snapshotManifestSha256(request.manifestBytes);
  return {
    key: request.keys.manifestKey,
    byteLength: request.manifestBytes.byteLength,
    contentType: "application/json",
    runId: request.archive.runId,
    captureWindowId: request.archive.capture.identity.captureWindowId,
    kind: "strapi-export-manifest",
    contentSha256: sha256,
    etag: '"manifest-etag"',
    versionId: "manifest-version",
    checksumAlgorithm: "SHA256",
    checksumType: "FULL_OBJECT",
    checksumValue: Buffer.from(sha256, "hex").toString("base64"),
  };
}

class ConfirmedSnapshotStore implements SnapshotStore {
  private readonly request: PublishedSnapshot["request"];

  constructor(request: PublishedSnapshot["request"]) {
    this.request = request;
  }

  async preflight(): Promise<void> {}

  async headArchive(): Promise<RemoteObjectEvidence> {
    return completeArchiveEvidence(this.request);
  }

  async headManifest(): Promise<RemoteObjectEvidence> {
    return completeManifestEvidence(this.request);
  }

  async getManifest(): Promise<Uint8Array> {
    return this.request.manifestBytes;
  }

  beginArchiveUpload(): ArchiveUploadOperation {
    throw new Error("already-published fixture must not upload archive");
  }

  async putManifest(): Promise<void> {
    throw new Error("already-published fixture must not upload manifest");
  }
}

async function fixtureRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "b07-state-"));
}

function repository(root: string, hooks?: StateRepositoryHooks) {
  return createStateRepository({
    stateRoot: root,
    publicationPolicy: fixturePolicy,
    hooks,
  });
}

test("missing state is initial until one atomic owner-only transition", async () => {
  const root = await fixtureRoot();
  try {
    const state = repository(root);
    assert.deepEqual(await state.load(), {
      version: 1,
      schedule: { lastClaimedSlot: null, retry: null },
      lastCompletedSnapshot: null,
      pendingPublication: null,
    });
    await assert.rejects(readFile(join(root, "backupd", "state.json")), {
      code: "ENOENT",
    });
    const policy = parseSchedulePolicy({});
    const claim = await state.claimAutomaticAttempt(
      { id: "2026-10-29", dueAt: "2026-10-29T03:00:00.000Z" },
      "2026-10-29T03:01:00.000Z",
      policy,
    );
    assert.equal(claim.attemptsStarted, 1);
    assert.equal(claim.notBefore, "2026-10-29T03:16:00.000Z");
    const directoryStat = await lstat(join(root, "backupd"));
    const fileStat = await lstat(join(root, "backupd", "state.json"));
    assert.equal(directoryStat.mode & 0o777, 0o700);
    assert.equal(fileStat.mode & 0o777, 0o600);
    assert.deepEqual(await readdir(join(root, "backupd")), ["state.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pending publication clears retry, preserves deadline, and freshness needs exact publication", async () => {
  const root = await fixtureRoot();
  try {
    const state = repository(root);
    const policy = parseSchedulePolicy({});
    const slot = {
      id: "2026-10-29",
      dueAt: "2026-10-29T03:00:00.000Z",
    };
    await state.claimAutomaticAttempt(slot, "2026-10-29T03:01:00.000Z", policy);
    const published = publishedSnapshot();
    const pending = await state.setPendingPublication(
      published.request,
      "2026-10-29T00:01:00.000Z",
      900_000,
    );
    assert.equal(pending.schedule.lastClaimedSlot, slot.id);
    assert.equal(pending.schedule.retry, null);
    const restored = await state.claimPendingPublicationAttempt(
      published.request.archive.runId,
      "2026-10-29T00:01:00.000Z",
      900_000,
    );
    assert.equal(
      restored.request.publicationDeadlineAt,
      published.request.publicationDeadlineAt,
    );
    assert.deepEqual(restored.request.keys, published.request.keys);

    assert.deepEqual(
      await state.setPendingPublication(
        published.request,
        "2026-10-29T00:02:00.000Z",
        900_000,
      ),
      await state.load(),
    );

    await assert.rejects(
      state.recordPublishedSnapshot(
        published.request.archive.runId,
        {
          ...published,
          manifest: { ...published.manifest, contentSha256: "0".repeat(64) },
        },
        "2026-10-29T01:00:00.000Z",
      ),
      (error: unknown) =>
        error instanceof StateRepositoryError &&
        error.code === "state_conflict",
    );
    assert.equal((await state.load()).lastCompletedSnapshot, null);
    const completed = await state.recordPublishedSnapshot(
      published.request.archive.runId,
      published,
      "2026-10-29T01:00:00.000Z",
    );
    assert.equal(completed.pendingPublication, null);
    assert.equal(
      completed.lastCompletedSnapshot?.capturedAt,
      published.request.manifest.capture.capturedAt,
    );
    assert.deepEqual(
      await state.recordPublishedSnapshot(
        published.request.archive.runId,
        published,
        "2026-10-29T01:01:00.000Z",
      ),
      completed,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an actual B06 publisher result with complete store evidence advances freshness", async () => {
  const root = await fixtureRoot();
  try {
    const state = repository(root);
    const request = createSnapshotPublicationRequest(
      fixtureArchive(),
      fixtureAttribution,
      fixturePolicy,
    );
    await state.setPendingPublication(
      request,
      "2026-10-29T00:01:00.000Z",
      900_000,
    );
    const published = await createSnapshotPublisher(
      new ConfirmedSnapshotStore(request),
      fixturePolicy,
      { now: () => Date.parse("2026-10-29T00:02:00.000Z") },
    ).publish(request);
    assert.equal(published.status, "already-published");
    assert.equal(published.archive.versionId, "archive-version");
    assert.equal(published.manifest.checksumType, "FULL_OBJECT");

    await assert.rejects(
      state.recordPublishedSnapshot(
        request.archive.runId,
        {
          ...published,
          archive: { ...published.archive, unexpected: true },
        } as PublishedSnapshot,
        "2026-10-29T01:00:00.000Z",
      ),
      (error: unknown) =>
        error instanceof StateRepositoryError &&
        error.code === "state_conflict",
    );
    await assert.rejects(
      state.recordPublishedSnapshot(
        request.archive.runId,
        {
          ...published,
          manifest: { ...published.manifest, etag: 42 },
        } as unknown as PublishedSnapshot,
        "2026-10-29T01:00:00.000Z",
      ),
      (error: unknown) =>
        error instanceof StateRepositoryError &&
        error.code === "state_conflict",
    );
    const completed = await state.recordPublishedSnapshot(
      request.archive.runId,
      published,
      "2026-10-29T01:00:00.000Z",
    );
    assert.equal(completed.pendingPublication, null);
    assert.equal(
      completed.lastCompletedSnapshot?.capturedAt,
      request.manifest.capture.capturedAt,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("clear without success preserves existing freshness", async () => {
  const root = await fixtureRoot();
  try {
    const state = repository(root);
    const published = publishedSnapshot();
    await state.setPendingPublication(
      published.request,
      "2026-10-29T00:01:00.000Z",
      900_000,
    );
    await state.recordPublishedSnapshot(
      published.request.archive.runId,
      published,
      "2026-10-29T01:00:00.000Z",
    );
    const second = publishedSnapshot(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      86_400_000,
    );
    await state.setPendingPublication(
      second.request,
      "2026-10-30T00:01:00.000Z",
      900_000,
    );
    const cleared = await state.clearPendingWithoutSuccess(
      second.request.archive.runId,
      "expired",
    );
    assert.equal(cleared.pendingPublication, null);
    assert.equal(
      cleared.lastCompletedSnapshot?.capturedAt,
      published.request.manifest.capture.capturedAt,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pre-rename failure preserves old state and removes only its temp", async () => {
  const root = await fixtureRoot();
  let fail = false;
  try {
    const state = repository(root, {
      beforeRename: async () => {
        if (fail) throw new Error("injected pre-rename failure");
      },
    });
    const first = {
      id: "2026-10-29",
      dueAt: "2026-10-29T03:00:00.000Z",
    };
    await state.skipAutomaticRequest(first);
    const before = await readFile(join(root, "backupd", "state.json"));
    fail = true;
    await assert.rejects(
      state.skipAutomaticRequest({
        id: "2026-10-30",
        dueAt: "2026-10-30T03:00:00.000Z",
      }),
      (error: unknown) =>
        error instanceof StateRepositoryError &&
        error.code === "state_unavailable",
    );
    assert.deepEqual(
      await readFile(join(root, "backupd", "state.json")),
      before,
    );
    assert.deepEqual(await readdir(join(root, "backupd")), ["state.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("post-rename uncertainty poisons mutations until strict reload", async () => {
  const root = await fixtureRoot();
  let fail = false;
  try {
    const state = repository(root, {
      beforeDirectorySync: async () => {
        if (fail) throw new Error("injected directory sync failure");
      },
    });
    await state.skipAutomaticRequest({
      id: "2026-10-29",
      dueAt: "2026-10-29T03:00:00.000Z",
    });
    fail = true;
    await assert.rejects(
      state.skipAutomaticRequest({
        id: "2026-10-30",
        dueAt: "2026-10-30T03:00:00.000Z",
      }),
      (error: unknown) =>
        error instanceof StateRepositoryError &&
        error.code === "state_durability_unconfirmed",
    );
    await assert.rejects(
      state.skipAutomaticRequest({
        id: "2026-10-31",
        dueAt: "2026-10-31T03:00:00.000Z",
      }),
      (error: unknown) =>
        error instanceof StateRepositoryError &&
        error.code === "state_durability_unconfirmed",
    );
    fail = false;
    assert.equal((await state.reload()).schedule.lastClaimedSlot, "2026-10-30");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("serialized concurrent transitions retain schedule and pending fields", async () => {
  const root = await fixtureRoot();
  try {
    const state = repository(root);
    const published = publishedSnapshot();
    await Promise.all([
      state.skipAutomaticRequest({
        id: "2026-10-29",
        dueAt: "2026-10-29T03:00:00.000Z",
      }),
      state.setPendingPublication(
        published.request,
        "2026-10-29T00:01:00.000Z",
        900_000,
      ),
    ]);
    const current = await state.load();
    assert.equal(current.schedule.lastClaimedSlot, "2026-10-29");
    assert.equal(
      current.pendingPublication?.runId,
      published.request.archive.runId,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("older completion cannot overwrite a newer consumed slot or freshness", async () => {
  const root = await fixtureRoot();
  try {
    const state = repository(root);
    const policy = parseSchedulePolicy({});
    const olderSlot = {
      id: "2026-10-29",
      dueAt: "2026-10-29T03:00:00.000Z",
    };
    const claim = await state.claimAutomaticAttempt(
      olderSlot,
      "2026-10-29T03:01:00.000Z",
      policy,
    );
    await state.skipAutomaticRequest({
      id: "2026-10-30",
      dueAt: "2026-10-30T03:00:00.000Z",
    });
    const afterStaleFinish = await state.finishAutomaticAttempt(
      claim,
      "failed",
    );
    assert.deepEqual(afterStaleFinish.schedule, {
      lastClaimedSlot: "2026-10-30",
      retry: null,
    });

    const newer = publishedSnapshot(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      86_400_000,
    );
    await state.setPendingPublication(
      newer.request,
      "2026-10-30T00:01:00.000Z",
      900_000,
    );
    await state.recordPublishedSnapshot(
      newer.request.archive.runId,
      newer,
      "2026-10-30T01:00:00.000Z",
    );
    const older = publishedSnapshot();
    await state.setPendingPublication(
      older.request,
      "2026-10-29T00:01:00.000Z",
      900_000,
    );
    const completed = await state.recordPublishedSnapshot(
      older.request.archive.runId,
      older,
      "2026-10-29T01:00:00.000Z",
    );
    assert.equal(
      completed.lastCompletedSnapshot?.capturedAt,
      newer.request.manifest.capture.capturedAt,
    );
    assert.equal(completed.pendingPublication, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("symlink, wrong mode, and simulated foreign ownership fail closed", async () => {
  const symlinkRoot = await fixtureRoot();
  const target = await fixtureRoot();
  const modeRoot = await fixtureRoot();
  const fileSymlinkRoot = await fixtureRoot();
  const oversizedRoot = await fixtureRoot();
  try {
    await symlink(target, join(symlinkRoot, "backupd"));
    await assert.rejects(repository(symlinkRoot).load(), StateRepositoryError);

    const modeRepository = repository(modeRoot);
    await modeRepository.skipAutomaticRequest({
      id: "2026-10-29",
      dueAt: "2026-10-29T03:00:00.000Z",
    });
    await chmod(join(modeRoot, "backupd", "state.json"), 0o644);
    await assert.rejects(repository(modeRoot).load(), StateRepositoryError);

    await repository(fileSymlinkRoot).load();
    await symlink(target, join(fileSymlinkRoot, "backupd", "state.json"));
    await assert.rejects(
      repository(fileSymlinkRoot).load(),
      StateRepositoryError,
    );

    await repository(oversizedRoot).load();
    await writeFile(
      join(oversizedRoot, "backupd", "state.json"),
      Buffer.alloc(65_537, 0x20),
      { mode: 0o600 },
    );
    await assert.rejects(
      repository(oversizedRoot).load(),
      StateRepositoryError,
    );

    const currentUid = process.geteuid?.();
    assert.notEqual(currentUid, undefined);
    await assert.rejects(
      createStateRepository({
        stateRoot: modeRoot,
        publicationPolicy: fixturePolicy,
        effectiveUid: (currentUid ?? 0) + 1,
      }).load(),
      StateRepositoryError,
    );
  } finally {
    await rm(symlinkRoot, { recursive: true, force: true });
    await rm(target, { recursive: true, force: true });
    await rm(modeRoot, { recursive: true, force: true });
    await rm(fileSymlinkRoot, { recursive: true, force: true });
    await rm(oversizedRoot, { recursive: true, force: true });
  }
});

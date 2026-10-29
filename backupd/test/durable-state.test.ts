import assert from "node:assert/strict";
import test from "node:test";

import {
  type BackupState,
  createPendingPublicationState,
  DurableStateError,
  decodeBackupState,
  encodeBackupState,
  initialBackupState,
  restorePendingPublicationRequest,
} from "../src/durable-state.ts";
import { createSnapshotPublicationRequest } from "../src/snapshot-manifest.ts";
import {
  fixtureArchive,
  fixtureAttribution,
  fixturePolicy,
} from "./snapshot-fixture.ts";

function stateWithPending(): BackupState {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  return {
    version: 1,
    schedule: {
      lastClaimedSlot: "2026-10-29",
      retry: {
        slot: "2026-10-29",
        attemptsStarted: 1,
        notBefore: "2026-10-29T00:15:00.000Z",
      },
    },
    lastCompletedSnapshot: {
      runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      capturedAt: "2026-10-28T00:00:01.000Z",
      confirmedAt: "2026-10-28T01:00:00.000Z",
      archiveKey:
        "snapshots/v1/example-site/production/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/archive.tar",
      manifestKey:
        "snapshots/v1/example-site/production/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/manifest.json",
    },
    pendingPublication: createPendingPublicationState(
      request,
      "2026-10-29T00:01:00.000Z",
    ),
  };
}

test("initial and complete version-one state round trip canonically", () => {
  assert.deepEqual(decodeBackupState(encodeBackupState(initialBackupState())), {
    version: 1,
    schedule: { lastClaimedSlot: null, retry: null },
    lastCompletedSnapshot: null,
    pendingPublication: null,
  });
  const state = stateWithPending();
  const bytes = encodeBackupState(state);
  assert.equal(Buffer.from(bytes).at(-1), 0x0a);
  assert.deepEqual(decodeBackupState(bytes), state);
});

test("pending state restores B05 bigint identity and exact B06 authority", () => {
  const pending = stateWithPending().pendingPublication;
  assert.ok(pending !== null);
  const restored = restorePendingPublicationRequest(pending, fixturePolicy);
  const original = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  assert.equal(restored.publicationDeadlineAt, original.publicationDeadlineAt);
  assert.deepEqual(restored.keys, original.keys);
  assert.deepEqual(restored.manifest, original.manifest);
  assert.deepEqual(
    Buffer.from(restored.manifestBytes),
    Buffer.from(original.manifestBytes),
  );
  assert.equal(restored.archive.fileIdentity.device, 1n);
  assert.equal(restored.archive.fileIdentity.changedNanoseconds, 4n);
});

test("strict decoder rejects malformed, unknown, duplicate, and noncanonical state", () => {
  const valid = Buffer.from(encodeBackupState(stateWithPending())).toString(
    "utf8",
  );
  const parsed = JSON.parse(valid) as Record<string, unknown>;
  const variants = [
    Buffer.from("not-json\n"),
    Buffer.from(valid.replace('"version":1', '"version":2')),
    Buffer.from(valid.replace('"version":1', '"version":1,"version":1')),
    Buffer.from(JSON.stringify({ ...parsed, extra: true })),
    Buffer.from(` ${valid}`),
    Buffer.alloc(65_537, 0x20),
  ];
  for (const bytes of variants) {
    assert.throws(
      () => decodeBackupState(bytes),
      (error: unknown) =>
        error instanceof DurableStateError && error.code === "state_invalid",
    );
  }
});

test("semantic corruption cannot reset deadline, keys, identity, or freshness", () => {
  const base = stateWithPending();
  assert.ok(base.pendingPublication !== null);
  assert.ok(base.lastCompletedSnapshot !== null);
  const completed = base.lastCompletedSnapshot;
  const variants: BackupState[] = [
    {
      ...base,
      schedule: {
        lastClaimedSlot: "2026-10-29",
        retry: {
          slot: "2026-10-28",
          attemptsStarted: 1,
          notBefore: "2026-10-29T00:15:00.000Z",
        },
      },
    },
    {
      ...base,
      schedule: {
        lastClaimedSlot: "2026-10-29",
        retry: {
          slot: "2026-10-29",
          attemptsStarted: 4,
          notBefore: "2026-10-29T00:15:00.000Z",
        },
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        publicationDeadlineAt: base.pendingPublication.acceptedAt,
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        notBefore: "2026-10-29T00:00:00.000Z",
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        archiveKey: "snapshots/v1/example-site/production/other/archive.tar",
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        archive: {
          ...base.pendingPublication.archive,
          archivePath: "/staging/runs/other/strapi-export.tar",
        },
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        archive: {
          ...base.pendingPublication.archive,
          sha256: "B".repeat(64),
        },
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        archive: {
          ...base.pendingPublication.archive,
          capture: {
            ...base.pendingPublication.archive.capture,
            deadlineAt: "2026-10-29T00:00:03.000Z",
          },
        },
      },
    },
    {
      ...base,
      pendingPublication: {
        ...base.pendingPublication,
        archive: {
          ...base.pendingPublication.archive,
          fileIdentity: {
            ...base.pendingPublication.archive.fileIdentity,
            size: "01",
          },
        },
      },
    },
    {
      ...base,
      lastCompletedSnapshot: {
        ...completed,
        confirmedAt: "2026-10-27T00:00:00.000Z",
      },
    },
    {
      ...base,
      lastCompletedSnapshot: {
        ...completed,
        archiveKey:
          "snapshots/v1/example--site/production/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/archive.tar",
        manifestKey:
          "snapshots/v1/example--site/production/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/manifest.json",
      },
    },
  ];
  for (const state of variants) {
    assert.throws(() => encodeBackupState(state), DurableStateError);
  }
});

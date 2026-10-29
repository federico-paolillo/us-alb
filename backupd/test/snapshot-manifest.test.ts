import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMultipartPartSize,
  createSnapshotPublicationRequest,
  decodeSnapshotManifest,
  deriveSnapshotKeys,
  SnapshotPolicyError,
} from "../src/snapshot-manifest.ts";
import {
  fixtureArchive,
  fixtureAttribution,
  fixturePolicy,
} from "./snapshot-fixture.ts";

test("snapshot request derives immutable keys and every manifest field deterministically", () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  assert.deepEqual(request.keys, {
    archiveKey:
      "snapshots/v1/example-site/production/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/archive.tar",
    manifestKey:
      "snapshots/v1/example-site/production/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/manifest.json",
  });
  assert.equal(request.publicationDeadlineAt, "2026-10-29T06:00:01.000Z");
  assert.deepEqual(request.manifest, {
    version: 1,
    kind: "strapi-export-snapshot",
    runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    site: "example-site",
    environment: "production",
    capture: {
      capturedAt: "2026-10-29T00:00:01.000Z",
      intervalStartedAt: "2026-10-29T00:00:00.000Z",
      intervalCompletedAt: "2026-10-29T00:00:02.000Z",
      servingRecoveredAt: "2026-10-29T00:00:03.000Z",
      supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
      captureWindowId: "22222222-2222-4222-8222-222222222222",
      sourceVolumeId: "source-1",
    },
    application: {
      releaseId: "release-1",
      imageDigest: `sha256:${"a".repeat(64)}`,
      gitRevision: "c57102d433b268363b1e1d7f98f47a32d69ea504",
      nodeVersion: "v24.20.0",
      strapiVersion: "5.52.0",
    },
    archive: {
      format: "strapi-export-tar",
      key: request.keys.archiveKey,
      byteLength: 10,
      sha256: "b".repeat(64),
    },
  });
  assert.equal(Buffer.from(request.manifestBytes).at(-1), 0x0a);
  assert.deepEqual(
    decodeSnapshotManifest(request.manifestBytes),
    request.manifest,
  );
});

test("multipart sizing enforces the Scaleway 1000-part ceiling and exact 75-GiB boundary", () => {
  assert.deepEqual(calculateMultipartPartSize(1), {
    partSize: 5 * 1_048_576,
    partCount: 1,
  });
  assert.deepEqual(calculateMultipartPartSize(80_530_636_800), {
    partSize: 80_740_352,
    partCount: 998,
  });
  const largest = calculateMultipartPartSize(5 * 1_024 * 1_048_576 * 1_000);
  assert.ok(largest.partCount <= 1_000);
  assert.ok(largest.partSize <= 5 * 1_024 * 1_048_576);
  assert.throws(
    () => calculateMultipartPartSize(0),
    (error: unknown) =>
      error instanceof SnapshotPolicyError &&
      error.code === "part_size_invalid",
  );
});

test("manifest construction rejects stale identity, time order, attribution, and unknown decoded fields", () => {
  assert.throws(() =>
    createSnapshotPublicationRequest(
      fixtureArchive({
        metadata: {
          createdAt: "2026-10-29T00:00:00.000Z",
          strapiVersion: "5.51.0",
        },
      }),
      fixtureAttribution,
      fixturePolicy,
    ),
  );
  const reversed = fixtureArchive();
  assert.throws(() =>
    createSnapshotPublicationRequest(
      {
        ...reversed,
        capture: {
          ...reversed.capture,
          acceptedAt: "2026-10-29T00:00:03.000Z",
        },
      },
      fixtureAttribution,
      fixturePolicy,
    ),
  );
  assert.throws(() =>
    deriveSnapshotKeys("../escape", "production", fixtureArchive().runId),
  );
  const valid = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const parsed = JSON.parse(
    Buffer.from(valid.manifestBytes).toString("utf8"),
  ) as Record<string, unknown>;
  parsed.extra = true;
  assert.throws(() =>
    decodeSnapshotManifest(Buffer.from(JSON.stringify(parsed))),
  );
});

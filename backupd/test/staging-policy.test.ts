import assert from "node:assert/strict";
import test from "node:test";

import type {
  CaptureIdentity,
  CaptureTerminalOutcome,
  CaptureTerminalRecord,
} from "../../strapid/src/capture-contract.ts";
import {
  archiveExceedsLimit,
  availableBytes,
  classifyCaptureWriterDisposition,
  DEFAULT_MAXIMUM_ARCHIVE_BYTES,
  DEFAULT_MINIMUM_FREE_BYTES,
  isCapturedArchiveEligible,
  parseStagingPolicy,
  StagingError,
} from "../src/staging-policy.ts";

const identity: CaptureIdentity = {
  supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
  captureWindowId: "22222222-2222-4222-8222-222222222222",
  releaseId: "release-1",
  sourceVolumeId: "source-1",
  nodeVersion: "v24.20.0",
  strapiVersion: "5.52.0",
};

function terminal(outcome: CaptureTerminalOutcome): CaptureTerminalRecord {
  return {
    version: 1,
    type: "terminal",
    identity,
    archiveBasePath: "/staging/runs/run/strapi-export",
    startedAt: "2026-10-29T00:00:00.000Z",
    deadlineAt: "2026-10-29T00:15:00.000Z",
    acceptedAt: "2026-10-29T00:00:01.000Z",
    completedAt: "2026-10-29T00:00:04.000Z",
    outcome,
  };
}

test("staging policy owns exact defaults and decimal configuration bounds", () => {
  const defaults = parseStagingPolicy({});
  assert.equal(defaults.minimumFreeBytes, DEFAULT_MINIMUM_FREE_BYTES);
  assert.equal(defaults.maximumArchiveBytes, DEFAULT_MAXIMUM_ARCHIVE_BYTES);
  assert.equal(defaults.minimumFreeBytes, 100n * 1024n ** 3n);
  assert.equal(defaults.maximumArchiveBytes, 75n * 1024n ** 3n);

  const configured = parseStagingPolicy({
    BACKUPD_STAGING_MIN_FREE_BYTES: "101",
    BACKUPD_ARCHIVE_MAX_BYTES: "100",
  });
  assert.equal(configured.minimumFreeBytes, 101n);
  assert.equal(configured.maximumArchiveBytes, 100n);

  for (const environment of [
    { BACKUPD_STAGING_MIN_FREE_BYTES: "100", BACKUPD_ARCHIVE_MAX_BYTES: "100" },
    { BACKUPD_STAGING_MIN_FREE_BYTES: "99", BACKUPD_ARCHIVE_MAX_BYTES: "100" },
    { BACKUPD_STAGING_MIN_FREE_BYTES: "101", BACKUPD_ARCHIVE_MAX_BYTES: "0" },
    {
      BACKUPD_STAGING_MIN_FREE_BYTES: "+101",
      BACKUPD_ARCHIVE_MAX_BYTES: "100",
    },
    {
      BACKUPD_STAGING_MIN_FREE_BYTES: " 101",
      BACKUPD_ARCHIVE_MAX_BYTES: "100",
    },
    { BACKUPD_STAGING_MIN_FREE_BYTES: "1e3", BACKUPD_ARCHIVE_MAX_BYTES: "100" },
    {
      BACKUPD_STAGING_MIN_FREE_BYTES: `${BigInt(Number.MAX_SAFE_INTEGER) + 1n}`,
      BACKUPD_ARCHIVE_MAX_BYTES: "100",
    },
  ]) {
    assert.throws(
      () => parseStagingPolicy(environment),
      (error: unknown) =>
        error instanceof StagingError && error.code === "configuration_invalid",
    );
  }
});

test("capacity and archive boundaries retain bigint equality semantics", () => {
  assert.equal(availableBytes({ bavail: 25n, bsize: 4n }), 100n);
  assert.equal(availableBytes({ bavail: 25n, bsize: 4n }) >= 100n, true);
  assert.equal(availableBytes({ bavail: 25n, bsize: 4n }) >= 101n, false);
  assert.equal(archiveExceedsLimit(75n, { maximumArchiveBytes: 75n }), false);
  assert.equal(archiveExceedsLimit(76n, { maximumArchiveBytes: 75n }), true);
});

test("writer release classification is exhaustive for current B04 terminals", () => {
  const cases: readonly [CaptureTerminalOutcome, "released" | "unconfirmed"][] =
    [
      [
        {
          status: "captured",
          exportClosedAt: "2026-10-29T00:00:02.000Z",
          servingRecoveredAt: "2026-10-29T00:00:03.000Z",
        },
        "released",
      ],
      [
        {
          status: "invalid",
          reason: "export_failed",
          servingRecoveredAt: "2026-10-29T00:00:03.000Z",
        },
        "released",
      ],
      [
        { status: "recovery-failed", reason: "export_ownership_unconfirmed" },
        "unconfirmed",
      ],
      [
        { status: "recovery-failed", reason: "serving_ownership_unconfirmed" },
        "released",
      ],
      [
        { status: "recovery-failed", reason: "serving_recovery_failed" },
        "released",
      ],
      [{ status: "recovery-failed", reason: "recovery_expired" }, "released"],
      [{ status: "supervisor-shutdown" }, "unconfirmed"],
    ];
  for (const [outcome, expected] of cases) {
    assert.equal(classifyCaptureWriterDisposition(terminal(outcome)), expected);
  }
});

test("captured eligibility requires exact identity and path with no local violation", () => {
  const captured = terminal({
    status: "captured",
    exportClosedAt: "2026-10-29T00:00:02.000Z",
    servingRecoveredAt: "2026-10-29T00:00:03.000Z",
  });
  assert.equal(
    isCapturedArchiveEligible(
      captured,
      identity,
      captured.archiveBasePath,
      undefined,
    ),
    true,
  );
  assert.equal(
    isCapturedArchiveEligible(
      captured,
      { ...identity, captureWindowId: "33333333-3333-4333-8333-333333333333" },
      captured.archiveBasePath,
      undefined,
    ),
    false,
  );
  assert.equal(
    isCapturedArchiveEligible(captured, identity, "/staging/other", undefined),
    false,
  );
  assert.equal(
    isCapturedArchiveEligible(captured, identity, captured.archiveBasePath, {
      code: "archive_limit_exceeded",
    }),
    false,
  );
});

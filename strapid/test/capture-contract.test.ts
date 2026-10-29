import assert from "node:assert/strict";
import test from "node:test";

import {
  CaptureContractError,
  decodeCaptureRequest,
  decodeCaptureTerminalRecord,
  isCaptureEligibleForValidation,
} from "../src/capture-contract.ts";

const identity = {
  supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
  captureWindowId: "22222222-2222-4222-8222-222222222222",
  releaseId: "sha256:release",
  sourceVolumeId: "project_source",
  nodeVersion: "v24.20.0",
  strapiVersion: "5.52.0",
};

test("decodes the exact version-one capture request", () => {
  assert.deepEqual(
    decodeCaptureRequest({
      version: 1,
      captureWindowId: identity.captureWindowId,
      expectedSupervisorInstanceId: identity.supervisorInstanceId,
      expectedReleaseId: identity.releaseId,
      expectedSourceVolumeId: identity.sourceVolumeId,
      expectedNodeVersion: identity.nodeVersion,
      expectedStrapiVersion: identity.strapiVersion,
      archiveBasePath: "/staging/run/export",
    }),
    {
      version: 1,
      captureWindowId: identity.captureWindowId,
      expectedSupervisorInstanceId: identity.supervisorInstanceId,
      expectedReleaseId: identity.releaseId,
      expectedSourceVolumeId: identity.sourceVolumeId,
      expectedNodeVersion: identity.nodeVersion,
      expectedStrapiVersion: identity.strapiVersion,
      archiveBasePath: "/staging/run/export",
    },
  );
});

test("rejects unknown fields, noncanonical identities, and unsafe archive paths", () => {
  const base = {
    version: 1,
    captureWindowId: identity.captureWindowId,
    expectedSupervisorInstanceId: identity.supervisorInstanceId,
    expectedReleaseId: identity.releaseId,
    expectedSourceVolumeId: identity.sourceVolumeId,
    expectedNodeVersion: identity.nodeVersion,
    expectedStrapiVersion: identity.strapiVersion,
    archiveBasePath: "/staging/run/export",
  };
  assert.throws(
    () => decodeCaptureRequest({ ...base, extra: true }),
    CaptureContractError,
  );
  assert.throws(
    () =>
      decodeCaptureRequest({
        ...base,
        captureWindowId: "AAAAAAAA-2222-4222-8222-222222222222",
      }),
    CaptureContractError,
  );
  assert.throws(
    () => decodeCaptureRequest({ ...base, archiveBasePath: "/tmp/export" }),
    CaptureContractError,
  );
});

test("only an exact captured terminal is eligible for B05 validation", () => {
  const captured = decodeCaptureTerminalRecord({
    version: 1,
    type: "terminal",
    identity,
    archiveBasePath: "/staging/run/export",
    startedAt: "2026-10-29T00:00:00.000Z",
    deadlineAt: "2026-10-29T00:15:00.000Z",
    acceptedAt: "2026-10-29T00:00:01.000Z",
    completedAt: "2026-10-29T00:00:03.000Z",
    outcome: {
      status: "captured",
      exportClosedAt: "2026-10-29T00:00:02.000Z",
      servingRecoveredAt: "2026-10-29T00:00:03.000Z",
    },
  });
  assert.equal(isCaptureEligibleForValidation(captured, identity), true);
  assert.equal(
    isCaptureEligibleForValidation(captured, {
      ...identity,
      captureWindowId: "33333333-3333-4333-8333-333333333333",
    }),
    false,
  );
  assert.equal(
    isCaptureEligibleForValidation(
      { ...captured, outcome: { status: "supervisor-shutdown" } },
      identity,
    ),
    false,
  );
});

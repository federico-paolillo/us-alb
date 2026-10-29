import assert from "node:assert/strict";
import test from "node:test";

import {
  CaptureClientProtocolError,
  captureClientTestHooks,
} from "../src/capture-client.ts";

const identity = {
  supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
  captureWindowId: "22222222-2222-4222-8222-222222222222",
  releaseId: "release-1",
  sourceVolumeId: "source-1",
  nodeVersion: "v24.20.0",
  strapiVersion: "5.52.0",
};
const timestamps = {
  startedAt: "2026-10-29T00:00:00.000Z",
  acceptedAt: "2026-10-29T00:00:01.000Z",
  exportClosedAt: "2026-10-29T00:00:02.000Z",
  servingRecoveredAt: "2026-10-29T00:00:03.000Z",
  completedAt: "2026-10-29T00:00:04.000Z",
  deadlineAt: "2026-10-29T00:15:00.000Z",
};
const validBudget = {
  totalWindowMs: 900_000,
  servingShutdownMs: 60_000,
  exportExecutionMs: 600_000,
  exporterTerminationMs: 30_000,
  recoveryMs: 210_000,
  forcedConfirmationMs: 5_000,
};

function acceptedRecord() {
  return {
    version: 1,
    type: "accepted",
    identity,
    archiveBasePath: "/staging/run/export",
    startedAt: timestamps.startedAt,
    deadlineAt: timestamps.deadlineAt,
    acceptedAt: timestamps.acceptedAt,
  };
}

function capturedTerminal() {
  return {
    version: 1,
    type: "terminal",
    identity,
    archiveBasePath: "/staging/run/export",
    startedAt: timestamps.startedAt,
    deadlineAt: timestamps.deadlineAt,
    acceptedAt: timestamps.acceptedAt,
    completedAt: timestamps.completedAt,
    outcome: {
      status: "captured",
      exportClosedAt: timestamps.exportClosedAt,
      servingRecoveredAt: timestamps.servingRecoveredAt,
    },
  };
}

test("client reconstructs only an exact ready or unavailable service status", () => {
  const ready = {
    version: 1,
    runtimeReady: true,
    supervisorInstanceId: identity.supervisorInstanceId,
    releaseId: identity.releaseId,
    sourceVolumeId: identity.sourceVolumeId,
    nodeVersion: identity.nodeVersion,
    strapiVersion: identity.strapiVersion,
    supervisorState: "serving",
    healthyServing: true,
    budget: validBudget,
  };
  assert.deepEqual(captureClientTestHooks.parseServiceStatus(ready), ready);

  for (const malformed of [
    { ...ready, extra: "untrusted" },
    { ...ready, supervisorState: "ready" },
    { ...ready, activeCaptureWindowId: "not-a-uuid" },
    { ...ready, budget: { ...validBudget, totalWindowMs: 1 } },
    { ...ready, budget: { ...validBudget, forcedConfirmationMs: 30_000 } },
  ]) {
    assert.throws(
      () => captureClientTestHooks.parseServiceStatus(malformed),
      CaptureClientProtocolError,
    );
  }

  const unavailable = {
    version: 1,
    runtimeReady: false,
    supervisorInstanceId: identity.supervisorInstanceId,
    reason: "runtime_unavailable",
  };
  assert.deepEqual(
    captureClientTestHooks.parseServiceStatus(unavailable),
    unavailable,
  );
  assert.throws(
    () =>
      captureClientTestHooks.parseServiceStatus({
        ...unavailable,
        releaseId: "must-not-be-present",
      }),
    CaptureClientProtocolError,
  );
});

test("client rejects adversarial captured records and reconstructs the valid shape", () => {
  const terminal = capturedTerminal();
  assert.deepEqual(captureClientTestHooks.parseTerminal(terminal), terminal);

  for (const malformed of [
    { ...terminal, extra: true },
    { ...terminal, identity: { ...identity, extra: true } },
    { ...terminal, acceptedAt: 1 },
    { ...terminal, archiveBasePath: "/tmp/export" },
    { ...terminal, completedAt: "not-a-timestamp" },
    { ...terminal, outcome: { ...terminal.outcome, extra: true } },
    { ...terminal, acceptedAt: undefined },
  ]) {
    assert.throws(
      () => captureClientTestHooks.parseTerminal(malformed),
      CaptureClientProtocolError,
    );
  }
});

test("client enforces terminal outcome variants and optional fields", () => {
  const recoveryFailure = {
    version: 1,
    type: "terminal",
    identity,
    archiveBasePath: "/staging/run/export",
    startedAt: timestamps.startedAt,
    deadlineAt: timestamps.deadlineAt,
    completedAt: timestamps.completedAt,
    outcome: {
      status: "recovery-failed",
      reason: "recovery_expired",
      captureReason: "window_expired",
    },
  };
  assert.deepEqual(
    captureClientTestHooks.parseTerminal(recoveryFailure),
    recoveryFailure,
  );
  assert.throws(
    () =>
      captureClientTestHooks.parseTerminal({
        ...recoveryFailure,
        outcome: {
          ...recoveryFailure.outcome,
          servingRecoveredAt: timestamps.servingRecoveredAt,
        },
      }),
    CaptureClientProtocolError,
  );
  assert.throws(
    () =>
      captureClientTestHooks.parseTerminal({
        ...recoveryFailure,
        outcome: { status: "maybe" },
      }),
    CaptureClientProtocolError,
  );
});

test("client accepts exact active and unusable reconciliation states only", () => {
  const active = {
    version: 1,
    type: "active",
    identity,
    archiveBasePath: "/staging/run/export",
    startedAt: timestamps.startedAt,
    phase: "recovering",
  };
  assert.deepEqual(captureClientTestHooks.parseWindowStatus(active), active);
  const unusable = {
    version: 1,
    type: "unusable",
    reason: "unknown_window",
    currentSupervisorInstanceId: identity.supervisorInstanceId,
  };
  assert.deepEqual(
    captureClientTestHooks.parseWindowStatus(unusable),
    unusable,
  );
  for (const malformed of [
    { ...active, phase: "uploaded" },
    { ...active, acceptedAt: 1 },
    { ...active, acceptedAt: undefined },
    { ...active, extra: true },
    { ...unusable, reason: "latest_window" },
    { ...unusable, identity },
  ]) {
    assert.throws(
      () => captureClientTestHooks.parseWindowStatus(malformed),
      CaptureClientProtocolError,
    );
  }
});

test("NDJSON decoder requires media type, newline framing, and accepted-terminal order", () => {
  assert.doesNotThrow(() =>
    captureClientTestHooks.assertMediaType(
      "application/x-ndjson; charset=utf-8",
      "application/x-ndjson",
    ),
  );
  assert.throws(
    () =>
      captureClientTestHooks.assertMediaType(
        "application/json",
        "application/x-ndjson",
      ),
    CaptureClientProtocolError,
  );

  const accepted = `${JSON.stringify(acceptedRecord())}\n`;
  const terminal = `${JSON.stringify(capturedTerminal())}\n`;
  const decoder = captureClientTestHooks.createNdjsonDecoder(
    identity,
    "/staging/run/export",
  );
  const response = Buffer.from(`${accepted}${terminal}`);
  decoder.push(response.subarray(0, 17));
  decoder.push(response.subarray(17));
  assert.deepEqual(decoder.finish(), capturedTerminal());

  const unterminated = captureClientTestHooks.createNdjsonDecoder(
    identity,
    "/staging/run/export",
  );
  unterminated.push(Buffer.from(JSON.stringify(acceptedRecord())));
  assert.throws(() => unterminated.finish(), CaptureClientProtocolError);

  const capturedWithoutAcceptance = captureClientTestHooks.createNdjsonDecoder(
    identity,
    "/staging/run/export",
  );
  assert.throws(
    () => capturedWithoutAcceptance.push(Buffer.from(terminal)),
    CaptureClientProtocolError,
  );
});

test("transport loss cannot authorize a terminal before all received bytes are framed", () => {
  const accepted = `${JSON.stringify(acceptedRecord())}\n`;
  const terminal = `${JSON.stringify(capturedTerminal())}\n`;
  const complete = captureClientTestHooks.createNdjsonDecoder(
    identity,
    "/staging/run/export",
  );
  complete.push(Buffer.from(`${accepted}${terminal}`));
  assert.deepEqual(complete.terminalAfterTransportLoss(), capturedTerminal());

  const trailing = captureClientTestHooks.createNdjsonDecoder(
    identity,
    "/staging/run/export",
  );
  trailing.push(Buffer.from(`${accepted}${terminal}{"type"`));
  assert.throws(
    () => trailing.terminalAfterTransportLoss(),
    CaptureClientProtocolError,
  );
});

test("client cancellation and identity helpers reject extra and stale data", () => {
  assert.equal(
    captureClientTestHooks.parseCancellationResponse({
      version: 1,
      cancelled: true,
    }),
    true,
  );
  assert.throws(
    () =>
      captureClientTestHooks.parseCancellationResponse({
        version: 1,
        cancelled: true,
        extra: true,
      }),
    CaptureClientProtocolError,
  );
  assert.equal(captureClientTestHooks.sameIdentity(identity, identity), true);
  assert.equal(
    captureClientTestHooks.sameIdentity(identity, {
      ...identity,
      captureWindowId: "33333333-3333-4333-8333-333333333333",
    }),
    false,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  CaptureTimeline,
  DEFAULT_CAPTURE_BUDGET,
  parseCaptureBudget,
  validateCaptureBudget,
} from "../src/capture-budget.ts";

test("default capture allocations preserve the non-resetting 900 second window", () => {
  assert.deepEqual(DEFAULT_CAPTURE_BUDGET, {
    totalWindowMs: 900_000,
    servingShutdownMs: 60_000,
    exportExecutionMs: 600_000,
    exporterTerminationMs: 30_000,
    recoveryMs: 210_000,
    forcedConfirmationMs: 5_000,
  });
  assert.equal(
    DEFAULT_CAPTURE_BUDGET.servingShutdownMs +
      DEFAULT_CAPTURE_BUDGET.exportExecutionMs +
      DEFAULT_CAPTURE_BUDGET.exporterTerminationMs +
      DEFAULT_CAPTURE_BUDGET.recoveryMs,
    DEFAULT_CAPTURE_BUDGET.totalWindowMs,
  );
});

test("phase deadlines retain later reserves and never reallocate early time", () => {
  const timeline = new CaptureTimeline(DEFAULT_CAPTURE_BUDGET, 1_000);
  assert.equal(timeline.deadlines.shutdown, 61_000);
  assert.equal(timeline.exportDeadline(31_000), 631_000);
  assert.equal(timeline.exportDeadline(101_000), 661_000);
  assert.equal(timeline.terminationDeadline(500_000), 530_000);
  assert.equal(timeline.recoveryDeadline(800_000), 901_000);
  assert.equal(timeline.remaining(10_000, 9_900), 100);
  assert.equal(timeline.remaining(10_000, 10_001), 0);
});

test("environment seconds are parsed once and relationship violations fail", () => {
  assert.throws(() =>
    parseCaptureBudget({
      STRAPID_CAPTURE_WINDOW_SECONDS: "9",
      STRAPID_SERVING_SHUTDOWN_SECONDS: "1",
      STRAPID_EXPORT_SECONDS: "4",
      STRAPID_EXPORT_TERMINATION_SECONDS: "1",
      STRAPID_RECOVERY_SECONDS: "3",
      STRAPID_FORCE_CONFIRMATION_SECONDS: "0",
    }),
  );
});

test("malformed and inconsistent policies are rejected", () => {
  assert.throws(() => parseCaptureBudget({ STRAPID_EXPORT_SECONDS: "1.5" }));
  assert.throws(() =>
    validateCaptureBudget({
      ...DEFAULT_CAPTURE_BUDGET,
      totalWindowMs: 1,
    }),
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  LifecycleConflictError,
  transitionLifecycle,
} from "../src/lifecycle-policy.ts";

test("unconfirmed ownership blocks restart until reconfirmed and shutdown is terminal", () => {
  const exporting = transitionLifecycle("stopped", "start-export");
  const failed = transitionLifecycle(exporting, "ownership-unconfirmed");
  assert.equal(failed, "recovery-failed");
  assert.throws(
    () => transitionLifecycle(failed, "start-serving"),
    LifecycleConflictError,
  );

  const recoverable = transitionLifecycle(failed, "owned-exit-reconfirmed");
  assert.equal(recoverable, "recovery-required");
  assert.equal(
    transitionLifecycle(recoverable, "start-serving"),
    "starting-serving",
  );

  const shuttingDown = transitionLifecycle("serving", "shutdown-requested");
  const terminated = transitionLifecycle(shuttingDown, "shutdown-complete");
  assert.equal(terminated, "terminated");
  assert.throws(
    () => transitionLifecycle(terminated, "start-serving"),
    LifecycleConflictError,
  );
});

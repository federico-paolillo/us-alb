import assert from "node:assert/strict";
import test from "node:test";

import {
  createManualRunRequestHandler,
  createRunAdmission,
} from "../src/run-admission.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("first request owns single flight synchronously and skipped work never queues", async () => {
  const admission = createRunAdmission();
  const held = deferred<string>();
  const calls: string[] = [];
  const first = admission.request("scheduled", () => {
    calls.push("scheduled");
    return held.promise;
  });
  const second = admission.request("manual", async () => {
    calls.push("manual");
    return "unexpected";
  });
  assert.equal(first.status, "started");
  assert.deepEqual(second, { status: "skipped", reason: "active" });
  assert.deepEqual(calls, ["scheduled"]);
  held.resolve("done");
  if (first.status === "started") assert.equal(await first.completion, "done");
  assert.deepEqual(calls, ["scheduled"]);
  const third = admission.request("manual", async () => "new");
  assert.equal(third.status, "started");
  if (third.status === "started") assert.equal(await third.completion, "new");
});

test("rejection clears only its generation and stop rejects future work", async () => {
  const admission = createRunAdmission();
  const failure = new Error("fixture failure");
  const request = admission.request("manual", async () => {
    throw failure;
  });
  assert.equal(request.status, "started");
  if (request.status === "started") {
    await assert.rejects(request.completion, (error) => error === failure);
  }
  admission.stop();
  assert.deepEqual(
    admission.request("scheduled", async () => undefined),
    {
      status: "skipped",
      reason: "not-ready",
    },
  );
});

test("manual signal handler observes one started rejection and never queues overlap", async () => {
  const admission = createRunAdmission();
  const held = deferred<void>();
  const errors: unknown[] = [];
  let calls = 0;
  const handler = createManualRunRequestHandler(
    () =>
      admission.request("manual", () => {
        calls += 1;
        return held.promise;
      }),
    (error) => errors.push(error),
  );
  handler();
  handler();
  assert.equal(calls, 1);
  const failure = new Error("manual failed");
  held.reject(failure);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, [failure]);
  assert.equal(calls, 1);
});

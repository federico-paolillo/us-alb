import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HARNESS = fileURLToPath(
  new URL("../fixtures/supervisor-main.ts", import.meta.url),
);

interface HarnessEvent {
  readonly event: string;
  readonly pid?: number;
  readonly starts?: number;
}

function isMissingProcess(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ESRCH"
  );
}

function forceOwnedGroupExit(processGroupId: number): void {
  try {
    process.kill(-processGroupId, "SIGKILL");
  } catch (error) {
    if (!isMissingProcess(error)) {
      throw error;
    }
  }
}

async function waitForReady(child: ChildProcess): Promise<HarnessEvent> {
  assert(child.stdout !== null);
  let buffer = "";
  for await (const chunk of child.stdout) {
    buffer += Buffer.from(chunk).toString("utf8");
    const lineEnd = buffer.indexOf("\n");
    if (lineEnd >= 0) {
      return JSON.parse(buffer.slice(0, lineEnd)) as HarnessEvent;
    }
  }
  throw new Error("Supervisor harness closed before readiness");
}

function waitForClose(child: ChildProcess): Promise<{
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

test(
  "SIGTERM shuts down the serving group without starting a replacement",
  { timeout: 10_000 },
  async () => {
    const harness = spawn(process.execPath, [HARNESS], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    harness.stderr?.resume();
    let servingPid: number | undefined;
    try {
      const ready = await waitForReady(harness);
      assert.equal(ready.event, "ready");
      assert.equal(ready.starts, 1);
      assert.equal(typeof ready.pid, "number");
      servingPid = ready.pid;

      assert.equal(harness.kill("SIGTERM"), true);
      const closed = await waitForClose(harness);
      assert.deepEqual(closed, { code: 0, signal: null });
      assert.throws(
        () => process.kill(servingPid as number, 0),
        (error: unknown) => isMissingProcess(error),
      );
      assert.throws(
        () => process.kill(-(servingPid as number), 0),
        (error: unknown) => isMissingProcess(error),
      );
    } finally {
      if (servingPid !== undefined) {
        forceOwnedGroupExit(servingPid);
      }
      if (harness.exitCode === null && harness.signalCode === null) {
        harness.kill("SIGKILL");
        await waitForClose(harness).catch(() => undefined);
      }
    }
  },
);

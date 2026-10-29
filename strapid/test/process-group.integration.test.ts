import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type {
  ChildCommand,
  ManagedProcessGroup,
  ProcessTerminationBounds,
} from "../src/process-group.ts";
import {
  ChildOutputError,
  ChildSpawnError,
  spawnManagedProcessGroup,
} from "../src/process-group.ts";

const FIXTURE = fileURLToPath(
  new URL("../fixtures/child-process.ts", import.meta.url),
);
const BOUNDS: ProcessTerminationBounds = {
  gracefulTimeoutMs: 250,
  forcedTimeoutMs: 1_000,
  pollIntervalMs: 10,
};

interface FixtureEvent {
  readonly event: string;
  readonly pid?: number;
}

class FixtureEvents {
  private buffer = "";
  private readonly observed: FixtureEvent[] = [];
  private readonly waiters = new Map<
    string,
    Array<(event: FixtureEvent) => void>
  >();

  consume = (chunk: Uint8Array): void => {
    this.buffer += Buffer.from(chunk).toString("utf8");
    while (true) {
      const lineEnd = this.buffer.indexOf("\n");
      if (lineEnd < 0) {
        return;
      }
      const line = this.buffer.slice(0, lineEnd);
      this.buffer = this.buffer.slice(lineEnd + 1);
      const event = JSON.parse(line) as FixtureEvent;
      this.observed.push(event);
      const listeners = this.waiters.get(event.event) ?? [];
      this.waiters.delete(event.event);
      for (const resolve of listeners) {
        resolve(event);
      }
    }
  };

  waitFor(name: string): Promise<FixtureEvent> {
    const existing = this.observed.find((event) => event.event === name);
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
      const listeners = this.waiters.get(name) ?? [];
      listeners.push(resolve);
      this.waiters.set(name, listeners);
    });
  }

  has(name: string): boolean {
    return this.observed.some((event) => event.event === name);
  }
}

function fixtureCommand(
  mode: string,
  arguments_: readonly string[] = [],
  events = new FixtureEvents(),
): { readonly command: ChildCommand; readonly events: FixtureEvents } {
  return {
    command: {
      role: "export",
      executable: process.execPath,
      arguments: [FIXTURE, mode, ...arguments_],
      cwd: process.cwd(),
      environment: { ...process.env },
      output: {
        mode: "pipe",
        onStdout: events.consume,
        onStderr: () => undefined,
      },
    },
    events,
  };
}

function isMissingProcess(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ESRCH"
  );
}

function assertPidMissing(pid: number): void {
  assert.throws(
    () => process.kill(pid, 0),
    (error: unknown) => isMissingProcess(error),
  );
}

function assertGroupMissing(processGroupId: number): void {
  assert.throws(
    () => process.kill(-processGroupId, 0),
    (error: unknown) => isMissingProcess(error),
  );
}

async function processGroupId(pid: number): Promise<number> {
  const stat = await readFile(`/proc/${pid}/stat`, "utf8");
  const match = /^(\d+) \((.*)\) ([A-Z]) (-?\d+) (-?\d+)/.exec(stat);
  assert(match !== null);
  return Number(match[5]);
}

async function cleanOwnedGroup(handle: ManagedProcessGroup | undefined) {
  if (handle === undefined) {
    return;
  }
  try {
    process.kill(-handle.pid, "SIGKILL");
  } catch (error) {
    if (!isMissingProcess(error)) {
      throw error;
    }
  }
  await handle.wait().catch(() => undefined);
}

test("classifies direct close results and preserves spawn and output failures", async (t) => {
  await t.test("zero exit", async () => {
    const { command } = fixtureCommand("exit", ["0"]);
    const child = spawnManagedProcessGroup(command, BOUNDS);
    const result = await child.wait();
    assert.deepEqual(result, {
      close: { status: "exited", exitCode: 0 },
      termination: "natural",
    });
    assertGroupMissing(child.pid);
  });

  await t.test("nonzero exit", async () => {
    const { command } = fixtureCommand("exit", ["7"]);
    const child = spawnManagedProcessGroup(command, BOUNDS);
    const result = await child.wait();
    assert.deepEqual(result.close, { status: "exited", exitCode: 7 });
    assertGroupMissing(child.pid);
  });

  await t.test("signal exit", async () => {
    const { command } = fixtureCommand("signal-self", ["SIGTERM"]);
    const child = spawnManagedProcessGroup(command, BOUNDS);
    const result = await child.wait();
    assert.deepEqual(result.close, { status: "signaled", signal: "SIGTERM" });
    assertGroupMissing(child.pid);
  });

  await t.test("spawn failure", async () => {
    const { command } = fixtureCommand("exit", ["0"]);
    const child = spawnManagedProcessGroup(
      { ...command, executable: "/definitely-missing/node" },
      BOUNDS,
    );
    await assert.rejects(child.wait(), (error: unknown) => {
      assert(error instanceof ChildSpawnError);
      assert(error.cause instanceof Error);
      assert.equal((error.cause as NodeJS.ErrnoException).code, "ENOENT");
      return true;
    });
  });

  await t.test("output failure after safe termination", async () => {
    const { command } = fixtureCommand("idle-graceful");
    const child = spawnManagedProcessGroup(
      {
        ...command,
        output: {
          mode: "pipe",
          onStdout: () => {
            throw new Error("fixture consumer failed");
          },
          onStderr: () => undefined,
        },
      },
      BOUNDS,
    );
    await assert.rejects(child.wait(), ChildOutputError);
    assertGroupMissing(child.pid);
  });
});

test("waits for direct close and inherited output before completing", async () => {
  const { command, events } = fixtureCommand("tail", ["5000"]);
  let child: ManagedProcessGroup | undefined;
  try {
    child = spawnManagedProcessGroup(command, BOUNDS);
    const descendant = await events.waitFor("descendant");
    assert.equal(typeof descendant.pid, "number");

    const result = await child.wait();
    assert.equal(result.termination, "graceful");
    assert.equal(events.has("tail-closed"), true);
    assertPidMissing(descendant.pid as number);
    assertGroupMissing(child.pid);
  } finally {
    await cleanOwnedGroup(child);
  }
});

test("escalates to SIGKILL and confirms the exact fixture group disappeared", async () => {
  const { command, events } = fixtureCommand("ignore-tree");
  let child: ManagedProcessGroup | undefined;
  try {
    child = spawnManagedProcessGroup(command, BOUNDS);
    const descendant = await events.waitFor("descendant");
    await events.waitFor("ready");
    assert.equal(typeof descendant.pid, "number");
    assert.equal(await processGroupId(child.pid), child.pid);
    assert.equal(await processGroupId(descendant.pid as number), child.pid);

    const result = await child.terminate({
      gracefulTimeoutMs: 50,
      forcedTimeoutMs: 1_000,
      pollIntervalMs: 10,
    });
    assert.equal(result.termination, "forced");
    assert.deepEqual(result.close, { status: "signaled", signal: "SIGKILL" });
    assertPidMissing(child.pid);
    assertPidMissing(descendant.pid as number);
    assertGroupMissing(child.pid);
  } finally {
    await cleanOwnedGroup(child);
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  createDailyScheduler,
  type RunLifecycleResult,
} from "../src/daily-scheduler.ts";
import {
  type BackupState,
  cloneBackupState,
  createPendingPublicationState,
  initialBackupState,
} from "../src/durable-state.ts";
import {
  automaticRetryNotBefore,
  parseSchedulePolicy,
  type ScheduledSlot,
  type SchedulePolicy,
} from "../src/schedule-policy.ts";
import { createSnapshotPublicationRequest } from "../src/snapshot-manifest.ts";
import type { PublishedSnapshot } from "../src/snapshot-publisher.ts";
import {
  type AutomaticAttemptClaim,
  type RestoredPendingPublication,
  type StateRepository,
  StateRepositoryError,
} from "../src/state-repository.ts";
import {
  fixtureArchive,
  fixtureAttribution,
  fixturePolicy,
} from "./snapshot-fixture.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

class MemoryRepository implements StateRepository {
  state: BackupState;
  readonly trace: string[] = [];
  failClaim = false;
  beforeLoad?: () => Promise<void>;

  constructor(state: BackupState = initialBackupState()) {
    this.state = cloneBackupState(state);
  }

  async load(): Promise<BackupState> {
    this.trace.push("load");
    await this.beforeLoad?.();
    return cloneBackupState(this.state);
  }

  async claimAutomaticAttempt(
    slot: ScheduledSlot,
    now: string,
    policy: SchedulePolicy,
  ): Promise<AutomaticAttemptClaim> {
    this.trace.push(`claim:${slot.id}`);
    if (this.failClaim) throw new StateRepositoryError("state_unavailable");
    const retry = this.state.schedule.retry;
    const attemptsStarted =
      retry?.slot === slot.id ? retry.attemptsStarted + 1 : 1;
    const notBefore = automaticRetryNotBefore(now, policy);
    this.state = cloneBackupState({
      ...this.state,
      schedule: {
        lastClaimedSlot: slot.id,
        retry: { slot: slot.id, attemptsStarted, notBefore },
      },
    });
    return {
      slot,
      attemptsStarted,
      notBefore,
      maximumAttempts: policy.automaticMaximumAttempts,
    };
  }

  async skipAutomaticRequest(slot: ScheduledSlot): Promise<BackupState> {
    this.trace.push(`skip:${slot.id}`);
    this.state = cloneBackupState({
      ...this.state,
      schedule: { lastClaimedSlot: slot.id, retry: null },
    });
    return this.state;
  }

  async finishAutomaticAttempt(
    claim: AutomaticAttemptClaim,
    outcome: "succeeded" | "failed",
  ): Promise<BackupState> {
    this.trace.push(`finish:${outcome}:${claim.attemptsStarted}`);
    const retry = this.state.schedule.retry;
    this.state = cloneBackupState({
      ...this.state,
      schedule: {
        ...this.state.schedule,
        retry:
          outcome === "failed" &&
          retry !== null &&
          retry.attemptsStarted < claim.maximumAttempts
            ? retry
            : null,
      },
    });
    return this.state;
  }

  async setPendingPublication(): Promise<BackupState> {
    throw new Error("unused");
  }

  async claimPendingPublicationAttempt(
    runId: string,
    now: string,
  ): Promise<RestoredPendingPublication> {
    this.trace.push(`pending-claim:${runId}`);
    const pending = this.state.pendingPublication;
    if (
      pending === null ||
      pending.runId !== runId ||
      Date.parse(now) < Date.parse(pending.notBefore) ||
      Date.parse(now) >= Date.parse(pending.publicationDeadlineAt)
    ) {
      throw new StateRepositoryError("state_not_eligible");
    }
    const request = createSnapshotPublicationRequest(
      fixtureArchive(),
      pending.attribution,
      fixturePolicy,
    );
    return {
      request,
      attemptsStarted: pending.attemptsStarted + 1,
      notBefore: pending.notBefore,
      publicationDeadlineAt: pending.publicationDeadlineAt,
    };
  }

  async recordPublishedSnapshot(
    _runId: string,
    _published: PublishedSnapshot,
    _confirmedAt: string,
  ): Promise<BackupState> {
    throw new Error("unused");
  }

  async clearPendingWithoutSuccess(): Promise<BackupState> {
    throw new Error("unused");
  }

  async reload(): Promise<BackupState> {
    return this.load();
  }
}

class TimerHarness {
  private nextId = 0;
  readonly scheduled = new Map<
    number,
    { callback: () => void; delay: number }
  >();

  set = (callback: () => void, delay: number): number => {
    const id = ++this.nextId;
    this.scheduled.set(id, { callback, delay });
    return id;
  };

  clear = (timer: unknown): void => {
    this.scheduled.delete(timer as number);
  };

  async fireOnly(): Promise<void> {
    assert.equal(this.scheduled.size, 1);
    const entry = [...this.scheduled.entries()][0];
    assert.ok(entry !== undefined);
    this.scheduled.delete(entry[0]);
    entry[1].callback();
    for (let index = 0; index < 5; index += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}

test("startup chooses one newest catch-up and claims before lifecycle", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: { lastClaimedSlot: "2026-10-20", retry: null },
  });
  const timers = new TimerHarness();
  const trace = repository.trace;
  let now = Date.parse("2026-10-29T12:00:00.000Z");
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      trace.push(`lifecycle:${request.trigger}`);
      return "completed";
    },
  });
  await scheduler.start();
  assert.ok(
    trace.indexOf("claim:2026-10-29") <
      trace.indexOf("lifecycle:startup-catch-up"),
  );
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-29");
  assert.equal(repository.state.schedule.retry, null);
  assert.equal(timers.scheduled.size, 1);
  now += 1;
  await scheduler.start();
  assert.equal(
    trace.filter((event) => event.startsWith("lifecycle:")).length,
    1,
  );
});

test("startup before the target catches up only yesterday and arms exact UTC target", async () => {
  const repository = new MemoryRepository();
  const timers = new TimerHarness();
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => Date.parse("2026-10-29T02:59:59.000Z"),
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      return "completed";
    },
  });
  await scheduler.start();
  assert.deepEqual(triggers, ["startup-catch-up"]);
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-28");
  assert.deepEqual(
    [...timers.scheduled.values()].map(({ delay }) => delay),
    [1_000],
  );
});

test("a UTC target crossing during state access is processed immediately", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: { lastClaimedSlot: "2026-10-28", retry: null },
  });
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T02:59:59.999Z");
  let loadCount = 0;
  repository.beforeLoad = async () => {
    loadCount += 1;
    if (loadCount === 1) now = Date.parse("2026-10-29T03:00:00.000Z");
  };
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      return "completed";
    },
  });
  await scheduler.start();
  assert.deepEqual(triggers, ["startup-catch-up"]);
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-29");
  assert.equal(timers.scheduled.size, 1);
  const nextTimer = [...timers.scheduled.values()][0];
  assert.ok(nextTimer !== undefined);
  assert.ok(nextTimer.delay > 0, "the processed slot arms the next UTC day");
});

test("a UTC target crossing during timer arming schedules immediate processing", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: { lastClaimedSlot: "2026-10-28", retry: null },
  });
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T02:59:59.999Z");
  let loadCount = 0;
  repository.beforeLoad = async () => {
    loadCount += 1;
    if (loadCount === 2) now = Date.parse("2026-10-29T03:00:00.000Z");
  };
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      return "completed";
    },
  });
  await scheduler.start();
  assert.deepEqual(triggers, []);
  assert.deepEqual(
    [...timers.scheduled.values()].map(({ delay }) => delay),
    [0],
  );
  await timers.fireOnly();
  assert.deepEqual(triggers, ["scheduled"]);
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-29");
});

test("a fast catch-up crossing the UTC target consumes the new slot before release", async () => {
  const repository = new MemoryRepository();
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T02:59:59.999Z");
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      now = Date.parse("2026-10-29T03:00:00.000Z");
      return "completed";
    },
  });
  await scheduler.start();
  assert.deepEqual(triggers, ["startup-catch-up"]);
  assert.deepEqual(
    repository.trace.filter(
      (event) => event.startsWith("claim:") || event.startsWith("skip:"),
    ),
    ["claim:2026-10-28", "skip:2026-10-29"],
  );
  assert.deepEqual(repository.state.schedule, {
    lastClaimedSlot: "2026-10-29",
    retry: null,
  });
  const nextTimer = [...timers.scheduled.values()][0];
  assert.ok(nextTimer !== undefined);
  assert.ok(nextTimer.delay > 0);
  await timers.fireOnly();
  assert.deepEqual(triggers, ["startup-catch-up"]);
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-29");
});

test("stop invalidates timer arming while its state load is pending", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: { lastClaimedSlot: "2026-10-29", retry: null },
  });
  const timers = new TimerHarness();
  const armLoadStarted = deferred<void>();
  const releaseArmLoad = deferred<void>();
  let loadCount = 0;
  repository.beforeLoad = async () => {
    loadCount += 1;
    if (loadCount === 2) {
      armLoadStarted.resolve();
      await releaseArmLoad.promise;
    }
  };
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => Date.parse("2026-10-29T12:00:00.000Z"),
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async () => "completed",
  });
  const starting = scheduler.start();
  await armLoadStarted.promise;
  scheduler.stop();
  releaseArmLoad.resolve();
  await starting;
  assert.equal(timers.scheduled.size, 0);
  assert.deepEqual(scheduler.requestManual(), {
    status: "skipped",
    reason: "not-ready",
  });
});

test("retry cooldown survives failure and exhausts after the second attempt", async () => {
  const repository = new MemoryRepository();
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T03:01:00.000Z");
  const outcomes: RunLifecycleResult[] = [
    "retryable-failure",
    "terminal-failure",
  ];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async () => outcomes.shift() ?? "terminal-failure",
  });
  await scheduler.start();
  assert.equal(repository.state.schedule.retry?.attemptsStarted, 1);
  assert.equal(timers.scheduled.size, 1);
  assert.deepEqual(
    [...timers.scheduled.values()].map(({ delay }) => delay),
    [900_000],
  );
  now = Date.parse("2026-10-29T03:16:00.000Z");
  await timers.fireOnly();
  assert.equal(repository.state.schedule.retry, null);
  assert.deepEqual(
    repository.trace.filter((event) => event.startsWith("claim:")),
    ["claim:2026-10-29", "claim:2026-10-29"],
  );
});

test("restart honors a persisted cooldown before requesting one retry", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: {
      lastClaimedSlot: "2026-10-29",
      retry: {
        slot: "2026-10-29",
        attemptsStarted: 1,
        notBefore: "2026-10-29T03:16:00.000Z",
      },
    },
  });
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T03:05:00.000Z");
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      return "completed";
    },
  });
  await scheduler.start();
  assert.deepEqual(triggers, []);
  assert.deepEqual(
    [...timers.scheduled.values()].map(({ delay }) => delay),
    [660_000],
  );
  const manual = scheduler.requestManual();
  assert.equal(manual.status, "started");
  if (manual.status === "started") await manual.completion;
  assert.deepEqual(triggers, ["manual"]);
  assert.equal(repository.state.schedule.retry?.attemptsStarted, 1);
  now = Date.parse("2026-10-29T03:16:00.000Z");
  await timers.fireOnly();
  assert.deepEqual(triggers, ["manual", "scheduled-retry"]);
  assert.equal(repository.state.schedule.retry, null);
});

test("daily event during active manual work is consumed and never queued", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: { lastClaimedSlot: "2026-10-29", retry: null },
  });
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T12:00:00.000Z");
  const held = deferred<RunLifecycleResult>();
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      if (request.trigger === "manual") return held.promise;
      return "completed";
    },
  });
  await scheduler.start();
  const manual = scheduler.requestManual();
  assert.equal(manual.status, "started");
  now = Date.parse("2026-10-30T03:00:00.000Z");
  await timers.fireOnly();
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-30");
  assert.deepEqual(triggers, ["manual"]);
  held.resolve("completed");
  if (manual.status === "started") await manual.completion;
  assert.deepEqual(triggers, ["manual"]);
});

test("daily event during active automatic work is consumed without a second lifecycle", async () => {
  const repository = new MemoryRepository();
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T03:01:00.000Z");
  const held = deferred<RunLifecycleResult>();
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      return held.promise;
    },
  });
  const starting = scheduler.start();
  while (timers.scheduled.size === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  now = Date.parse("2026-10-30T03:00:00.000Z");
  await timers.fireOnly();
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-30");
  assert.deepEqual(triggers, ["startup-catch-up"]);
  held.resolve("retryable-failure");
  await starting;
  assert.deepEqual(triggers, ["startup-catch-up"]);
  assert.equal(repository.state.schedule.retry, null);
});

test("a newer UTC day supersedes old retry debt with one newest catch-up", async () => {
  const repository = new MemoryRepository({
    ...initialBackupState(),
    schedule: {
      lastClaimedSlot: "2026-10-28",
      retry: {
        slot: "2026-10-28",
        attemptsStarted: 1,
        notBefore: "2026-10-28T03:16:00.000Z",
      },
    },
  });
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => Date.parse("2026-10-29T12:00:00.000Z"),
    runLifecycle: async (request) => {
      triggers.push(request.trigger);
      return "completed";
    },
  });
  await scheduler.start();
  assert.deepEqual(triggers, ["startup-catch-up"]);
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-29");
  assert.equal(repository.state.schedule.retry, null);
  scheduler.stop();
});

test("pending publication suppresses catch-up and uses original eligibility", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const pending = createPendingPublicationState(
    request,
    "2026-10-29T00:01:00.000Z",
  );
  const repository = new MemoryRepository({
    ...initialBackupState(),
    pendingPublication: pending,
  });
  const timers = new TimerHarness();
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => Date.parse("2026-10-29T05:00:00.000Z"),
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (lifecycle) => {
      triggers.push(lifecycle.trigger);
      return "completed";
    },
  });
  await scheduler.start();
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-29");
  assert.deepEqual(triggers, []);
  const manual = scheduler.requestManual();
  assert.equal(manual.status, "started");
  if (manual.status === "started") {
    assert.deepEqual(await manual.completion, { status: "not-eligible" });
  }
  const pendingRequest = scheduler.requestPendingPublication(
    request.archive.runId,
  );
  assert.equal(pendingRequest.status, "started");
  if (pendingRequest.status === "started") {
    assert.equal((await pendingRequest.completion).status, "finished");
  }
  assert.deepEqual(triggers, ["pending-publication"]);
});

test("daily event during active pending recovery is consumed without queuing capture", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const pending = createPendingPublicationState(
    request,
    "2026-10-29T00:01:00.000Z",
  );
  const repository = new MemoryRepository({
    ...initialBackupState(),
    pendingPublication: pending,
  });
  const timers = new TimerHarness();
  let now = Date.parse("2026-10-29T05:00:00.000Z");
  const held = deferred<RunLifecycleResult>();
  const triggers: string[] = [];
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => now,
    setTimer: timers.set,
    clearTimer: timers.clear,
    runLifecycle: async (lifecycle) => {
      triggers.push(lifecycle.trigger);
      return held.promise;
    },
  });
  await scheduler.start();
  const recovery = scheduler.requestPendingPublication(request.archive.runId);
  assert.equal(recovery.status, "started");
  now = Date.parse("2026-10-30T03:00:00.000Z");
  await timers.fireOnly();
  assert.equal(repository.state.schedule.lastClaimedSlot, "2026-10-30");
  assert.deepEqual(triggers, ["pending-publication"]);
  held.resolve("completed");
  if (recovery.status === "started") await recovery.completion;
  assert.deepEqual(triggers, ["pending-publication"]);
});

test("state claim failure prevents lifecycle and stop prevents future requests", async () => {
  const repository = new MemoryRepository();
  repository.failClaim = true;
  let lifecycleCalls = 0;
  const scheduler = createDailyScheduler({
    policy: parseSchedulePolicy({}),
    stateRepository: repository,
    now: () => Date.parse("2026-10-29T12:00:00.000Z"),
    runLifecycle: async () => {
      lifecycleCalls += 1;
      return "completed";
    },
  });
  await assert.rejects(scheduler.start(), StateRepositoryError);
  assert.equal(lifecycleCalls, 0);
  scheduler.stop();
  scheduler.stop();
  assert.deepEqual(scheduler.requestManual(), {
    status: "skipped",
    reason: "not-ready",
  });
});

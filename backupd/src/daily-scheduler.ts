import {
  createRunAdmission,
  type RunAdmission,
  type RunRequest,
  type RunTrigger,
} from "./run-admission.ts";
import {
  compareSlotIds,
  latestDueSlot,
  nextDailySlot,
  type ScheduledSlot,
  type SchedulePolicy,
} from "./schedule-policy.ts";
import {
  type AutomaticAttemptClaim,
  type RestoredPendingPublication,
  type StateRepository,
  StateRepositoryError,
} from "./state-repository.ts";

export type RunLifecycleResult =
  | "completed"
  | "publication-pending"
  | "retryable-failure"
  | "terminal-failure";

export interface RunLifecycleRequest {
  readonly trigger: RunTrigger;
  readonly automaticClaim?: AutomaticAttemptClaim;
  readonly pendingPublication?: RestoredPendingPublication;
}

export type RunDispatchResult =
  | { readonly status: "not-eligible" }
  | { readonly status: "finished"; readonly result: RunLifecycleResult };

export interface DailyScheduler {
  start(): Promise<void>;
  stop(): void;
  requestManual(): RunRequest<RunDispatchResult>;
  requestPendingPublication(runId: string): RunRequest<RunDispatchResult>;
}

export interface DailySchedulerOptions {
  readonly policy: SchedulePolicy;
  readonly stateRepository: StateRepository;
  readonly runLifecycle: (
    request: RunLifecycleRequest,
  ) => Promise<RunLifecycleResult>;
  readonly admission?: RunAdmission;
  readonly now?: () => number;
  readonly setTimer?: (callback: () => void, delay: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
  readonly onError?: (error: unknown) => void;
}

function isNotEligible(error: unknown): boolean {
  return (
    error instanceof StateRepositoryError && error.code === "state_not_eligible"
  );
}

class DailySchedulerImplementation implements DailyScheduler {
  private readonly policy: SchedulePolicy;
  private readonly stateRepository: StateRepository;
  private readonly runLifecycle: DailySchedulerOptions["runLifecycle"];
  private readonly admission: RunAdmission;
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, delay: number) => unknown;
  private readonly clearTimer: (timer: unknown) => void;
  private readonly onError: (error: unknown) => void;
  private timer: unknown;
  private armGeneration = 0;
  private started = false;
  private stopped = false;

  constructor(options: DailySchedulerOptions) {
    this.policy = options.policy;
    this.stateRepository = options.stateRepository;
    this.runLifecycle = options.runLifecycle;
    this.admission = options.admission ?? createRunAdmission();
    this.now = options.now ?? Date.now;
    this.setTimer =
      options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer =
      options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
    this.onError = options.onError ?? (() => undefined);
  }

  async start(): Promise<void> {
    if (this.started) return;
    if (this.stopped) return;
    this.started = true;
    try {
      await this.tick(true);
      await this.armTimer();
    } catch (error) {
      this.started = false;
      this.stopTimer();
      throw error;
    }
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.armGeneration += 1;
    this.stopTimer();
    this.admission.stop();
  }

  requestManual(): RunRequest<RunDispatchResult> {
    return this.admission.request("manual", async () => {
      const state = await this.stateRepository.load();
      if (state.pendingPublication !== null) {
        return { status: "not-eligible" };
      }
      return this.completeAdmittedFlight(async () => {
        return {
          status: "finished",
          result: await this.runLifecycle({ trigger: "manual" }),
        };
      });
    });
  }

  requestPendingPublication(runId: string): RunRequest<RunDispatchResult> {
    return this.admission.request("pending-publication", async () => {
      try {
        const pending =
          await this.stateRepository.claimPendingPublicationAttempt(
            runId,
            this.nowIso(),
            this.policy.automaticRetryDelayMs,
          );
        return this.completeAdmittedFlight(async () => {
          return {
            status: "finished",
            result: await this.runLifecycle({
              trigger: "pending-publication",
              pendingPublication: pending,
            }),
          };
        });
      } catch (error) {
        if (isNotEligible(error)) return { status: "not-eligible" };
        throw error;
      }
    });
  }

  private async completeAdmittedFlight<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    let result: T | undefined;
    let operationFailure: unknown;
    let operationFailed = false;
    try {
      result = await operation();
    } catch (error) {
      operationFailed = true;
      operationFailure = error;
    }
    let consumptionFailure: unknown;
    let consumptionFailed = false;
    try {
      await this.consumeNewlyDueSlot();
    } catch (error) {
      consumptionFailed = true;
      consumptionFailure = error;
    }
    if (operationFailed) {
      if (consumptionFailed) {
        throw new AggregateError([operationFailure, consumptionFailure]);
      }
      throw operationFailure;
    }
    if (consumptionFailed) throw consumptionFailure;
    return result as T;
  }

  private async consumeNewlyDueSlot(): Promise<void> {
    const state = await this.stateRepository.load();
    const newest = latestDueSlot(this.nowIso(), this.policy);
    if (
      state.schedule.lastClaimedSlot === null ||
      compareSlotIds(newest.id, state.schedule.lastClaimedSlot) > 0
    ) {
      await this.stateRepository.skipAutomaticRequest(newest);
    }
  }

  private async tick(startup: boolean): Promise<void> {
    if (this.stopped) return;
    const state = await this.stateRepository.load();
    if (this.stopped) return;
    const now = this.nowIso();
    const newest = latestDueSlot(now, this.policy);
    if (state.pendingPublication !== null) {
      if (
        state.schedule.lastClaimedSlot === null ||
        compareSlotIds(newest.id, state.schedule.lastClaimedSlot) > 0
      ) {
        await this.stateRepository.skipAutomaticRequest(newest);
      }
      return;
    }

    const retry = state.schedule.retry;
    if (retry !== null && retry.slot === newest.id) {
      if (retry.attemptsStarted >= this.policy.automaticMaximumAttempts) {
        await this.stateRepository.skipAutomaticRequest(newest);
        return;
      }
      if (Date.parse(now) >= Date.parse(retry.notBefore)) {
        await this.requestAutomatic(newest, "scheduled-retry");
      }
      return;
    }

    if (
      state.schedule.lastClaimedSlot === null ||
      compareSlotIds(newest.id, state.schedule.lastClaimedSlot) > 0
    ) {
      await this.requestAutomatic(
        newest,
        startup ? "startup-catch-up" : "scheduled",
      );
    }
  }

  private async requestAutomatic(
    slot: ScheduledSlot,
    trigger: Extract<
      RunTrigger,
      "scheduled" | "startup-catch-up" | "scheduled-retry"
    >,
  ): Promise<void> {
    const request = this.admission.request(trigger, async () => {
      let claim: AutomaticAttemptClaim;
      try {
        claim = await this.stateRepository.claimAutomaticAttempt(
          slot,
          this.nowIso(),
          this.policy,
        );
      } catch (error) {
        if (isNotEligible(error)) return { status: "not-eligible" } as const;
        throw error;
      }
      return this.completeAdmittedFlight(async () => {
        let result: RunLifecycleResult;
        try {
          result = await this.runLifecycle({
            trigger,
            automaticClaim: claim,
          });
        } catch (error) {
          try {
            await this.stateRepository.finishAutomaticAttempt(claim, "failed");
          } catch (stateError) {
            throw new AggregateError([error, stateError]);
          }
          this.onError(error);
          return {
            status: "finished",
            result: "retryable-failure",
          } as const;
        }
        await this.stateRepository.finishAutomaticAttempt(
          claim,
          result === "retryable-failure" ? "failed" : "succeeded",
        );
        return { status: "finished", result } as const;
      });
    });
    if (request.status === "skipped") {
      if (request.reason === "active") {
        await this.stateRepository.skipAutomaticRequest(slot);
      }
      return;
    }
    await this.armTimer();
    await request.completion;
  }

  private async armTimer(): Promise<void> {
    if (this.stopped) return;
    const generation = ++this.armGeneration;
    this.stopTimer();
    const state = await this.stateRepository.load();
    if (this.stopped || generation !== this.armGeneration) return;
    const nowMilliseconds = this.now();
    const now = new Date(nowMilliseconds).toISOString();
    const newest = latestDueSlot(now, this.policy);
    const nextDaily = Date.parse(nextDailySlot(now, this.policy).dueAt);
    let wakeAt =
      state.schedule.lastClaimedSlot === null ||
      compareSlotIds(newest.id, state.schedule.lastClaimedSlot) > 0
        ? nowMilliseconds
        : nextDaily;
    const retry = state.schedule.retry;
    if (
      state.pendingPublication === null &&
      retry !== null &&
      retry.attemptsStarted < this.policy.automaticMaximumAttempts
    ) {
      wakeAt = Math.min(wakeAt, Date.parse(retry.notBefore));
    }
    const delay = Math.max(0, wakeAt - this.now());
    if (this.stopped || generation !== this.armGeneration) return;
    this.timer = this.setTimer(() => {
      if (this.stopped || generation !== this.armGeneration) return;
      this.timer = undefined;
      void this.tick(false)
        .then(() => this.armTimer())
        .catch((error) => {
          this.stopTimer();
          this.onError(error);
        });
    }, delay);
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      this.clearTimer(this.timer);
      this.timer = undefined;
    }
  }

  private nowIso(): string {
    return new Date(this.now()).toISOString();
  }
}

export function createDailyScheduler(
  options: DailySchedulerOptions,
): DailyScheduler {
  return new DailySchedulerImplementation(options);
}

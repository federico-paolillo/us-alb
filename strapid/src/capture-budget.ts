import type { CaptureBudgetPolicy } from "./capture-contract.ts";

export const DEFAULT_CAPTURE_BUDGET: CaptureBudgetPolicy = {
  totalWindowMs: 900_000,
  servingShutdownMs: 60_000,
  exportExecutionMs: 600_000,
  exporterTerminationMs: 30_000,
  recoveryMs: 210_000,
  forcedConfirmationMs: 5_000,
};

const environmentNames = {
  totalWindowMs: "STRAPID_CAPTURE_WINDOW_SECONDS",
  servingShutdownMs: "STRAPID_SERVING_SHUTDOWN_SECONDS",
  exportExecutionMs: "STRAPID_EXPORT_SECONDS",
  exporterTerminationMs: "STRAPID_EXPORT_TERMINATION_SECONDS",
  recoveryMs: "STRAPID_RECOVERY_SECONDS",
  forcedConfirmationMs: "STRAPID_FORCE_CONFIRMATION_SECONDS",
} as const;

export function validateCaptureBudget(
  policy: CaptureBudgetPolicy,
): CaptureBudgetPolicy {
  for (const [name, value] of Object.entries(policy)) {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive integer`);
    }
  }
  if (
    policy.servingShutdownMs +
      policy.exportExecutionMs +
      policy.exporterTerminationMs +
      policy.recoveryMs !==
    policy.totalWindowMs
  ) {
    throw new RangeError("Capture phase allocations must equal totalWindowMs");
  }
  if (
    policy.forcedConfirmationMs >= policy.servingShutdownMs ||
    policy.forcedConfirmationMs >= policy.exporterTerminationMs ||
    policy.exporterTerminationMs >= policy.recoveryMs
  ) {
    throw new RangeError(
      "Capture forced confirmation/reserve relationship is invalid",
    );
  }
  return { ...policy };
}

export function parseCaptureBudget(
  environment: NodeJS.ProcessEnv,
): CaptureBudgetPolicy {
  const values = { ...DEFAULT_CAPTURE_BUDGET };
  for (const [field, name] of Object.entries(environmentNames) as Array<
    [keyof CaptureBudgetPolicy, string]
  >) {
    const raw = environment[name];
    if (raw === undefined) continue;
    if (!/^[1-9][0-9]*$/.test(raw)) {
      throw new RangeError(`${name} must be a positive integer`);
    }
    values[field] = Number(raw) * 1_000;
  }
  return validateCaptureBudget(values);
}

export interface CaptureDeadlines {
  readonly started: number;
  readonly overall: number;
  readonly shutdown: number;
}

export class CaptureTimeline {
  readonly policy: CaptureBudgetPolicy;
  readonly deadlines: CaptureDeadlines;

  constructor(policy: CaptureBudgetPolicy, started: number) {
    validateCaptureBudget(policy);
    this.policy = policy;
    this.deadlines = {
      started,
      overall: started + policy.totalWindowMs,
      shutdown: Math.min(
        started + policy.servingShutdownMs,
        started + policy.totalWindowMs,
      ),
    };
  }

  exportDeadline(exportStarted: number): number {
    return Math.min(
      exportStarted + this.policy.exportExecutionMs,
      this.deadlines.overall -
        this.policy.exporterTerminationMs -
        this.policy.recoveryMs,
    );
  }

  terminationDeadline(terminationStarted: number): number {
    return Math.min(
      terminationStarted + this.policy.exporterTerminationMs,
      this.deadlines.overall - this.policy.recoveryMs,
    );
  }

  recoveryDeadline(recoveryStarted: number): number {
    return Math.min(
      recoveryStarted + this.policy.recoveryMs,
      this.deadlines.overall,
    );
  }

  remaining(deadline: number, now: number): number {
    return Math.max(0, deadline - now);
  }
}

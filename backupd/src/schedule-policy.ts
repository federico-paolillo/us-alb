export interface SchedulePolicy {
  readonly utcHour: number;
  readonly utcMinute: number;
  readonly automaticRetryDelayMs: number;
  readonly automaticMaximumAttempts: number;
}

export interface ScheduledSlot {
  readonly id: string;
  readonly dueAt: string;
}

export class ScheduleConfigurationError extends Error {
  readonly code = "configuration_invalid" as const;

  constructor(cause?: unknown) {
    super(
      "Backup schedule configuration is invalid",
      cause === undefined ? undefined : { cause },
    );
    this.name = "ScheduleConfigurationError";
  }
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new ScheduleConfigurationError();
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ScheduleConfigurationError();
  }
  return parsed;
}

export function parseSchedulePolicy(
  environment: NodeJS.ProcessEnv = process.env,
): SchedulePolicy {
  const schedule = environment.BACKUPD_SCHEDULE_UTC ?? "03:00";
  const match = /^(\d{2}):(\d{2})$/.exec(schedule);
  if (match === null) throw new ScheduleConfigurationError();
  const utcHour = Number(match[1]);
  const utcMinute = Number(match[2]);
  if (utcHour > 23 || utcMinute > 59) {
    throw new ScheduleConfigurationError();
  }
  return Object.freeze({
    utcHour,
    utcMinute,
    automaticRetryDelayMs:
      boundedInteger(
        environment.BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS,
        900,
        60,
        86_400,
      ) * 1_000,
    automaticMaximumAttempts: boundedInteger(
      environment.BACKUPD_AUTOMATIC_MAX_ATTEMPTS,
      2,
      1,
      3,
    ),
  });
}

function canonicalInstant(value: string): number {
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new ScheduleConfigurationError();
  }
  return milliseconds;
}

function slotAt(milliseconds: number, policy: SchedulePolicy): ScheduledSlot {
  const date = new Date(milliseconds);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const dueMilliseconds = Date.UTC(
    year,
    month,
    day,
    policy.utcHour,
    policy.utcMinute,
  );
  return Object.freeze({
    id: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10),
    dueAt: new Date(dueMilliseconds).toISOString(),
  });
}

export function latestDueSlot(
  now: string,
  policy: SchedulePolicy,
): ScheduledSlot {
  const nowMilliseconds = canonicalInstant(now);
  const today = slotAt(nowMilliseconds, policy);
  if (Date.parse(today.dueAt) <= nowMilliseconds) return today;
  return slotAt(nowMilliseconds - 86_400_000, policy);
}

export function nextDailySlot(
  now: string,
  policy: SchedulePolicy,
): ScheduledSlot {
  const nowMilliseconds = canonicalInstant(now);
  const today = slotAt(nowMilliseconds, policy);
  if (Date.parse(today.dueAt) > nowMilliseconds) return today;
  return slotAt(nowMilliseconds + 86_400_000, policy);
}

export function compareSlotIds(left: string, right: string): number {
  const parse = (value: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new ScheduleConfigurationError();
    }
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== value
    ) {
      throw new ScheduleConfigurationError();
    }
    return value;
  };
  return parse(left).localeCompare(parse(right));
}

export function automaticRetryNotBefore(
  now: string,
  policy: SchedulePolicy,
): string {
  const nowMilliseconds = canonicalInstant(now);
  const nextDaily = Date.parse(nextDailySlot(now, policy).dueAt);
  return new Date(
    Math.min(nowMilliseconds + policy.automaticRetryDelayMs, nextDaily),
  ).toISOString();
}

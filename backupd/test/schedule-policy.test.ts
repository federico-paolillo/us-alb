import assert from "node:assert/strict";
import test from "node:test";

import {
  automaticRetryNotBefore,
  compareSlotIds,
  latestDueSlot,
  nextDailySlot,
  parseSchedulePolicy,
  ScheduleConfigurationError,
} from "../src/schedule-policy.ts";

test("schedule policy owns exact UTC and bounded retry defaults", () => {
  assert.deepEqual(parseSchedulePolicy({}), {
    utcHour: 3,
    utcMinute: 0,
    automaticRetryDelayMs: 900_000,
    automaticMaximumAttempts: 2,
  });
  assert.deepEqual(
    parseSchedulePolicy({
      BACKUPD_SCHEDULE_UTC: "23:59",
      BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "60",
      BACKUPD_AUTOMATIC_MAX_ATTEMPTS: "3",
    }),
    {
      utcHour: 23,
      utcMinute: 59,
      automaticRetryDelayMs: 60_000,
      automaticMaximumAttempts: 3,
    },
  );
  assert.deepEqual(
    parseSchedulePolicy({
      BACKUPD_SCHEDULE_UTC: "00:00",
      BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "86400",
      BACKUPD_AUTOMATIC_MAX_ATTEMPTS: "1",
    }),
    {
      utcHour: 0,
      utcMinute: 0,
      automaticRetryDelayMs: 86_400_000,
      automaticMaximumAttempts: 1,
    },
  );
  for (const environment of [
    { BACKUPD_SCHEDULE_UTC: "3:00" },
    { BACKUPD_SCHEDULE_UTC: "24:00" },
    { BACKUPD_SCHEDULE_UTC: "03:60" },
    { BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "059" },
    { BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: " 60" },
    { BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "6e2" },
    { BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "60.5" },
    { BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "59" },
    { BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "86401" },
    { BACKUPD_AUTOMATIC_MAX_ATTEMPTS: "+2" },
    { BACKUPD_AUTOMATIC_MAX_ATTEMPTS: "01" },
    { BACKUPD_AUTOMATIC_MAX_ATTEMPTS: "4" },
  ]) {
    assert.throws(
      () => parseSchedulePolicy(environment),
      (error: unknown) =>
        error instanceof ScheduleConfigurationError &&
        error.code === "configuration_invalid",
    );
  }
});

test("latest and next slots honor exact UTC boundaries and rollovers", () => {
  const policy = parseSchedulePolicy({});
  assert.deepEqual(latestDueSlot("2026-03-29T02:59:59.999Z", policy), {
    id: "2026-03-28",
    dueAt: "2026-03-28T03:00:00.000Z",
  });
  assert.deepEqual(latestDueSlot("2026-03-29T03:00:00.000Z", policy), {
    id: "2026-03-29",
    dueAt: "2026-03-29T03:00:00.000Z",
  });
  assert.equal(
    nextDailySlot("2024-02-28T04:00:00.000Z", policy).id,
    "2024-02-29",
  );
  assert.equal(
    nextDailySlot("2026-12-31T03:00:00.000Z", policy).id,
    "2027-01-01",
  );
  assert.equal(
    nextDailySlot("2026-10-25T02:59:59.999Z", policy).id,
    "2026-10-25",
  );
  const midnight = parseSchedulePolicy({ BACKUPD_SCHEDULE_UTC: "00:00" });
  assert.deepEqual(nextDailySlot("2026-01-31T23:59:59.999Z", midnight), {
    id: "2026-02-01",
    dueAt: "2026-02-01T00:00:00.000Z",
  });
  assert.equal(compareSlotIds("2026-01-01", "2026-01-02"), -1);
  assert.equal(compareSlotIds("2026-01-02", "2026-01-02"), 0);
  assert.throws(() => latestDueSlot("2026-03-29T03:00:00Z", policy));
  assert.throws(() => compareSlotIds("2026-02-30", "2026-03-01"));
});

test("catch-up math chooses the newest slot and retry is clipped before the next day", () => {
  const policy = parseSchedulePolicy({});
  assert.equal(
    latestDueSlot("2026-10-29T12:00:00.000Z", policy).id,
    "2026-10-29",
  );
  assert.equal(
    automaticRetryNotBefore("2026-10-29T02:55:00.000Z", policy),
    "2026-10-29T03:00:00.000Z",
  );
  assert.equal(
    automaticRetryNotBefore("2026-10-29T03:01:00.000Z", policy),
    "2026-10-29T03:16:00.000Z",
  );
});

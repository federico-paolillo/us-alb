import { isAbsolute, relative } from "node:path";

import type { SupervisorState } from "./lifecycle-policy.ts";

export const CAPTURE_PROTOCOL_VERSION = 1 as const;
export const CAPTURE_JSON_LIMIT_BYTES = 16 * 1024;
export const CAPTURE_NDJSON_LIMIT_BYTES = 32 * 1024;

export interface CaptureBudgetPolicy {
  readonly totalWindowMs: number;
  readonly servingShutdownMs: number;
  readonly exportExecutionMs: number;
  readonly exporterTerminationMs: number;
  readonly recoveryMs: number;
  readonly forcedConfirmationMs: number;
}

export interface CaptureIdentity {
  readonly supervisorInstanceId: string;
  readonly captureWindowId: string;
  readonly releaseId: string;
  readonly sourceVolumeId: string;
  readonly nodeVersion: string;
  readonly strapiVersion: string;
}

export type CaptureServiceStatus =
  | {
      readonly version: 1;
      readonly runtimeReady: true;
      readonly supervisorInstanceId: string;
      readonly releaseId: string;
      readonly sourceVolumeId: string;
      readonly nodeVersion: string;
      readonly strapiVersion: string;
      readonly supervisorState: SupervisorState;
      readonly healthyServing: boolean;
      readonly budget: CaptureBudgetPolicy;
      readonly activeCaptureWindowId?: string;
    }
  | {
      readonly version: 1;
      readonly runtimeReady: false;
      readonly supervisorInstanceId: string;
      readonly reason:
        | "configuration_invalid"
        | "runtime_unavailable"
        | "serving_unavailable";
    };

export interface CaptureRequest {
  readonly version: 1;
  readonly captureWindowId: string;
  readonly expectedSupervisorInstanceId: string;
  readonly expectedReleaseId: string;
  readonly expectedSourceVolumeId: string;
  readonly expectedNodeVersion: string;
  readonly expectedStrapiVersion: string;
  readonly archiveBasePath: string;
}

export interface CaptureAcceptedRecord {
  readonly version: 1;
  readonly type: "accepted";
  readonly identity: CaptureIdentity;
  readonly archiveBasePath: string;
  readonly startedAt: string;
  readonly deadlineAt: string;
  readonly acceptedAt: string;
}

export type CaptureInvalidReason =
  | "client_disconnected"
  | "client_cancelled"
  | "window_expired"
  | "forced_serving_stop"
  | "serving_stop_failed"
  | "export_failed"
  | "export_cancelled"
  | "export_setup_failed";

export type CaptureTerminalOutcome =
  | {
      readonly status: "captured";
      readonly exportClosedAt: string;
      readonly servingRecoveredAt: string;
    }
  | {
      readonly status: "invalid";
      readonly reason: CaptureInvalidReason;
      readonly servingRecoveredAt: string;
    }
  | {
      readonly status: "recovery-failed";
      readonly captureReason?: CaptureInvalidReason;
      readonly reason:
        | "export_ownership_unconfirmed"
        | "serving_ownership_unconfirmed"
        | "serving_recovery_failed"
        | "recovery_expired";
    }
  | { readonly status: "supervisor-shutdown" };

export interface CaptureTerminalRecord {
  readonly version: 1;
  readonly type: "terminal";
  readonly identity: CaptureIdentity;
  readonly archiveBasePath: string;
  readonly startedAt: string;
  readonly deadlineAt: string;
  readonly acceptedAt?: string;
  readonly completedAt: string;
  readonly outcome: CaptureTerminalOutcome;
}

export interface CaptureActiveRecord {
  readonly version: 1;
  readonly type: "active";
  readonly identity: CaptureIdentity;
  readonly archiveBasePath: string;
  readonly startedAt?: string;
  readonly deadlineAt?: string;
  readonly acceptedAt?: string;
  readonly phase:
    | "preflight"
    | "stopping"
    | "exporting"
    | "terminating-export"
    | "recovering";
}

export type CaptureWindowStatus =
  | CaptureActiveRecord
  | CaptureTerminalRecord
  | {
      readonly version: 1;
      readonly type: "unusable";
      readonly reason: "unknown_window" | "supervisor_replaced";
      readonly currentSupervisorInstanceId: string;
    };

export interface CaptureCancellationRequest {
  readonly version: 1;
  readonly supervisorInstanceId: string;
}

export class CaptureContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureContractError";
  }
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CaptureContractError(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new CaptureContractError("Capture record has invalid fields");
  }
}

export function validateCanonicalUuid(value: unknown, name: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value,
    )
  ) {
    throw new CaptureContractError(`${name} must be a canonical UUID`);
  }
  return value;
}

export function validateIdentityToken(
  value: unknown,
  name: string,
  maximumBytes = 256,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > maximumBytes ||
    !/^[!-~]+$/.test(value)
  ) {
    throw new CaptureContractError(`${name} must be a bounded ASCII token`);
  }
  return value;
}

export function validateArchiveBasePath(value: unknown): string {
  if (typeof value !== "string" || !isAbsolute(value)) {
    throw new CaptureContractError("archiveBasePath must be absolute");
  }
  const child = relative("/staging", value);
  if (
    child.length === 0 ||
    child === ".." ||
    child.startsWith("../") ||
    isAbsolute(child)
  ) {
    throw new CaptureContractError("archiveBasePath must be below /staging");
  }
  return value;
}

export function decodeCaptureRequest(value: unknown): CaptureRequest {
  const record = object(value, "capture request");
  exactKeys(record, [
    "version",
    "captureWindowId",
    "expectedSupervisorInstanceId",
    "expectedReleaseId",
    "expectedSourceVolumeId",
    "expectedNodeVersion",
    "expectedStrapiVersion",
    "archiveBasePath",
  ]);
  if (record.version !== 1) {
    throw new CaptureContractError("Unsupported capture protocol version");
  }
  return {
    version: 1,
    captureWindowId: validateCanonicalUuid(
      record.captureWindowId,
      "captureWindowId",
    ),
    expectedSupervisorInstanceId: validateCanonicalUuid(
      record.expectedSupervisorInstanceId,
      "expectedSupervisorInstanceId",
    ),
    expectedReleaseId: validateIdentityToken(
      record.expectedReleaseId,
      "expectedReleaseId",
    ),
    expectedSourceVolumeId: validateIdentityToken(
      record.expectedSourceVolumeId,
      "expectedSourceVolumeId",
    ),
    expectedNodeVersion: validateIdentityToken(
      record.expectedNodeVersion,
      "expectedNodeVersion",
      64,
    ),
    expectedStrapiVersion: validateIdentityToken(
      record.expectedStrapiVersion,
      "expectedStrapiVersion",
      64,
    ),
    archiveBasePath: validateArchiveBasePath(record.archiveBasePath),
  };
}

export function decodeCancellationRequest(
  value: unknown,
): CaptureCancellationRequest {
  const record = object(value, "cancellation request");
  exactKeys(record, ["version", "supervisorInstanceId"]);
  if (record.version !== 1) {
    throw new CaptureContractError("Unsupported capture protocol version");
  }
  return {
    version: 1,
    supervisorInstanceId: validateCanonicalUuid(
      record.supervisorInstanceId,
      "supervisorInstanceId",
    ),
  };
}

function decodeIdentity(value: unknown): CaptureIdentity {
  const record = object(value, "capture identity");
  exactKeys(record, [
    "supervisorInstanceId",
    "captureWindowId",
    "releaseId",
    "sourceVolumeId",
    "nodeVersion",
    "strapiVersion",
  ]);
  return {
    supervisorInstanceId: validateCanonicalUuid(
      record.supervisorInstanceId,
      "supervisorInstanceId",
    ),
    captureWindowId: validateCanonicalUuid(
      record.captureWindowId,
      "captureWindowId",
    ),
    releaseId: validateIdentityToken(record.releaseId, "releaseId"),
    sourceVolumeId: validateIdentityToken(
      record.sourceVolumeId,
      "sourceVolumeId",
    ),
    nodeVersion: validateIdentityToken(record.nodeVersion, "nodeVersion", 64),
    strapiVersion: validateIdentityToken(
      record.strapiVersion,
      "strapiVersion",
      64,
    ),
  };
}

const invalidReasons = new Set<CaptureInvalidReason>([
  "client_disconnected",
  "client_cancelled",
  "window_expired",
  "forced_serving_stop",
  "serving_stop_failed",
  "export_failed",
  "export_cancelled",
  "export_setup_failed",
]);

function decodeTerminalOutcome(value: unknown): CaptureTerminalOutcome {
  const record = object(value, "terminal outcome");
  if (record.status === "captured") {
    exactKeys(record, ["status", "exportClosedAt", "servingRecoveredAt"]);
    if (
      typeof record.exportClosedAt !== "string" ||
      typeof record.servingRecoveredAt !== "string"
    ) {
      throw new CaptureContractError("Captured timestamps are invalid");
    }
    return {
      status: "captured",
      exportClosedAt: record.exportClosedAt,
      servingRecoveredAt: record.servingRecoveredAt,
    };
  }
  if (record.status === "invalid") {
    exactKeys(record, ["status", "reason", "servingRecoveredAt"]);
    if (
      !invalidReasons.has(record.reason as CaptureInvalidReason) ||
      typeof record.servingRecoveredAt !== "string"
    ) {
      throw new CaptureContractError("Invalid capture outcome is malformed");
    }
    return {
      status: "invalid",
      reason: record.reason as CaptureInvalidReason,
      servingRecoveredAt: record.servingRecoveredAt,
    };
  }
  if (record.status === "recovery-failed") {
    exactKeys(record, ["status", "reason"], ["captureReason"]);
    const reasons = new Set([
      "export_ownership_unconfirmed",
      "serving_ownership_unconfirmed",
      "serving_recovery_failed",
      "recovery_expired",
    ]);
    if (!reasons.has(record.reason as string)) {
      throw new CaptureContractError("Recovery failure reason is invalid");
    }
    if (
      record.captureReason !== undefined &&
      !invalidReasons.has(record.captureReason as CaptureInvalidReason)
    ) {
      throw new CaptureContractError("Capture failure reason is invalid");
    }
    return record as unknown as CaptureTerminalOutcome;
  }
  if (record.status === "supervisor-shutdown") {
    exactKeys(record, ["status"]);
    return { status: "supervisor-shutdown" };
  }
  throw new CaptureContractError("Terminal outcome status is invalid");
}

export function decodeCaptureTerminalRecord(
  value: unknown,
): CaptureTerminalRecord {
  const record = object(value, "terminal record");
  exactKeys(
    record,
    [
      "version",
      "type",
      "identity",
      "archiveBasePath",
      "startedAt",
      "deadlineAt",
      "completedAt",
      "outcome",
    ],
    ["acceptedAt"],
  );
  if (record.version !== 1 || record.type !== "terminal") {
    throw new CaptureContractError("Terminal record header is invalid");
  }
  for (const name of ["startedAt", "deadlineAt", "completedAt"] as const) {
    if (typeof record[name] !== "string") {
      throw new CaptureContractError("Terminal timestamp is invalid");
    }
  }
  if (
    record.acceptedAt !== undefined &&
    typeof record.acceptedAt !== "string"
  ) {
    throw new CaptureContractError("acceptedAt is invalid");
  }
  return {
    version: 1,
    type: "terminal",
    identity: decodeIdentity(record.identity),
    archiveBasePath: validateArchiveBasePath(record.archiveBasePath),
    startedAt: record.startedAt as string,
    deadlineAt: record.deadlineAt as string,
    ...(record.acceptedAt === undefined
      ? {}
      : { acceptedAt: record.acceptedAt as string }),
    completedAt: record.completedAt as string,
    outcome: decodeTerminalOutcome(record.outcome),
  };
}

export function decodeCaptureAcceptedRecord(
  value: unknown,
): CaptureAcceptedRecord {
  const record = object(value, "accepted record");
  exactKeys(record, [
    "version",
    "type",
    "identity",
    "archiveBasePath",
    "startedAt",
    "deadlineAt",
    "acceptedAt",
  ]);
  if (record.version !== 1 || record.type !== "accepted") {
    throw new CaptureContractError("Accepted record header is invalid");
  }
  for (const name of ["startedAt", "deadlineAt", "acceptedAt"] as const) {
    if (typeof record[name] !== "string") {
      throw new CaptureContractError("Accepted timestamp is invalid");
    }
  }
  return {
    version: 1,
    type: "accepted",
    identity: decodeIdentity(record.identity),
    archiveBasePath: validateArchiveBasePath(record.archiveBasePath),
    startedAt: record.startedAt as string,
    deadlineAt: record.deadlineAt as string,
    acceptedAt: record.acceptedAt as string,
  };
}

export function sameCaptureIdentity(
  left: CaptureIdentity,
  right: CaptureIdentity,
): boolean {
  return Object.keys(left).every(
    (key) =>
      left[key as keyof CaptureIdentity] ===
      right[key as keyof CaptureIdentity],
  );
}

export function isCaptureEligibleForValidation(
  record: CaptureTerminalRecord,
  expected: CaptureIdentity,
): boolean {
  return (
    record.outcome.status === "captured" &&
    sameCaptureIdentity(record.identity, expected)
  );
}

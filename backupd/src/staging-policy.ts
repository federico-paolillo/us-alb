import type {
  CaptureIdentity,
  CaptureTerminalOutcome,
  CaptureTerminalRecord,
} from "../../strapid/src/capture-contract.ts";

export const STAGING_ROOT = "/staging";
export const STAGING_RUNS_DIRECTORY = "runs";
export const ARCHIVE_BASE_NAME = "strapi-export";
export const ARCHIVE_FILE_NAME = `${ARCHIVE_BASE_NAME}.tar`;
export const ARCHIVE_METADATA_PATH = "metadata.json";
export const ARCHIVE_METADATA_MAXIMUM_BYTES = 65_536;
export const ARCHIVE_SIZE_POLL_INTERVAL_MS = 250;
export const DEFAULT_MINIMUM_FREE_BYTES = 107_374_182_400n;
export const DEFAULT_MAXIMUM_ARCHIVE_BYTES = 80_530_636_800n;

export interface StagingPolicy {
  readonly stagingRoot: string;
  readonly minimumFreeBytes: bigint;
  readonly maximumArchiveBytes: bigint;
  readonly metadataMaximumBytes: number;
  readonly sizePollIntervalMs: number;
}

export type StagingErrorCode =
  | "configuration_invalid"
  | "staging_unavailable"
  | "insufficient_capacity"
  | "staging_occupied"
  | "allocation_collision"
  | "archive_limit_exceeded"
  | "archive_output_invalid"
  | "capture_cancellation_failed"
  | "capture_identity_mismatch"
  | "writer_unconfirmed"
  | "cleanup_failed";

export class StagingError extends Error {
  readonly code: StagingErrorCode;

  constructor(code: StagingErrorCode, cause?: unknown) {
    super(
      `Staging operation failed (${code})`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "StagingError";
    this.code = code;
  }
}

function parseByteSetting(value: string | undefined, fallback: bigint): bigint {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new StagingError("configuration_invalid");
  }
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new StagingError("configuration_invalid");
  }
  return parsed;
}

export function validateStagingPolicy(policy: StagingPolicy): StagingPolicy {
  if (
    policy.stagingRoot.length === 0 ||
    policy.maximumArchiveBytes <= 0n ||
    policy.minimumFreeBytes <= policy.maximumArchiveBytes ||
    policy.minimumFreeBytes > BigInt(Number.MAX_SAFE_INTEGER) ||
    !Number.isSafeInteger(policy.metadataMaximumBytes) ||
    policy.metadataMaximumBytes <= 0 ||
    !Number.isSafeInteger(policy.sizePollIntervalMs) ||
    policy.sizePollIntervalMs <= 0
  ) {
    throw new StagingError("configuration_invalid");
  }
  return policy;
}

export function parseStagingPolicy(
  environment: NodeJS.ProcessEnv = process.env,
): StagingPolicy {
  return validateStagingPolicy({
    stagingRoot: STAGING_ROOT,
    minimumFreeBytes: parseByteSetting(
      environment.BACKUPD_STAGING_MIN_FREE_BYTES,
      DEFAULT_MINIMUM_FREE_BYTES,
    ),
    maximumArchiveBytes: parseByteSetting(
      environment.BACKUPD_ARCHIVE_MAX_BYTES,
      DEFAULT_MAXIMUM_ARCHIVE_BYTES,
    ),
    metadataMaximumBytes: ARCHIVE_METADATA_MAXIMUM_BYTES,
    sizePollIntervalMs: ARCHIVE_SIZE_POLL_INTERVAL_MS,
  });
}

export function availableBytes(stat: {
  readonly bavail: bigint;
  readonly bsize: bigint;
}): bigint {
  return stat.bavail * stat.bsize;
}

export function archiveExceedsLimit(
  size: bigint,
  policy: Pick<StagingPolicy, "maximumArchiveBytes">,
): boolean {
  return size > policy.maximumArchiveBytes;
}

export type CaptureWriterDisposition = "released" | "unconfirmed";

export type CapturedTerminalRecord = CaptureTerminalRecord & {
  readonly outcome: Extract<
    CaptureTerminalOutcome,
    { readonly status: "captured" }
  >;
};

export function classifyCaptureWriterDisposition(
  terminal: CaptureTerminalRecord,
): CaptureWriterDisposition {
  const outcome = terminal.outcome;
  switch (outcome.status) {
    case "captured":
    case "invalid":
      return "released";
    case "supervisor-shutdown":
      return "unconfirmed";
    case "recovery-failed":
      switch (outcome.reason) {
        case "export_ownership_unconfirmed":
          return "unconfirmed";
        case "serving_ownership_unconfirmed":
        case "serving_recovery_failed":
        case "recovery_expired":
          return "released";
      }
  }
}

export function sameCaptureIdentity(
  left: CaptureIdentity,
  right: CaptureIdentity,
): boolean {
  return (
    left.supervisorInstanceId === right.supervisorInstanceId &&
    left.captureWindowId === right.captureWindowId &&
    left.releaseId === right.releaseId &&
    left.sourceVolumeId === right.sourceVolumeId &&
    left.nodeVersion === right.nodeVersion &&
    left.strapiVersion === right.strapiVersion
  );
}

export function isCapturedArchiveEligible(
  terminal: CaptureTerminalRecord,
  expectedIdentity: CaptureIdentity,
  expectedArchiveBasePath: string,
  localViolation: unknown,
): terminal is CapturedTerminalRecord {
  return (
    localViolation === undefined &&
    terminal.outcome.status === "captured" &&
    terminal.archiveBasePath === expectedArchiveBasePath &&
    sameCaptureIdentity(terminal.identity, expectedIdentity)
  );
}

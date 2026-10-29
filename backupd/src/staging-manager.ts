import { lstat, mkdir, readdir, realpath, rm, statfs } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";

import type {
  CaptureIdentity,
  CaptureTerminalRecord,
} from "../../strapid/src/capture-contract.ts";
import {
  type ArchiveValidatorHooks,
  type ValidatedArchive,
  validateArchiveFile,
} from "./archive-validator.ts";
import type { CaptureClient } from "./capture-client.ts";
import {
  ARCHIVE_BASE_NAME,
  ARCHIVE_FILE_NAME,
  archiveExceedsLimit,
  availableBytes,
  type CaptureWriterDisposition,
  classifyCaptureWriterDisposition,
  isCapturedArchiveEligible,
  STAGING_ROOT,
  STAGING_RUNS_DIRECTORY,
  StagingError,
  type StagingErrorCode,
  type StagingPolicy,
  sameCaptureIdentity,
  validateStagingPolicy,
} from "./staging-policy.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface StagingAllocation {
  readonly runId: string;
  readonly runDirectory: string;
  readonly archiveBasePath: string;
  readonly archivePath: string;
}

export interface ArchiveSizeViolation {
  readonly code: Extract<
    StagingErrorCode,
    "archive_limit_exceeded" | "archive_output_invalid"
  >;
}

export interface ArchiveSizeWatch {
  readonly violation: ArchiveSizeViolation | undefined;
  stop(): Promise<void>;
}

export type ReopenedRetainedArchive =
  | {
      readonly status: "reopened";
      readonly allocation: StagingAllocation;
    }
  | { readonly status: "already-cleaned"; readonly runId: string };

export interface StagingManager {
  assertEmptyForStartup(): Promise<void>;
  reopenRetainedArchive(
    archive: ValidatedArchive,
  ): Promise<ReopenedRetainedArchive>;
  allocate(runId: string): Promise<StagingAllocation>;
  watchCaptureSize(
    allocation: StagingAllocation,
    identity: CaptureIdentity,
    captureClient: CaptureClient,
    disconnectHeldCapture: (cause: Error) => void,
  ): ArchiveSizeWatch;
  recordCaptureTerminal(
    allocation: StagingAllocation,
    terminal: CaptureTerminalRecord,
  ): Promise<CaptureWriterDisposition>;
  validateArchive(
    allocation: StagingAllocation,
    terminal: CaptureTerminalRecord,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ValidatedArchive>;
  cleanup(allocation: StagingAllocation): Promise<void>;
}

export interface StagingManagerOptions {
  readonly inspectAvailableBytes?: (path: string) => Promise<bigint>;
  readonly archiveValidatorHooks?: ArchiveValidatorHooks;
}

type AllocationState =
  | "allocated"
  | "capturing"
  | "writer-released"
  | "writer-unconfirmed"
  | "validating"
  | "cleanup-only"
  | "retained"
  | "cleaning"
  | "cleaned";

interface AllocationRecord {
  readonly allocation: StagingAllocation;
  readonly directoryDevice: bigint;
  readonly directoryInode: bigint;
  state: AllocationState;
  identity?: CaptureIdentity;
  watch?: ArchiveSizeWatch;
  terminal?: CaptureTerminalRecord;
  terminalRecording?: boolean;
  validationFailure?: unknown;
}

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function sameOutcome(
  left: CaptureTerminalRecord["outcome"],
  right: CaptureTerminalRecord["outcome"],
): boolean {
  if (left.status !== right.status) return false;
  switch (left.status) {
    case "captured":
      return (
        right.status === "captured" &&
        left.exportClosedAt === right.exportClosedAt &&
        left.servingRecoveredAt === right.servingRecoveredAt
      );
    case "invalid":
      return (
        right.status === "invalid" &&
        left.reason === right.reason &&
        left.servingRecoveredAt === right.servingRecoveredAt
      );
    case "recovery-failed":
      return (
        right.status === "recovery-failed" &&
        left.reason === right.reason &&
        left.captureReason === right.captureReason
      );
    case "supervisor-shutdown":
      return right.status === "supervisor-shutdown";
  }
}

function sameTerminal(
  left: CaptureTerminalRecord,
  right: CaptureTerminalRecord,
): boolean {
  return (
    left.version === right.version &&
    left.type === right.type &&
    sameCaptureIdentity(left.identity, right.identity) &&
    left.archiveBasePath === right.archiveBasePath &&
    left.startedAt === right.startedAt &&
    left.deadlineAt === right.deadlineAt &&
    left.acceptedAt === right.acceptedAt &&
    left.completedAt === right.completedAt &&
    sameOutcome(left.outcome, right.outcome)
  );
}

function hasKnownInvalidReason(value: string): boolean {
  return (
    value === "client_disconnected" ||
    value === "client_cancelled" ||
    value === "window_expired" ||
    value === "forced_serving_stop" ||
    value === "serving_stop_failed" ||
    value === "export_failed" ||
    value === "export_cancelled" ||
    value === "export_setup_failed"
  );
}

function hasClassifiableTerminalShape(
  terminal: CaptureTerminalRecord,
): boolean {
  if (
    terminal.version !== 1 ||
    terminal.type !== "terminal" ||
    typeof terminal.startedAt !== "string" ||
    typeof terminal.deadlineAt !== "string" ||
    typeof terminal.completedAt !== "string" ||
    terminal.outcome === null ||
    typeof terminal.outcome !== "object"
  ) {
    return false;
  }
  const outcome = terminal.outcome;
  switch (outcome.status) {
    case "captured":
      return (
        typeof terminal.acceptedAt === "string" &&
        typeof outcome.exportClosedAt === "string" &&
        typeof outcome.servingRecoveredAt === "string"
      );
    case "invalid":
      return (
        hasKnownInvalidReason(outcome.reason) &&
        typeof outcome.servingRecoveredAt === "string"
      );
    case "recovery-failed":
      return (
        (outcome.captureReason === undefined ||
          hasKnownInvalidReason(outcome.captureReason)) &&
        (outcome.reason === "export_ownership_unconfirmed" ||
          outcome.reason === "serving_ownership_unconfirmed" ||
          outcome.reason === "serving_recovery_failed" ||
          outcome.reason === "recovery_expired")
      );
    case "supervisor-shutdown":
      return true;
  }
}

class StagingManagerImplementation implements StagingManager {
  private readonly policy: StagingPolicy;
  private readonly options: StagingManagerOptions;
  private readonly records = new Map<StagingAllocation, AllocationRecord>();
  private allocationPending = false;
  private activeRecord: AllocationRecord | undefined;

  constructor(policy: StagingPolicy, options: StagingManagerOptions) {
    this.policy = validateStagingPolicy(policy);
    this.options = options;
  }

  async assertEmptyForStartup(): Promise<void> {
    if (this.allocationPending || this.activeRecord !== undefined) {
      throw new StagingError("staging_occupied");
    }
    const runsDirectory = await this.ensureStagingRoot();
    if ((await readdir(runsDirectory)).length !== 0) {
      throw new StagingError("staging_occupied");
    }
  }

  async reopenRetainedArchive(
    archive: ValidatedArchive,
  ): Promise<ReopenedRetainedArchive> {
    if (this.allocationPending || this.activeRecord !== undefined) {
      throw new StagingError("staging_occupied");
    }
    if (!UUID_PATTERN.test(archive.runId)) {
      throw new StagingError("staging_recovery_mismatch");
    }
    this.allocationPending = true;
    try {
      const runsDirectory = await this.ensureStagingRoot();
      const entries = await readdir(runsDirectory);
      const runDirectory = join(runsDirectory, archive.runId);
      const archiveBasePath = join(runDirectory, ARCHIVE_BASE_NAME);
      const archivePath = join(runDirectory, ARCHIVE_FILE_NAME);
      if (
        archive.archivePath !== archivePath ||
        archive.capture.archiveBasePath !== archiveBasePath
      ) {
        throw new StagingError("staging_recovery_mismatch");
      }
      if (entries.length === 0) {
        return { status: "already-cleaned", runId: archive.runId };
      }
      if (entries.length !== 1 || entries[0] !== archive.runId) {
        throw new StagingError("staging_recovery_mismatch");
      }

      try {
        const directoryStat = await lstat(runDirectory, { bigint: true });
        const resolvedDirectory = await realpath(runDirectory);
        const archiveEntries = await readdir(runDirectory);
        const archiveStat = await lstat(archivePath, { bigint: true });
        const expected = archive.fileIdentity;
        if (
          directoryStat.isSymbolicLink() ||
          !directoryStat.isDirectory() ||
          (directoryStat.mode & 0o777n) !== 0o700n ||
          dirname(resolvedDirectory) !== runsDirectory ||
          basename(resolvedDirectory) !== archive.runId ||
          archiveEntries.length !== 1 ||
          archiveEntries[0] !== ARCHIVE_FILE_NAME ||
          archiveStat.isSymbolicLink() ||
          !archiveStat.isFile() ||
          expected.size !== BigInt(archive.byteLength) ||
          archiveStat.dev !== expected.device ||
          archiveStat.ino !== expected.inode ||
          archiveStat.size !== expected.size ||
          archiveStat.mtimeNs !== expected.modifiedNanoseconds ||
          archiveStat.ctimeNs !== expected.changedNanoseconds
        ) {
          throw new Error("Retained archive identity changed");
        }
        const allocation = Object.freeze({
          runId: archive.runId,
          runDirectory,
          archiveBasePath,
          archivePath,
        });
        const record: AllocationRecord = {
          allocation,
          directoryDevice: directoryStat.dev,
          directoryInode: directoryStat.ino,
          state: "retained",
        };
        this.records.set(allocation, record);
        this.activeRecord = record;
        return { status: "reopened", allocation };
      } catch (error) {
        if (
          error instanceof StagingError &&
          error.code === "staging_recovery_mismatch"
        ) {
          throw error;
        }
        throw new StagingError("staging_recovery_mismatch", error);
      }
    } finally {
      this.allocationPending = false;
    }
  }

  async allocate(runId: string): Promise<StagingAllocation> {
    if (
      this.allocationPending ||
      (this.activeRecord !== undefined && this.activeRecord.state !== "cleaned")
    ) {
      throw new StagingError("staging_occupied");
    }
    if (!UUID_PATTERN.test(runId)) {
      throw new StagingError("configuration_invalid");
    }
    this.allocationPending = true;
    try {
      const runsDirectory = await this.ensureStagingRoot();
      if ((await readdir(runsDirectory)).length !== 0) {
        throw new StagingError("staging_occupied");
      }
      await this.requireCapacity(this.policy.stagingRoot);
      const runDirectory = join(runsDirectory, runId);
      try {
        await mkdir(runDirectory, { mode: 0o700 });
      } catch (error) {
        if (errorCode(error) === "EEXIST") {
          throw new StagingError("allocation_collision", error);
        }
        throw new StagingError("staging_unavailable", error);
      }
      try {
        const entries = await readdir(runsDirectory);
        if (entries.length !== 1 || entries[0] !== runId) {
          throw new StagingError("staging_occupied");
        }
        await this.requireCapacity(runDirectory);
      } catch (error) {
        try {
          await rm(runDirectory, { recursive: true, force: true });
        } catch (cleanupCause) {
          throw new StagingError(
            "cleanup_failed",
            new AggregateError([error, cleanupCause]),
          );
        }
        throw error;
      }
      const directoryStat = await lstat(runDirectory, { bigint: true });
      const allocation = Object.freeze({
        runId,
        runDirectory,
        archiveBasePath: join(runDirectory, ARCHIVE_BASE_NAME),
        archivePath: join(runDirectory, ARCHIVE_FILE_NAME),
      });
      const record: AllocationRecord = {
        allocation,
        directoryDevice: directoryStat.dev,
        directoryInode: directoryStat.ino,
        state: "allocated",
      };
      this.records.set(allocation, record);
      this.activeRecord = record;
      return allocation;
    } finally {
      this.allocationPending = false;
    }
  }

  watchCaptureSize(
    allocation: StagingAllocation,
    identity: CaptureIdentity,
    captureClient: CaptureClient,
    disconnectHeldCapture: (cause: Error) => void,
  ): ArchiveSizeWatch {
    const record = this.ownedRecord(allocation);
    if (record.state !== "allocated") {
      throw new StagingError("writer_unconfirmed");
    }
    record.state = "capturing";
    record.identity = identity;

    let violation: ArchiveSizeViolation | undefined;
    let timer: NodeJS.Timeout | undefined;
    let stopping = false;
    let disconnected = false;

    const violate = async (
      code: ArchiveSizeViolation["code"],
      cause?: unknown,
    ) => {
      if (violation !== undefined) return;
      violation = { code };
      try {
        await captureClient.cancel(identity);
      } catch (cancellationCause) {
        if (disconnected) return;
        disconnected = true;
        const causes = [cancellationCause];
        if (cause !== undefined) causes.unshift(cause);
        disconnectHeldCapture(
          new StagingError(
            "capture_cancellation_failed",
            causes.length === 1
              ? cancellationCause
              : new AggregateError(causes),
          ),
        );
      }
    };

    const observe = async (): Promise<void> => {
      try {
        const output = await lstat(allocation.archivePath, { bigint: true });
        if (!output.isFile()) {
          await violate("archive_output_invalid");
        } else if (archiveExceedsLimit(output.size, this.policy)) {
          await violate("archive_limit_exceeded");
        }
      } catch (error) {
        if (errorCode(error) !== "ENOENT") {
          await violate("archive_output_invalid", error);
        }
      } finally {
        if (!stopping && violation === undefined) {
          timer = setTimeout(runObservation, this.policy.sizePollIntervalMs);
          timer.unref();
        }
      }
    };

    let inFlight = Promise.resolve();
    const runObservation = () => {
      inFlight = observe();
    };
    const watch: ArchiveSizeWatch = {
      get violation() {
        return violation;
      },
      async stop() {
        if (!stopping) {
          stopping = true;
          if (timer !== undefined) clearTimeout(timer);
        }
        await inFlight;
      },
    };
    record.watch = watch;
    runObservation();
    return watch;
  }

  async recordCaptureTerminal(
    allocation: StagingAllocation,
    terminal: CaptureTerminalRecord,
  ): Promise<CaptureWriterDisposition> {
    const record = this.ownedRecord(allocation);
    if (record.state !== "capturing" || record.watch === undefined) {
      throw new StagingError("writer_unconfirmed");
    }
    if (record.terminalRecording === true) {
      throw new StagingError("writer_unconfirmed");
    }
    if (
      record.identity === undefined ||
      !hasClassifiableTerminalShape(terminal) ||
      !sameCaptureIdentity(record.identity, terminal.identity) ||
      terminal.archiveBasePath !== allocation.archiveBasePath
    ) {
      throw new StagingError("capture_identity_mismatch");
    }
    record.terminalRecording = true;
    try {
      await record.watch.stop();
      const disposition = classifyCaptureWriterDisposition(terminal);
      record.terminal = terminal;
      record.state =
        disposition === "released" ? "writer-released" : "writer-unconfirmed";
      return disposition;
    } catch (error) {
      record.state = "writer-unconfirmed";
      throw new StagingError("writer_unconfirmed", error);
    } finally {
      record.terminalRecording = false;
    }
  }

  async validateArchive(
    allocation: StagingAllocation,
    terminal: CaptureTerminalRecord,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<ValidatedArchive> {
    const record = this.ownedRecord(allocation);
    if (record.state === "cleanup-only") {
      throw (
        record.validationFailure ?? new StagingError("archive_output_invalid")
      );
    }
    if (record.state !== "writer-released" || record.terminal === undefined) {
      throw new StagingError("writer_unconfirmed");
    }
    if (!sameTerminal(record.terminal, terminal)) {
      throw new StagingError("capture_identity_mismatch");
    }
    const violation = record.watch?.violation;
    if (violation !== undefined) {
      throw new StagingError(violation.code);
    }
    if (
      record.identity === undefined ||
      !isCapturedArchiveEligible(
        terminal,
        record.identity,
        allocation.archiveBasePath,
        violation,
      )
    ) {
      throw new StagingError("archive_output_invalid");
    }
    record.state = "validating";
    try {
      const validated = await validateArchiveFile(
        {
          runId: allocation.runId,
          runDirectory: allocation.runDirectory,
          archivePath: allocation.archivePath,
          maximumArchiveBytes: this.policy.maximumArchiveBytes,
          metadataMaximumBytes: this.policy.metadataMaximumBytes,
          capture: terminal,
          signal: options.signal,
        },
        this.options.archiveValidatorHooks,
      );
      record.state = "retained";
      return validated;
    } catch (error) {
      record.validationFailure = error;
      record.state = "cleanup-only";
      throw error;
    }
  }

  async cleanup(allocation: StagingAllocation): Promise<void> {
    const record = this.ownedRecord(allocation);
    if (
      record.state !== "allocated" &&
      record.state !== "writer-released" &&
      record.state !== "cleanup-only" &&
      record.state !== "retained"
    ) {
      throw new StagingError("writer_unconfirmed");
    }
    const previousState = record.state;
    record.state = "cleaning";
    try {
      const runsDirectory = await this.ensureStagingRoot();
      const current = await lstat(allocation.runDirectory, { bigint: true });
      const resolved = await realpath(allocation.runDirectory);
      if (
        current.isSymbolicLink() ||
        !current.isDirectory() ||
        current.dev !== record.directoryDevice ||
        current.ino !== record.directoryInode ||
        dirname(resolved) !== runsDirectory ||
        basename(resolved) !== allocation.runId
      ) {
        throw new Error("Allocated directory identity changed");
      }
      await rm(allocation.runDirectory, {
        recursive: true,
        force: false,
        maxRetries: 3,
        retryDelay: 50,
      });
      record.state = "cleaned";
      this.activeRecord = undefined;
    } catch (error) {
      record.state = previousState;
      throw new StagingError("cleanup_failed", error);
    }
  }

  private ownedRecord(allocation: StagingAllocation): AllocationRecord {
    const record = this.records.get(allocation);
    if (record === undefined || record.state === "cleaned") {
      throw new StagingError("writer_unconfirmed");
    }
    return record;
  }

  private async ensureStagingRoot(): Promise<string> {
    if (!isAbsolute(this.policy.stagingRoot)) {
      throw new StagingError("configuration_invalid");
    }
    try {
      const rootStat = await lstat(this.policy.stagingRoot);
      const rootRealPath = await realpath(this.policy.stagingRoot);
      if (
        rootStat.isSymbolicLink() ||
        !rootStat.isDirectory() ||
        (this.policy.stagingRoot === STAGING_ROOT &&
          rootRealPath !== STAGING_ROOT)
      ) {
        throw new Error("Staging root is not a real directory");
      }
      const runsDirectory = join(rootRealPath, STAGING_RUNS_DIRECTORY);
      try {
        await mkdir(runsDirectory, { mode: 0o700 });
      } catch (error) {
        if (errorCode(error) !== "EEXIST") throw error;
      }
      const runsStat = await lstat(runsDirectory);
      const runsRealPath = await realpath(runsDirectory);
      if (
        runsStat.isSymbolicLink() ||
        !runsStat.isDirectory() ||
        dirname(runsRealPath) !== rootRealPath ||
        basename(runsRealPath) !== STAGING_RUNS_DIRECTORY
      ) {
        throw new Error("Staging runs path is not a real directory");
      }
      return runsRealPath;
    } catch (error) {
      if (error instanceof StagingError) throw error;
      throw new StagingError("staging_unavailable", error);
    }
  }

  private async requireCapacity(path: string): Promise<void> {
    let bytes: bigint;
    try {
      bytes =
        this.options.inspectAvailableBytes === undefined
          ? availableBytes(await statfs(path, { bigint: true }))
          : await this.options.inspectAvailableBytes(path);
    } catch (error) {
      throw new StagingError("staging_unavailable", error);
    }
    if (bytes < this.policy.minimumFreeBytes) {
      throw new StagingError("insufficient_capacity");
    }
  }
}

export function createStagingManager(
  policy: StagingPolicy,
  options: StagingManagerOptions = {},
): StagingManager {
  return new StagingManagerImplementation(policy, options);
}

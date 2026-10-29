import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  type FileHandle,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { join } from "node:path";

import {
  type BackupState,
  canonicalStateTimestamp,
  cloneBackupState,
  createPendingPublicationState,
  decodeBackupState,
  encodeBackupState,
  initialBackupState,
  type PendingPublicationStateV1,
  restorePendingPublicationRequest,
  STATE_MAXIMUM_BYTES,
} from "./durable-state.ts";
import type { PublicationPolicy } from "./object-storage-config.ts";
import {
  automaticRetryNotBefore,
  compareSlotIds,
  latestDueSlot,
  type ScheduledSlot,
  type SchedulePolicy,
} from "./schedule-policy.ts";
import {
  authorizeSnapshotPublicationRequest,
  type SnapshotPublicationRequest,
  snapshotManifestSha256,
} from "./snapshot-manifest.ts";
import type {
  PublishedSnapshot,
  RemoteObjectEvidence,
} from "./snapshot-publisher.ts";

export const STATE_ROOT = "/state";
export const STATE_DIRECTORY_NAME = "backupd";
export const STATE_FILE_NAME = "state.json";

export type StateRepositoryErrorCode =
  | "state_invalid"
  | "state_unavailable"
  | "state_conflict"
  | "state_not_eligible"
  | "state_durability_unconfirmed";

export class StateRepositoryError extends Error {
  readonly code: StateRepositoryErrorCode;

  constructor(code: StateRepositoryErrorCode, cause?: unknown) {
    super(
      `Backup state operation failed (${code})`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "StateRepositoryError";
    this.code = code;
  }
}

export interface AutomaticAttemptClaim {
  readonly slot: ScheduledSlot;
  readonly attemptsStarted: number;
  readonly notBefore: string;
  readonly maximumAttempts: number;
}

export interface RestoredPendingPublication {
  readonly request: SnapshotPublicationRequest;
  readonly attemptsStarted: number;
  readonly notBefore: string;
  readonly publicationDeadlineAt: string;
}

export interface StateRepository {
  load(): Promise<BackupState>;
  claimAutomaticAttempt(
    slot: ScheduledSlot,
    now: string,
    policy: SchedulePolicy,
  ): Promise<AutomaticAttemptClaim>;
  skipAutomaticRequest(slot: ScheduledSlot): Promise<BackupState>;
  finishAutomaticAttempt(
    claim: AutomaticAttemptClaim,
    outcome: "succeeded" | "failed",
  ): Promise<BackupState>;
  setPendingPublication(
    request: SnapshotPublicationRequest,
    now: string,
    retryDelayMs: number,
  ): Promise<BackupState>;
  claimPendingPublicationAttempt(
    runId: string,
    now: string,
    retryDelayMs: number,
  ): Promise<RestoredPendingPublication>;
  recordPublishedSnapshot(
    runId: string,
    published: PublishedSnapshot,
    confirmedAt: string,
  ): Promise<BackupState>;
  clearPendingWithoutSuccess(
    runId: string,
    reason: "expired" | "invalid" | "remote-status-unknown",
  ): Promise<BackupState>;
  reload(): Promise<BackupState>;
}

export interface StateRepositoryHooks {
  readonly beforeRename?: () => Promise<void>;
  readonly beforeDirectorySync?: () => Promise<void>;
}

export interface StateRepositoryOptions {
  readonly stateRoot?: string;
  readonly publicationPolicy: PublicationPolicy;
  readonly effectiveUid?: number;
  readonly hooks?: StateRepositoryHooks;
}

interface DirectoryIdentity {
  readonly device: bigint;
  readonly inode: bigint;
}

function hasExactKeys(value: unknown, keys: readonly string[]): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && keys.every((key) => actual.includes(key))
  );
}

const REMOTE_EVIDENCE_REQUIRED_KEYS = [
  "key",
  "byteLength",
  "contentType",
  "runId",
  "captureWindowId",
  "kind",
  "contentSha256",
] as const;
const REMOTE_EVIDENCE_OPTIONAL_KEYS = [
  "etag",
  "versionId",
  "checksumAlgorithm",
  "checksumType",
  "checksumValue",
] as const;
const REMOTE_EVIDENCE_KEYS = new Set<string>([
  ...REMOTE_EVIDENCE_REQUIRED_KEYS,
  ...REMOTE_EVIDENCE_OPTIONAL_KEYS,
]);

function validRemoteObjectEvidence(
  value: unknown,
): value is RemoteObjectEvidence {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const evidence = value as Record<string, unknown>;
  if (
    Object.keys(evidence).some((key) => !REMOTE_EVIDENCE_KEYS.has(key)) ||
    REMOTE_EVIDENCE_REQUIRED_KEYS.some(
      (key) => !Object.hasOwn(evidence, key),
    ) ||
    typeof evidence.key !== "string" ||
    typeof evidence.byteLength !== "number" ||
    !Number.isSafeInteger(evidence.byteLength) ||
    evidence.byteLength < 0
  ) {
    return false;
  }
  return REMOTE_EVIDENCE_OPTIONAL_KEYS.every(
    (key) => evidence[key] === undefined || typeof evidence[key] === "string",
  );
}

function stateTimestamp(value: string): string {
  try {
    return canonicalStateTimestamp(value);
  } catch (error) {
    throw new StateRepositoryError("state_invalid", error);
  }
}

function validateSlot(slot: ScheduledSlot): void {
  try {
    if (
      new Date(slot.dueAt).toISOString() !== slot.dueAt ||
      slot.dueAt.slice(0, 10) !== slot.id ||
      compareSlotIds(slot.id, slot.id) !== 0
    ) {
      throw new Error("slot mismatch");
    }
  } catch (error) {
    throw new StateRepositoryError("state_invalid", error);
  }
}

function systemCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function stateError(error: unknown): StateRepositoryError {
  if (error instanceof StateRepositoryError) return error;
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "state_invalid"
  ) {
    return new StateRepositoryError("state_invalid", error);
  }
  return new StateRepositoryError("state_unavailable", error);
}

function validateDelay(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new StateRepositoryError("state_invalid");
  }
}

function exactArchiveEvidence(
  evidence: RemoteObjectEvidence,
  request: SnapshotPublicationRequest,
): boolean {
  return (
    validRemoteObjectEvidence(evidence) &&
    evidence.key === request.keys.archiveKey &&
    evidence.byteLength === request.archive.byteLength &&
    evidence.contentType === "application/x-tar" &&
    evidence.runId === request.archive.runId &&
    evidence.captureWindowId ===
      request.archive.capture.identity.captureWindowId &&
    evidence.kind === "strapi-export-archive" &&
    evidence.contentSha256 === request.archive.sha256
  );
}

function exactManifestEvidence(
  evidence: RemoteObjectEvidence,
  request: SnapshotPublicationRequest,
): boolean {
  return (
    validRemoteObjectEvidence(evidence) &&
    evidence.key === request.keys.manifestKey &&
    evidence.byteLength === request.manifestBytes.byteLength &&
    evidence.contentType === "application/json" &&
    evidence.runId === request.archive.runId &&
    evidence.captureWindowId ===
      request.archive.capture.identity.captureWindowId &&
    evidence.kind === "strapi-export-manifest" &&
    evidence.contentSha256 === snapshotManifestSha256(request.manifestBytes)
  );
}

class StateRepositoryImplementation implements StateRepository {
  private readonly stateDirectory: string;
  private readonly statePath: string;
  private readonly publicationPolicy: PublicationPolicy;
  private readonly effectiveUid: number;
  private readonly hooks: StateRepositoryHooks;
  private committed: BackupState | undefined;
  private directoryIdentity: DirectoryIdentity | undefined;
  private durabilityUnconfirmed = false;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(options: StateRepositoryOptions) {
    const stateRoot = options.stateRoot ?? STATE_ROOT;
    this.stateDirectory = join(stateRoot, STATE_DIRECTORY_NAME);
    this.statePath = join(this.stateDirectory, STATE_FILE_NAME);
    this.publicationPolicy = options.publicationPolicy;
    const processUid = process.geteuid?.();
    if (options.effectiveUid === undefined && processUid === undefined) {
      throw new StateRepositoryError("state_unavailable");
    }
    this.effectiveUid = options.effectiveUid ?? (processUid as number);
    this.hooks = options.hooks ?? {};
  }

  load(): Promise<BackupState> {
    return this.serialize(async () =>
      cloneBackupState(await this.ensureLoaded(false)),
    );
  }

  claimAutomaticAttempt(
    slot: ScheduledSlot,
    now: string,
    policy: SchedulePolicy,
  ): Promise<AutomaticAttemptClaim> {
    return this.serialize(async () => {
      const state = await this.requireMutableState();
      stateTimestamp(now);
      validateSlot(slot);
      const newest = latestDueSlot(now, policy);
      if (
        newest.id !== slot.id ||
        newest.dueAt !== slot.dueAt ||
        state.pendingPublication !== null
      ) {
        throw new StateRepositoryError("state_not_eligible");
      }
      let attemptsStarted: number;
      const retry = state.schedule.retry;
      if (retry?.slot === slot.id) {
        if (
          Date.parse(now) < Date.parse(retry.notBefore) ||
          retry.attemptsStarted >= policy.automaticMaximumAttempts
        ) {
          throw new StateRepositoryError("state_not_eligible");
        }
        attemptsStarted = retry.attemptsStarted + 1;
      } else {
        if (
          state.schedule.lastClaimedSlot !== null &&
          compareSlotIds(slot.id, state.schedule.lastClaimedSlot) <= 0
        ) {
          throw new StateRepositoryError("state_not_eligible");
        }
        attemptsStarted = 1;
      }
      const notBefore = automaticRetryNotBefore(now, policy);
      const next: BackupState = {
        ...state,
        schedule: {
          lastClaimedSlot: slot.id,
          retry: { slot: slot.id, attemptsStarted, notBefore },
        },
      };
      await this.commit(next);
      return Object.freeze({
        slot: { ...slot },
        attemptsStarted,
        notBefore,
        maximumAttempts: policy.automaticMaximumAttempts,
      });
    });
  }

  skipAutomaticRequest(slot: ScheduledSlot): Promise<BackupState> {
    return this.serialize(async () => {
      const state = await this.requireMutableState();
      validateSlot(slot);
      const claimed = state.schedule.lastClaimedSlot;
      if (claimed !== null && compareSlotIds(slot.id, claimed) < 0) {
        return cloneBackupState(state);
      }
      const next: BackupState = {
        ...state,
        schedule: { lastClaimedSlot: slot.id, retry: null },
      };
      await this.commit(next);
      return cloneBackupState(next);
    });
  }

  finishAutomaticAttempt(
    claim: AutomaticAttemptClaim,
    outcome: "succeeded" | "failed",
  ): Promise<BackupState> {
    return this.serialize(async () => {
      const state = await this.requireMutableState();
      validateSlot(claim.slot);
      if (outcome !== "succeeded" && outcome !== "failed") {
        throw new StateRepositoryError("state_invalid");
      }
      const slotOrder = compareSlotIds(
        state.schedule.lastClaimedSlot ?? claim.slot.id,
        claim.slot.id,
      );
      if (slotOrder > 0) return cloneBackupState(state);
      if (
        slotOrder < 0 ||
        state.schedule.lastClaimedSlot !== claim.slot.id ||
        !Number.isSafeInteger(claim.maximumAttempts) ||
        claim.maximumAttempts < 1 ||
        claim.maximumAttempts > 3 ||
        claim.attemptsStarted > claim.maximumAttempts
      ) {
        throw new StateRepositoryError("state_conflict");
      }
      const retry = state.schedule.retry;
      if (retry === null) return cloneBackupState(state);
      if (
        retry.slot !== claim.slot.id ||
        retry.attemptsStarted !== claim.attemptsStarted ||
        retry.notBefore !== claim.notBefore
      ) {
        throw new StateRepositoryError("state_conflict");
      }
      const keepRetry =
        outcome === "failed" && retry.attemptsStarted < claim.maximumAttempts;
      const next: BackupState = {
        ...state,
        schedule: {
          ...state.schedule,
          retry: keepRetry ? retry : null,
        },
      };
      await this.commit(next);
      return cloneBackupState(next);
    });
  }

  setPendingPublication(
    request: SnapshotPublicationRequest,
    now: string,
    retryDelayMs: number,
  ): Promise<BackupState> {
    return this.serialize(async () => {
      validateDelay(retryDelayMs);
      const state = await this.requireMutableState();
      stateTimestamp(now);
      const authorizedRequest = authorizeSnapshotPublicationRequest(request);
      const pending = createPendingPublicationState(
        authorizedRequest,
        state.pendingPublication?.runId === authorizedRequest.archive.runId
          ? state.pendingPublication.notBefore
          : now,
      );
      if (state.pendingPublication !== null) {
        const currentIdentity = {
          ...state.pendingPublication,
          attemptsStarted: 0,
          notBefore: pending.notBefore,
        };
        if (
          state.pendingPublication.runId === pending.runId &&
          JSON.stringify(currentIdentity) === JSON.stringify(pending)
        ) {
          return cloneBackupState(state);
        }
        throw new StateRepositoryError("state_conflict");
      }
      const next: BackupState = {
        ...state,
        schedule: { ...state.schedule, retry: null },
        pendingPublication: pending,
      };
      await this.commit(next);
      return cloneBackupState(next);
    });
  }

  claimPendingPublicationAttempt(
    runId: string,
    now: string,
    retryDelayMs: number,
  ): Promise<RestoredPendingPublication> {
    return this.serialize(async () => {
      validateDelay(retryDelayMs);
      stateTimestamp(now);
      const state = await this.requireMutableState();
      const pending = state.pendingPublication;
      if (
        pending === null ||
        pending.runId !== runId ||
        Date.parse(now) < Date.parse(pending.notBefore) ||
        Date.parse(now) >= Date.parse(pending.publicationDeadlineAt)
      ) {
        throw new StateRepositoryError("state_not_eligible");
      }
      const nextNotBefore = new Date(
        Math.min(
          Date.parse(now) + retryDelayMs,
          Date.parse(pending.publicationDeadlineAt),
        ),
      ).toISOString();
      const nextPending: PendingPublicationStateV1 = {
        ...pending,
        attemptsStarted: pending.attemptsStarted + 1,
        notBefore: nextNotBefore,
      };
      if (!Number.isSafeInteger(nextPending.attemptsStarted)) {
        throw new StateRepositoryError("state_invalid");
      }
      const next: BackupState = { ...state, pendingPublication: nextPending };
      await this.commit(next);
      return Object.freeze({
        request: restorePendingPublicationRequest(
          nextPending,
          this.publicationPolicy,
        ),
        attemptsStarted: nextPending.attemptsStarted,
        notBefore: nextPending.notBefore,
        publicationDeadlineAt: nextPending.publicationDeadlineAt,
      });
    });
  }

  recordPublishedSnapshot(
    runId: string,
    published: PublishedSnapshot,
    confirmedAt: string,
  ): Promise<BackupState> {
    return this.serialize(async () => {
      const state = await this.requireMutableState();
      const request = authorizeSnapshotPublicationRequest(published.request);
      stateTimestamp(confirmedAt);
      if (
        !hasExactKeys(published, [
          "status",
          "request",
          "archive",
          "manifest",
        ]) ||
        (published.status !== "published" &&
          published.status !== "already-published") ||
        request.archive.runId !== runId ||
        !exactArchiveEvidence(published.archive, request) ||
        !exactManifestEvidence(published.manifest, request)
      ) {
        throw new StateRepositoryError("state_conflict");
      }
      const pending = state.pendingPublication;
      if (pending === null) {
        if (
          state.lastCompletedSnapshot?.runId === runId &&
          state.lastCompletedSnapshot.capturedAt ===
            request.manifest.capture.capturedAt &&
          state.lastCompletedSnapshot.archiveKey === request.keys.archiveKey &&
          state.lastCompletedSnapshot.manifestKey === request.keys.manifestKey
        ) {
          return cloneBackupState(state);
        }
        throw new StateRepositoryError("state_conflict");
      }
      if (
        pending.runId !== runId ||
        pending.archiveKey !== request.keys.archiveKey ||
        pending.manifestKey !== request.keys.manifestKey ||
        pending.publicationDeadlineAt !== request.publicationDeadlineAt ||
        pending.acceptedAt !== request.archive.capture.acceptedAt
      ) {
        throw new StateRepositoryError("state_conflict");
      }
      const candidate = {
        runId,
        capturedAt: request.manifest.capture.capturedAt,
        confirmedAt,
        archiveKey: request.keys.archiveKey,
        manifestKey: request.keys.manifestKey,
      };
      if (
        Date.parse(candidate.confirmedAt) < Date.parse(candidate.capturedAt)
      ) {
        throw new StateRepositoryError("state_conflict");
      }
      const freshness =
        state.lastCompletedSnapshot !== null &&
        Date.parse(state.lastCompletedSnapshot.capturedAt) >
          Date.parse(candidate.capturedAt)
          ? state.lastCompletedSnapshot
          : candidate;
      const next: BackupState = {
        ...state,
        lastCompletedSnapshot: freshness,
        pendingPublication: null,
      };
      await this.commit(next);
      return cloneBackupState(next);
    });
  }

  clearPendingWithoutSuccess(
    runId: string,
    reason: "expired" | "invalid" | "remote-status-unknown",
  ): Promise<BackupState> {
    return this.serialize(async () => {
      const state = await this.requireMutableState();
      if (
        reason !== "expired" &&
        reason !== "invalid" &&
        reason !== "remote-status-unknown"
      ) {
        throw new StateRepositoryError("state_invalid");
      }
      if (state.pendingPublication?.runId !== runId) {
        throw new StateRepositoryError("state_conflict");
      }
      const next: BackupState = { ...state, pendingPublication: null };
      await this.commit(next);
      return cloneBackupState(next);
    });
  }

  reload(): Promise<BackupState> {
    return this.serialize(async () => {
      this.committed = undefined;
      this.directoryIdentity = undefined;
      const state = await this.ensureLoaded(true);
      this.durabilityUnconfirmed = false;
      return cloneBackupState(state);
    });
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(operation, operation);
    this.mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async requireMutableState(): Promise<BackupState> {
    if (this.durabilityUnconfirmed) {
      throw new StateRepositoryError("state_durability_unconfirmed");
    }
    return this.ensureLoaded(false);
  }

  private async ensureLoaded(force: boolean): Promise<BackupState> {
    if (!force && this.committed !== undefined) return this.committed;
    await this.ensureDirectory();
    try {
      const handle = await open(
        this.statePath,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      let readFailure: unknown;
      try {
        const stat = await handle.stat({ bigint: true });
        if (
          !stat.isFile() ||
          stat.uid !== BigInt(this.effectiveUid) ||
          (stat.mode & 0o777n) !== 0o600n ||
          stat.size <= 0n ||
          stat.size > BigInt(STATE_MAXIMUM_BYTES)
        ) {
          throw new StateRepositoryError("state_invalid");
        }
        const bytes = Buffer.alloc(STATE_MAXIMUM_BYTES + 1);
        let length = 0;
        while (length < bytes.byteLength) {
          const { bytesRead } = await handle.read(
            bytes,
            length,
            bytes.byteLength - length,
            length,
          );
          if (bytesRead === 0) break;
          length += bytesRead;
        }
        if (length > STATE_MAXIMUM_BYTES || BigInt(length) !== stat.size) {
          throw new StateRepositoryError("state_invalid");
        }
        this.committed = decodeBackupState(bytes.subarray(0, length));
      } catch (error) {
        readFailure = error;
      }
      try {
        await handle.close();
      } catch (closeError) {
        if (readFailure !== undefined) {
          throw new AggregateError([readFailure, closeError]);
        }
        throw closeError;
      }
      if (readFailure !== undefined) throw readFailure;
    } catch (error) {
      if (systemCode(error) === "ENOENT") {
        this.committed = initialBackupState();
      } else {
        throw stateError(error);
      }
    }
    if (this.committed === undefined) {
      throw new StateRepositoryError("state_unavailable");
    }
    return this.committed;
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await mkdir(this.stateDirectory, { mode: 0o700 });
    } catch (error) {
      if (systemCode(error) !== "EEXIST") {
        throw new StateRepositoryError("state_unavailable", error);
      }
    }
    try {
      const stat = await lstat(this.stateDirectory, { bigint: true });
      if (
        !stat.isDirectory() ||
        stat.uid !== BigInt(this.effectiveUid) ||
        (stat.mode & 0o777n) !== 0o700n ||
        (await realpath(this.stateDirectory)) !== this.stateDirectory
      ) {
        throw new StateRepositoryError("state_unavailable");
      }
      this.directoryIdentity = { device: stat.dev, inode: stat.ino };
    } catch (error) {
      throw stateError(error);
    }
  }

  private async revalidateDirectory(): Promise<void> {
    const expected = this.directoryIdentity;
    const stat = await lstat(this.stateDirectory, { bigint: true });
    if (
      expected === undefined ||
      !stat.isDirectory() ||
      stat.dev !== expected.device ||
      stat.ino !== expected.inode ||
      stat.uid !== BigInt(this.effectiveUid) ||
      (stat.mode & 0o777n) !== 0o700n
    ) {
      throw new StateRepositoryError("state_unavailable");
    }
  }

  private async commit(nextState: BackupState): Promise<void> {
    const next = cloneBackupState(nextState);
    const bytes = encodeBackupState(next);
    const temporaryPath = join(
      this.stateDirectory,
      `.state.${process.pid}.${randomUUID()}.tmp`,
    );
    let handle: FileHandle | undefined;
    let renamed = false;
    try {
      handle = await open(
        temporaryPath,
        constants.O_CREAT |
          constants.O_EXCL |
          constants.O_WRONLY |
          constants.O_NOFOLLOW,
        0o600,
      );
      await handle.writeFile(bytes);
      await handle.sync();
      await handle.close();
      handle = undefined;
      await this.revalidateDirectory();
      await this.hooks.beforeRename?.();
      await rename(temporaryPath, this.statePath);
      renamed = true;
      const directory = await open(
        this.stateDirectory,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      let syncFailure: unknown;
      try {
        const directoryStat = await directory.stat({ bigint: true });
        const expectedDirectory = this.directoryIdentity;
        if (
          expectedDirectory === undefined ||
          !directoryStat.isDirectory() ||
          directoryStat.dev !== expectedDirectory.device ||
          directoryStat.ino !== expectedDirectory.inode ||
          directoryStat.uid !== BigInt(this.effectiveUid) ||
          (directoryStat.mode & 0o777n) !== 0o700n
        ) {
          throw new StateRepositoryError("state_unavailable");
        }
        await this.hooks.beforeDirectorySync?.();
        await directory.sync();
      } catch (error) {
        syncFailure = error;
      }
      try {
        await directory.close();
      } catch (closeError) {
        if (syncFailure !== undefined) {
          throw new AggregateError([syncFailure, closeError]);
        }
        throw closeError;
      }
      if (syncFailure !== undefined) throw syncFailure;
      this.committed = next;
    } catch (error) {
      let cleanupError: unknown;
      if (handle !== undefined) {
        try {
          await handle.close();
        } catch (closeError) {
          cleanupError = closeError;
        }
      }
      if (!renamed) {
        try {
          await rm(temporaryPath, { force: true });
        } catch (removeError) {
          cleanupError =
            cleanupError === undefined
              ? removeError
              : new AggregateError([cleanupError, removeError]);
        }
      } else {
        this.durabilityUnconfirmed = true;
      }
      const cause =
        cleanupError === undefined
          ? error
          : new AggregateError([error, cleanupError]);
      throw new StateRepositoryError(
        renamed ? "state_durability_unconfirmed" : "state_unavailable",
        cause,
      );
    }
  }
}

export function createStateRepository(
  options: StateRepositoryOptions,
): StateRepository {
  return new StateRepositoryImplementation(options);
}

import { isAbsolute, relative } from "node:path";

import {
  validateCanonicalUuid,
  validateIdentityToken,
} from "../../strapid/src/capture-contract.ts";
import type { ValidatedArchive } from "./archive-validator.ts";
import {
  FINAL_RECONCILIATION_RESERVE_MS,
  type PublicationPolicy,
  type SnapshotAttribution,
} from "./object-storage-config.ts";
import {
  authorizeSnapshotPublicationRequest,
  createSnapshotPublicationRequest,
  type SnapshotPublicationRequest,
} from "./snapshot-manifest.ts";

export const STATE_MAXIMUM_BYTES = 65_536;

export interface PersistedValidatedArchiveV1 {
  readonly runId: string;
  readonly archivePath: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly metadata: {
    readonly createdAt: string;
    readonly strapiVersion: string;
  };
  readonly capture: ValidatedArchive["capture"];
  readonly fileIdentity: {
    readonly device: string;
    readonly inode: string;
    readonly size: string;
    readonly modifiedNanoseconds: string;
    readonly changedNanoseconds: string;
  };
}

export interface PendingPublicationStateV1 {
  readonly runId: string;
  readonly archiveKey: string;
  readonly manifestKey: string;
  readonly acceptedAt: string;
  readonly publicationDeadlineAt: string;
  readonly attemptsStarted: number;
  readonly notBefore: string;
  readonly attribution: SnapshotAttribution;
  readonly archive: PersistedValidatedArchiveV1;
}

export interface BackupStateFileV1 {
  readonly version: 1;
  readonly schedule: {
    readonly lastClaimedSlot: string | null;
    readonly retry: null | {
      readonly slot: string;
      readonly attemptsStarted: number;
      readonly notBefore: string;
    };
  };
  readonly lastCompletedSnapshot: null | {
    readonly runId: string;
    readonly capturedAt: string;
    readonly confirmedAt: string;
    readonly archiveKey: string;
    readonly manifestKey: string;
  };
  readonly pendingPublication: PendingPublicationStateV1 | null;
}

export type BackupState = BackupStateFileV1;

export class DurableStateError extends Error {
  readonly code = "state_invalid" as const;

  constructor(cause?: unknown) {
    super(
      "Durable backup state is invalid",
      cause === undefined ? undefined : { cause },
    );
    this.name = "DurableStateError";
  }
}

function exactObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DurableStateError();
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== keys.length ||
    keys.some((key) => !(key in record))
  ) {
    throw new DurableStateError();
  }
  return record;
}

function canonicalTimestamp(value: unknown): string {
  if (typeof value !== "string") throw new DurableStateError();
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new DurableStateError();
  }
  return value;
}

function canonicalSlot(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DurableStateError();
  }
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString().slice(0, 10) !== value
  ) {
    throw new DurableStateError();
  }
  return value;
}

function canonicalUuid(value: unknown, name: string): string {
  try {
    return validateCanonicalUuid(value, name);
  } catch (error) {
    throw new DurableStateError(error);
  }
}

function token(value: unknown, name: string, maximum = 256): string {
  try {
    return validateIdentityToken(value, name, maximum);
  } catch (error) {
    throw new DurableStateError(error);
  }
}

function unsignedDecimal(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new DurableStateError();
  }
  return BigInt(value);
}

function safeAttemptCount(value: unknown, allowZero: boolean): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new DurableStateError();
  }
  return value;
}

function safeAutomaticAttemptCount(value: unknown): number {
  const attempts = safeAttemptCount(value, false);
  if (attempts > 3) throw new DurableStateError();
  return attempts;
}

function stagingPath(value: unknown): string {
  if (typeof value !== "string" || !isAbsolute(value)) {
    throw new DurableStateError();
  }
  const child = relative("/staging", value);
  if (
    child.length === 0 ||
    child === ".." ||
    child.startsWith("../") ||
    isAbsolute(child)
  ) {
    throw new DurableStateError();
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function initialBackupState(): BackupState {
  return deepFreeze({
    version: 1,
    schedule: { lastClaimedSlot: null, retry: null },
    lastCompletedSnapshot: null,
    pendingPublication: null,
  });
}

export function cloneBackupState(state: BackupState): BackupState {
  return deepFreeze(structuredClone(state));
}

function persistedArchive(
  request: SnapshotPublicationRequest,
): PersistedValidatedArchiveV1 {
  const archive = request.archive;
  return {
    runId: archive.runId,
    archivePath: archive.archivePath,
    byteLength: archive.byteLength,
    sha256: archive.sha256,
    metadata: { ...archive.metadata },
    capture: structuredClone(archive.capture),
    fileIdentity: {
      device: archive.fileIdentity.device.toString(),
      inode: archive.fileIdentity.inode.toString(),
      size: archive.fileIdentity.size.toString(),
      modifiedNanoseconds: archive.fileIdentity.modifiedNanoseconds.toString(),
      changedNanoseconds: archive.fileIdentity.changedNanoseconds.toString(),
    },
  };
}

export function createPendingPublicationState(
  suppliedRequest: SnapshotPublicationRequest,
  now: string,
): PendingPublicationStateV1 {
  const request = authorizeSnapshotPublicationRequest(suppliedRequest);
  canonicalTimestamp(now);
  const acceptedAt = request.archive.capture.acceptedAt;
  if (acceptedAt === undefined) throw new DurableStateError();
  if (
    Date.parse(now) < Date.parse(acceptedAt) ||
    Date.parse(now) > Date.parse(request.publicationDeadlineAt)
  ) {
    throw new DurableStateError();
  }
  return deepFreeze({
    runId: request.archive.runId,
    archiveKey: request.keys.archiveKey,
    manifestKey: request.keys.manifestKey,
    acceptedAt,
    publicationDeadlineAt: request.publicationDeadlineAt,
    attemptsStarted: 0,
    notBefore: now,
    attribution: { ...request.attribution },
    archive: persistedArchive(request),
  });
}

function runtimeArchive(
  persisted: PersistedValidatedArchiveV1,
): ValidatedArchive {
  const fileIdentity = exactObject(persisted.fileIdentity, [
    "device",
    "inode",
    "size",
    "modifiedNanoseconds",
    "changedNanoseconds",
  ]);
  const archive: ValidatedArchive = {
    runId: persisted.runId,
    archivePath: persisted.archivePath,
    byteLength: persisted.byteLength,
    sha256: persisted.sha256,
    metadata: { ...persisted.metadata },
    capture: structuredClone(persisted.capture),
    fileIdentity: {
      device: unsignedDecimal(fileIdentity.device),
      inode: unsignedDecimal(fileIdentity.inode),
      size: unsignedDecimal(fileIdentity.size),
      modifiedNanoseconds: unsignedDecimal(fileIdentity.modifiedNanoseconds),
      changedNanoseconds: unsignedDecimal(fileIdentity.changedNanoseconds),
    },
  };
  return archive;
}

function validatePendingShape(pending: PendingPublicationStateV1): void {
  exactObject(pending, [
    "runId",
    "archiveKey",
    "manifestKey",
    "acceptedAt",
    "publicationDeadlineAt",
    "attemptsStarted",
    "notBefore",
    "attribution",
    "archive",
  ]);
  exactObject(pending.attribution, [
    "site",
    "environment",
    "imageDigest",
    "gitRevision",
  ]);
  exactObject(pending.archive, [
    "runId",
    "archivePath",
    "byteLength",
    "sha256",
    "metadata",
    "capture",
    "fileIdentity",
  ]);
  exactObject(pending.archive.metadata, ["createdAt", "strapiVersion"]);
  const capture = exactObject(pending.archive.capture, [
    "version",
    "type",
    "identity",
    "archiveBasePath",
    "startedAt",
    "deadlineAt",
    "acceptedAt",
    "completedAt",
    "outcome",
  ]);
  exactObject(capture.identity, [
    "supervisorInstanceId",
    "captureWindowId",
    "releaseId",
    "sourceVolumeId",
    "nodeVersion",
    "strapiVersion",
  ]);
  exactObject(capture.outcome, [
    "status",
    "exportClosedAt",
    "servingRecoveredAt",
  ]);
}

export function restorePendingPublicationRequest(
  pending: PendingPublicationStateV1,
  currentPolicy: Pick<
    PublicationPolicy,
    "uploadConcurrency" | "finalReconciliationReserveMs"
  >,
): SnapshotPublicationRequest {
  try {
    validatePendingShape(pending);
    canonicalUuid(pending.runId, "runId");
    safeAttemptCount(pending.attemptsStarted, true);
    const accepted = Date.parse(canonicalTimestamp(pending.acceptedAt));
    const deadline = Date.parse(
      canonicalTimestamp(pending.publicationDeadlineAt),
    );
    const notBefore = Date.parse(canonicalTimestamp(pending.notBefore));
    const captureStarted = Date.parse(
      canonicalTimestamp(pending.archive.capture.startedAt),
    );
    const captureDeadline = Date.parse(
      canonicalTimestamp(pending.archive.capture.deadlineAt),
    );
    const captureCompleted = Date.parse(
      canonicalTimestamp(pending.archive.capture.completedAt),
    );
    if (
      deadline <= accepted ||
      notBefore < accepted ||
      notBefore > deadline ||
      pending.archive.capture.version !== 1 ||
      pending.archive.capture.type !== "terminal" ||
      pending.archive.capture.outcome.status !== "captured" ||
      captureStarted > accepted ||
      accepted > captureDeadline ||
      captureCompleted > captureDeadline ||
      pending.archive.runId !== pending.runId ||
      pending.archive.capture.acceptedAt !== pending.acceptedAt
    ) {
      throw new DurableStateError();
    }
    stagingPath(pending.archive.archivePath);
    stagingPath(pending.archive.capture.archiveBasePath);
    if (
      pending.archive.capture.archiveBasePath !==
        `/staging/runs/${pending.runId}/strapi-export` ||
      pending.archive.archivePath !==
        `${pending.archive.capture.archiveBasePath}.tar`
    ) {
      throw new DurableStateError();
    }
    canonicalTimestamp(pending.archive.metadata.createdAt);
    token(pending.archive.metadata.strapiVersion, "strapiVersion", 64);
    const archive = runtimeArchive(pending.archive);
    if (archive.fileIdentity.size !== BigInt(archive.byteLength)) {
      throw new DurableStateError();
    }
    const request = createSnapshotPublicationRequest(
      archive,
      { ...pending.attribution },
      {
        uploadConcurrency: currentPolicy.uploadConcurrency,
        publicationWindowMs: deadline - accepted,
        finalReconciliationReserveMs:
          currentPolicy.finalReconciliationReserveMs,
      },
    );
    if (
      request.publicationDeadlineAt !== pending.publicationDeadlineAt ||
      request.keys.archiveKey !== pending.archiveKey ||
      request.keys.manifestKey !== pending.manifestKey
    ) {
      throw new DurableStateError();
    }
    return request;
  } catch (error) {
    if (error instanceof DurableStateError) throw error;
    throw new DurableStateError(error);
  }
}

function validateCompleted(value: BackupState["lastCompletedSnapshot"]): void {
  if (value === null) return;
  exactObject(value, [
    "runId",
    "capturedAt",
    "confirmedAt",
    "archiveKey",
    "manifestKey",
  ]);
  canonicalUuid(value.runId, "runId");
  const captured = Date.parse(canonicalTimestamp(value.capturedAt));
  const confirmed = Date.parse(canonicalTimestamp(value.confirmedAt));
  if (confirmed < captured) throw new DurableStateError();
  if (
    typeof value.archiveKey !== "string" ||
    typeof value.manifestKey !== "string"
  ) {
    throw new DurableStateError();
  }
  const suffix = `/${value.runId}`;
  const archivePrefix = value.archiveKey.slice(0, -"/archive.tar".length);
  const manifestPrefix = value.manifestKey.slice(0, -"/manifest.json".length);
  if (
    !value.archiveKey.endsWith("/archive.tar") ||
    !value.manifestKey.endsWith("/manifest.json") ||
    archivePrefix !== manifestPrefix ||
    !archivePrefix.endsWith(suffix) ||
    !/^snapshots\/v1\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9a-f-]+$/.test(
      archivePrefix,
    )
  ) {
    throw new DurableStateError();
  }
}

export function validateBackupState(value: BackupState): BackupState {
  const root = exactObject(value, [
    "version",
    "schedule",
    "lastCompletedSnapshot",
    "pendingPublication",
  ]);
  if (root.version !== 1) throw new DurableStateError();
  const schedule = exactObject(root.schedule, ["lastClaimedSlot", "retry"]);
  if (schedule.lastClaimedSlot !== null)
    canonicalSlot(schedule.lastClaimedSlot);
  if (schedule.retry !== null) {
    const retry = exactObject(schedule.retry, [
      "slot",
      "attemptsStarted",
      "notBefore",
    ]);
    const slot = canonicalSlot(retry.slot);
    if (slot !== schedule.lastClaimedSlot) throw new DurableStateError();
    safeAutomaticAttemptCount(retry.attemptsStarted);
    canonicalTimestamp(retry.notBefore);
  }
  validateCompleted(value.lastCompletedSnapshot);
  if (value.pendingPublication !== null) {
    restorePendingPublicationRequest(value.pendingPublication, {
      uploadConcurrency: 1,
      finalReconciliationReserveMs: FINAL_RECONCILIATION_RESERVE_MS,
    });
  }
  return cloneBackupState(value);
}

function serializeUnchecked(state: BackupState): Uint8Array {
  const bytes = Buffer.from(`${JSON.stringify(state)}\n`, "utf8");
  if (bytes.byteLength > STATE_MAXIMUM_BYTES) {
    throw new DurableStateError();
  }
  return bytes;
}

export function encodeBackupState(state: BackupState): Uint8Array {
  return serializeUnchecked(validateBackupState(state));
}

export function decodeBackupState(bytes: Uint8Array): BackupState {
  if (bytes.byteLength === 0 || bytes.byteLength > STATE_MAXIMUM_BYTES) {
    throw new DurableStateError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch (error) {
    throw new DurableStateError(error);
  }
  const state = validateBackupState(parsed as BackupState);
  if (!Buffer.from(bytes).equals(Buffer.from(serializeUnchecked(state)))) {
    throw new DurableStateError();
  }
  return state;
}

export function canonicalStateTimestamp(value: string): string {
  return canonicalTimestamp(value);
}

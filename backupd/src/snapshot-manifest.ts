import { createHash } from "node:crypto";

import {
  validateCanonicalUuid,
  validateIdentityToken,
} from "../../strapid/src/capture-contract.ts";
import type { ValidatedArchive } from "./archive-validator.ts";
import type {
  PublicationPolicy,
  SnapshotAttribution,
} from "./object-storage-config.ts";

const MEBIBYTE = 1_048_576;
const MINIMUM_PART_SIZE = 5 * MEBIBYTE;
const MAXIMUM_PART_SIZE = 5 * 1_024 * MEBIBYTE;
const MAXIMUM_PARTS = 1_000;
const MANIFEST_MAXIMUM_BYTES = 65_536;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type SnapshotPolicyErrorCode =
  | "manifest_invalid"
  | "part_size_invalid"
  | "publication_expired";

export class SnapshotPolicyError extends Error {
  readonly code: SnapshotPolicyErrorCode;

  constructor(code: SnapshotPolicyErrorCode, cause?: unknown) {
    super(
      `Snapshot policy rejected the request (${code})`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "SnapshotPolicyError";
    this.code = code;
  }
}

export interface SnapshotManifestV1 {
  readonly version: 1;
  readonly kind: "strapi-export-snapshot";
  readonly runId: string;
  readonly site: string;
  readonly environment: string;
  readonly capture: {
    readonly capturedAt: string;
    readonly intervalStartedAt: string;
    readonly intervalCompletedAt: string;
    readonly servingRecoveredAt: string;
    readonly supervisorInstanceId: string;
    readonly captureWindowId: string;
    readonly sourceVolumeId: string;
  };
  readonly application: {
    readonly releaseId: string;
    readonly imageDigest: string;
    readonly gitRevision: string;
    readonly nodeVersion: string;
    readonly strapiVersion: string;
  };
  readonly archive: {
    readonly format: "strapi-export-tar";
    readonly key: string;
    readonly byteLength: number;
    readonly sha256: string;
  };
}

export interface SnapshotPublicationRequest {
  readonly archive: ValidatedArchive;
  readonly attribution: SnapshotAttribution;
  readonly keys: {
    readonly archiveKey: string;
    readonly manifestKey: string;
  };
  readonly manifest: SnapshotManifestV1;
  readonly manifestBytes: Uint8Array;
  readonly publicationDeadlineAt: string;
}

const publicationAuthorities = new WeakMap<
  SnapshotPublicationRequest,
  SnapshotPublicationRequest
>();

function cloneValidatedArchive(archive: ValidatedArchive): ValidatedArchive {
  if (
    archive.capture.outcome.status !== "captured" ||
    archive.capture.acceptedAt === undefined
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  return {
    runId: archive.runId,
    archivePath: archive.archivePath,
    byteLength: archive.byteLength,
    sha256: archive.sha256,
    metadata: {
      createdAt: archive.metadata.createdAt,
      strapiVersion: archive.metadata.strapiVersion,
    },
    capture: {
      version: 1,
      type: "terminal",
      identity: {
        supervisorInstanceId: archive.capture.identity.supervisorInstanceId,
        captureWindowId: archive.capture.identity.captureWindowId,
        releaseId: archive.capture.identity.releaseId,
        sourceVolumeId: archive.capture.identity.sourceVolumeId,
        nodeVersion: archive.capture.identity.nodeVersion,
        strapiVersion: archive.capture.identity.strapiVersion,
      },
      archiveBasePath: archive.capture.archiveBasePath,
      startedAt: archive.capture.startedAt,
      deadlineAt: archive.capture.deadlineAt,
      acceptedAt: archive.capture.acceptedAt,
      completedAt: archive.capture.completedAt,
      outcome: {
        status: "captured",
        exportClosedAt: archive.capture.outcome.exportClosedAt,
        servingRecoveredAt: archive.capture.outcome.servingRecoveredAt,
      },
    },
    fileIdentity: {
      device: archive.fileIdentity.device,
      inode: archive.fileIdentity.inode,
      size: archive.fileIdentity.size,
      modifiedNanoseconds: archive.fileIdentity.modifiedNanoseconds,
      changedNanoseconds: archive.fileIdentity.changedNanoseconds,
    },
  };
}

function cloneManifest(manifest: SnapshotManifestV1): SnapshotManifestV1 {
  return {
    version: 1,
    kind: "strapi-export-snapshot",
    runId: manifest.runId,
    site: manifest.site,
    environment: manifest.environment,
    capture: { ...manifest.capture },
    application: { ...manifest.application },
    archive: { ...manifest.archive },
  };
}

function clonePublicationRequest(
  request: SnapshotPublicationRequest,
): SnapshotPublicationRequest {
  return Object.freeze({
    archive: cloneValidatedArchive(request.archive),
    attribution: { ...request.attribution },
    keys: { ...request.keys },
    manifest: cloneManifest(request.manifest),
    manifestBytes: Uint8Array.from(request.manifestBytes),
    publicationDeadlineAt: request.publicationDeadlineAt,
  });
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

function sameAuthorizedArchive(
  current: ValidatedArchive,
  authority: ValidatedArchive,
): boolean {
  const currentCapture = current.capture;
  const authorityCapture = authority.capture;
  return (
    hasExactKeys(current, [
      "runId",
      "archivePath",
      "byteLength",
      "sha256",
      "metadata",
      "capture",
      "fileIdentity",
    ]) &&
    hasExactKeys(current.metadata, ["createdAt", "strapiVersion"]) &&
    hasExactKeys(current.fileIdentity, [
      "device",
      "inode",
      "size",
      "modifiedNanoseconds",
      "changedNanoseconds",
    ]) &&
    hasExactKeys(currentCapture, [
      "version",
      "type",
      "identity",
      "archiveBasePath",
      "startedAt",
      "deadlineAt",
      "acceptedAt",
      "completedAt",
      "outcome",
    ]) &&
    hasExactKeys(currentCapture.identity, [
      "supervisorInstanceId",
      "captureWindowId",
      "releaseId",
      "sourceVolumeId",
      "nodeVersion",
      "strapiVersion",
    ]) &&
    hasExactKeys(currentCapture.outcome, [
      "status",
      "exportClosedAt",
      "servingRecoveredAt",
    ]) &&
    currentCapture.outcome.status === "captured" &&
    authorityCapture.outcome.status === "captured" &&
    current.runId === authority.runId &&
    current.archivePath === authority.archivePath &&
    current.byteLength === authority.byteLength &&
    current.sha256 === authority.sha256 &&
    current.metadata.createdAt === authority.metadata.createdAt &&
    current.metadata.strapiVersion === authority.metadata.strapiVersion &&
    current.fileIdentity.device === authority.fileIdentity.device &&
    current.fileIdentity.inode === authority.fileIdentity.inode &&
    current.fileIdentity.size === authority.fileIdentity.size &&
    current.fileIdentity.modifiedNanoseconds ===
      authority.fileIdentity.modifiedNanoseconds &&
    current.fileIdentity.changedNanoseconds ===
      authority.fileIdentity.changedNanoseconds &&
    currentCapture.version === authorityCapture.version &&
    currentCapture.type === authorityCapture.type &&
    currentCapture.archiveBasePath === authorityCapture.archiveBasePath &&
    currentCapture.startedAt === authorityCapture.startedAt &&
    currentCapture.deadlineAt === authorityCapture.deadlineAt &&
    currentCapture.acceptedAt === authorityCapture.acceptedAt &&
    currentCapture.completedAt === authorityCapture.completedAt &&
    currentCapture.identity.supervisorInstanceId ===
      authorityCapture.identity.supervisorInstanceId &&
    currentCapture.identity.captureWindowId ===
      authorityCapture.identity.captureWindowId &&
    currentCapture.identity.releaseId === authorityCapture.identity.releaseId &&
    currentCapture.identity.sourceVolumeId ===
      authorityCapture.identity.sourceVolumeId &&
    currentCapture.identity.nodeVersion ===
      authorityCapture.identity.nodeVersion &&
    currentCapture.identity.strapiVersion ===
      authorityCapture.identity.strapiVersion &&
    currentCapture.outcome.exportClosedAt ===
      authorityCapture.outcome.exportClosedAt &&
    currentCapture.outcome.servingRecoveredAt ===
      authorityCapture.outcome.servingRecoveredAt
  );
}

function sameAuthorizedRequest(
  current: SnapshotPublicationRequest,
  authority: SnapshotPublicationRequest,
): boolean {
  if (
    !hasExactKeys(current, [
      "archive",
      "attribution",
      "keys",
      "manifest",
      "manifestBytes",
      "publicationDeadlineAt",
    ]) ||
    !hasExactKeys(current.attribution, [
      "site",
      "environment",
      "imageDigest",
      "gitRevision",
    ]) ||
    !hasExactKeys(current.keys, ["archiveKey", "manifestKey"]) ||
    !sameAuthorizedArchive(current.archive, authority.archive) ||
    current.attribution.site !== authority.attribution.site ||
    current.attribution.environment !== authority.attribution.environment ||
    current.attribution.imageDigest !== authority.attribution.imageDigest ||
    current.attribution.gitRevision !== authority.attribution.gitRevision ||
    current.keys.archiveKey !== authority.keys.archiveKey ||
    current.keys.manifestKey !== authority.keys.manifestKey ||
    current.publicationDeadlineAt !== authority.publicationDeadlineAt ||
    !Buffer.from(current.manifestBytes).equals(
      Buffer.from(authority.manifestBytes),
    )
  ) {
    return false;
  }
  try {
    return (
      Buffer.from(serializeSnapshotManifest(current.manifest)).equals(
        Buffer.from(authority.manifestBytes),
      ) &&
      Buffer.from(serializeSnapshotManifest(authority.manifest)).equals(
        Buffer.from(authority.manifestBytes),
      )
    );
  } catch {
    return false;
  }
}

export function authorizeSnapshotPublicationRequest(
  request: SnapshotPublicationRequest,
): SnapshotPublicationRequest {
  const authority = publicationAuthorities.get(request);
  let authorized = false;
  try {
    authorized =
      authority !== undefined && sameAuthorizedRequest(request, authority);
  } catch {
    authorized = false;
  }
  if (!authorized || authority === undefined) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  const operationRequest = clonePublicationRequest(authority);
  publicationAuthorities.set(operationRequest, authority);
  return operationRequest;
}

function canonicalTime(value: string): number {
  try {
    const milliseconds = Date.parse(value);
    if (
      !Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !== value
    ) {
      throw new Error("noncanonical timestamp");
    }
    return milliseconds;
  } catch (error) {
    throw new SnapshotPolicyError("manifest_invalid", error);
  }
}

function manifestSegment(value: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value)) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  return value;
}

export function deriveSnapshotKeys(
  site: string,
  environment: string,
  runId: string,
): { readonly archiveKey: string; readonly manifestKey: string } {
  const safeSite = manifestSegment(site);
  const safeEnvironment = manifestSegment(environment);
  try {
    validateCanonicalUuid(runId, "runId");
  } catch (error) {
    throw new SnapshotPolicyError("manifest_invalid", error);
  }
  const prefix = `snapshots/v1/${safeSite}/${safeEnvironment}/${runId}`;
  return Object.freeze({
    archiveKey: `${prefix}/archive.tar`,
    manifestKey: `${prefix}/manifest.json`,
  });
}

export function calculateMultipartPartSize(byteLength: number): {
  readonly partSize: number;
  readonly partCount: number;
} {
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0) {
    throw new SnapshotPolicyError("part_size_invalid");
  }
  const minimumForLimit = Math.ceil(byteLength / MAXIMUM_PARTS);
  const rounded = Math.ceil(minimumForLimit / MEBIBYTE) * MEBIBYTE;
  const partSize = Math.max(MINIMUM_PART_SIZE, rounded);
  if (partSize > MAXIMUM_PART_SIZE) {
    throw new SnapshotPolicyError("part_size_invalid");
  }
  const partCount = Math.ceil(byteLength / partSize);
  if (partCount > MAXIMUM_PARTS) {
    throw new SnapshotPolicyError("part_size_invalid");
  }
  return Object.freeze({ partSize, partCount });
}

export function serializeSnapshotManifest(
  manifest: SnapshotManifestV1,
): Uint8Array {
  const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");
  if (bytes.length > MANIFEST_MAXIMUM_BYTES) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  return bytes;
}

export function snapshotManifestSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateIdentity(value: string, name: string, maximum = 256): string {
  try {
    return validateIdentityToken(value, name, maximum);
  } catch (error) {
    throw new SnapshotPolicyError("manifest_invalid", error);
  }
}

export function createSnapshotPublicationRequest(
  archive: ValidatedArchive,
  attribution: SnapshotAttribution,
  policy: PublicationPolicy,
): SnapshotPublicationRequest {
  if (
    archive.capture.outcome.status !== "captured" ||
    archive.capture.acceptedAt === undefined ||
    archive.metadata.strapiVersion !== archive.capture.identity.strapiVersion ||
    !Number.isSafeInteger(archive.byteLength) ||
    archive.byteLength <= 0 ||
    archive.fileIdentity.size !== BigInt(archive.byteLength) ||
    !SHA256_PATTERN.test(archive.sha256)
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  const identity = archive.capture.identity;
  try {
    validateCanonicalUuid(
      identity.supervisorInstanceId,
      "supervisorInstanceId",
    );
    validateCanonicalUuid(identity.captureWindowId, "captureWindowId");
    validateCanonicalUuid(archive.runId, "runId");
  } catch (error) {
    throw new SnapshotPolicyError("manifest_invalid", error);
  }
  validateIdentity(identity.releaseId, "releaseId");
  validateIdentity(identity.sourceVolumeId, "sourceVolumeId");
  validateIdentity(identity.nodeVersion, "nodeVersion", 64);
  validateIdentity(identity.strapiVersion, "strapiVersion", 64);
  if (
    !/^sha256:[0-9a-f]{64}$/.test(attribution.imageDigest) ||
    !/^[0-9a-f]{7,64}$/.test(attribution.gitRevision)
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  const started = canonicalTime(archive.capture.startedAt);
  const accepted = canonicalTime(archive.capture.acceptedAt);
  const exported = canonicalTime(archive.capture.outcome.exportClosedAt);
  const recovered = canonicalTime(archive.capture.outcome.servingRecoveredAt);
  const completed = canonicalTime(archive.capture.completedAt);
  if (
    !(
      started <= accepted &&
      accepted <= exported &&
      exported <= recovered &&
      recovered <= completed
    )
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  if (
    !Number.isSafeInteger(policy.publicationWindowMs) ||
    policy.publicationWindowMs <= policy.finalReconciliationReserveMs
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  const deadline = accepted + policy.publicationWindowMs;
  if (!Number.isSafeInteger(deadline)) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  calculateMultipartPartSize(archive.byteLength);
  const keys = deriveSnapshotKeys(
    attribution.site,
    attribution.environment,
    archive.runId,
  );
  const manifest: SnapshotManifestV1 = Object.freeze({
    version: 1,
    kind: "strapi-export-snapshot",
    runId: archive.runId,
    site: attribution.site,
    environment: attribution.environment,
    capture: Object.freeze({
      capturedAt: archive.capture.acceptedAt,
      intervalStartedAt: archive.capture.startedAt,
      intervalCompletedAt: archive.capture.outcome.exportClosedAt,
      servingRecoveredAt: archive.capture.outcome.servingRecoveredAt,
      supervisorInstanceId: identity.supervisorInstanceId,
      captureWindowId: identity.captureWindowId,
      sourceVolumeId: identity.sourceVolumeId,
    }),
    application: Object.freeze({
      releaseId: identity.releaseId,
      imageDigest: attribution.imageDigest,
      gitRevision: attribution.gitRevision,
      nodeVersion: identity.nodeVersion,
      strapiVersion: identity.strapiVersion,
    }),
    archive: Object.freeze({
      format: "strapi-export-tar",
      key: keys.archiveKey,
      byteLength: archive.byteLength,
      sha256: archive.sha256,
    }),
  });
  const authority = Object.freeze({
    archive: cloneValidatedArchive(archive),
    attribution: { ...attribution },
    keys,
    manifest,
    manifestBytes: serializeSnapshotManifest(manifest),
    publicationDeadlineAt: new Date(deadline).toISOString(),
  });
  const request = clonePublicationRequest(authority);
  publicationAuthorities.set(request, authority);
  return request;
}

function exactObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== keys.length ||
    keys.some((key) => !(key in record))
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  return record;
}

export function decodeSnapshotManifest(bytes: Uint8Array): SnapshotManifestV1 {
  if (bytes.byteLength === 0 || bytes.byteLength > MANIFEST_MAXIMUM_BYTES) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    throw new SnapshotPolicyError("manifest_invalid", error);
  }
  const root = exactObject(value, [
    "version",
    "kind",
    "runId",
    "site",
    "environment",
    "capture",
    "application",
    "archive",
  ]);
  const capture = exactObject(root.capture, [
    "capturedAt",
    "intervalStartedAt",
    "intervalCompletedAt",
    "servingRecoveredAt",
    "supervisorInstanceId",
    "captureWindowId",
    "sourceVolumeId",
  ]);
  const application = exactObject(root.application, [
    "releaseId",
    "imageDigest",
    "gitRevision",
    "nodeVersion",
    "strapiVersion",
  ]);
  const archive = exactObject(root.archive, [
    "format",
    "key",
    "byteLength",
    "sha256",
  ]);
  if (
    root.version !== 1 ||
    root.kind !== "strapi-export-snapshot" ||
    typeof root.runId !== "string" ||
    typeof root.site !== "string" ||
    typeof root.environment !== "string" ||
    Object.values(capture).some((item) => typeof item !== "string") ||
    Object.values(application).some((item) => typeof item !== "string") ||
    archive.format !== "strapi-export-tar" ||
    typeof archive.key !== "string" ||
    typeof archive.byteLength !== "number" ||
    !Number.isSafeInteger(archive.byteLength) ||
    typeof archive.sha256 !== "string"
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  const decoded = value as SnapshotManifestV1;
  const expected = deriveSnapshotKeys(
    decoded.site,
    decoded.environment,
    decoded.runId,
  );
  if (
    decoded.archive.key !== expected.archiveKey ||
    decoded.archive.byteLength <= 0 ||
    !SHA256_PATTERN.test(decoded.archive.sha256) ||
    !/^sha256:[0-9a-f]{64}$/.test(decoded.application.imageDigest) ||
    !/^[0-9a-f]{7,64}$/.test(decoded.application.gitRevision)
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  try {
    validateCanonicalUuid(
      decoded.capture.supervisorInstanceId,
      "supervisorInstanceId",
    );
    validateCanonicalUuid(decoded.capture.captureWindowId, "captureWindowId");
  } catch (error) {
    throw new SnapshotPolicyError("manifest_invalid", error);
  }
  validateIdentity(decoded.capture.sourceVolumeId, "sourceVolumeId");
  validateIdentity(decoded.application.releaseId, "releaseId");
  validateIdentity(decoded.application.nodeVersion, "nodeVersion", 64);
  validateIdentity(decoded.application.strapiVersion, "strapiVersion", 64);
  const started = canonicalTime(decoded.capture.intervalStartedAt);
  const captured = canonicalTime(decoded.capture.capturedAt);
  const completed = canonicalTime(decoded.capture.intervalCompletedAt);
  const recovered = canonicalTime(decoded.capture.servingRecoveredAt);
  if (
    !(started <= captured && captured <= completed && completed <= recovered)
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  if (
    !Buffer.from(bytes).equals(Buffer.from(serializeSnapshotManifest(decoded)))
  ) {
    throw new SnapshotPolicyError("manifest_invalid");
  }
  return decoded;
}

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { type FileHandle, open, readdir } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { Parser } from "tar";

import {
  ARCHIVE_FILE_NAME,
  ARCHIVE_METADATA_PATH,
  type CapturedTerminalRecord,
} from "./staging-policy.ts";

export type ArchiveErrorCode =
  | "archive_missing"
  | "archive_unreadable"
  | "archive_not_regular"
  | "archive_empty"
  | "archive_too_large"
  | "archive_invalid"
  | "archive_changed"
  | "metadata_missing"
  | "metadata_duplicate"
  | "metadata_not_file"
  | "metadata_too_large"
  | "metadata_invalid"
  | "metadata_version_mismatch";

export class ArchiveValidationError extends Error {
  readonly code: ArchiveErrorCode;

  constructor(code: ArchiveErrorCode, cause?: unknown) {
    super(
      `Archive validation failed (${code})`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "ArchiveValidationError";
    this.code = code;
  }
}

export interface ArchiveFileIdentity {
  readonly device: bigint;
  readonly inode: bigint;
  readonly size: bigint;
  readonly modifiedNanoseconds: bigint;
  readonly changedNanoseconds: bigint;
}

export interface ValidatedArchive {
  readonly runId: string;
  readonly archivePath: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly metadata: {
    readonly createdAt: string;
    readonly strapiVersion: string;
  };
  readonly capture: CapturedTerminalRecord;
  readonly fileIdentity: ArchiveFileIdentity;
}

export interface ArchiveValidationRequest {
  readonly runId: string;
  readonly runDirectory: string;
  readonly archivePath: string;
  readonly maximumArchiveBytes: bigint;
  readonly metadataMaximumBytes: number;
  readonly capture: CapturedTerminalRecord;
  readonly signal?: AbortSignal;
}

export interface ArchiveValidatorHooks {
  readonly beforeFinalStat?: () => Promise<void>;
}

function systemCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function mapOpenError(error: unknown): ArchiveValidationError {
  const code = systemCode(error);
  if (code === "ENOENT")
    return new ArchiveValidationError("archive_missing", error);
  if (code === "ELOOP" || code === "EISDIR") {
    return new ArchiveValidationError("archive_not_regular", error);
  }
  return new ArchiveValidationError("archive_unreadable", error);
}

function fileIdentity(stat: {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
}): ArchiveFileIdentity {
  return {
    device: stat.dev,
    inode: stat.ino,
    size: stat.size,
    modifiedNanoseconds: stat.mtimeNs,
    changedNanoseconds: stat.ctimeNs,
  };
}

function sameFileIdentity(
  left: ArchiveFileIdentity,
  right: ArchiveFileIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.size === right.size &&
    left.modifiedNanoseconds === right.modifiedNanoseconds &&
    left.changedNanoseconds === right.changedNanoseconds
  );
}

function parseMetadata(
  bytes: Buffer,
  expectedStrapiVersion: string,
): ValidatedArchive["metadata"] {
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
  } catch (error) {
    throw new ArchiveValidationError("metadata_invalid", error);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ArchiveValidationError("metadata_invalid");
  }
  const record = value as Record<string, unknown>;
  const strapi = record.strapi;
  if (
    typeof record.createdAt !== "string" ||
    strapi === null ||
    typeof strapi !== "object" ||
    Array.isArray(strapi)
  ) {
    throw new ArchiveValidationError("metadata_invalid");
  }
  const version = (strapi as Record<string, unknown>).version;
  if (
    typeof version !== "string" ||
    version.length === 0 ||
    Buffer.byteLength(version) > 64 ||
    !/^[!-~]+$/.test(version)
  ) {
    throw new ArchiveValidationError("metadata_invalid");
  }
  try {
    if (new Date(record.createdAt).toISOString() !== record.createdAt) {
      throw new Error("Timestamp is not canonical");
    }
  } catch (error) {
    throw new ArchiveValidationError("metadata_invalid", error);
  }
  if (version !== expectedStrapiVersion) {
    throw new ArchiveValidationError("metadata_version_mismatch");
  }
  return { createdAt: record.createdAt, strapiVersion: version };
}

export async function validateArchiveFile(
  request: ArchiveValidationRequest,
  hooks: ArchiveValidatorHooks = {},
): Promise<ValidatedArchive> {
  let entries: string[];
  try {
    entries = await readdir(request.runDirectory);
  } catch (error) {
    throw new ArchiveValidationError("archive_unreadable", error);
  }
  if (entries.length === 0) {
    throw new ArchiveValidationError("archive_missing");
  }
  if (entries.length !== 1 || entries[0] !== ARCHIVE_FILE_NAME) {
    throw new ArchiveValidationError("archive_invalid");
  }

  let handle: FileHandle;
  try {
    handle = await open(
      request.archivePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
  } catch (error) {
    throw mapOpenError(error);
  }

  let operationFailure: ArchiveValidationError | undefined;
  let validated: ValidatedArchive | undefined;
  try {
    const openingStat = await handle.stat({ bigint: true });
    if (!openingStat.isFile()) {
      throw new ArchiveValidationError("archive_not_regular");
    }
    if (openingStat.size === 0n) {
      throw new ArchiveValidationError("archive_empty");
    }
    if (
      openingStat.size > request.maximumArchiveBytes ||
      openingStat.size > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      throw new ArchiveValidationError("archive_too_large");
    }
    const openingIdentity = fileIdentity(openingStat);
    const hash = createHash("sha256");
    let streamedBytes = 0n;
    let metadataSeen = false;
    let metadataBytes: Buffer | undefined;
    let metadataFailure: ArchiveValidationError | undefined;
    let parser: Parser;

    const failMetadata = (error: ArchiveValidationError) => {
      if (metadataFailure !== undefined) return;
      metadataFailure = error;
      parser.abort(error);
    };
    parser = new Parser({
      strict: true,
      maxMetaEntrySize: request.metadataMaximumBytes,
      onReadEntry(entry) {
        if (
          entry.path !== ARCHIVE_METADATA_PATH &&
          entry.path !== `${ARCHIVE_METADATA_PATH}/`
        ) {
          entry.resume();
          return;
        }
        if (metadataSeen) {
          entry.resume();
          failMetadata(new ArchiveValidationError("metadata_duplicate"));
          return;
        }
        metadataSeen = true;
        if (entry.type !== "File") {
          entry.resume();
          failMetadata(new ArchiveValidationError("metadata_not_file"));
          return;
        }
        if (entry.size > request.metadataMaximumBytes) {
          entry.resume();
          failMetadata(new ArchiveValidationError("metadata_too_large"));
          return;
        }
        const chunks: Buffer[] = [];
        let length = 0;
        entry.on("data", (chunk: Buffer) => {
          length += chunk.length;
          if (length > request.metadataMaximumBytes) {
            failMetadata(new ArchiveValidationError("metadata_too_large"));
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        entry.once("error", (error) =>
          failMetadata(new ArchiveValidationError("metadata_invalid", error)),
        );
        entry.once("end", () => {
          if (metadataFailure === undefined) {
            metadataBytes = Buffer.concat(chunks, length);
          }
        });
        entry.resume();
      },
    });

    const hashAndCount = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        const bytes = Buffer.from(chunk);
        streamedBytes += BigInt(bytes.length);
        if (streamedBytes > request.maximumArchiveBytes) {
          callback(new ArchiveValidationError("archive_too_large"));
          return;
        }
        if (streamedBytes > openingStat.size) {
          callback(new ArchiveValidationError("archive_changed"));
          return;
        }
        hash.update(bytes);
        callback(null, bytes);
      },
    });
    const stream = handle.createReadStream({ autoClose: false });
    try {
      await pipeline(stream, hashAndCount, parser, {
        signal: request.signal,
      });
    } catch (error) {
      if (error instanceof ArchiveValidationError) throw error;
      throw new ArchiveValidationError("archive_invalid", error);
    }
    if (metadataFailure !== undefined) throw metadataFailure;
    if (!metadataSeen || metadataBytes === undefined) {
      throw new ArchiveValidationError("metadata_missing");
    }
    if (streamedBytes !== openingStat.size) {
      throw new ArchiveValidationError("archive_changed");
    }
    const metadata = parseMetadata(
      metadataBytes,
      request.capture.identity.strapiVersion,
    );
    await hooks.beforeFinalStat?.();
    const closingIdentity = fileIdentity(await handle.stat({ bigint: true }));
    if (!sameFileIdentity(openingIdentity, closingIdentity)) {
      throw new ArchiveValidationError("archive_changed");
    }
    validated = {
      runId: request.runId,
      archivePath: request.archivePath,
      byteLength: Number(streamedBytes),
      sha256: hash.digest("hex"),
      metadata,
      capture: request.capture,
      fileIdentity: openingIdentity,
    };
  } catch (error) {
    operationFailure =
      error instanceof ArchiveValidationError
        ? error
        : new ArchiveValidationError("archive_unreadable", error);
  }
  try {
    await handle.close();
  } catch (closeError) {
    if (operationFailure !== undefined) {
      throw new ArchiveValidationError(
        operationFailure.code,
        new AggregateError([operationFailure, closeError]),
      );
    }
    throw new ArchiveValidationError("archive_unreadable", closeError);
  }
  if (operationFailure !== undefined) throw operationFailure;
  if (validated === undefined) {
    throw new ArchiveValidationError("archive_unreadable");
  }
  return validated;
}

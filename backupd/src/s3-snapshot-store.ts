import type { Readable } from "node:stream";

import {
  ChecksumMode,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import type { ObjectStorageConfig } from "./object-storage-config.ts";
import type { SnapshotPublicationRequest } from "./snapshot-manifest.ts";
import { snapshotManifestSha256 } from "./snapshot-manifest.ts";
import type {
  ArchiveUploadOperation,
  RemoteObjectEvidence,
  SnapshotStore,
} from "./snapshot-publisher.ts";

const MANIFEST_MAXIMUM_BYTES = 65_536;

function isNotFound(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const status =
    "$metadata" in error
      ? (error as { readonly $metadata?: { readonly httpStatusCode?: number } })
          .$metadata?.httpStatusCode
      : undefined;
  const name =
    "name" in error && typeof error.name === "string" ? error.name : undefined;
  return status === 404 || name === "NotFound" || name === "NoSuchKey";
}

function evidence(
  key: string,
  output: {
    readonly ContentLength?: number;
    readonly ContentType?: string;
    readonly Metadata?: Record<string, string>;
    readonly ETag?: string;
    readonly VersionId?: string;
    readonly ChecksumSHA256?: string;
    readonly ChecksumType?: string;
  },
): RemoteObjectEvidence {
  return {
    key,
    byteLength: output.ContentLength ?? -1,
    contentType: output.ContentType,
    runId: output.Metadata?.["run-id"],
    captureWindowId: output.Metadata?.["capture-window-id"],
    kind: output.Metadata?.["artifact-kind"],
    contentSha256: output.Metadata?.sha256,
    etag: output.ETag,
    versionId: output.VersionId,
    checksumAlgorithm:
      output.ChecksumSHA256 === undefined ? undefined : "SHA256",
    checksumType: output.ChecksumType,
    checksumValue: output.ChecksumSHA256,
  };
}

async function boundedBody(body: unknown): Promise<Uint8Array> {
  if (
    body === undefined ||
    body === null ||
    !(Symbol.asyncIterator in Object(body))
  ) {
    throw new Error("Manifest response body is unavailable");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > MANIFEST_MAXIMUM_BYTES) {
      throw new Error("Manifest response exceeds the bounded body limit");
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, total);
}

class S3SnapshotStore implements SnapshotStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly onArchiveProgress: (() => void) | undefined;

  constructor(
    client: S3Client,
    bucket: string,
    onArchiveProgress?: () => void,
  ) {
    this.client = client;
    this.bucket = bucket;
    this.onArchiveProgress = onArchiveProgress;
  }

  async preflight(signal?: AbortSignal): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }), {
      abortSignal: signal,
    });
  }

  async headArchive(
    request: SnapshotPublicationRequest,
    signal?: AbortSignal,
  ): Promise<RemoteObjectEvidence | undefined> {
    return this.head(request.keys.archiveKey, signal);
  }

  async headManifest(
    request: SnapshotPublicationRequest,
    signal?: AbortSignal,
  ): Promise<RemoteObjectEvidence | undefined> {
    return this.head(request.keys.manifestKey, signal);
  }

  async getManifest(
    request: SnapshotPublicationRequest,
    etag: string | undefined,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: request.keys.manifestKey,
        IfMatch: etag,
        ChecksumMode: ChecksumMode.ENABLED,
      }),
      { abortSignal: signal },
    );
    return boundedBody(result.Body);
  }

  beginArchiveUpload(
    request: SnapshotPublicationRequest,
    body: Readable,
    partSize: number,
    queueSize: number,
    signal: AbortSignal,
  ): ArchiveUploadOperation {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(signal.reason);
    if (signal.aborted) forwardAbort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: request.keys.archiveKey,
        Body: body,
        ContentLength: request.archive.byteLength,
        ContentType: "application/x-tar",
        ChecksumAlgorithm: "SHA256",
        ChecksumType: "COMPOSITE",
        IfNoneMatch: "*",
        Metadata: {
          "artifact-kind": "strapi-export-archive",
          "run-id": request.archive.runId,
          "capture-window-id": request.archive.capture.identity.captureWindowId,
          sha256: request.archive.sha256,
        },
      },
      partSize,
      queueSize,
      leavePartsOnError: false,
      abortController: controller,
    });
    if (this.onArchiveProgress !== undefined) {
      upload.on("httpUploadProgress", this.onArchiveProgress);
    }
    const done = upload
      .done()
      .finally(() => signal.removeEventListener("abort", forwardAbort));
    return {
      async done() {
        await done;
      },
      async abort() {
        await upload.abort();
        await done.catch(() => undefined);
      },
    };
  }

  async putManifest(
    request: SnapshotPublicationRequest,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: request.keys.manifestKey,
        Body: request.manifestBytes,
        ContentLength: request.manifestBytes.byteLength,
        ContentType: "application/json",
        ChecksumAlgorithm: "SHA256",
        IfNoneMatch: "*",
        Metadata: {
          "artifact-kind": "strapi-export-manifest",
          "run-id": request.archive.runId,
          "capture-window-id": request.archive.capture.identity.captureWindowId,
          sha256: snapshotManifestSha256(request.manifestBytes),
        },
      }),
      { abortSignal: signal },
    );
  }

  private async head(
    key: string,
    signal: AbortSignal | undefined,
  ): Promise<RemoteObjectEvidence | undefined> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ChecksumMode: ChecksumMode.ENABLED,
        }),
        { abortSignal: signal },
      );
      return evidence(key, result);
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }
}

export function createS3Client(config: ObjectStorageConfig): S3Client {
  const clientConfig: S3ClientConfig = {
    endpoint: config.endpoint.toString(),
    region: config.region,
    // The SDK annotates its resolved credential value with internal feature data.
    credentials: { ...config.credentials },
    forcePathStyle: config.forcePathStyle,
    maxAttempts: config.maximumAttempts,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_SUPPORTED",
    requestHandler: {
      connectionTimeout: 10_000,
      socketTimeout: 120_000,
      requestTimeout: 600_000,
      throwOnRequestTimeout: true,
    },
  };
  return new S3Client(clientConfig);
}

export function createS3SnapshotStore(
  config: ObjectStorageConfig,
  options: { readonly onArchiveProgress?: () => void } = {},
): SnapshotStore {
  return new S3SnapshotStore(
    createS3Client(config),
    config.bucket,
    options.onArchiveProgress,
  );
}

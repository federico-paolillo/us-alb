import type { ReadStream } from "node:fs";
import { constants } from "node:fs";
import { type FileHandle, open } from "node:fs/promises";

import type {
  ObjectStorageConfig,
  PublicationPolicy,
} from "./object-storage-config.ts";
import {
  authorizeSnapshotPublicationRequest,
  calculateMultipartPartSize,
  decodeSnapshotManifest,
  type SnapshotPublicationRequest,
  snapshotManifestSha256,
} from "./snapshot-manifest.ts";

export type SnapshotPublicationErrorCode =
  | "local_archive_missing"
  | "local_archive_unreadable"
  | "local_archive_changed"
  | "destination_unavailable"
  | "destination_unauthorized"
  | "remote_collision"
  | "remote_inconsistent"
  | "archive_upload_failed"
  | "archive_confirmation_failed"
  | "manifest_upload_failed"
  | "manifest_confirmation_failed"
  | "multipart_abort_failed"
  | "publication_cancelled"
  | "publication_expired"
  | "remote_status_unknown";

export class SnapshotPublicationError extends Error {
  readonly code: SnapshotPublicationErrorCode;
  readonly phase: string;

  constructor(
    code: SnapshotPublicationErrorCode,
    phase: string,
    cause?: unknown,
  ) {
    super(
      `Snapshot publication failed during ${phase} (${code})`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "SnapshotPublicationError";
    this.code = code;
    this.phase = phase;
  }
}

export interface RemoteObjectEvidence {
  readonly key: string;
  readonly byteLength: number;
  readonly contentType?: string;
  readonly runId?: string;
  readonly captureWindowId?: string;
  readonly kind?: string;
  readonly contentSha256?: string;
  readonly etag?: string;
  readonly versionId?: string;
  readonly checksumAlgorithm?: string;
  readonly checksumType?: string;
  readonly checksumValue?: string;
}

export interface ArchiveUploadOperation {
  done(): Promise<void>;
  abort(): Promise<void>;
}

export interface SnapshotStore {
  preflight(signal?: AbortSignal): Promise<void>;
  headArchive(
    request: SnapshotPublicationRequest,
    signal?: AbortSignal,
  ): Promise<RemoteObjectEvidence | undefined>;
  headManifest(
    request: SnapshotPublicationRequest,
    signal?: AbortSignal,
  ): Promise<RemoteObjectEvidence | undefined>;
  getManifest(
    request: SnapshotPublicationRequest,
    etag: string | undefined,
    signal?: AbortSignal,
  ): Promise<Uint8Array>;
  beginArchiveUpload(
    request: SnapshotPublicationRequest,
    body: ReadStream,
    partSize: number,
    queueSize: number,
    signal: AbortSignal,
  ): ArchiveUploadOperation;
  putManifest(
    request: SnapshotPublicationRequest,
    signal?: AbortSignal,
  ): Promise<void>;
}

export type ReconciledSnapshot =
  | { readonly status: "absent" }
  | {
      readonly status: "archive-confirmed";
      readonly archive: RemoteObjectEvidence;
    }
  | {
      readonly status: "published";
      readonly archive: RemoteObjectEvidence;
      readonly manifest: RemoteObjectEvidence;
    };

export interface PublishedSnapshot {
  readonly status: "published" | "already-published";
  readonly request: SnapshotPublicationRequest;
  readonly archive: RemoteObjectEvidence;
  readonly manifest: RemoteObjectEvidence;
}

export type FinalPublicationReconciliation =
  | { readonly status: "absent" }
  | {
      readonly status: "archive-confirmed";
      readonly archive: RemoteObjectEvidence;
    }
  | { readonly status: "published"; readonly published: PublishedSnapshot };

export interface SnapshotPublisher {
  preflight(options?: { readonly signal?: AbortSignal }): Promise<void>;
  reconcile(
    request: SnapshotPublicationRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ReconciledSnapshot>;
  reconcileFinal(
    request: SnapshotPublicationRequest,
    options: { readonly signal: AbortSignal },
  ): Promise<FinalPublicationReconciliation>;
  publish(
    request: SnapshotPublicationRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<PublishedSnapshot>;
}

export interface SnapshotPublisherOptions {
  readonly now?: () => number;
  readonly setTimer?: typeof setTimeout;
  readonly clearTimer?: typeof clearTimeout;
  readonly afterInitialArchiveStat?: () => void;
}

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error))
    return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function cancellation(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return Buffer.from(left).equals(Buffer.from(right));
}

function archiveMatches(
  request: SnapshotPublicationRequest,
  evidence: RemoteObjectEvidence,
): boolean {
  return (
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

function manifestMatches(
  request: SnapshotPublicationRequest,
  evidence: RemoteObjectEvidence,
): boolean {
  return (
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

function sameFileIdentity(
  stat: {
    readonly dev: bigint;
    readonly ino: bigint;
    readonly size: bigint;
    readonly mtimeNs: bigint;
    readonly ctimeNs: bigint;
    isFile(): boolean;
  },
  request: SnapshotPublicationRequest,
): boolean {
  const expected = request.archive.fileIdentity;
  return (
    stat.isFile() &&
    stat.dev === expected.device &&
    stat.ino === expected.inode &&
    stat.size === expected.size &&
    stat.size === BigInt(request.archive.byteLength) &&
    stat.mtimeNs === expected.modifiedNanoseconds &&
    stat.ctimeNs === expected.changedNanoseconds
  );
}

interface DeadlineBoundary {
  readonly signal: AbortSignal;
  readonly expired: () => boolean;
  dispose(): void;
}

function deadlineBoundary(
  deadline: number,
  caller: AbortSignal | undefined,
  now: () => number,
  setTimer: typeof setTimeout,
  clearTimer: typeof clearTimeout,
): DeadlineBoundary {
  const controller = new AbortController();
  let didExpire = false;
  const expire = () => {
    didExpire = true;
    controller.abort(
      new SnapshotPublicationError("publication_expired", "deadline"),
    );
  };
  const onCallerAbort = () => controller.abort(caller?.reason);
  if (caller?.aborted) onCallerAbort();
  else caller?.addEventListener("abort", onCallerAbort, { once: true });
  const remaining = deadline - now();
  const timer = setTimer(expire, Math.max(0, remaining));
  return {
    signal: controller.signal,
    expired: () => didExpire || now() >= deadline,
    dispose() {
      clearTimer(timer);
      caller?.removeEventListener("abort", onCallerAbort);
    },
  };
}

function throwCancellationOrExpiry(
  caller: AbortSignal | undefined,
  expired: boolean,
  cause?: unknown,
): never {
  if (caller?.aborted) {
    throw new SnapshotPublicationError(
      "publication_cancelled",
      "publication",
      cause ?? caller.reason,
    );
  }
  if (expired) {
    throw new SnapshotPublicationError(
      "publication_expired",
      "publication",
      cause,
    );
  }
  throw new SnapshotPublicationError(
    "archive_upload_failed",
    "archive-upload",
    cause,
  );
}

class SnapshotPublisherImplementation implements SnapshotPublisher {
  private readonly store: SnapshotStore;
  private readonly policy: PublicationPolicy;
  private readonly now: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private readonly afterInitialArchiveStat: (() => void) | undefined;

  constructor(
    store: SnapshotStore,
    policy: PublicationPolicy,
    options: SnapshotPublisherOptions,
  ) {
    this.store = store;
    this.policy = policy;
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.afterInitialArchiveStat = options.afterInitialArchiveStat;
  }

  async preflight(
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<void> {
    const deadline = this.now() + 30_000;
    const boundary = deadlineBoundary(
      deadline,
      options.signal,
      this.now,
      this.setTimer,
      this.clearTimer,
    );
    try {
      await this.store.preflight(boundary.signal);
      const expired = this.now() >= deadline;
      if (options.signal?.aborted) {
        throw new SnapshotPublicationError(
          "publication_cancelled",
          "preflight",
          options.signal.reason,
        );
      }
      if (expired) {
        throw new SnapshotPublicationError(
          "destination_unavailable",
          "preflight",
        );
      }
    } catch (error) {
      if (options.signal?.aborted) {
        throw new SnapshotPublicationError(
          "publication_cancelled",
          "preflight",
          error,
        );
      }
      if (error instanceof SnapshotPublicationError) throw error;
      const status =
        error !== null && typeof error === "object" && "$metadata" in error
          ? (
              error as {
                readonly $metadata?: { readonly httpStatusCode?: number };
              }
            ).$metadata?.httpStatusCode
          : undefined;
      throw new SnapshotPublicationError(
        status === 401 || status === 403
          ? "destination_unauthorized"
          : "destination_unavailable",
        "preflight",
        error,
      );
    } finally {
      boundary.dispose();
    }
  }

  async reconcile(
    request: SnapshotPublicationRequest,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<ReconciledSnapshot> {
    request = authorizeSnapshotPublicationRequest(request);
    const deadline = Date.parse(request.publicationDeadlineAt);
    if (!Number.isFinite(deadline) || this.now() >= deadline) {
      throw new SnapshotPublicationError(
        "publication_expired",
        "reconciliation",
      );
    }
    const boundary = deadlineBoundary(
      deadline,
      options.signal,
      this.now,
      this.setTimer,
      this.clearTimer,
    );
    const requireTimeRemaining = () => {
      if (this.now() >= deadline) {
        throw new SnapshotPublicationError(
          "publication_expired",
          "reconciliation",
        );
      }
    };
    try {
      const [archive, manifest] = await Promise.all([
        this.store.headArchive(request, boundary.signal),
        this.store.headManifest(request, boundary.signal),
      ]);
      requireTimeRemaining();
      if (archive === undefined) {
        if (manifest !== undefined) {
          throw new SnapshotPublicationError(
            "remote_inconsistent",
            "reconciliation",
          );
        }
        return { status: "absent" };
      }
      if (!archiveMatches(request, archive)) {
        throw new SnapshotPublicationError(
          "remote_collision",
          "archive-reconciliation",
        );
      }
      if (manifest === undefined) {
        return { status: "archive-confirmed", archive };
      }
      if (!manifestMatches(request, manifest)) {
        throw new SnapshotPublicationError(
          "remote_collision",
          "manifest-reconciliation",
        );
      }
      const bytes = await this.store.getManifest(
        request,
        manifest.etag,
        boundary.signal,
      );
      requireTimeRemaining();
      if (!sameBytes(bytes, request.manifestBytes)) {
        try {
          decodeSnapshotManifest(bytes);
        } catch {
          // Body contents are intentionally not included in the resulting error.
        }
        throw new SnapshotPublicationError(
          "remote_collision",
          "manifest-reconciliation",
        );
      }
      return { status: "published", archive, manifest };
    } catch (error) {
      if (options.signal?.aborted) {
        throw new SnapshotPublicationError(
          "publication_cancelled",
          "reconciliation",
          error,
        );
      }
      if (boundary.expired()) {
        throw new SnapshotPublicationError(
          "publication_expired",
          "reconciliation",
          error,
        );
      }
      if (error instanceof SnapshotPublicationError) throw error;
      if (cancellation(error)) {
        throw new SnapshotPublicationError(
          "publication_cancelled",
          "reconciliation",
          error,
        );
      }
      throw new SnapshotPublicationError(
        "remote_status_unknown",
        "reconciliation",
        error,
      );
    } finally {
      boundary.dispose();
    }
  }

  async reconcileFinal(
    request: SnapshotPublicationRequest,
    options: { readonly signal: AbortSignal },
  ): Promise<FinalPublicationReconciliation> {
    request = authorizeSnapshotPublicationRequest(request);
    const deadline = this.now() + 30_000;
    const controller = new AbortController();
    let rejectBoundary!: (error: unknown) => void;
    const boundaryFailure = new Promise<never>((_resolve, reject) => {
      rejectBoundary = reject;
    });
    const abort = () => {
      const error =
        options.signal.reason ??
        new DOMException("Operation aborted", "AbortError");
      controller.abort(error);
      rejectBoundary(error);
    };
    if (options.signal.aborted) abort();
    else options.signal.addEventListener("abort", abort, { once: true });
    const timer = this.setTimer(() => {
      const error = new SnapshotPublicationError(
        "remote_status_unknown",
        "final-reconciliation",
      );
      controller.abort(error);
      rejectBoundary(error);
    }, 30_000);
    const bounded = <T>(operation: Promise<T>): Promise<T> =>
      Promise.race([operation, boundaryFailure]);
    const requireTimeRemaining = () => {
      if (this.now() >= deadline) {
        throw new SnapshotPublicationError(
          "remote_status_unknown",
          "final-reconciliation",
        );
      }
    };
    try {
      const [archive, manifest] = await bounded(
        Promise.all([
          this.store.headArchive(request, controller.signal),
          this.store.headManifest(request, controller.signal),
        ]),
      );
      requireTimeRemaining();
      if (archive === undefined) {
        if (manifest !== undefined) {
          throw new SnapshotPublicationError(
            "remote_inconsistent",
            "final-reconciliation",
          );
        }
        return { status: "absent" };
      }
      if (!archiveMatches(request, archive)) {
        throw new SnapshotPublicationError(
          "remote_collision",
          "final-archive-reconciliation",
        );
      }
      if (manifest === undefined) {
        return { status: "archive-confirmed", archive };
      }
      if (!manifestMatches(request, manifest)) {
        throw new SnapshotPublicationError(
          "remote_collision",
          "final-manifest-reconciliation",
        );
      }
      const bytes = await bounded(
        this.store.getManifest(request, manifest.etag, controller.signal),
      );
      requireTimeRemaining();
      if (!sameBytes(bytes, request.manifestBytes)) {
        throw new SnapshotPublicationError(
          "remote_collision",
          "final-manifest-reconciliation",
        );
      }
      return {
        status: "published",
        published: {
          status: "already-published",
          request,
          archive,
          manifest,
        },
      };
    } catch (error) {
      if (options.signal.aborted) {
        throw new SnapshotPublicationError(
          "publication_cancelled",
          "final-reconciliation",
          error,
        );
      }
      if (error instanceof SnapshotPublicationError) throw error;
      throw new SnapshotPublicationError(
        "remote_status_unknown",
        "final-reconciliation",
        error,
      );
    } finally {
      this.clearTimer(timer);
      options.signal.removeEventListener("abort", abort);
    }
  }

  async publish(
    request: SnapshotPublicationRequest,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<PublishedSnapshot> {
    request = authorizeSnapshotPublicationRequest(request);
    const deadline = Date.parse(request.publicationDeadlineAt);
    if (!Number.isFinite(deadline) || this.now() >= deadline) {
      throw new SnapshotPublicationError("publication_expired", "admission");
    }
    let state = await this.reconcile(request, options);
    if (state.status === "published") {
      return {
        status: "already-published",
        request,
        archive: state.archive,
        manifest: state.manifest,
      };
    }
    const mutationDeadline =
      deadline - this.policy.finalReconciliationReserveMs;
    this.requireMutationAllowed(
      options.signal,
      mutationDeadline,
      "mutation-admission",
    );

    let handle: FileHandle | undefined;
    let stream: ReadStream | undefined;
    let primaryFailure: unknown;
    try {
      if (state.status === "absent") {
        try {
          handle = await open(
            request.archive.archivePath,
            constants.O_RDONLY | constants.O_NOFOLLOW,
          );
        } catch (error) {
          const code = errorCode(error);
          throw new SnapshotPublicationError(
            code === "ENOENT"
              ? "local_archive_missing"
              : "local_archive_unreadable",
            "local-open",
            error,
          );
        }
        this.requireMutationAllowed(
          options.signal,
          mutationDeadline,
          "local-open",
        );
        const openingStat = await handle.stat({ bigint: true });
        this.afterInitialArchiveStat?.();
        this.requireMutationAllowed(
          options.signal,
          mutationDeadline,
          "local-stat",
        );
        if (!sameFileIdentity(openingStat, request)) {
          throw new SnapshotPublicationError(
            "local_archive_changed",
            "local-open",
          );
        }
        this.requireMutationAllowed(
          options.signal,
          mutationDeadline,
          "local-fingerprint",
        );
        const sizing = calculateMultipartPartSize(request.archive.byteLength);
        stream = handle.createReadStream({ autoClose: false });
        const boundary = deadlineBoundary(
          mutationDeadline,
          options.signal,
          this.now,
          this.setTimer,
          this.clearTimer,
        );
        this.requireMutationAllowed(
          options.signal,
          mutationDeadline,
          "archive-upload-admission",
        );
        const upload = this.store.beginArchiveUpload(
          request,
          stream,
          sizing.partSize,
          this.policy.uploadConcurrency,
          boundary.signal,
        );
        try {
          await upload.done();
        } catch (error) {
          let abortFailure: unknown;
          try {
            await upload.abort();
          } catch (abortError) {
            abortFailure = abortError;
          }
          boundary.dispose();
          stream.destroy();
          stream = undefined;
          await handle.close();
          handle = undefined;
          const reconciliation = await this.reconcileAfterMutationFailure(
            request,
            deadline,
            error,
          );
          if (reconciliation.status === "published") {
            return {
              status: "published",
              request,
              archive: reconciliation.archive,
              manifest: reconciliation.manifest,
            };
          }
          if (abortFailure !== undefined) {
            throw new SnapshotPublicationError(
              "multipart_abort_failed",
              "archive-abort",
              new AggregateError([error, abortFailure]),
            );
          }
          if (
            reconciliation.status === "archive-confirmed" &&
            !options.signal?.aborted &&
            this.now() < mutationDeadline
          ) {
            state = reconciliation;
          } else {
            throwCancellationOrExpiry(
              options.signal,
              boundary.expired(),
              error,
            );
          }
        } finally {
          boundary.dispose();
        }
        if (handle !== undefined) {
          const closingStat = await handle.stat({ bigint: true });
          this.requireMutationAllowed(
            options.signal,
            mutationDeadline,
            "local-final-stat",
          );
          if (!sameFileIdentity(closingStat, request)) {
            throw new SnapshotPublicationError(
              "local_archive_changed",
              "local-final-stat",
            );
          }
          this.requireMutationAllowed(
            options.signal,
            mutationDeadline,
            "local-final-fingerprint",
          );
          stream?.destroy();
          stream = undefined;
          await handle.close();
          handle = undefined;
        }
        state = await this.confirmArchive(
          request,
          options.signal,
          mutationDeadline,
        );
      }

      if (state.status !== "archive-confirmed") {
        throw new SnapshotPublicationError(
          "remote_inconsistent",
          "archive-confirmation",
        );
      }
      this.requireMutationAllowed(
        options.signal,
        mutationDeadline,
        "manifest-admission",
      );
      const boundary = deadlineBoundary(
        mutationDeadline,
        options.signal,
        this.now,
        this.setTimer,
        this.clearTimer,
      );
      try {
        this.requireMutationAllowed(
          options.signal,
          mutationDeadline,
          "manifest-upload-admission",
        );
        await this.store.putManifest(request, boundary.signal);
      } catch (error) {
        const reconciled = await this.reconcileAfterMutationFailure(
          request,
          deadline,
          error,
        );
        if (reconciled.status === "published") {
          return {
            status: "published",
            request,
            archive: reconciled.archive,
            manifest: reconciled.manifest,
          };
        }
        if (options.signal?.aborted) {
          throw new SnapshotPublicationError(
            "publication_cancelled",
            "manifest-upload",
            error,
          );
        }
        if (boundary.expired()) {
          throw new SnapshotPublicationError(
            "publication_expired",
            "manifest-upload",
            error,
          );
        }
        throw new SnapshotPublicationError(
          "manifest_upload_failed",
          "manifest-upload",
          error,
        );
      } finally {
        boundary.dispose();
      }
      // No mutation follows manifest PUT. Use a fresh bounded read so caller
      // cancellation cannot hide a manifest that was already committed.
      const published = await this.reconcile(request);
      if (published.status !== "published") {
        throw new SnapshotPublicationError(
          "manifest_confirmation_failed",
          "manifest-confirmation",
        );
      }
      return {
        status: "published",
        request,
        archive: published.archive,
        manifest: published.manifest,
      };
    } catch (error) {
      primaryFailure = error;
      throw error;
    } finally {
      stream?.destroy();
      if (handle !== undefined) {
        try {
          await handle.close();
        } catch (closeError) {
          if (primaryFailure === undefined) {
            // biome-ignore lint/correctness/noUnsafeFinally: close failure must replace a nominal success.
            throw new SnapshotPublicationError(
              "local_archive_unreadable",
              "local-close",
              closeError,
            );
          }
          // biome-ignore lint/correctness/noUnsafeFinally: preserve both operation and close failures.
          throw new SnapshotPublicationError(
            primaryFailure instanceof SnapshotPublicationError
              ? primaryFailure.code
              : "local_archive_unreadable",
            "local-close",
            new AggregateError([primaryFailure, closeError]),
          );
        }
      }
    }
  }

  private requireMutationAllowed(
    signal: AbortSignal | undefined,
    mutationDeadline: number,
    phase: string,
  ): void {
    const expired = this.now() >= mutationDeadline;
    if (signal?.aborted) {
      throw new SnapshotPublicationError(
        "publication_cancelled",
        phase,
        signal.reason,
      );
    }
    if (expired) {
      throw new SnapshotPublicationError("publication_expired", phase);
    }
  }

  private async confirmArchive(
    request: SnapshotPublicationRequest,
    signal: AbortSignal | undefined,
    deadline: number,
  ): Promise<
    Extract<ReconciledSnapshot, { readonly status: "archive-confirmed" }>
  > {
    const boundary = deadlineBoundary(
      deadline,
      signal,
      this.now,
      this.setTimer,
      this.clearTimer,
    );
    try {
      const archive = await this.store.headArchive(request, boundary.signal);
      if (this.now() >= deadline) {
        throw new SnapshotPublicationError(
          "publication_expired",
          "archive-confirmation",
        );
      }
      if (archive === undefined || !archiveMatches(request, archive)) {
        throw new SnapshotPublicationError(
          "archive_confirmation_failed",
          "archive-confirmation",
        );
      }
      return { status: "archive-confirmed", archive };
    } catch (error) {
      if (signal?.aborted) {
        throw new SnapshotPublicationError(
          "publication_cancelled",
          "archive-confirmation",
          error,
        );
      }
      if (boundary.expired()) {
        throw new SnapshotPublicationError(
          "publication_expired",
          "archive-confirmation",
          error,
        );
      }
      if (error instanceof SnapshotPublicationError) throw error;
      throw new SnapshotPublicationError(
        "archive_confirmation_failed",
        "archive-confirmation",
        error,
      );
    } finally {
      boundary.dispose();
    }
  }

  private async reconcileAfterMutationFailure(
    request: SnapshotPublicationRequest,
    deadline: number,
    cause: unknown,
  ): Promise<ReconciledSnapshot> {
    const reconciliationDeadline = Math.min(deadline, this.now() + 30_000);
    if (this.now() >= reconciliationDeadline) {
      throw new SnapshotPublicationError(
        "remote_status_unknown",
        "post-failure-reconciliation",
        cause,
      );
    }
    const boundary = deadlineBoundary(
      reconciliationDeadline,
      undefined,
      this.now,
      this.setTimer,
      this.clearTimer,
    );
    try {
      return await this.reconcile(request, { signal: boundary.signal });
    } catch (error) {
      if (
        error instanceof SnapshotPublicationError &&
        (error.code === "remote_collision" ||
          error.code === "remote_inconsistent")
      ) {
        throw error;
      }
      throw new SnapshotPublicationError(
        "remote_status_unknown",
        "post-failure-reconciliation",
        new AggregateError([cause, error]),
      );
    } finally {
      boundary.dispose();
    }
  }
}

export function createSnapshotPublisher(
  store: SnapshotStore,
  policy: PublicationPolicy,
  options: SnapshotPublisherOptions = {},
): SnapshotPublisher {
  return new SnapshotPublisherImplementation(store, policy, options);
}

export type SnapshotPublisherStorageConfig = Pick<
  ObjectStorageConfig,
  "bucket" | "maximumAttempts"
>;

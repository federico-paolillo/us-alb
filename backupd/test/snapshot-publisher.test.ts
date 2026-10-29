import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createSnapshotPublicationRequest,
  SnapshotPolicyError,
  type SnapshotPublicationRequest,
  snapshotManifestSha256,
} from "../src/snapshot-manifest.ts";
import {
  type ArchiveUploadOperation,
  createSnapshotPublisher,
  type RemoteObjectEvidence,
  SnapshotPublicationError,
  type SnapshotStore,
} from "../src/snapshot-publisher.ts";
import {
  fileArchive,
  fixtureArchive,
  fixtureAttribution,
  fixturePolicy,
} from "./snapshot-fixture.ts";

function archiveEvidence(
  request: SnapshotPublicationRequest,
): RemoteObjectEvidence {
  return {
    key: request.keys.archiveKey,
    byteLength: request.archive.byteLength,
    contentType: "application/x-tar",
    runId: request.archive.runId,
    captureWindowId: request.archive.capture.identity.captureWindowId,
    kind: "strapi-export-archive",
    contentSha256: request.archive.sha256,
    etag: '"archive"',
  };
}

function manifestEvidence(
  request: SnapshotPublicationRequest,
): RemoteObjectEvidence {
  return {
    key: request.keys.manifestKey,
    byteLength: request.manifestBytes.byteLength,
    contentType: "application/json",
    runId: request.archive.runId,
    captureWindowId: request.archive.capture.identity.captureWindowId,
    kind: "strapi-export-manifest",
    contentSha256: snapshotManifestSha256(request.manifestBytes),
    etag: '"manifest"',
  };
}

class ScriptedStore implements SnapshotStore {
  readonly events: string[] = [];
  archive?: RemoteObjectEvidence;
  manifest?: RemoteObjectEvidence;
  manifestBody?: Uint8Array;
  uploadFailure?: Error;
  archiveCommitsBeforeFailure = false;
  abortFailure?: Error;
  manifestFailure?: Error;
  mutateAfterUpload?: () => Promise<void>;
  afterHead?: () => void;
  afterManifestCommit?: () => void;
  preflightAction?: () => void;

  async preflight(): Promise<void> {
    this.events.push("preflight");
    this.preflightAction?.();
  }

  async headArchive(): Promise<RemoteObjectEvidence | undefined> {
    this.events.push("head-archive");
    return this.archive;
  }

  async headManifest(): Promise<RemoteObjectEvidence | undefined> {
    this.events.push("head-manifest");
    this.afterHead?.();
    return this.manifest;
  }

  async getManifest(): Promise<Uint8Array> {
    this.events.push("get-manifest");
    if (this.manifestBody === undefined) throw new Error("missing body");
    return this.manifestBody;
  }

  beginArchiveUpload(
    request: SnapshotPublicationRequest,
    body: NodeJS.ReadableStream,
    _partSize: number,
    queueSize: number,
  ): ArchiveUploadOperation {
    this.events.push(`begin-archive:${queueSize}`);
    return {
      done: async () => {
        for await (const _chunk of body) {
          // Consume the exact stream supplied by the publisher.
        }
        if (this.uploadFailure !== undefined) {
          if (this.archiveCommitsBeforeFailure) {
            this.archive = archiveEvidence(request);
          }
          throw this.uploadFailure;
        }
        this.archive = archiveEvidence(request);
        await this.mutateAfterUpload?.();
        this.events.push("archive-uploaded");
      },
      abort: async () => {
        this.events.push("abort-archive");
        if (this.abortFailure !== undefined) throw this.abortFailure;
      },
    };
  }

  async putManifest(request: SnapshotPublicationRequest): Promise<void> {
    this.events.push("put-manifest");
    if (this.manifestFailure !== undefined) throw this.manifestFailure;
    this.manifest = manifestEvidence(request);
    this.manifestBody = request.manifestBytes;
    this.afterManifestCommit?.();
  }
}

test("preflight is an independent bounded destination operation", async () => {
  const store = new ScriptedStore();
  const publisher = createSnapshotPublisher(store, fixturePolicy);
  await publisher.preflight();
  assert.deepEqual(store.events, ["preflight"]);
});

test("preflight rejects ignored cancellation and completion at its absolute boundary", async () => {
  let now = 10_000;
  const expired = new ScriptedStore();
  expired.preflightAction = () => {
    now = 40_000;
  };
  await assert.rejects(
    createSnapshotPublisher(expired, fixturePolicy, {
      now: () => now,
    }).preflight(),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "destination_unavailable",
  );
  assert.deepEqual(expired.events, ["preflight"]);

  now = 10_000;
  const controller = new AbortController();
  const cancelled = new ScriptedStore();
  cancelled.preflightAction = () =>
    controller.abort(new Error("ignored preflight cancellation"));
  await assert.rejects(
    createSnapshotPublisher(cancelled, fixturePolicy, {
      now: () => now,
    }).preflight({
      signal: controller.signal,
    }),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "publication_cancelled",
  );
  assert.deepEqual(cancelled.events, ["preflight"]);
});

test("mutated or fabricated publication requests make zero remote calls", async () => {
  const corruptBytes = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  corruptBytes.manifestBytes[0] = (corruptBytes.manifestBytes[0] ?? 0) ^ 0xff;

  const changedRun = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  (changedRun.archive as { runId: string }).runId =
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  const changedIdentity = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  (
    changedIdentity.archive.capture.identity as {
      captureWindowId: string;
    }
  ).captureWindowId = "33333333-3333-4333-8333-333333333333";

  const changedAttribution = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  (changedAttribution.attribution as { site: string }).site = "other-site";

  const changedCapture = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  (
    changedCapture.archive.capture.outcome as {
      servingRecoveredAt: string;
    }
  ).servingRecoveredAt = "2026-10-29T00:00:04.000Z";

  const valid = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const fabricated = {
    ...valid,
    archive: { ...valid.archive },
    manifestBytes: Uint8Array.from(valid.manifestBytes),
  } as SnapshotPublicationRequest;

  for (const [request, method] of [
    [corruptBytes, "publish"],
    [changedRun, "publish"],
    [changedIdentity, "reconcile"],
    [changedAttribution, "publish"],
    [changedCapture, "reconcile"],
    [fabricated, "publish"],
    [{} as SnapshotPublicationRequest, "reconcile"],
  ] as const) {
    const store = new ScriptedStore();
    const publisher = createSnapshotPublisher(store, fixturePolicy, {
      now: () => Date.parse("2026-10-29T00:01:00.000Z"),
    });
    await assert.rejects(
      method === "publish"
        ? publisher.publish(request)
        : publisher.reconcile(request),
      (error: unknown) =>
        error instanceof SnapshotPolicyError &&
        error.code === "manifest_invalid",
    );
    assert.deepEqual(store.events, []);
  }
});

test("publisher streams the exact file archive first and confirms manifest last", async () => {
  const root = await mkdtemp(join(tmpdir(), "b06-publisher-"));
  try {
    const bytes = Buffer.alloc(6 * 1_048_576, 0x5a);
    const archive = await fileArchive(join(root, "archive.tar"), bytes);
    const request = createSnapshotPublicationRequest(
      archive,
      fixtureAttribution,
      fixturePolicy,
    );
    const store = new ScriptedStore();
    const publisher = createSnapshotPublisher(store, fixturePolicy, {
      now: () => Date.parse("2026-10-29T00:01:00.000Z"),
    });
    const result = await publisher.publish(request);
    assert.equal(result.status, "published");
    assert.deepEqual(store.events, [
      "head-archive",
      "head-manifest",
      "begin-archive:4",
      "archive-uploaded",
      "head-archive",
      "put-manifest",
      "head-archive",
      "head-manifest",
      "get-manifest",
    ]);
    const repeat = await publisher.publish(request);
    assert.equal(repeat.status, "already-published");
    assert.equal(
      store.events.filter((event) => event === "put-manifest").length,
      1,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publisher reuses one exact archive but rejects collisions and manifest without archive", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const store = new ScriptedStore();
  store.archive = archiveEvidence(request);
  const publisher = createSnapshotPublisher(store, fixturePolicy, {
    now: () => Date.parse("2026-10-29T00:01:00.000Z"),
  });
  await publisher.publish(request);
  assert.equal(store.events.includes("begin-archive:4"), false);

  const collision = new ScriptedStore();
  collision.archive = { ...archiveEvidence(request), runId: "other" };
  await assert.rejects(
    createSnapshotPublisher(collision, fixturePolicy, {
      now: () => Date.parse("2026-10-29T00:01:00.000Z"),
    }).publish(request),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "remote_collision",
  );

  const inconsistent = new ScriptedStore();
  inconsistent.manifest = manifestEvidence(request);
  inconsistent.manifestBody = request.manifestBytes;
  await assert.rejects(
    createSnapshotPublisher(inconsistent, fixturePolicy, {
      now: () => Date.parse("2026-10-29T00:01:00.000Z"),
    }).reconcile(request),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "remote_inconsistent",
  );
});

test("lost manifest acknowledgement reconciles exact bytes without a second mutation", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const store = new ScriptedStore();
  store.archive = archiveEvidence(request);
  store.manifestFailure = new Error("lost acknowledgement");
  store.putManifest = async (publication) => {
    store.events.push("put-manifest");
    store.manifest = manifestEvidence(publication);
    store.manifestBody = publication.manifestBytes;
    throw store.manifestFailure;
  };
  const result = await createSnapshotPublisher(store, fixturePolicy, {
    now: () => Date.parse("2026-10-29T00:01:00.000Z"),
  }).publish(request);
  assert.equal(result.status, "published");
  assert.equal(
    store.events.filter((event) => event === "put-manifest").length,
    1,
  );
});

test("lost archive acknowledgement reuses the exact object and abort failure preserves both causes", async () => {
  const root = await mkdtemp(join(tmpdir(), "b06-lost-archive-"));
  try {
    const archive = await fileArchive(
      join(root, "archive.tar"),
      Buffer.alloc(6 * 1_048_576, 0x41),
    );
    const request = createSnapshotPublicationRequest(
      archive,
      fixtureAttribution,
      fixturePolicy,
    );
    const store = new ScriptedStore();
    store.uploadFailure = new Error("lost archive acknowledgement");
    store.archiveCommitsBeforeFailure = true;
    const result = await createSnapshotPublisher(store, fixturePolicy, {
      now: () => Date.parse("2026-10-29T00:01:00.000Z"),
    }).publish(request);
    assert.equal(result.status, "published");
    assert.equal(
      store.events.filter((event) => event.startsWith("begin-archive")).length,
      1,
    );

    const failedAbort = new ScriptedStore();
    failedAbort.uploadFailure = new Error("upload failed");
    failedAbort.abortFailure = new Error("abort failed");
    await assert.rejects(
      createSnapshotPublisher(failedAbort, fixturePolicy, {
        now: () => Date.parse("2026-10-29T00:01:00.000Z"),
      }).publish(request),
      (error: unknown) =>
        error instanceof SnapshotPublicationError &&
        error.code === "multipart_abort_failed" &&
        error.cause instanceof AggregateError,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a final local fingerprint change permanently prevents manifest publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "b06-fingerprint-"));
  try {
    const archivePath = join(root, "archive.tar");
    const archive = await fileArchive(
      archivePath,
      Buffer.alloc(5 * 1_048_576, 0x31),
    );
    const request = createSnapshotPublicationRequest(
      archive,
      fixtureAttribution,
      fixturePolicy,
    );
    const store = new ScriptedStore();
    store.mutateAfterUpload = async () =>
      writeFile(archivePath, Buffer.alloc(archive.byteLength, 0x32));
    await assert.rejects(
      createSnapshotPublisher(store, fixturePolicy, {
        now: () => Date.parse("2026-10-29T00:01:00.000Z"),
      }).publish(request),
      (error: unknown) =>
        error instanceof SnapshotPublicationError &&
        error.code === "local_archive_changed",
    );
    assert.equal(store.events.includes("put-manifest"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cutoff reached during local stat permits no remote mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "b06-local-cutoff-"));
  try {
    const archive = await fileArchive(
      join(root, "archive.tar"),
      Buffer.alloc(6 * 1_048_576, 0x35),
    );
    const request = createSnapshotPublicationRequest(
      archive,
      fixtureAttribution,
      fixturePolicy,
    );
    const mutationDeadline =
      Date.parse(request.publicationDeadlineAt) -
      fixturePolicy.finalReconciliationReserveMs;
    let now = Date.parse("2026-10-29T00:01:00.000Z");
    const store = new ScriptedStore();
    await assert.rejects(
      createSnapshotPublisher(store, fixturePolicy, {
        now: () => now,
        afterInitialArchiveStat: () => {
          now = mutationDeadline;
        },
      }).publish(request),
      (error: unknown) =>
        error instanceof SnapshotPublicationError &&
        error.code === "publication_expired",
    );
    assert.deepEqual(store.events, ["head-archive", "head-manifest"]);

    const cancellationStore = new ScriptedStore();
    const cancellation = new AbortController();
    await assert.rejects(
      createSnapshotPublisher(cancellationStore, fixturePolicy, {
        now: () => Date.parse("2026-10-29T00:01:00.000Z"),
        afterInitialArchiveStat: () =>
          cancellation.abort(new Error("cancelled during local stat")),
      }).publish(request, { signal: cancellation.signal }),
      (error: unknown) =>
        error instanceof SnapshotPublicationError &&
        error.code === "publication_cancelled",
    );
    assert.deepEqual(cancellationStore.events, [
      "head-archive",
      "head-manifest",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("expiry and cancellation prohibit new publication", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  await assert.rejects(
    createSnapshotPublisher(new ScriptedStore(), fixturePolicy, {
      now: () => Date.parse(request.publicationDeadlineAt),
    }).publish(request),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "publication_expired",
  );
  const controller = new AbortController();
  controller.abort(new Error("test cancellation"));
  await assert.rejects(
    createSnapshotPublisher(new ScriptedStore(), fixturePolicy, {
      now: () => Date.parse("2026-10-29T00:01:00.000Z"),
    }).publish(request, { signal: controller.signal }),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "publication_cancelled",
  );
});

test("cancellation after manifest commit still permits fresh exact reconciliation", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const store = new ScriptedStore();
  store.archive = archiveEvidence(request);
  const controller = new AbortController();
  store.afterManifestCommit = () =>
    controller.abort(new Error("cancelled after manifest commit"));
  const result = await createSnapshotPublisher(store, fixturePolicy, {
    now: () => Date.parse("2026-10-29T00:01:00.000Z"),
  }).publish(request, { signal: controller.signal });
  assert.equal(result.status, "published");
  assert.equal(
    store.events.filter((event) => event === "put-manifest").length,
    1,
  );
});

test("absolute deadline is rechecked after remote reads and reserve never resets", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const deadline = Date.parse(request.publicationDeadlineAt);
  let now = deadline - 1;
  const completed = new ScriptedStore();
  completed.archive = archiveEvidence(request);
  completed.manifest = manifestEvidence(request);
  completed.manifestBody = request.manifestBytes;
  completed.afterHead = () => {
    now = deadline;
  };
  await assert.rejects(
    createSnapshotPublisher(completed, fixturePolicy, {
      now: () => now,
    }).publish(request),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "publication_expired",
  );

  now = deadline - fixturePolicy.finalReconciliationReserveMs;
  const absent = new ScriptedStore();
  await assert.rejects(
    createSnapshotPublisher(absent, fixturePolicy, { now: () => now }).publish(
      request,
    ),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "publication_expired",
  );
  assert.equal(
    absent.events.some((event) => event.startsWith("begin-archive")),
    false,
  );
});

test("final reconciliation is bounded, read-only, and independent of publication expiry", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const afterDeadline = Date.parse(request.publicationDeadlineAt) + 1;

  const absent = new ScriptedStore();
  assert.deepEqual(
    await createSnapshotPublisher(absent, fixturePolicy, {
      now: () => afterDeadline,
    }).reconcileFinal(request, { signal: new AbortController().signal }),
    { status: "absent" },
  );
  assert.deepEqual(absent.events, ["head-archive", "head-manifest"]);

  const archiveOnly = new ScriptedStore();
  archiveOnly.archive = archiveEvidence(request);
  const archiveResult = await createSnapshotPublisher(
    archiveOnly,
    fixturePolicy,
    { now: () => afterDeadline },
  ).reconcileFinal(request, { signal: new AbortController().signal });
  assert.equal(archiveResult.status, "archive-confirmed");

  const published = new ScriptedStore();
  published.archive = archiveEvidence(request);
  published.manifest = manifestEvidence(request);
  published.manifestBody = request.manifestBytes;
  const publishedResult = await createSnapshotPublisher(
    published,
    fixturePolicy,
    { now: () => afterDeadline },
  ).reconcileFinal(request, { signal: new AbortController().signal });
  assert.equal(publishedResult.status, "published");
  if (publishedResult.status !== "published") {
    throw new Error("expected published final reconciliation");
  }
  assert.equal(publishedResult.published.status, "already-published");
  assert.deepEqual(published.events, [
    "head-archive",
    "head-manifest",
    "get-manifest",
  ]);
  for (const store of [absent, archiveOnly, published]) {
    assert.equal(
      store.events.some(
        (event) =>
          event.startsWith("begin-archive") || event === "put-manifest",
      ),
      false,
    );
  }
});

test("final reconciliation rejects collision and absolute timeout without mutation", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  let now = Date.parse(request.publicationDeadlineAt) + 1;
  const collision = new ScriptedStore();
  collision.archive = { ...archiveEvidence(request), byteLength: 1 };
  await assert.rejects(
    createSnapshotPublisher(collision, fixturePolicy, {
      now: () => now,
    }).reconcileFinal(request, { signal: new AbortController().signal }),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "remote_collision",
  );

  const timeout = new ScriptedStore();
  timeout.afterHead = () => {
    now += 30_000;
  };
  await assert.rejects(
    createSnapshotPublisher(timeout, fixturePolicy, {
      now: () => now,
    }).reconcileFinal(request, { signal: new AbortController().signal }),
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "remote_status_unknown",
  );
  assert.equal(
    timeout.events.some(
      (event) => event.startsWith("begin-archive") || event === "put-manifest",
    ),
    false,
  );
});

test("final reconciliation rejects at its timer bound when storage ignores abort", async () => {
  const request = createSnapshotPublicationRequest(
    fixtureArchive(),
    fixtureAttribution,
    fixturePolicy,
  );
  const never = new Promise<RemoteObjectEvidence | undefined>(() => undefined);
  const store: SnapshotStore = {
    async preflight() {},
    headArchive: async () => await never,
    headManifest: async () => await never,
    async getManifest() {
      throw new Error("unexpected manifest read");
    },
    beginArchiveUpload() {
      throw new Error("unexpected archive mutation");
    },
    async putManifest() {
      throw new Error("unexpected manifest mutation");
    },
  };
  let expire: (() => void) | undefined;
  const result = createSnapshotPublisher(store, fixturePolicy, {
    now: () => Date.parse(request.publicationDeadlineAt) + 1,
    setTimer: ((callback: () => void) => {
      expire = callback;
      return callback as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout,
    clearTimer: () => undefined,
  }).reconcileFinal(request, { signal: new AbortController().signal });
  assert.notEqual(expire, undefined);
  expire?.();
  await assert.rejects(
    result,
    (error: unknown) =>
      error instanceof SnapshotPublicationError &&
      error.code === "remote_status_unknown",
  );
});

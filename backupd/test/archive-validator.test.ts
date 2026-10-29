import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  appendFile,
  chmod,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { create } from "tar";

import type {
  CaptureIdentity,
  CaptureTerminalRecord,
} from "../../strapid/src/capture-contract.ts";
import {
  type ArchiveErrorCode,
  ArchiveValidationError,
  type ArchiveValidationRequest,
  validateArchiveFile,
} from "../src/archive-validator.ts";
import type { CaptureClient } from "../src/capture-client.ts";
import { createStagingManager } from "../src/staging-manager.ts";
import type { StagingPolicy } from "../src/staging-policy.ts";

interface ArchiveFixtureEntry {
  readonly path: string;
  readonly content?: string | Buffer;
  readonly directory?: boolean;
}

async function createArchiveFixture(
  sourceDirectory: string,
  archivePath: string,
  entries: readonly ArchiveFixtureEntry[],
  archiveEntries: readonly string[] = entries.map((entry) => entry.path),
): Promise<void> {
  await mkdir(sourceDirectory, { recursive: true });
  for (const entry of entries) {
    const path = join(sourceDirectory, entry.path);
    if (entry.directory) {
      await mkdir(path, { recursive: true });
    } else {
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, entry.content ?? "fixture");
    }
  }
  await create(
    {
      cwd: sourceDirectory,
      file: archivePath,
      portable: true,
      noMtime: true,
    },
    [...archiveEntries],
  );
}

function metadata(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    createdAt: "2026-10-29T00:00:00.000Z",
    strapi: { version: "5.52.0" },
    ...overrides,
  });
}

const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const identity: CaptureIdentity = {
  supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
  captureWindowId: "22222222-2222-4222-8222-222222222222",
  releaseId: "release-1",
  sourceVolumeId: "source-1",
  nodeVersion: "v24.20.0",
  strapiVersion: "5.52.0",
};

function captured(
  archiveBasePath: string,
  terminalIdentity: CaptureIdentity = identity,
): CaptureTerminalRecord & {
  readonly outcome: {
    readonly status: "captured";
    readonly exportClosedAt: string;
    readonly servingRecoveredAt: string;
  };
} {
  return {
    version: 1,
    type: "terminal",
    identity: terminalIdentity,
    archiveBasePath,
    startedAt: "2026-10-29T00:00:00.000Z",
    deadlineAt: "2026-10-29T00:15:00.000Z",
    acceptedAt: "2026-10-29T00:00:01.000Z",
    completedAt: "2026-10-29T00:00:04.000Z",
    outcome: {
      status: "captured",
      exportClosedAt: "2026-10-29T00:00:02.000Z",
      servingRecoveredAt: "2026-10-29T00:00:03.000Z",
    },
  };
}

function policy(stagingRoot: string): StagingPolicy {
  return {
    stagingRoot,
    minimumFreeBytes: 2_000_000n,
    maximumArchiveBytes: 1_000_000n,
    metadataMaximumBytes: 65_536,
    sizePollIntervalMs: 5,
  };
}

function unusedClient(): CaptureClient {
  return {
    async getStatus() {
      throw new Error("unused");
    },
    async startCapture() {
      throw new Error("unused");
    },
    async reconcile() {
      throw new Error("unused");
    },
    async cancel() {
      throw new Error("unexpected cancellation");
    },
  };
}

function archiveCode(expected: ArchiveErrorCode) {
  return (error: unknown) =>
    error instanceof ArchiveValidationError && error.code === expected;
}

async function directFixture(
  root: string,
  entries: readonly ArchiveFixtureEntry[],
  options: {
    readonly archiveEntries?: readonly string[];
    readonly maximumArchiveBytes?: bigint;
    readonly metadataMaximumBytes?: number;
    readonly terminalIdentity?: CaptureIdentity;
  } = {},
): Promise<ArchiveValidationRequest> {
  const runDirectory = join(root, "run");
  const archivePath = join(runDirectory, "strapi-export.tar");
  await mkdir(runDirectory);
  await createArchiveFixture(
    join(root, "source"),
    archivePath,
    entries,
    options.archiveEntries,
  );
  return {
    runId,
    runDirectory,
    archivePath,
    maximumArchiveBytes: options.maximumArchiveBytes ?? 1_000_000n,
    metadataMaximumBytes: options.metadataMaximumBytes ?? 65_536,
    capture: captured(
      join(runDirectory, "strapi-export"),
      options.terminalIdentity,
    ),
  };
}

test("manager validates one streamed archive and retains exact hash and identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-valid-"));
  const stagingRoot = join(root, "staging");
  await mkdir(stagingRoot);
  const manager = createStagingManager(policy(stagingRoot), {
    inspectAvailableBytes: async () => 2_000_000n,
  });
  try {
    const allocation = await manager.allocate(runId);
    manager.watchCaptureSize(allocation, identity, unusedClient(), () =>
      assert.fail("disconnect was not expected"),
    );
    await createArchiveFixture(join(root, "source"), allocation.archivePath, [
      { path: "metadata.json", content: metadata({ future: "allowed" }) },
      { path: "payload.bin", content: Buffer.alloc(256 * 1024, 0x5a) },
    ]);
    const terminal = captured(allocation.archiveBasePath);
    assert.equal(
      await manager.recordCaptureTerminal(allocation, terminal),
      "released",
    );
    const before = await readFile(allocation.archivePath);
    const result = await manager.validateArchive(allocation, terminal);
    assert.equal(result.capture, terminal);
    assert.equal(result.byteLength, before.length);
    assert.equal(
      result.sha256,
      createHash("sha256").update(before).digest("hex"),
    );
    assert.deepEqual(result.metadata, {
      createdAt: "2026-10-29T00:00:00.000Z",
      strapiVersion: "5.52.0",
    });
    assert.equal(result.fileIdentity.size, BigInt(before.length));
    assert.deepEqual(await readdir(allocation.runDirectory), [
      "strapi-export.tar",
    ]);
    assert.deepEqual(await readFile(allocation.archivePath), before);
    await manager.cleanup(allocation);
    await assert.rejects(access(allocation.runDirectory), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("manager latches archive mutation as cleanup-only and never retries validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-manager-mutation-"));
  const stagingRoot = join(root, "staging");
  await mkdir(stagingRoot);
  let finalStatHooks = 0;
  const manager = createStagingManager(policy(stagingRoot), {
    inspectAvailableBytes: async () => 2_000_000n,
    archiveValidatorHooks: {
      async beforeFinalStat() {
        finalStatHooks += 1;
        await appendFile(
          join(stagingRoot, "runs", runId, "strapi-export.tar"),
          "changed",
        );
      },
    },
  });
  try {
    const allocation = await manager.allocate(runId);
    manager.watchCaptureSize(allocation, identity, unusedClient(), () =>
      assert.fail("disconnect was not expected"),
    );
    await createArchiveFixture(join(root, "source"), allocation.archivePath, [
      { path: "metadata.json", content: metadata() },
    ]);
    const terminal = captured(allocation.archiveBasePath);
    await manager.recordCaptureTerminal(allocation, terminal);

    let mutationFailure: unknown;
    await assert.rejects(
      manager.validateArchive(allocation, terminal),
      (error: unknown) => {
        mutationFailure = error;
        return archiveCode("archive_changed")(error);
      },
    );
    await assert.rejects(
      manager.validateArchive(allocation, terminal),
      (error: unknown) => error === mutationFailure,
    );
    assert.equal(finalStatHooks, 1);
    await manager.cleanup(allocation);
    await assert.rejects(access(allocation.runDirectory), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict tar inspection rejects random, checksum-damaged, and truncated archives", async (context) => {
  await context.test("random bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-random-"));
    const runDirectory = join(root, "run");
    try {
      await mkdir(runDirectory);
      const archivePath = join(runDirectory, "strapi-export.tar");
      await writeFile(archivePath, "not a tar archive");
      await assert.rejects(
        validateArchiveFile({
          runId,
          runDirectory,
          archivePath,
          maximumArchiveBytes: 1_000_000n,
          metadataMaximumBytes: 65_536,
          capture: captured(join(runDirectory, "strapi-export")),
        }),
        archiveCode("archive_invalid"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("checksum damage", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-checksum-"));
    try {
      const request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
      ]);
      const handle = await open(request.archivePath, "r+");
      try {
        await handle.write(Buffer.from([0xff]), 0, 1, 10);
      } finally {
        await handle.close();
      }
      await assert.rejects(
        validateArchiveFile(request),
        archiveCode("archive_invalid"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("truncated body", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-truncated-"));
    try {
      const request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
        { path: "payload.bin", content: Buffer.alloc(8 * 1024, 0x42) },
      ]);
      await truncate(request.archivePath, 2048);
      await assert.rejects(
        validateArchiveFile(request),
        archiveCode("archive_invalid"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test("metadata is required once as a bounded regular root file", async (context) => {
  const cases: readonly {
    readonly name: string;
    readonly entries: readonly ArchiveFixtureEntry[];
    readonly archiveEntries?: readonly string[];
    readonly maximum?: number;
    readonly code: ArchiveErrorCode;
  }[] = [
    {
      name: "missing",
      entries: [{ path: "payload.bin" }],
      code: "metadata_missing",
    },
    {
      name: "duplicate",
      entries: [{ path: "metadata.json", content: metadata() }],
      archiveEntries: ["metadata.json", "metadata.json"],
      code: "metadata_duplicate",
    },
    {
      name: "directory",
      entries: [{ path: "metadata.json", directory: true }],
      code: "metadata_not_file",
    },
    {
      name: "invalid UTF-8",
      entries: [{ path: "metadata.json", content: Buffer.from([0xff]) }],
      code: "metadata_invalid",
    },
    {
      name: "invalid JSON",
      entries: [{ path: "metadata.json", content: "{" }],
      code: "metadata_invalid",
    },
    {
      name: "invalid shape",
      entries: [{ path: "metadata.json", content: "[]" }],
      code: "metadata_invalid",
    },
    {
      name: "missing required field",
      entries: [
        {
          path: "metadata.json",
          content: JSON.stringify({
            createdAt: "2026-10-29T00:00:00.000Z",
          }),
        },
      ],
      code: "metadata_invalid",
    },
    {
      name: "invalid timestamp",
      entries: [
        {
          path: "metadata.json",
          content: metadata({ createdAt: "yesterday" }),
        },
      ],
      code: "metadata_invalid",
    },
    {
      name: "oversized",
      entries: [{ path: "metadata.json", content: metadata() }],
      maximum: 8,
      code: "metadata_too_large",
    },
  ];
  for (const fixture of cases) {
    await context.test(fixture.name, async () => {
      const root = await mkdtemp(join(tmpdir(), "b05-metadata-"));
      try {
        const request = await directFixture(root, fixture.entries, {
          archiveEntries: fixture.archiveEntries,
          metadataMaximumBytes: fixture.maximum,
        });
        await assert.rejects(
          validateArchiveFile(request),
          archiveCode(fixture.code),
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

test("metadata Strapi version must match the captured runtime", async () => {
  const root = await mkdtemp(join(tmpdir(), "b05-version-"));
  try {
    const request = await directFixture(
      root,
      [{ path: "metadata.json", content: metadata() }],
      { terminalIdentity: { ...identity, strapiVersion: "5.51.0" } },
    );
    await assert.rejects(
      validateArchiveFile(request),
      archiveCode("metadata_version_mismatch"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file admission rejects missing, extra, symlink, empty, unreadable, and oversized output", async (context) => {
  await context.test("missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-missing-"));
    const runDirectory = join(root, "run");
    try {
      await mkdir(runDirectory);
      await assert.rejects(
        validateArchiveFile({
          runId,
          runDirectory,
          archivePath: join(runDirectory, "strapi-export.tar"),
          maximumArchiveBytes: 1_000_000n,
          metadataMaximumBytes: 65_536,
          capture: captured(join(runDirectory, "strapi-export")),
        }),
        archiveCode("archive_missing"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("extra output", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-extra-"));
    try {
      const request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
      ]);
      await writeFile(join(request.runDirectory, "partial"), "unexpected");
      await assert.rejects(
        validateArchiveFile(request),
        archiveCode("archive_invalid"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("final symlink", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-symlink-"));
    const sourceRun = join(root, "source-run");
    const runDirectory = join(root, "run");
    try {
      await mkdir(sourceRun);
      await mkdir(runDirectory);
      const realArchive = join(sourceRun, "real.tar");
      await createArchiveFixture(join(root, "source"), realArchive, [
        { path: "metadata.json", content: metadata() },
      ]);
      const archivePath = join(runDirectory, "strapi-export.tar");
      await symlink(realArchive, archivePath);
      await assert.rejects(
        validateArchiveFile({
          runId,
          runDirectory,
          archivePath,
          maximumArchiveBytes: 1_000_000n,
          metadataMaximumBytes: 65_536,
          capture: captured(join(runDirectory, "strapi-export")),
        }),
        archiveCode("archive_not_regular"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("empty", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-empty-"));
    const runDirectory = join(root, "run");
    try {
      await mkdir(runDirectory);
      const archivePath = join(runDirectory, "strapi-export.tar");
      await writeFile(archivePath, "");
      await assert.rejects(
        validateArchiveFile({
          runId,
          runDirectory,
          archivePath,
          maximumArchiveBytes: 1_000_000n,
          metadataMaximumBytes: 65_536,
          capture: captured(join(runDirectory, "strapi-export")),
        }),
        archiveCode("archive_empty"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("non-regular directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-nonregular-"));
    const runDirectory = join(root, "run");
    try {
      await mkdir(runDirectory);
      const archivePath = join(runDirectory, "strapi-export.tar");
      await mkdir(archivePath);
      await assert.rejects(
        validateArchiveFile({
          runId,
          runDirectory,
          archivePath,
          maximumArchiveBytes: 1_000_000n,
          metadataMaximumBytes: 65_536,
          capture: captured(join(runDirectory, "strapi-export")),
        }),
        archiveCode("archive_not_regular"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("unreadable with cause", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-unreadable-"));
    let request: ArchiveValidationRequest | undefined;
    try {
      request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
      ]);
      await chmod(request.archivePath, 0o000);
      await assert.rejects(validateArchiveFile(request), (error: unknown) => {
        assert.equal(error instanceof ArchiveValidationError, true);
        assert.equal(
          (error as ArchiveValidationError).code,
          "archive_unreadable",
        );
        assert.notEqual((error as ArchiveValidationError).cause, undefined);
        return true;
      });
    } finally {
      if (request !== undefined)
        await chmod(request.archivePath, 0o600).catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("oversized", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-too-large-"));
    try {
      const request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
      ]);
      const size = (await stat(request.archivePath)).size;
      await assert.rejects(
        validateArchiveFile({
          ...request,
          maximumArchiveBytes: BigInt(size - 1),
        }),
        archiveCode("archive_too_large"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test("abort and mutation cannot produce a validated artifact", async (context) => {
  await context.test("aborted stream", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-abort-"));
    try {
      const request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
        { path: "payload.bin", content: Buffer.alloc(128 * 1024) },
      ]);
      const controller = new AbortController();
      controller.abort(new Error("fixture abort"));
      await assert.rejects(
        validateArchiveFile({ ...request, signal: controller.signal }),
        archiveCode("archive_invalid"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await context.test("changed after streaming", async () => {
    const root = await mkdtemp(join(tmpdir(), "b05-mutation-"));
    try {
      const request = await directFixture(root, [
        { path: "metadata.json", content: metadata() },
      ]);
      await assert.rejects(
        validateArchiveFile(request, {
          beforeFinalStat: async () =>
            appendFile(request.archivePath, "changed"),
        }),
        archiveCode("archive_changed"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

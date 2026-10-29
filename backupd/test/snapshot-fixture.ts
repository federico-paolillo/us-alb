import { createHash } from "node:crypto";
import { type FileHandle, open, writeFile } from "node:fs/promises";

import type { ValidatedArchive } from "../src/archive-validator.ts";
import type {
  PublicationPolicy,
  SnapshotAttribution,
} from "../src/object-storage-config.ts";

export const fixtureAttribution: SnapshotAttribution = {
  site: "example-site",
  environment: "production",
  imageDigest: `sha256:${"a".repeat(64)}`,
  gitRevision: "c57102d433b268363b1e1d7f98f47a32d69ea504",
};

export const fixturePolicy: PublicationPolicy = {
  uploadConcurrency: 4,
  publicationWindowMs: 21_600_000,
  finalReconciliationReserveMs: 60_000,
};

export function fixtureArchive(
  overrides: Partial<ValidatedArchive> = {},
): ValidatedArchive {
  return {
    runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    archivePath:
      "/staging/runs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/strapi-export.tar",
    byteLength: 10,
    sha256: "b".repeat(64),
    metadata: {
      createdAt: "2026-10-29T00:00:00.000Z",
      strapiVersion: "5.52.0",
    },
    capture: {
      version: 1,
      type: "terminal",
      identity: {
        supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
        captureWindowId: "22222222-2222-4222-8222-222222222222",
        releaseId: "release-1",
        sourceVolumeId: "source-1",
        nodeVersion: "v24.20.0",
        strapiVersion: "5.52.0",
      },
      archiveBasePath:
        "/staging/runs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/strapi-export",
      startedAt: "2026-10-29T00:00:00.000Z",
      deadlineAt: "2026-10-29T00:15:00.000Z",
      acceptedAt: "2026-10-29T00:00:01.000Z",
      completedAt: "2026-10-29T00:00:04.000Z",
      outcome: {
        status: "captured",
        exportClosedAt: "2026-10-29T00:00:02.000Z",
        servingRecoveredAt: "2026-10-29T00:00:03.000Z",
      },
    },
    fileIdentity: {
      device: 1n,
      inode: 2n,
      size: 10n,
      modifiedNanoseconds: 3n,
      changedNanoseconds: 4n,
    },
    ...overrides,
  };
}

export async function fileArchive(
  archivePath: string,
  bytes: Buffer,
  overrides: Partial<ValidatedArchive> = {},
): Promise<ValidatedArchive> {
  await writeFile(archivePath, bytes);
  let handle: FileHandle | undefined;
  try {
    handle = await open(archivePath, "r");
    const stat = await handle.stat({ bigint: true });
    return fixtureArchive({
      archivePath,
      byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      fileIdentity: {
        device: stat.dev,
        inode: stat.ino,
        size: stat.size,
        modifiedNanoseconds: stat.mtimeNs,
        changedNanoseconds: stat.ctimeNs,
      },
      ...overrides,
    });
  } finally {
    await handle?.close();
  }
}

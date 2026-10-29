import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  CreateBucketCommand,
  GetObjectCommand,
  ListMultipartUploadsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { createTestBackupPublicationConfig } from "../src/object-storage-config.ts";
import {
  createS3Client,
  createS3SnapshotStore,
} from "../src/s3-snapshot-store.ts";
import { createSnapshotPublicationRequest } from "../src/snapshot-manifest.ts";
import {
  createSnapshotPublisher,
  SnapshotPublicationError,
  type SnapshotStore,
} from "../src/snapshot-publisher.ts";
import { fileArchive, fixtureAttribution } from "./snapshot-fixture.ts";

const execute = promisify(execFile);
const LOCALSTACK_IMAGE =
  "localstack/localstack:4.9.2@sha256:59373b4a27dba3ec15c4db0b7455f0cb68c8a42300e2cbbe362b440f9a131697";

async function docker(...arguments_: string[]): Promise<string> {
  const result = await execute("docker", arguments_, {
    encoding: "utf8",
    maxBuffer: 4 * 1_048_576,
  });
  return result.stdout.trim();
}

function storageEnvironment(
  endpoint: string,
  bucket: string,
): NodeJS.ProcessEnv {
  return {
    BACKUPD_S3_ENDPOINT: endpoint,
    BACKUPD_S3_REGION: "us-east-1",
    BACKUPD_S3_BUCKET: bucket,
    BACKUPD_S3_ACCESS_KEY_ID: "test",
    BACKUPD_S3_SECRET_ACCESS_KEY: "test",
    BACKUPD_SNAPSHOT_SITE: fixtureAttribution.site,
    BACKUPD_SNAPSHOT_ENVIRONMENT: fixtureAttribution.environment,
    BACKUPD_APPLICATION_IMAGE_DIGEST: fixtureAttribution.imageDigest,
    BACKUPD_GIT_REVISION: fixtureAttribution.gitRevision,
    BACKUPD_UPLOAD_CONCURRENCY: "2",
    BACKUPD_S3_MAX_ATTEMPTS: "1",
  };
}

async function responseBytes(body: unknown): Promise<Buffer> {
  assert.ok(body !== undefined && body !== null);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function liveCapture(
  archive: Awaited<ReturnType<typeof fileArchive>>,
  runId: string,
): Awaited<ReturnType<typeof fileArchive>> {
  const accepted = Date.now() - 3_000;
  return {
    ...archive,
    runId,
    capture: {
      ...archive.capture,
      identity: {
        ...archive.capture.identity,
        captureWindowId: randomUUID(),
      },
      startedAt: new Date(accepted - 1_000).toISOString(),
      acceptedAt: new Date(accepted).toISOString(),
      deadlineAt: new Date(accepted + 900_000).toISOString(),
      completedAt: new Date(accepted + 3_000).toISOString(),
      outcome: {
        status: "captured",
        exportClosedAt: new Date(accepted + 1_000).toISOString(),
        servingRecoveredAt: new Date(accepted + 2_000).toISOString(),
      },
    },
  };
}

test(
  "real SDK publishes immutable multipart archive then manifest and aborts owned multipart work",
  { timeout: 120_000 },
  async () => {
    const suffix = randomUUID().slice(0, 8);
    const containerName = `b06-localstack-${suffix}`;
    const bucket = `b06-${suffix}`;
    const root = await mkdtemp(join(tmpdir(), "b06-localstack-"));
    let containerStarted = false;
    try {
      await docker(
        "run",
        "--detach",
        "--rm",
        "--name",
        containerName,
        "--label",
        "us-alb.test-owner=b06",
        "--env",
        "SERVICES=s3",
        "--publish",
        "127.0.0.1::4566",
        LOCALSTACK_IMAGE,
      );
      containerStarted = true;
      const portOutput = await docker("port", containerName, "4566/tcp");
      const match = /127\.0\.0\.1:(\d+)/.exec(portOutput);
      assert.ok(match?.[1]);
      const endpoint = `http://127.0.0.1:${match[1]}`;
      const config = createTestBackupPublicationConfig(
        storageEnvironment(endpoint, bucket),
      );
      const administrativeClient = createS3Client(config.storage);
      let ready = false;
      let lastError: unknown;
      const readinessDeadline = Date.now() + 60_000;
      while (!ready && Date.now() < readinessDeadline) {
        try {
          await administrativeClient.send(
            new CreateBucketCommand({ Bucket: bucket }),
          );
          ready = true;
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      if (!ready) {
        throw new Error("LocalStack S3 did not become ready", {
          cause: lastError,
        });
      }

      const archiveBytes = Buffer.alloc(6 * 1_048_576, 0x6a);
      const archive = liveCapture(
        await fileArchive(join(root, "archive.tar"), archiveBytes),
        randomUUID(),
      );
      const request = createSnapshotPublicationRequest(
        archive,
        config.attribution,
        config.publication,
      );
      const publisher = createSnapshotPublisher(
        createS3SnapshotStore(config.storage),
        config.publication,
      );
      await publisher.preflight();
      const published = await publisher.publish(request);
      assert.equal(published.status, "published");
      const remoteArchive = await administrativeClient.send(
        new GetObjectCommand({ Bucket: bucket, Key: request.keys.archiveKey }),
      );
      assert.deepEqual(await responseBytes(remoteArchive.Body), archiveBytes);
      const remoteManifest = await administrativeClient.send(
        new GetObjectCommand({ Bucket: bucket, Key: request.keys.manifestKey }),
      );
      assert.deepEqual(
        await responseBytes(remoteManifest.Body),
        Buffer.from(request.manifestBytes),
      );
      assert.equal(
        (await publisher.publish(request)).status,
        "already-published",
      );

      const conflictingArchive = liveCapture(
        await fileArchive(join(root, "conflict.tar"), Buffer.alloc(32, 0x44)),
        randomUUID(),
      );
      const conflictRequest = createSnapshotPublicationRequest(
        conflictingArchive,
        config.attribution,
        config.publication,
      );
      const foreign = Buffer.from("foreign-object");
      await administrativeClient.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: conflictRequest.keys.archiveKey,
          Body: foreign,
        }),
      );
      await assert.rejects(
        publisher.publish(conflictRequest),
        (error: unknown) =>
          error instanceof SnapshotPublicationError &&
          error.code === "remote_collision",
      );
      const unchanged = await administrativeClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: conflictRequest.keys.archiveKey,
        }),
      );
      assert.deepEqual(await responseBytes(unchanged.Body), foreign);

      const racedArchive = liveCapture(
        await fileArchive(
          join(root, "race.tar"),
          Buffer.alloc(6 * 1_048_576, 0x52),
        ),
        randomUUID(),
      );
      const raceRequest = createSnapshotPublicationRequest(
        racedArchive,
        config.attribution,
        config.publication,
      );
      const realStore = createS3SnapshotStore(config.storage);
      let firstArchiveHead = true;
      let seededRace = false;
      const racingStore: SnapshotStore = {
        ...realStore,
        preflight: (signal) => realStore.preflight(signal),
        headArchive: async (publication, signal) => {
          if (firstArchiveHead) {
            firstArchiveHead = false;
            return undefined;
          }
          return realStore.headArchive(publication, signal);
        },
        headManifest: async (publication, signal) => {
          const result = await realStore.headManifest(publication, signal);
          if (!seededRace) {
            seededRace = true;
            await administrativeClient.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: raceRequest.keys.archiveKey,
                Body: foreign,
              }),
            );
          }
          return result;
        },
        getManifest: (publication, etag, signal) =>
          realStore.getManifest(publication, etag, signal),
        beginArchiveUpload: (publication, body, partSize, queueSize, signal) =>
          realStore.beginArchiveUpload(
            publication,
            body,
            partSize,
            queueSize,
            signal,
          ),
        putManifest: (publication, signal) =>
          realStore.putManifest(publication, signal),
      };
      await assert.rejects(
        createSnapshotPublisher(racingStore, config.publication).publish(
          raceRequest,
        ),
        (error: unknown) =>
          error instanceof SnapshotPublicationError &&
          error.code === "remote_collision",
      );
      const racedBody = await administrativeClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: raceRequest.keys.archiveKey,
        }),
      );
      assert.deepEqual(await responseBytes(racedBody.Body), foreign);

      const manifestRaceArchive = liveCapture(
        await fileArchive(
          join(root, "manifest-race.tar"),
          Buffer.alloc(6 * 1_048_576, 0x61),
        ),
        randomUUID(),
      );
      const manifestRaceRequest = createSnapshotPublicationRequest(
        manifestRaceArchive,
        config.attribution,
        config.publication,
      );
      const manifestRaceStore = createS3SnapshotStore(config.storage);
      const manifestRacingStore: SnapshotStore = {
        preflight: (signal) => manifestRaceStore.preflight(signal),
        headArchive: (publication, signal) =>
          manifestRaceStore.headArchive(publication, signal),
        headManifest: (publication, signal) =>
          manifestRaceStore.headManifest(publication, signal),
        getManifest: (publication, etag, signal) =>
          manifestRaceStore.getManifest(publication, etag, signal),
        beginArchiveUpload: (publication, body, partSize, queueSize, signal) =>
          manifestRaceStore.beginArchiveUpload(
            publication,
            body,
            partSize,
            queueSize,
            signal,
          ),
        putManifest: async (publication, signal) => {
          await administrativeClient.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: publication.keys.manifestKey,
              Body: foreign,
            }),
          );
          await manifestRaceStore.putManifest(publication, signal);
        },
      };
      await assert.rejects(
        createSnapshotPublisher(
          manifestRacingStore,
          config.publication,
        ).publish(manifestRaceRequest),
        (error: unknown) =>
          error instanceof SnapshotPublicationError &&
          error.code === "remote_collision",
      );
      const racedManifestBody = await administrativeClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: manifestRaceRequest.keys.manifestKey,
        }),
      );
      assert.deepEqual(await responseBytes(racedManifestBody.Body), foreign);

      const cancelController = new AbortController();
      let progressEvents = 0;
      const cancellationArchive = liveCapture(
        await fileArchive(
          join(root, "cancel.tar"),
          Buffer.alloc(20 * 1_048_576, 0x33),
        ),
        randomUUID(),
      );
      const cancellationRequest = createSnapshotPublicationRequest(
        cancellationArchive,
        config.attribution,
        config.publication,
      );
      const cancellationPublisher = createSnapshotPublisher(
        createS3SnapshotStore(config.storage, {
          onArchiveProgress: () => {
            progressEvents += 1;
            cancelController.abort(new Error("integration cancellation"));
          },
        }),
        config.publication,
      );
      await assert.rejects(
        cancellationPublisher.publish(cancellationRequest, {
          signal: cancelController.signal,
        }),
        (error: unknown) =>
          error instanceof SnapshotPublicationError &&
          error.code === "publication_cancelled",
      );
      assert.ok(progressEvents >= 1);
      const cleanupDeadline = Date.now() + 10_000;
      let activeUpload = true;
      while (activeUpload && Date.now() < cleanupDeadline) {
        const multipart = await administrativeClient.send(
          new ListMultipartUploadsCommand({ Bucket: bucket }),
        );
        activeUpload =
          multipart.Uploads?.some(
            (upload) => upload.Key === cancellationRequest.keys.archiveKey,
          ) ?? false;
        if (activeUpload) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      assert.equal(activeUpload, false);
      assert.deepEqual(await readFile(archive.archivePath), archiveBytes);
      administrativeClient.destroy();
    } finally {
      if (containerStarted) {
        await docker("rm", "--force", containerName).catch(() => undefined);
      }
      await rm(root, { recursive: true, force: true });
    }
  },
);

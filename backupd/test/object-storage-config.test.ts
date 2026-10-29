import assert from "node:assert/strict";
import test from "node:test";

import {
  createTestBackupPublicationConfig,
  ObjectStorageConfigurationError,
  parseBackupPublicationConfig,
} from "../src/object-storage-config.ts";

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    BACKUPD_S3_ENDPOINT: "https://s3.fr-par.scw.cloud",
    BACKUPD_S3_REGION: "fr-par",
    BACKUPD_S3_BUCKET: "private-backups",
    BACKUPD_S3_ACCESS_KEY_ID: "access-fixture",
    BACKUPD_S3_SECRET_ACCESS_KEY: "secret-fixture",
    BACKUPD_SNAPSHOT_SITE: "example-site",
    BACKUPD_SNAPSHOT_ENVIRONMENT: "production",
    BACKUPD_APPLICATION_IMAGE_DIGEST: `sha256:${"a".repeat(64)}`,
    BACKUPD_GIT_REVISION: "c57102d433b268363b1e1d7f98f47a32d69ea504",
  };
}

test("production configuration is strict and uses bounded defaults", () => {
  const config = parseBackupPublicationConfig(validEnvironment());
  assert.equal(config.storage.endpoint.href, "https://s3.fr-par.scw.cloud/");
  assert.equal(config.storage.forcePathStyle, false);
  assert.equal(config.storage.maximumAttempts, 3);
  assert.equal(config.publication.uploadConcurrency, 4);
  assert.equal(config.publication.publicationWindowMs, 21_600_000);
  assert.equal(config.publication.finalReconciliationReserveMs, 60_000);
  assert.deepEqual(config.attribution, {
    site: "example-site",
    environment: "production",
    imageDigest: `sha256:${"a".repeat(64)}`,
    gitRevision: "c57102d433b268363b1e1d7f98f47a32d69ea504",
  });
});

test("configuration rejects insecure production transport and malformed bounds without echoing secrets", () => {
  const invalids: NodeJS.ProcessEnv[] = [
    { ...validEnvironment(), BACKUPD_S3_ENDPOINT: "http://127.0.0.1:4566" },
    {
      ...validEnvironment(),
      BACKUPD_S3_ENDPOINT: "https://user:pass@example.com/",
    },
    { ...validEnvironment(), BACKUPD_S3_ENDPOINT: "https://example.com/path" },
    { ...validEnvironment(), BACKUPD_SNAPSHOT_SITE: "Unsafe/segment" },
    { ...validEnvironment(), BACKUPD_UPLOAD_CONCURRENCY: "5" },
    { ...validEnvironment(), BACKUPD_S3_MAX_ATTEMPTS: "4" },
    { ...validEnvironment(), BACKUPD_PUBLICATION_WINDOW_SECONDS: "60" },
    {
      ...validEnvironment(),
      BACKUPD_APPLICATION_IMAGE_DIGEST: "secret-fixture",
    },
  ];
  for (const environment of invalids) {
    assert.throws(
      () => parseBackupPublicationConfig(environment),
      (error: unknown) =>
        error instanceof ObjectStorageConfigurationError &&
        error.code === "configuration_invalid" &&
        !error.message.includes("secret-fixture"),
    );
  }
});

test("only the explicit test factory permits loopback HTTP and path style", () => {
  const config = createTestBackupPublicationConfig({
    ...validEnvironment(),
    BACKUPD_S3_ENDPOINT: "http://127.0.0.1:4566",
    BACKUPD_UPLOAD_CONCURRENCY: "2",
    BACKUPD_S3_MAX_ATTEMPTS: "1",
  });
  assert.equal(config.storage.forcePathStyle, true);
  assert.equal(config.publication.uploadConcurrency, 2);
  assert.equal(config.storage.maximumAttempts, 1);
});

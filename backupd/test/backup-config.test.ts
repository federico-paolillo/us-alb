import assert from "node:assert/strict";
import test from "node:test";

import {
  BackupConfigurationError,
  parseBackupDaemonConfig,
} from "../src/backup-config.ts";

function environment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    BACKUPD_S3_ENDPOINT: "https://s3.example.test",
    BACKUPD_S3_REGION: "fr-par",
    BACKUPD_S3_BUCKET: "backup-bucket",
    BACKUPD_S3_ACCESS_KEY_ID: "access-key",
    BACKUPD_S3_SECRET_ACCESS_KEY: "secret-key",
    BACKUPD_SNAPSHOT_SITE: "site",
    BACKUPD_SNAPSHOT_ENVIRONMENT: "production",
    BACKUPD_APPLICATION_IMAGE_DIGEST: `sha256:${"a".repeat(64)}`,
    BACKUPD_GIT_REVISION: "5600dbf1ab6234e04a72a48ecfb1a0f46c89a6c9",
    ...overrides,
  };
}

test("daemon configuration composes canonical defaults without mutating input", () => {
  const input = environment();
  const before = { ...input };
  const config = parseBackupDaemonConfig(input);
  assert.equal(config.captureClient.socketPath, "/coordination/strapid.sock");
  assert.equal(config.shutdownTimeoutMs, 30_000);
  assert.equal(config.schedule.utcHour, 3);
  assert.equal(config.staging.stagingRoot, "/staging");
  assert.deepEqual(input, before);
});

test("daemon configuration strictly bounds socket and shutdown settings", () => {
  const configured = parseBackupDaemonConfig(
    environment({
      BACKUPD_COORDINATION_SOCKET_PATH: "/run/private/strapid.sock",
      BACKUPD_SHUTDOWN_TIMEOUT_SECONDS: "300",
    }),
  );
  assert.equal(
    configured.captureClient.socketPath,
    "/run/private/strapid.sock",
  );
  assert.equal(configured.shutdownTimeoutMs, 300_000);

  for (const overrides of [
    { BACKUPD_COORDINATION_SOCKET_PATH: "relative.sock" },
    { BACKUPD_COORDINATION_SOCKET_PATH: "/run/bad\0socket" },
    { BACKUPD_SHUTDOWN_TIMEOUT_SECONDS: "0" },
    { BACKUPD_SHUTDOWN_TIMEOUT_SECONDS: "01" },
    { BACKUPD_SHUTDOWN_TIMEOUT_SECONDS: "301" },
  ]) {
    assert.throws(
      () => parseBackupDaemonConfig(environment(overrides)),
      BackupConfigurationError,
    );
  }
});

import { isAbsolute } from "node:path";

import type { CaptureClientOptions } from "./capture-client.ts";
import {
  type BackupPublicationConfig,
  parseBackupPublicationConfig,
} from "./object-storage-config.ts";
import { parseSchedulePolicy, type SchedulePolicy } from "./schedule-policy.ts";
import { parseStagingPolicy, type StagingPolicy } from "./staging-policy.ts";

export const DEFAULT_COORDINATION_SOCKET_PATH = "/coordination/strapid.sock";
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

export class BackupConfigurationError extends Error {
  readonly code = "configuration_invalid" as const;

  constructor(cause?: unknown) {
    super(
      "Backup daemon configuration is invalid",
      cause === undefined ? undefined : { cause },
    );
    this.name = "BackupConfigurationError";
  }
}

export interface BackupDaemonConfig {
  readonly captureClient: CaptureClientOptions;
  readonly schedule: SchedulePolicy;
  readonly staging: StagingPolicy;
  readonly publication: BackupPublicationConfig;
  readonly shutdownTimeoutMs: number;
}

function shutdownTimeout(value: string | undefined): number {
  if (value === undefined) return DEFAULT_SHUTDOWN_TIMEOUT_MS;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new BackupConfigurationError();
  }
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 300) {
    throw new BackupConfigurationError();
  }
  return seconds * 1_000;
}

function socketPath(value: string | undefined): string {
  const path = value ?? DEFAULT_COORDINATION_SOCKET_PATH;
  if (!isAbsolute(path) || path.includes("\0")) {
    throw new BackupConfigurationError();
  }
  return path;
}

export function parseBackupDaemonConfig(
  environment: NodeJS.ProcessEnv = process.env,
): BackupDaemonConfig {
  try {
    return Object.freeze({
      captureClient: Object.freeze({
        socketPath: socketPath(environment.BACKUPD_COORDINATION_SOCKET_PATH),
      }),
      schedule: parseSchedulePolicy(environment),
      staging: parseStagingPolicy(environment),
      publication: parseBackupPublicationConfig(environment),
      shutdownTimeoutMs: shutdownTimeout(
        environment.BACKUPD_SHUTDOWN_TIMEOUT_SECONDS,
      ),
    });
  } catch (error) {
    if (error instanceof BackupConfigurationError) throw error;
    throw new BackupConfigurationError(error);
  }
}

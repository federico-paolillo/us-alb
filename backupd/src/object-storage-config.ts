export const FINAL_RECONCILIATION_RESERVE_MS = 60_000 as const;

export interface ObjectStorageConfig {
  readonly endpoint: URL;
  readonly region: string;
  readonly bucket: string;
  readonly credentials: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
  readonly forcePathStyle: boolean;
  readonly maximumAttempts: number;
}

export interface SnapshotAttribution {
  readonly site: string;
  readonly environment: string;
  readonly imageDigest: string;
  readonly gitRevision: string;
}

export interface PublicationPolicy {
  readonly uploadConcurrency: number;
  readonly publicationWindowMs: number;
  readonly finalReconciliationReserveMs: typeof FINAL_RECONCILIATION_RESERVE_MS;
}

export interface BackupPublicationConfig {
  readonly storage: ObjectStorageConfig;
  readonly attribution: SnapshotAttribution;
  readonly publication: PublicationPolicy;
}

export class ObjectStorageConfigurationError extends Error {
  readonly code = "configuration_invalid" as const;

  constructor(cause?: unknown) {
    super(
      "Object storage configuration is invalid",
      cause === undefined ? undefined : { cause },
    );
    this.name = "ObjectStorageConfigurationError";
  }
}

function required(
  environment: NodeJS.ProcessEnv,
  name: string,
  maximumBytes: number,
): string {
  const value = environment[name];
  const hasControlCharacter =
    value !== undefined &&
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 31 || codePoint === 127;
    });
  if (
    value === undefined ||
    value.length === 0 ||
    Buffer.byteLength(value) > maximumBytes ||
    hasControlCharacter
  ) {
    throw new ObjectStorageConfigurationError();
  }
  return value;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new ObjectStorageConfigurationError();
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ObjectStorageConfigurationError();
  }
  return parsed;
}

function endpoint(value: string, allowLoopbackHttp = false): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // URL parse errors retain the rejected input; never expose it as a cause.
    throw new ObjectStorageConfigurationError();
  }
  const loopback =
    parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
  if (
    (parsed.protocol !== "https:" &&
      !(allowLoopbackHttp && loopback && parsed.protocol === "http:")) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new ObjectStorageConfigurationError();
  }
  return parsed;
}

function asciiToken(value: string, pattern: RegExp): string {
  if (!pattern.test(value)) throw new ObjectStorageConfigurationError();
  return value;
}

function parseCommon(
  environment: NodeJS.ProcessEnv,
  options: {
    readonly allowLoopbackHttp: boolean;
    readonly forcePathStyle: boolean;
  },
): BackupPublicationConfig {
  const endpointValue = required(environment, "BACKUPD_S3_ENDPOINT", 2_048);
  const region = asciiToken(
    required(environment, "BACKUPD_S3_REGION", 63),
    /^[a-z0-9][a-z0-9-]{0,62}$/,
  );
  const bucket = asciiToken(
    required(environment, "BACKUPD_S3_BUCKET", 63),
    /^(?=.{3,63}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/,
  );
  const segment = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
  const site = asciiToken(
    required(environment, "BACKUPD_SNAPSHOT_SITE", 64),
    segment,
  );
  const deploymentEnvironment = asciiToken(
    required(environment, "BACKUPD_SNAPSHOT_ENVIRONMENT", 64),
    segment,
  );
  const imageDigest = asciiToken(
    required(environment, "BACKUPD_APPLICATION_IMAGE_DIGEST", 71),
    /^sha256:[0-9a-f]{64}$/,
  );
  const gitRevision = asciiToken(
    required(environment, "BACKUPD_GIT_REVISION", 64),
    /^[0-9a-f]{7,64}$/,
  );
  const publicationWindowSeconds = boundedInteger(
    environment.BACKUPD_PUBLICATION_WINDOW_SECONDS,
    21_600,
    61,
    Math.floor(Number.MAX_SAFE_INTEGER / 1_000),
  );
  return Object.freeze({
    storage: Object.freeze({
      endpoint: endpoint(endpointValue, options.allowLoopbackHttp),
      region,
      bucket,
      credentials: Object.freeze({
        accessKeyId: required(environment, "BACKUPD_S3_ACCESS_KEY_ID", 256),
        secretAccessKey: required(
          environment,
          "BACKUPD_S3_SECRET_ACCESS_KEY",
          1_024,
        ),
      }),
      forcePathStyle: options.forcePathStyle,
      maximumAttempts: boundedInteger(
        environment.BACKUPD_S3_MAX_ATTEMPTS,
        3,
        1,
        3,
      ),
    }),
    attribution: Object.freeze({
      site,
      environment: deploymentEnvironment,
      imageDigest,
      gitRevision,
    }),
    publication: Object.freeze({
      uploadConcurrency: boundedInteger(
        environment.BACKUPD_UPLOAD_CONCURRENCY,
        4,
        1,
        4,
      ),
      publicationWindowMs: publicationWindowSeconds * 1_000,
      finalReconciliationReserveMs: FINAL_RECONCILIATION_RESERVE_MS,
    }),
  });
}

export function parseBackupPublicationConfig(
  environment: NodeJS.ProcessEnv = process.env,
): BackupPublicationConfig {
  return parseCommon(environment, {
    allowLoopbackHttp: false,
    forcePathStyle: false,
  });
}

export function createTestBackupPublicationConfig(
  environment: NodeJS.ProcessEnv,
): BackupPublicationConfig {
  return parseCommon(environment, {
    allowLoopbackHttp: true,
    forcePathStyle: true,
  });
}

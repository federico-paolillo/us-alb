import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const projectName = "b10-config-test";

const environment: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  SITE_URL: "https://site.invalid",
  CMS_API_URL: "http://backend:65101/api",
  CMS_PUBLIC_URL: "https://site.invalid/cms",
  CMS_MEDIA_URL: "https://site.invalid",
  CMS_API_TOKEN: "cms-token-placeholder",
  REVALIDATION_HEADER: "x-revalidation-token",
  REVALIDATION_SECRET: "revalidation-placeholder",
  PREVIEW_SECRET: "preview-placeholder",
  NEXT_PUBLIC_APP_VERSION: "b10-validation",
  CMS_ADMIN_COOKIE_PATH: "/cms/admin",
  APP_KEYS: "app-key-placeholder-1,app-key-placeholder-2",
  API_TOKEN_SALT: "api-token-salt-placeholder",
  ADMIN_JWT_SECRET: "admin-jwt-placeholder",
  TRANSFER_TOKEN_SALT: "transfer-token-placeholder",
  JWT_SECRET: "jwt-placeholder",
  ENCRYPTION_KEY: "encryption-placeholder",
  FRONTEND_INTERNAL_URL: "http://frontend:65100",
  ADMIN_EMAIL: "admin@example.invalid",
  ADMIN_PASSWORD: "admin-password-placeholder",
  APPLICATION_SOURCE_URL: "https://example.invalid/repository",
  APPLICATION_GIT_REVISION: "a".repeat(40),
  APPLICATION_IMAGE_DIGEST: `sha256:${"b".repeat(64)}`,
  STRAPI_SOURCE_IDENTITY: "source-placeholder",
  DEPLOYMENT_ENVIRONMENT: "test",
  BACKEND_IMAGE_REPOSITORY: "registry.invalid/backend",
  FRONTEND_IMAGE: `registry.invalid/frontend@sha256:${"c".repeat(64)}`,
  BACKUPD_IMAGE: `registry.invalid/backupd@sha256:${"d".repeat(64)}`,
  BACKUPD_S3_ENDPOINT: "https://s3.example.invalid",
  BACKUPD_S3_REGION: "test-region",
  BACKUPD_S3_BUCKET: "backup-placeholder",
  BACKUPD_S3_ACCESS_KEY_ID: "access-placeholder",
  BACKUPD_S3_SECRET_ACCESS_KEY: "secret-placeholder",
  BACKUPD_SNAPSHOT_SITE: "site-placeholder",
  BACKUPD_SCHEDULE_UTC: "03:00",
  BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS: "900",
  BACKUPD_AUTOMATIC_MAX_ATTEMPTS: "2",
  BACKUPD_STAGING_MIN_FREE_BYTES: "107374182400",
  BACKUPD_ARCHIVE_MAX_BYTES: "80530636800",
  BACKUPD_PUBLICATION_WINDOW_SECONDS: "21600",
  BACKUPD_UPLOAD_CONCURRENCY: "4",
  BACKUPD_S3_MAX_ATTEMPTS: "3",
  BACKUPD_SHUTDOWN_TIMEOUT_SECONDS: "30",
  STRAPID_CAPTURE_WINDOW_SECONDS: "900",
  STRAPID_SERVING_SHUTDOWN_SECONDS: "60",
  STRAPID_EXPORT_SECONDS: "600",
  STRAPID_EXPORT_TERMINATION_SECONDS: "30",
  STRAPID_RECOVERY_SECONDS: "210",
  STRAPID_FORCE_CONFIRMATION_SECONDS: "5",
};

interface ComposeMount {
  readonly type: string;
  readonly source: string;
  readonly target: string;
  readonly read_only?: boolean;
}

interface ComposePort {
  readonly host_ip?: string;
  readonly target: number;
  readonly published?: string;
}

interface ComposeService {
  readonly environment?: Readonly<Record<string, string | null>>;
  readonly env_file?: unknown;
  readonly secrets?: unknown;
  readonly volumes?: readonly ComposeMount[];
  readonly tmpfs?: readonly string[];
  readonly ports?: readonly ComposePort[];
  readonly networks?: Readonly<Record<string, unknown>>;
  readonly read_only?: boolean;
  readonly restart?: string;
  readonly stop_grace_period?: string;
  readonly depends_on?: Readonly<
    Record<string, { readonly condition?: string; readonly required?: boolean }>
  >;
  readonly healthcheck?: {
    readonly test?: readonly string[];
  };
  readonly privileged?: boolean;
  readonly network_mode?: string;
  readonly pid?: string;
  readonly ipc?: string;
}

interface ComposeProject {
  readonly services: Readonly<Record<string, ComposeService>>;
  readonly volumes: Readonly<
    Record<
      string,
      {
        readonly name?: string;
        readonly external?: boolean;
        readonly driver?: string;
      }
    >
  >;
  readonly networks: Readonly<
    Record<string, { readonly name?: string; readonly external?: boolean }>
  >;
  readonly secrets?: unknown;
}

const backendEnvironment = [
  "ADMIN_EMAIL",
  "ADMIN_JWT_SECRET",
  "ADMIN_PASSWORD",
  "API_TOKEN_SALT",
  "APP_KEYS",
  "CMS_ADMIN_COOKIE_PATH",
  "CMS_PUBLIC_URL",
  "ENCRYPTION_KEY",
  "FRONTEND_INTERNAL_URL",
  "HOST",
  "JWT_SECRET",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_PROTOCOL",
  "PORT",
  "PREVIEW_SECRET",
  "REVALIDATION_HEADER",
  "REVALIDATION_SECRET",
  "SITE_URL",
  "STRAPID_CAPTURE_WINDOW_SECONDS",
  "STRAPID_COORDINATION_SOCKET_PATH",
  "STRAPID_EXPORT_SECONDS",
  "STRAPID_EXPORT_TERMINATION_SECONDS",
  "STRAPID_FORCE_CONFIRMATION_SECONDS",
  "STRAPID_RECOVERY_SECONDS",
  "STRAPID_RELEASE_ID",
  "STRAPID_SERVING_SHUTDOWN_SECONDS",
  "STRAPID_SOURCE_VOLUME_ID",
  "STRAPID_TELEMETRY_ENVIRONMENT",
  "TRANSFER_TOKEN_SALT",
];

const frontendEnvironment = [
  "CMS_API_TOKEN",
  "CMS_API_URL",
  "CMS_MEDIA_URL",
  "HOSTNAME",
  "PORT",
  "PREVIEW_SECRET",
  "REVALIDATION_HEADER",
  "REVALIDATION_SECRET",
  "SITE_URL",
];

const backupdEnvironment = [
  "BACKUPD_APPLICATION_IMAGE_DIGEST",
  "BACKUPD_ARCHIVE_MAX_BYTES",
  "BACKUPD_AUTOMATIC_MAX_ATTEMPTS",
  "BACKUPD_AUTOMATIC_RETRY_DELAY_SECONDS",
  "BACKUPD_COORDINATION_SOCKET_PATH",
  "BACKUPD_GIT_REVISION",
  "BACKUPD_PUBLICATION_WINDOW_SECONDS",
  "BACKUPD_S3_ACCESS_KEY_ID",
  "BACKUPD_S3_BUCKET",
  "BACKUPD_S3_ENDPOINT",
  "BACKUPD_S3_MAX_ATTEMPTS",
  "BACKUPD_S3_REGION",
  "BACKUPD_S3_SECRET_ACCESS_KEY",
  "BACKUPD_SCHEDULE_UTC",
  "BACKUPD_SHUTDOWN_TIMEOUT_SECONDS",
  "BACKUPD_SNAPSHOT_ENVIRONMENT",
  "BACKUPD_SNAPSHOT_SITE",
  "BACKUPD_STAGING_MIN_FREE_BYTES",
  "BACKUPD_UPLOAD_CONCURRENCY",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_PROTOCOL",
];

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

async function renderCompose(file: string): Promise<ComposeProject> {
  const { stdout } = await execFileAsync(
    "docker",
    [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      "/dev/null",
      "--file",
      file,
      "config",
      "--format",
      "json",
    ],
    {
      cwd: repositoryRoot,
      env: environment,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout) as ComposeProject;
}

function environmentNames(service: ComposeService): string[] {
  return sorted(Object.keys(service.environment ?? {}));
}

function volumeTargets(service: ComposeService): string[] {
  return sorted(
    (service.volumes ?? [])
      .filter((mount) => mount.type === "volume")
      .map((mount) => mount.target),
  );
}

function volumeSourceTargets(service: ComposeService): string[] {
  return sorted(
    (service.volumes ?? [])
      .filter((mount) => mount.type === "volume")
      .map((mount) => `${mount.source}:${mount.target}`),
  );
}

function assertServiceBoundary(
  name: string,
  service: ComposeService,
  expectedEnvironment: readonly string[],
): void {
  assert.deepEqual(
    environmentNames(service),
    sorted(expectedEnvironment),
    `${name} environment key allowlist changed`,
  );
  assert.equal(service.env_file, undefined, `${name} must not use env_file`);
  assert.equal(service.secrets, undefined, `${name} must not use secrets`);
  assert.equal(service.privileged, undefined, `${name} must not be privileged`);
  assert.notEqual(
    service.network_mode,
    "host",
    `${name} must not use host networking`,
  );
  assert.notEqual(
    service.pid,
    "host",
    `${name} must not use the host PID namespace`,
  );
  assert.notEqual(
    service.ipc,
    "host",
    `${name} must not use the host IPC namespace`,
  );
  assert.deepEqual(Object.keys(service.networks ?? {}), ["app"]);
  assert.equal(
    service.restart,
    "unless-stopped",
    `${name} restart policy changed`,
  );
  assert.equal(
    service.read_only,
    true,
    `${name} root filesystem must be read-only`,
  );

  for (const mount of service.volumes ?? []) {
    assert.ok(
      !mount.target.includes("docker.sock") &&
        !mount.target.startsWith("/var/log") &&
        !mount.source.includes("docker.sock") &&
        !mount.source.startsWith("/var/log"),
      `${name} has a forbidden host/control mount`,
    );
  }
}

function assertRenderedBoundaries(project: ComposeProject): void {
  assert.equal(
    project.secrets,
    undefined,
    "top-level Compose secrets are forbidden",
  );
  assert.deepEqual(sorted(Object.keys(project.services)), [
    "backend",
    "backupd",
    "frontend",
    "gateway",
  ]);

  const backend = project.services.backend;
  const backupd = project.services.backupd;
  const frontend = project.services.frontend;
  const gateway = project.services.gateway;
  assert.ok(
    backend !== undefined && backupd !== undefined && frontend !== undefined,
  );
  assert.ok(gateway !== undefined);

  assertServiceBoundary("backend", backend, backendEnvironment);
  assertServiceBoundary("backupd", backupd, backupdEnvironment);
  assertServiceBoundary("frontend", frontend, frontendEnvironment);

  assert.deepEqual(volumeTargets(backend), [
    "/config",
    "/coordination",
    "/data",
    "/staging",
  ]);
  assert.deepEqual(volumeSourceTargets(backend), [
    "backend_config:/config",
    "backend_data:/data",
    "backup_coordination:/coordination",
    "backup_staging:/staging",
  ]);
  assert.deepEqual(volumeTargets(backupd), [
    "/coordination",
    "/staging",
    "/state",
  ]);
  assert.deepEqual(volumeSourceTargets(backupd), [
    "backup_coordination:/coordination",
    "backup_staging:/staging",
    "backup_state:/state",
  ]);
  assert.deepEqual(volumeTargets(frontend), []);
  assert.deepEqual(sorted(backend.tmpfs ?? []), ["/tmp:mode=1777"]);
  assert.deepEqual(sorted(backupd.tmpfs ?? []), ["/tmp:mode=1777"]);
  assert.deepEqual(sorted(frontend.tmpfs ?? []), [
    "/app/.next/cache:mode=1777",
    "/tmp:mode=1777",
  ]);
  assert.equal(backend.stop_grace_period, "45s");
  assert.equal(backupd.stop_grace_period, "45s");
  assert.equal(backupd.depends_on?.backend?.condition, "service_healthy");
  assert.equal(backend.healthcheck?.test?.[0], "CMD");
  assert.equal(backend.healthcheck?.test?.[1], "/nodejs/bin/node");
  assert.equal(backend.ports, undefined, "backend must not publish a port");
  assert.equal(backupd.ports, undefined, "backupd must not publish a port");

  assert.deepEqual(environmentNames(gateway), []);
  assert.equal(gateway.env_file, undefined, "gateway must not use env_file");
  assert.equal(gateway.secrets, undefined, "gateway must not use secrets");
  assert.equal(gateway.privileged, undefined, "gateway must not be privileged");
  assert.deepEqual(Object.keys(gateway.networks ?? {}), ["app"]);
  assert.equal(gateway.restart, "unless-stopped");
  const gatewayMounts = gateway.volumes ?? [];
  assert.equal(
    gatewayMounts.length,
    1,
    "gateway must mount only its Caddyfile",
  );
  assert.equal(gatewayMounts[0]?.type, "bind");
  assert.equal(gatewayMounts[0]?.target, "/etc/caddy/Caddyfile");
  assert.equal(gatewayMounts[0]?.read_only, true);

  const allEnvironmentNames = Object.values(project.services).flatMap(
    (service) => environmentNames(service),
  );
  assert.equal(
    allEnvironmentNames.some((name) => name.startsWith("GRAFANA_")),
    false,
    "Grafana settings must wait for the Collector service",
  );

  const gatewayPorts = gateway.ports ?? [];
  assert.equal(gatewayPorts.length, 1, "gateway must have one published port");
  assert.deepEqual(gatewayPorts[0], {
    mode: "ingress",
    host_ip: "127.0.0.1",
    target: 65102,
    published: "65102",
    protocol: "tcp",
  });

  const volumeNames = [
    "backend_config",
    "backend_data",
    "backup_coordination",
    "backup_staging",
    "backup_state",
  ];
  assert.deepEqual(sorted(Object.keys(project.volumes)), volumeNames);
  for (const name of volumeNames) {
    const volume = project.volumes[name];
    assert.equal(volume?.name, `${projectName}_${name}`);
    assert.equal(volume?.external, undefined);
    assert.equal(volume?.driver, undefined);
  }
  assert.equal(project.networks.app?.name, `${projectName}_app`);
  assert.equal(project.networks.app?.external, undefined);
}

for (const composeFile of ["compose.yml", "compose.prod.yml"]) {
  test(`${composeFile} enforces service-specific configuration boundaries`, async () => {
    const project = await renderCompose(composeFile);
    assertRenderedBoundaries(project);
  });
}

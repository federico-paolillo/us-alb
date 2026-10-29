import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

export const STRAPI_APPLICATION_ROOT = "/strapi";
export const STRAPI_NODE_EXECUTABLE = "/nodejs/bin/node";
export const STRAPI_CLI = "/strapi/node_modules/@strapi/strapi/bin/strapi.js";
export const STRAPI_WORKSPACE_PARENT = "/tmp/strapi-workspaces";
export const STRAPI_STAGING_ROOT = "/staging";

const APPLICATION_ENTRIES = [
  "config",
  "src",
  "build",
  "database",
  "node_modules",
  "package.json",
  "package-lock.json",
  "public",
  "favicon.png",
] as const;

const REQUIRED_ABSOLUTE_ENVIRONMENT_PATHS = [
  "ENV_PATH",
  "DATABASE_FILENAME",
  "SERVER_PUBLIC_FOLDER",
] as const;

export type StrapiDataTransferOperation = "export" | "import";

export interface StrapiWorkspaceRequest {
  readonly operation: StrapiDataTransferOperation;
  readonly filePath: string;
  readonly arguments?: readonly string[];
  readonly environment?: NodeJS.ProcessEnv;
}

export interface StrapiCliInvocation {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
}

function assertStagingPath(filePath: string): void {
  if (!isAbsolute(filePath)) {
    throw new Error("Strapi data-transfer file path must be absolute");
  }

  const relativePath = relative(STRAPI_STAGING_ROOT, filePath);
  if (
    relativePath.length === 0 ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Strapi data-transfer file path must be below /staging");
  }
}

function assertNoFileArgument(arguments_: readonly string[]): void {
  const duplicate = arguments_.find(
    (argument) =>
      argument.startsWith("-f") ||
      argument === "--file" ||
      argument.startsWith("--file="),
  );

  if (duplicate !== undefined) {
    throw new Error(
      "Strapi data-transfer arguments must not override the file path",
    );
  }
}

function assertAbsoluteEnvironmentPaths(environment: NodeJS.ProcessEnv): void {
  for (const name of REQUIRED_ABSOLUTE_ENVIRONMENT_PATHS) {
    const value = environment[name];
    if (value === undefined || !isAbsolute(value)) {
      throw new Error(`${name} must be an absolute path`);
    }
  }
}

async function createApplicationLinks(workspace: string): Promise<void> {
  await Promise.all(
    APPLICATION_ENTRIES.map((entry) =>
      symlink(join(STRAPI_APPLICATION_ROOT, entry), join(workspace, entry)),
    ),
  );
}

type RemoveWorkspace = (workspace: string) => Promise<void>;

async function removeWorkspace(workspace: string): Promise<void> {
  await rm(workspace, { recursive: true, force: true });
}

async function runInStrapiDataTransferWorkspace<T>(
  request: StrapiWorkspaceRequest,
  waitForChildClose: (invocation: StrapiCliInvocation) => Promise<T>,
  cleanupWorkspace: RemoveWorkspace,
): Promise<T> {
  const operationArguments = request.arguments ?? [];
  const environment = { ...process.env, ...request.environment };

  assertStagingPath(request.filePath);
  assertNoFileArgument(operationArguments);
  assertAbsoluteEnvironmentPaths(environment);

  await mkdir(STRAPI_WORKSPACE_PARENT, { recursive: true });
  const workspace = await mkdtemp(
    join(STRAPI_WORKSPACE_PARENT, `${request.operation}-`),
  );

  let callbackOutcome:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: unknown };

  try {
    await createApplicationLinks(workspace);

    // B03 must settle this callback only after the child close event confirms
    // both process exit and stdio closure; cleanup must not race either one.
    callbackOutcome = {
      ok: true,
      value: await waitForChildClose({
        executable: STRAPI_NODE_EXECUTABLE,
        arguments: [
          STRAPI_CLI,
          request.operation,
          "--file",
          request.filePath,
          ...operationArguments,
        ],
        cwd: workspace,
        environment,
      }),
    };
  } catch (error) {
    callbackOutcome = { ok: false, error };
  }

  try {
    await cleanupWorkspace(workspace);
  } catch (cleanupError) {
    if (!callbackOutcome.ok) {
      throw new AggregateError(
        [callbackOutcome.error, cleanupError],
        `Strapi data-transfer callback and workspace cleanup failed for ${workspace}`,
      );
    }

    throw new Error(
      `Failed to clean Strapi data-transfer workspace ${workspace}`,
      { cause: cleanupError },
    );
  }

  if (!callbackOutcome.ok) {
    throw callbackOutcome.error;
  }

  return callbackOutcome.value;
}

export async function withStrapiDataTransferWorkspace<T>(
  request: StrapiWorkspaceRequest,
  waitForChildClose: (invocation: StrapiCliInvocation) => Promise<T>,
): Promise<T> {
  return runInStrapiDataTransferWorkspace(
    request,
    waitForChildClose,
    removeWorkspace,
  );
}

export const strapiRuntimeTestHooks = {
  withCleanup<T>(
    request: StrapiWorkspaceRequest,
    waitForChildClose: (invocation: StrapiCliInvocation) => Promise<T>,
    cleanupWorkspace: RemoveWorkspace,
  ): Promise<T> {
    return runInStrapiDataTransferWorkspace(
      request,
      waitForChildClose,
      cleanupWorkspace,
    );
  },
};

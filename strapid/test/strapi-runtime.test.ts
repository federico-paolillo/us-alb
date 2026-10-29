import assert from "node:assert/strict";
import { access, lstat, readlink, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  STRAPI_APPLICATION_ROOT,
  STRAPI_CLI,
  STRAPI_NODE_EXECUTABLE,
  strapiRuntimeTestHooks,
  withStrapiDataTransferWorkspace,
} from "../src/strapi-runtime.ts";

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

function absoluteEnvironment(): NodeJS.ProcessEnv {
  return {
    ENV_PATH: "/run/secrets/backend.env",
    DATABASE_FILENAME: "/data/cms.db",
    SERVER_PUBLIC_FOLDER: "/data/public",
  };
}

test("creates a writable linked workspace until child closure is confirmed", async () => {
  const callbackStarted = Promise.withResolvers<void>();
  const childClosed = Promise.withResolvers<void>();
  let workspace = "";

  const completion = withStrapiDataTransferWorkspace(
    {
      operation: "export",
      filePath: "/staging/run-1/export",
      arguments: ["--no-encrypt", "--no-compress"],
      environment: absoluteEnvironment(),
    },
    async (invocation) => {
      workspace = invocation.cwd;
      assert.equal(invocation.executable, STRAPI_NODE_EXECUTABLE);
      assert.deepEqual(invocation.arguments, [
        STRAPI_CLI,
        "export",
        "--file",
        "/staging/run-1/export",
        "--no-encrypt",
        "--no-compress",
      ]);
      assert.equal(invocation.environment.ENV_PATH, "/run/secrets/backend.env");

      for (const entry of APPLICATION_ENTRIES) {
        const linkPath = join(workspace, entry);
        assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
        assert.equal(
          await readlink(linkPath),
          join(STRAPI_APPLICATION_ROOT, entry),
        );
      }

      await writeFile(join(workspace, "export_1.log"), "diagnostic\n");
      callbackStarted.resolve();
      await childClosed.promise;
      return "closed";
    },
  );

  await callbackStarted.promise;
  await access(workspace);
  childClosed.resolve();

  assert.equal(await completion, "closed");
  await assert.rejects(access(workspace), { code: "ENOENT" });
});

test("rejects unsafe paths and duplicate file options before invocation", async (t) => {
  const validRequest = {
    operation: "import" as const,
    filePath: "/staging/recovery/archive.tar",
    environment: absoluteEnvironment(),
  };

  const invalidRequests = [
    {
      name: "relative archive",
      request: { ...validRequest, filePath: "archive.tar" },
    },
    {
      name: "archive outside staging",
      request: { ...validRequest, filePath: "/staging-other/archive.tar" },
    },
    {
      name: "archive in tmpfs",
      request: { ...validRequest, filePath: "/tmp/archive.tar" },
    },
    {
      name: "relative environment file",
      request: {
        ...validRequest,
        environment: { ...absoluteEnvironment(), ENV_PATH: "backend.env" },
      },
    },
    {
      name: "relative database file",
      request: {
        ...validRequest,
        environment: {
          ...absoluteEnvironment(),
          DATABASE_FILENAME: "cms.db",
        },
      },
    },
    {
      name: "relative public folder",
      request: {
        ...validRequest,
        environment: {
          ...absoluteEnvironment(),
          SERVER_PUBLIC_FOLDER: "public",
        },
      },
    },
    {
      name: "short file option",
      request: { ...validRequest, arguments: ["-f"] },
    },
    {
      name: "attached short file option",
      request: { ...validRequest, arguments: ["-f/tmp/bypass"] },
    },
    {
      name: "assigned short file option",
      request: { ...validRequest, arguments: ["-f=/tmp/bypass"] },
    },
    {
      name: "long file option",
      request: { ...validRequest, arguments: ["--file"] },
    },
    {
      name: "assigned file option",
      request: { ...validRequest, arguments: ["--file=/tmp/archive.tar"] },
    },
  ];

  for (const invalid of invalidRequests) {
    await t.test(invalid.name, async () => {
      let invoked = false;
      await assert.rejects(
        withStrapiDataTransferWorkspace(invalid.request, async () => {
          invoked = true;
        }),
      );
      assert.equal(invoked, false);
    });
  }
});

test("preserves callback failure after cleaning its workspace", async () => {
  const callbackFailure = new Error("child close failed");
  let workspace = "";

  await assert.rejects(
    withStrapiDataTransferWorkspace(
      {
        operation: "import",
        filePath: "/staging/recovery/archive.tar",
        environment: absoluteEnvironment(),
      },
      async (invocation) => {
        workspace = invocation.cwd;
        throw callbackFailure;
      },
    ),
    (error) => error === callbackFailure,
  );

  await assert.rejects(access(workspace), { code: "ENOENT" });
});

test("reports cleanup failure after a successful callback", async () => {
  const cleanupFailure = new Error("fixture cleanup failed");
  let callbackCompleted = false;
  let workspace = "";

  try {
    await assert.rejects(
      strapiRuntimeTestHooks.withCleanup(
        {
          operation: "export",
          filePath: "/staging/run-2/export",
          environment: absoluteEnvironment(),
        },
        async (invocation) => {
          workspace = invocation.cwd;
          callbackCompleted = true;
          return "closed";
        },
        async (workspaceToRemove) => {
          assert.equal(callbackCompleted, true);
          assert.equal(workspaceToRemove, workspace);
          throw cleanupFailure;
        },
      ),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(
          error.message,
          `Failed to clean Strapi data-transfer workspace ${workspace}`,
        );
        assert.equal(error.cause, cleanupFailure);
        return true;
      },
    );
  } finally {
    if (workspace !== "") {
      await rm(workspace, { recursive: true, force: true });
    }
  }
});

test("preserves callback and cleanup failures together", async () => {
  const callbackFailure = new Error("child close failed");
  const cleanupFailure = new Error("fixture cleanup failed");
  let callbackCompleted = false;
  let workspace = "";

  try {
    await assert.rejects(
      strapiRuntimeTestHooks.withCleanup(
        {
          operation: "import",
          filePath: "/staging/recovery/archive.tar",
          environment: absoluteEnvironment(),
        },
        async (invocation) => {
          workspace = invocation.cwd;
          callbackCompleted = true;
          throw callbackFailure;
        },
        async (workspaceToRemove) => {
          assert.equal(callbackCompleted, true);
          assert.equal(workspaceToRemove, workspace);
          throw cleanupFailure;
        },
      ),
      (error: unknown) => {
        assert(error instanceof AggregateError);
        assert.equal(
          error.message,
          `Strapi data-transfer callback and workspace cleanup failed for ${workspace}`,
        );
        assert.deepEqual(error.errors, [callbackFailure, cleanupFailure]);
        return true;
      },
    );
  } finally {
    if (workspace !== "") {
      await rm(workspace, { recursive: true, force: true });
    }
  }
});

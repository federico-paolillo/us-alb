import assert from "node:assert/strict";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ServingHealthError, waitForServingHealth } from "../src/health.ts";
import type {
  ManagedProcessGroup,
  ProcessTerminationBounds,
} from "../src/process-group.ts";
import { spawnManagedProcessGroup } from "../src/process-group.ts";

const FIXTURE = fileURLToPath(
  new URL("../fixtures/child-process.ts", import.meta.url),
);
const TERMINATION: ProcessTerminationBounds = {
  gracefulTimeoutMs: 200,
  forcedTimeoutMs: 1_000,
  pollIntervalMs: 10,
};

async function listen(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<{ readonly server: Server; readonly endpoint: string }> {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address();
  assert(address !== null && typeof address !== "string");
  return {
    server,
    endpoint: `http://127.0.0.1:${address.port}/_health`,
  };
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}

async function startLiveChild(): Promise<ManagedProcessGroup> {
  const ready = Promise.withResolvers<void>();
  let output = "";
  const child = spawnManagedProcessGroup(
    {
      role: "serving",
      executable: process.execPath,
      arguments: [FIXTURE, "idle-graceful"],
      cwd: process.cwd(),
      environment: { ...process.env },
      output: {
        mode: "pipe",
        onStdout: (chunk) => {
          output += Buffer.from(chunk).toString("utf8");
          if (output.includes("\n")) {
            ready.resolve();
          }
        },
        onStderr: () => undefined,
      },
    },
    TERMINATION,
  );
  await ready.promise;
  return child;
}

async function stopChild(
  child: ManagedProcessGroup | undefined,
): Promise<void> {
  await child?.terminate(TERMINATION).catch(() => undefined);
}

function policy(endpoint: string) {
  return {
    endpoint,
    startupTimeoutMs: 250,
    requestTimeoutMs: 60,
    retryIntervalMs: 20,
  };
}

test("requires a live child and a completed loopback 2xx health response", async (t) => {
  await t.test(
    "accepts HTTP 204 while the owned child remains live",
    async () => {
      const { server, endpoint } = await listen((_request, response) => {
        response.writeHead(204).end();
      });
      let child: ManagedProcessGroup | undefined;
      try {
        child = await startLiveChild();
        await waitForServingHealth(child, policy(endpoint));
      } finally {
        await stopChild(child);
        await closeServer(server);
      }
    },
  );

  await t.test(
    "rejects HTTP 204 when the owned child is already dead",
    async () => {
      const { server, endpoint } = await listen((_request, response) => {
        response.writeHead(204).end();
      });
      const child = spawnManagedProcessGroup(
        {
          role: "serving",
          executable: process.execPath,
          arguments: [FIXTURE, "exit", "0"],
          cwd: process.cwd(),
          environment: { ...process.env },
          output: {
            mode: "pipe",
            onStdout: () => undefined,
            onStderr: () => undefined,
          },
        },
        TERMINATION,
      );
      try {
        await child.wait();
        await assert.rejects(
          waitForServingHealth(child, policy(endpoint)),
          ServingHealthError,
        );
      } finally {
        await closeServer(server);
      }
    },
  );

  await t.test("rejects repeated HTTP 503 responses", async () => {
    const { server, endpoint } = await listen((_request, response) => {
      response.writeHead(503).end();
    });
    let child: ManagedProcessGroup | undefined;
    try {
      child = await startLiveChild();
      await assert.rejects(
        waitForServingHealth(child, policy(endpoint)),
        ServingHealthError,
      );
    } finally {
      await stopChild(child);
      await closeServer(server);
    }
  });

  await t.test(
    "destroys hung health requests at the fixed deadline",
    async () => {
      const { server, endpoint } = await listen(() => undefined);
      let child: ManagedProcessGroup | undefined;
      try {
        child = await startLiveChild();
        await assert.rejects(
          waitForServingHealth(child, policy(endpoint)),
          ServingHealthError,
        );
      } finally {
        await stopChild(child);
        await closeServer(server);
      }
    },
  );

  await t.test("rejects refused loopback connections", async () => {
    const { server, endpoint } = await listen((_request, response) => {
      response.writeHead(204).end();
    });
    await closeServer(server);
    let child: ManagedProcessGroup | undefined;
    try {
      child = await startLiveChild();
      await assert.rejects(
        waitForServingHealth(child, policy(endpoint)),
        ServingHealthError,
      );
    } finally {
      await stopChild(child);
    }
  });

  await t.test(
    "rejects a slow-drip 2xx response at the startup deadline",
    async () => {
      const { server, endpoint } = await listen((_request, response) => {
        response.writeHead(200);
        const drip = setInterval(() => response.write("."), 20);
        const finish = setTimeout(() => response.end(), 500);
        response.once("close", () => {
          clearInterval(drip);
          clearTimeout(finish);
        });
      });
      let child: ManagedProcessGroup | undefined;
      try {
        child = await startLiveChild();
        const started = performance.now();
        await assert.rejects(
          waitForServingHealth(child, {
            endpoint,
            startupTimeoutMs: 120,
            requestTimeoutMs: 1_000,
            retryIntervalMs: 20,
          }),
          ServingHealthError,
        );
        assert(performance.now() - started < 350);
      } finally {
        await stopChild(child);
        await closeServer(server);
      }
    },
  );
});

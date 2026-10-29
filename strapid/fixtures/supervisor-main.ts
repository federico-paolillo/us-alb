import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

import { superviseStrapi } from "../src/main.ts";
import type { ChildCommand } from "../src/process-group.ts";
import { strapiSupervisorTestHooks } from "../src/strapi-supervisor.ts";

const CHILD_FIXTURE = fileURLToPath(
  new URL("./child-process.ts", import.meta.url),
);
const TERMINATION = {
  gracefulTimeoutMs: 500,
  forcedTimeoutMs: 1_000,
  pollIntervalMs: 10,
};

function writeEvent(event: string, fields: Record<string, unknown> = {}): void {
  process.stdout.write(`${JSON.stringify({ event, ...fields })}\n`);
}

const selfExpiry = setTimeout(() => process.exit(124), 30_000);
const server = createServer((_request, response) => {
  response.writeHead(204).end();
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen({ host: "127.0.0.1", port: 0 }, resolve);
});
const address = server.address();
if (address === null || typeof address === "string") {
  throw new Error("Fixture health server did not bind to TCP");
}

let servingStarts = 0;
const supervisor = strapiSupervisorTestHooks.create({
  createServingCommand: (): ChildCommand => {
    ++servingStarts;
    return {
      role: "serving",
      executable: process.execPath,
      arguments: [CHILD_FIXTURE, "idle-graceful"],
      cwd: process.cwd(),
      environment: { ...process.env },
      output: {
        mode: "pipe",
        onStdout: () => undefined,
        onStderr: () => undefined,
      },
    };
  },
  createExportCommand: (invocation, exportOutput): ChildCommand => ({
    role: "export",
    executable: process.execPath,
    arguments: [CHILD_FIXTURE, "exit", "0"],
    cwd: invocation.cwd,
    environment: invocation.environment,
    output: { mode: "pipe", ...exportOutput },
  }),
});

try {
  await superviseStrapi({
    supervisor,
    health: {
      endpoint: `http://127.0.0.1:${address.port}/_health`,
      startupTimeoutMs: 2_000,
      requestTimeoutMs: 200,
      retryIntervalMs: 20,
    },
    termination: TERMINATION,
    onServingReady: () => {
      const snapshot = supervisor.snapshot();
      writeEvent("ready", {
        pid: snapshot.activePid,
        starts: servingStarts,
      });
    },
  });
} finally {
  clearTimeout(selfExpiry);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

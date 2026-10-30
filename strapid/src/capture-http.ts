import { chmod, lstat, mkdir, unlink } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createConnection, type Socket } from "node:net";
import { dirname, isAbsolute } from "node:path";

import {
  CAPTURE_JSON_LIMIT_BYTES,
  CaptureContractError,
  type CaptureRequest,
  type CaptureServiceStatus,
  type CaptureTerminalRecord,
  type CaptureWindowStatus,
  decodeCancellationRequest,
  decodeCaptureRequest,
} from "./capture-contract.ts";
import type { CaptureCoordinator } from "./capture-coordinator.ts";
import {
  CaptureAdmissionError,
  type CaptureResponseObserver,
} from "./capture-coordinator.ts";

export interface CaptureHttpCoordinator {
  getServiceStatus(signal?: AbortSignal): Promise<CaptureServiceStatus>;
  beginCapture(
    request: CaptureRequest,
    observer: CaptureResponseObserver,
    admissionSignal: AbortSignal,
  ): Promise<CaptureTerminalRecord>;
  getWindowStatus(
    supervisorInstanceId: string,
    captureWindowId: string,
  ): CaptureWindowStatus;
  cancel(supervisorInstanceId: string, captureWindowId: string): boolean;
  disconnect(captureWindowId: string): void;
}

export interface CaptureHttpServer {
  readonly socketPath: string;
  close(): Promise<void>;
}

export interface CaptureHttpServerOptions {
  readonly runCapture?: <Result>(
    headers: {
      readonly traceparent?: string;
      readonly tracestate?: string;
    },
    operation: () => Promise<Result>,
  ) => Promise<Result>;
}

function json(
  response: ServerResponse,
  statusCode: number,
  value: unknown,
): void {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    Connection: "close",
    "Content-Type": "application/json",
    "Content-Length": body.length,
  });
  response.end(body);
}

async function body(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"]?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw Object.assign(new CaptureContractError("Unsupported media type"), {
      statusCode: 415,
    });
  }
  const declared = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declared) && declared > CAPTURE_JSON_LIMIT_BYTES) {
    throw Object.assign(new CaptureContractError("Request body is too large"), {
      statusCode: 413,
    });
  }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk as Uint8Array);
    length += bytes.length;
    if (length > CAPTURE_JSON_LIMIT_BYTES) {
      throw Object.assign(
        new CaptureContractError("Request body is too large"),
        {
          statusCode: 413,
        },
      );
    }
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (cause) {
    throw new CaptureContractError(
      cause instanceof Error
        ? "Request body is not valid JSON"
        : "Invalid JSON",
    );
  }
}

function writeLine(response: ServerResponse, record: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (response.destroyed || response.writableEnded) {
      reject(new Error("Capture response is closed"));
      return;
    }
    const line = `${JSON.stringify(record)}\n`;
    response.write(line, (error) =>
      error === null || error === undefined ? resolve() : reject(error),
    );
  });
}

async function probeStaleSocket(
  socketPath: string,
): Promise<"live" | "refused"> {
  return await new Promise((resolve, reject) => {
    const socket = createConnection({ path: socketPath });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("Existing coordination socket probe timed out"));
    }, 1_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve("live");
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (error.code === "ECONNREFUSED") resolve("refused");
      else reject(error);
    });
  });
}

async function prepareSocketPath(socketPath: string): Promise<void> {
  try {
    const before = await lstat(socketPath);
    if (!before.isSocket())
      throw new Error("Coordination path is not a socket");
    if ((await probeStaleSocket(socketPath)) === "live") {
      throw new Error("Coordination socket already has a listener");
    }
    const after = await lstat(socketPath);
    if (
      !after.isSocket() ||
      after.dev !== before.dev ||
      after.ino !== before.ino
    ) {
      throw new Error("Coordination socket identity changed during probe");
    }
    await unlink(socketPath);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

export async function startCaptureHttpServer(
  socketPath: string,
  coordinator: CaptureHttpCoordinator | CaptureCoordinator,
  options: CaptureHttpServerOptions = {},
): Promise<CaptureHttpServer> {
  if (!isAbsolute(socketPath)) {
    throw new Error("Coordination socket path must be absolute");
  }
  await mkdir(dirname(socketPath), { recursive: true });
  await prepareSocketPath(socketPath);

  let accepting = true;
  const connections = new Set<Socket>();
  const server = createServer(
    {
      requestTimeout: 10_000,
      headersTimeout: 10_000,
      keepAliveTimeout: 5_000,
      maxHeaderSize: 8_192,
    },
    (request, response) => {
      void handleRequest(request, response).catch((error: unknown) => {
        if (response.headersSent || response.writableEnded) {
          response.destroy(error instanceof Error ? error : undefined);
          return;
        }
        if (error instanceof CaptureAdmissionError) {
          json(response, error.statusCode, {
            version: 1,
            error: error.code,
          });
          return;
        }
        const statusCode =
          error instanceof Error && "statusCode" in error
            ? Number((error as Error & { statusCode: number }).statusCode)
            : 400;
        json(response, statusCode, { version: 1, error: "invalid_request" });
      });
    },
  );
  server.timeout = 0;
  server.on("connection", (connection) => {
    connections.add(connection);
    connection.once("close", () => connections.delete(connection));
  });

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (!accepting) {
      json(response, 503, { version: 1, error: "shutting_down" });
      return;
    }
    const url = new URL(request.url ?? "/", "http://unix");
    if (request.method === "GET" && url.pathname === "/v1/status") {
      const controller = new AbortController();
      response.once("close", () => controller.abort());
      json(
        response,
        200,
        await coordinator.getServiceStatus(controller.signal),
      );
      return;
    }

    const match = /^\/v1\/captures\/([^/]+)$/.exec(url.pathname);
    if (request.method === "GET" && match !== null) {
      const instance = url.searchParams.get("supervisorInstanceId");
      if (instance === null) {
        json(response, 400, { version: 1, error: "invalid_request" });
        return;
      }
      const status = coordinator.getWindowStatus(instance, match[1] as string);
      const statusCode =
        status.type !== "unusable"
          ? 200
          : status.reason === "supervisor_replaced"
            ? 409
            : 404;
      json(response, statusCode, status);
      return;
    }

    if (request.method === "DELETE" && match !== null) {
      const cancellation = decodeCancellationRequest(await body(request));
      const current = coordinator.getWindowStatus(
        cancellation.supervisorInstanceId,
        match[1] as string,
      );
      if (current.type === "unusable") {
        json(
          response,
          current.reason === "supervisor_replaced" ? 409 : 404,
          current,
        );
        return;
      }
      const cancelled = coordinator.cancel(
        cancellation.supervisorInstanceId,
        match[1] as string,
      );
      json(response, cancelled ? 202 : 200, {
        version: 1,
        cancelled,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/captures") {
      const captureRequest = decodeCaptureRequest(await body(request));
      const admission = new AbortController();
      let terminalAttempted = false;
      response.once("close", () => {
        if (!terminalAttempted) {
          admission.abort();
          coordinator.disconnect(captureRequest.captureWindowId);
        }
      });
      response.setTimeout(0);
      response.socket?.setTimeout(0);
      const operation = () =>
        coordinator.beginCapture(
          captureRequest,
          {
            async accepted(record) {
              if (!response.headersSent) {
                response.writeHead(200, {
                  "Cache-Control": "no-store",
                  Connection: "close",
                  "Content-Type": "application/x-ndjson",
                });
              }
              await writeLine(response, record);
            },
            async terminal(record) {
              terminalAttempted = true;
              if (!response.headersSent) {
                response.writeHead(200, {
                  "Cache-Control": "no-store",
                  Connection: "close",
                  "Content-Type": "application/x-ndjson",
                });
              }
              await writeLine(response, record);
              response.end();
            },
          },
          admission.signal,
        );
      const traceparent = request.headers.traceparent;
      const tracestate = request.headers.tracestate;
      const traceHeaders = {
        ...(typeof traceparent === "string" ? { traceparent } : {}),
        ...(typeof tracestate === "string" ? { tracestate } : {}),
      };
      if (options.runCapture === undefined) await operation();
      else await options.runCapture(traceHeaders, operation);
      return;
    }

    json(response, 404, { version: 1, error: "not_found" });
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  try {
    await chmod(socketPath, 0o660);
  } catch (error) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw error;
  }

  return {
    socketPath,
    async close(): Promise<void> {
      if (!accepting) return;
      accepting = false;
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) =>
          error === undefined ? resolve() : reject(error),
        ),
      );
      for (const connection of connections) connection.destroy();
      try {
        await lstat(socketPath);
        throw new Error("Coordination socket remained after close");
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            (error as NodeJS.ErrnoException).code === "ENOENT"
          )
        ) {
          throw error;
        }
      }
    },
  };
}

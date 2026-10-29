import { request as httpRequest, type IncomingMessage } from "node:http";
import { isAbsolute, relative } from "node:path";

import type {
  CaptureAcceptedRecord,
  CaptureBudgetPolicy,
  CaptureIdentity,
  CaptureInvalidReason,
  CaptureRequest,
  CaptureServiceStatus,
  CaptureTerminalOutcome,
  CaptureTerminalRecord,
  CaptureWindowStatus,
} from "../../strapid/src/capture-contract.ts";

const JSON_LIMIT = 16 * 1024;
const NDJSON_LIMIT = 32 * 1024;

export interface CaptureClient {
  getStatus(signal?: AbortSignal): Promise<CaptureServiceStatus>;
  startCapture(
    request: CaptureRequest,
    options?: {
      readonly signal?: AbortSignal;
      readonly onAccepted?: (record: CaptureAcceptedRecord) => void;
    },
  ): Promise<
    | CaptureTerminalRecord
    | {
        readonly status: "reconciliation-required";
        readonly identity: CaptureIdentity;
      }
  >;
  reconcile(
    identity: CaptureIdentity,
    signal?: AbortSignal,
  ): Promise<CaptureWindowStatus>;
  cancel(
    identity: Pick<CaptureIdentity, "supervisorInstanceId" | "captureWindowId">,
    signal?: AbortSignal,
  ): Promise<void>;
}

export interface CaptureClientOptions {
  readonly socketPath: string;
  readonly requestTimeoutMs?: number;
  readonly captureTimeoutMs?: number;
}

export class CaptureClientProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureClientProtocolError";
  }
}

export type CaptureAdmissionRejectionReason =
  | "capture_busy"
  | "identity_mismatch"
  | "stale_window"
  | "runtime_unavailable"
  | "serving_unavailable"
  | "admission_cancelled"
  | "shutting_down";

export class CaptureAdmissionRejectedError extends Error {
  readonly code = "capture_admission_rejected" as const;
  readonly statusCode: 409 | 503;
  readonly reason: CaptureAdmissionRejectionReason;

  constructor(statusCode: 409 | 503, reason: CaptureAdmissionRejectionReason) {
    super("Capture admission was rejected");
    this.name = "CaptureAdmissionRejectedError";
    this.statusCode = statusCode;
    this.reason = reason;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CaptureClientProtocolError("Capture response is not an object");
  }
  return value as Record<string, unknown>;
}

function exactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  const item = record(value);
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(item, key)) ||
    Object.keys(item).some((key) => !allowed.has(key))
  ) {
    throw new CaptureClientProtocolError("Capture response fields are invalid");
  }
  return item;
}

function parseCaptureAdmissionRejection(
  statusCode: number,
  value: unknown,
): CaptureAdmissionRejectedError {
  const item = exactRecord(value, ["version", "error"]);
  if (item.version !== 1 || typeof item.error !== "string") {
    throw new CaptureClientProtocolError(
      "Capture admission rejection is invalid",
    );
  }
  const reason = item.error;
  const valid409 =
    reason === "capture_busy" ||
    reason === "identity_mismatch" ||
    reason === "stale_window";
  const valid503 =
    reason === "runtime_unavailable" ||
    reason === "serving_unavailable" ||
    reason === "admission_cancelled" ||
    reason === "shutting_down";
  if ((statusCode === 409 && valid409) || (statusCode === 503 && valid503)) {
    return new CaptureAdmissionRejectedError(
      statusCode,
      reason as CaptureAdmissionRejectionReason,
    );
  }
  throw new CaptureClientProtocolError(
    "Capture admission rejection is invalid",
  );
}

function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value,
    )
  ) {
    throw new CaptureClientProtocolError("Capture response UUID is invalid");
  }
  return value;
}

function token(value: unknown, maximum = 256): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > maximum ||
    !/^[!-~]+$/.test(value)
  ) {
    throw new CaptureClientProtocolError("Capture response token is invalid");
  }
  return value;
}

function timestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new CaptureClientProtocolError("Capture timestamp is invalid");
  }
  try {
    if (new Date(value).toISOString() !== value) {
      throw new Error("Timestamp is not canonical");
    }
  } catch {
    throw new CaptureClientProtocolError("Capture timestamp is invalid");
  }
  return value;
}

function archiveBasePath(value: unknown): string {
  if (typeof value !== "string" || !isAbsolute(value)) {
    throw new CaptureClientProtocolError("Capture archive path is invalid");
  }
  const descendant = relative("/staging", value);
  if (
    descendant.length === 0 ||
    descendant === ".." ||
    descendant.startsWith("../") ||
    isAbsolute(descendant)
  ) {
    throw new CaptureClientProtocolError("Capture archive path is invalid");
  }
  return value;
}

function positiveInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new CaptureClientProtocolError("Capture budget is invalid");
  }
  return value as number;
}

function identity(value: unknown): CaptureIdentity {
  const item = exactRecord(value, [
    "supervisorInstanceId",
    "captureWindowId",
    "releaseId",
    "sourceVolumeId",
    "nodeVersion",
    "strapiVersion",
  ]);
  return {
    supervisorInstanceId: uuid(item.supervisorInstanceId),
    captureWindowId: uuid(item.captureWindowId),
    releaseId: token(item.releaseId),
    sourceVolumeId: token(item.sourceVolumeId),
    nodeVersion: token(item.nodeVersion, 64),
    strapiVersion: token(item.strapiVersion, 64),
  };
}

function budget(value: unknown): CaptureBudgetPolicy {
  const item = exactRecord(value, [
    "totalWindowMs",
    "servingShutdownMs",
    "exportExecutionMs",
    "exporterTerminationMs",
    "recoveryMs",
    "forcedConfirmationMs",
  ]);
  const decoded: CaptureBudgetPolicy = {
    totalWindowMs: positiveInteger(item.totalWindowMs),
    servingShutdownMs: positiveInteger(item.servingShutdownMs),
    exportExecutionMs: positiveInteger(item.exportExecutionMs),
    exporterTerminationMs: positiveInteger(item.exporterTerminationMs),
    recoveryMs: positiveInteger(item.recoveryMs),
    forcedConfirmationMs: positiveInteger(item.forcedConfirmationMs),
  };
  if (
    decoded.servingShutdownMs +
      decoded.exportExecutionMs +
      decoded.exporterTerminationMs +
      decoded.recoveryMs !==
      decoded.totalWindowMs ||
    decoded.forcedConfirmationMs >= decoded.servingShutdownMs ||
    decoded.forcedConfirmationMs >= decoded.exporterTerminationMs ||
    decoded.exporterTerminationMs >= decoded.recoveryMs
  ) {
    throw new CaptureClientProtocolError("Capture budget is invalid");
  }
  return decoded;
}

function sameIdentity(left: CaptureIdentity, right: CaptureIdentity): boolean {
  return (
    left.supervisorInstanceId === right.supervisorInstanceId &&
    left.captureWindowId === right.captureWindowId &&
    left.releaseId === right.releaseId &&
    left.sourceVolumeId === right.sourceVolumeId &&
    left.nodeVersion === right.nodeVersion &&
    left.strapiVersion === right.strapiVersion
  );
}

function parseAccepted(value: unknown): CaptureAcceptedRecord {
  const item = exactRecord(value, [
    "version",
    "type",
    "identity",
    "archiveBasePath",
    "startedAt",
    "deadlineAt",
    "acceptedAt",
  ]);
  if (item.version !== 1 || item.type !== "accepted") {
    throw new CaptureClientProtocolError("Accepted record header is invalid");
  }
  return {
    version: 1,
    type: "accepted",
    identity: identity(item.identity),
    archiveBasePath: archiveBasePath(item.archiveBasePath),
    startedAt: timestamp(item.startedAt),
    deadlineAt: timestamp(item.deadlineAt),
    acceptedAt: timestamp(item.acceptedAt),
  };
}

const invalidReasons = new Set<CaptureInvalidReason>([
  "client_disconnected",
  "client_cancelled",
  "window_expired",
  "forced_serving_stop",
  "serving_stop_failed",
  "export_failed",
  "export_cancelled",
  "export_setup_failed",
]);

function invalidReason(value: unknown): CaptureInvalidReason {
  if (!invalidReasons.has(value as CaptureInvalidReason)) {
    throw new CaptureClientProtocolError("Capture invalid reason is malformed");
  }
  return value as CaptureInvalidReason;
}

function parseTerminalOutcome(value: unknown): CaptureTerminalOutcome {
  const status = record(value).status;
  if (status === "captured") {
    const item = exactRecord(value, [
      "status",
      "exportClosedAt",
      "servingRecoveredAt",
    ]);
    return {
      status: "captured",
      exportClosedAt: timestamp(item.exportClosedAt),
      servingRecoveredAt: timestamp(item.servingRecoveredAt),
    };
  }
  if (status === "invalid") {
    const item = exactRecord(value, ["status", "reason", "servingRecoveredAt"]);
    return {
      status: "invalid",
      reason: invalidReason(item.reason),
      servingRecoveredAt: timestamp(item.servingRecoveredAt),
    };
  }
  if (status === "recovery-failed") {
    const item = exactRecord(value, ["status", "reason"], ["captureReason"]);
    const reasons = [
      "export_ownership_unconfirmed",
      "serving_ownership_unconfirmed",
      "serving_recovery_failed",
      "recovery_expired",
    ] as const;
    if (!reasons.includes(item.reason as (typeof reasons)[number])) {
      throw new CaptureClientProtocolError("Recovery failure is malformed");
    }
    return {
      status: "recovery-failed",
      reason: item.reason as (typeof reasons)[number],
      ...(!Object.hasOwn(item, "captureReason")
        ? {}
        : { captureReason: invalidReason(item.captureReason) }),
    };
  }
  if (status === "supervisor-shutdown") {
    exactRecord(value, ["status"]);
    return { status: "supervisor-shutdown" };
  }
  throw new CaptureClientProtocolError("Terminal outcome is invalid");
}

function parseTerminal(value: unknown): CaptureTerminalRecord {
  const item = exactRecord(
    value,
    [
      "version",
      "type",
      "identity",
      "archiveBasePath",
      "startedAt",
      "deadlineAt",
      "completedAt",
      "outcome",
    ],
    ["acceptedAt"],
  );
  if (item.version !== 1 || item.type !== "terminal") {
    throw new CaptureClientProtocolError("Terminal record header is invalid");
  }
  const outcome = parseTerminalOutcome(item.outcome);
  const acceptedAt = Object.hasOwn(item, "acceptedAt")
    ? timestamp(item.acceptedAt)
    : undefined;
  if (outcome.status === "captured" && acceptedAt === undefined) {
    throw new CaptureClientProtocolError(
      "Captured terminal is missing acceptance",
    );
  }
  return {
    version: 1,
    type: "terminal",
    identity: identity(item.identity),
    archiveBasePath: archiveBasePath(item.archiveBasePath),
    startedAt: timestamp(item.startedAt),
    deadlineAt: timestamp(item.deadlineAt),
    ...(acceptedAt === undefined ? {} : { acceptedAt }),
    completedAt: timestamp(item.completedAt),
    outcome,
  };
}

function parseServiceStatus(value: unknown): CaptureServiceStatus {
  const runtimeReady = record(value).runtimeReady;
  if (runtimeReady === true) {
    const item = exactRecord(
      value,
      [
        "version",
        "runtimeReady",
        "supervisorInstanceId",
        "releaseId",
        "sourceVolumeId",
        "nodeVersion",
        "strapiVersion",
        "supervisorState",
        "healthyServing",
        "budget",
      ],
      ["activeCaptureWindowId"],
    );
    const states = [
      "stopped",
      "starting-serving",
      "serving",
      "stopping-serving",
      "exporting",
      "recovery-required",
      "recovery-failed",
      "shutting-down",
      "terminated",
    ] as const;
    if (
      item.version !== 1 ||
      item.runtimeReady !== true ||
      !states.includes(item.supervisorState as (typeof states)[number]) ||
      typeof item.healthyServing !== "boolean"
    ) {
      throw new CaptureClientProtocolError("Service readiness is invalid");
    }
    const activeCaptureWindowId = Object.hasOwn(item, "activeCaptureWindowId")
      ? uuid(item.activeCaptureWindowId)
      : undefined;
    if (
      item.healthyServing &&
      (item.supervisorState !== "serving" ||
        activeCaptureWindowId !== undefined)
    ) {
      throw new CaptureClientProtocolError("Service readiness is invalid");
    }
    return {
      version: 1,
      runtimeReady: true,
      supervisorInstanceId: uuid(item.supervisorInstanceId),
      releaseId: token(item.releaseId),
      sourceVolumeId: token(item.sourceVolumeId),
      nodeVersion: token(item.nodeVersion, 64),
      strapiVersion: token(item.strapiVersion, 64),
      supervisorState: item.supervisorState as (typeof states)[number],
      healthyServing: item.healthyServing,
      budget: budget(item.budget),
      ...(activeCaptureWindowId === undefined ? {} : { activeCaptureWindowId }),
    };
  }
  if (runtimeReady === false) {
    const item = exactRecord(value, [
      "version",
      "runtimeReady",
      "supervisorInstanceId",
      "reason",
    ]);
    const reasons = [
      "configuration_invalid",
      "runtime_unavailable",
      "serving_unavailable",
    ] as const;
    if (
      item.version !== 1 ||
      item.runtimeReady !== false ||
      !reasons.includes(item.reason as (typeof reasons)[number])
    ) {
      throw new CaptureClientProtocolError("Service unavailability is invalid");
    }
    return {
      version: 1,
      runtimeReady: false,
      supervisorInstanceId: uuid(item.supervisorInstanceId),
      reason: item.reason as (typeof reasons)[number],
    };
  }
  throw new CaptureClientProtocolError("Service status header is invalid");
}

function optionalTimestamp(
  item: Record<string, unknown>,
  name: "startedAt" | "deadlineAt" | "acceptedAt",
): string | undefined {
  return Object.hasOwn(item, name) ? timestamp(item[name]) : undefined;
}

function parseWindowStatus(value: unknown): CaptureWindowStatus {
  const type = record(value).type;
  if (type === "terminal") return parseTerminal(value);
  if (type === "active") {
    const item = exactRecord(
      value,
      ["version", "type", "identity", "archiveBasePath", "phase"],
      ["startedAt", "deadlineAt", "acceptedAt"],
    );
    const phases = [
      "preflight",
      "stopping",
      "exporting",
      "terminating-export",
      "recovering",
    ] as const;
    if (
      item.version !== 1 ||
      item.type !== "active" ||
      !phases.includes(item.phase as (typeof phases)[number])
    ) {
      throw new CaptureClientProtocolError("Active phase is invalid");
    }
    const startedAt = optionalTimestamp(item, "startedAt");
    const deadlineAt = optionalTimestamp(item, "deadlineAt");
    const acceptedAt = optionalTimestamp(item, "acceptedAt");
    return {
      version: 1,
      type: "active",
      identity: identity(item.identity),
      archiveBasePath: archiveBasePath(item.archiveBasePath),
      ...(startedAt === undefined ? {} : { startedAt }),
      ...(deadlineAt === undefined ? {} : { deadlineAt }),
      ...(acceptedAt === undefined ? {} : { acceptedAt }),
      phase: item.phase as (typeof phases)[number],
    };
  }
  if (type === "unusable") {
    const item = exactRecord(value, [
      "version",
      "type",
      "reason",
      "currentSupervisorInstanceId",
    ]);
    const reasons = ["unknown_window", "supervisor_replaced"] as const;
    if (
      item.version !== 1 ||
      item.type !== "unusable" ||
      !reasons.includes(item.reason as (typeof reasons)[number])
    ) {
      throw new CaptureClientProtocolError("Window status is invalid");
    }
    return {
      version: 1,
      type: "unusable",
      reason: item.reason as (typeof reasons)[number],
      currentSupervisorInstanceId: uuid(item.currentSupervisorInstanceId),
    };
  }
  throw new CaptureClientProtocolError("Window status is invalid");
}

function parseCancellationResponse(value: unknown): boolean {
  const item = exactRecord(value, ["version", "cancelled"]);
  if (item.version !== 1 || typeof item.cancelled !== "boolean") {
    throw new CaptureClientProtocolError("Cancellation response is invalid");
  }
  return item.cancelled;
}

function assertMediaType(
  value: string | readonly string[] | undefined,
  expected: "application/json" | "application/x-ndjson",
): void {
  if (typeof value !== "string") {
    throw new CaptureClientProtocolError(
      "Capture response media type is invalid",
    );
  }
  const actual = value.split(";", 1)[0]?.trim().toLowerCase();
  if (actual !== expected) {
    throw new CaptureClientProtocolError(
      "Capture response media type is invalid",
    );
  }
}

class CaptureNdjsonDecoder {
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private pending = Buffer.alloc(0);
  private total = 0;
  private accepted: CaptureAcceptedRecord | undefined;
  private terminal: CaptureTerminalRecord | undefined;
  private readonly expectedIdentity: CaptureIdentity;
  private readonly expectedArchiveBasePath: string;
  private readonly onAccepted:
    | ((record: CaptureAcceptedRecord) => void)
    | undefined;

  constructor(
    expectedIdentity: CaptureIdentity,
    expectedArchiveBasePath: string,
    onAccepted?: (record: CaptureAcceptedRecord) => void,
  ) {
    this.expectedIdentity = expectedIdentity;
    this.expectedArchiveBasePath = expectedArchiveBasePath;
    this.onAccepted = onAccepted;
  }

  push(chunk: Uint8Array): void {
    const bytes = Buffer.from(chunk);
    this.total += bytes.length;
    if (this.total > NDJSON_LIMIT) {
      throw new CaptureClientProtocolError("Capture response is too large");
    }
    this.pending = Buffer.concat([this.pending, bytes]);
    while (true) {
      const lineEnd = this.pending.indexOf(0x0a);
      if (lineEnd < 0) return;
      const line = this.pending.subarray(0, lineEnd);
      this.pending = this.pending.subarray(lineEnd + 1);
      this.decodeLine(line);
    }
  }

  finish(): CaptureTerminalRecord | undefined {
    this.assertCompleteFraming();
    return this.terminal;
  }

  terminalAfterTransportLoss(): CaptureTerminalRecord | undefined {
    this.assertCompleteFraming();
    return this.terminal;
  }

  private assertCompleteFraming(): void {
    if (this.pending.length !== 0) {
      throw new CaptureClientProtocolError(
        "Capture response has an unterminated record",
      );
    }
  }

  private decodeLine(line: Uint8Array): void {
    if (line.length === 0 || line.length > JSON_LIMIT) {
      throw new CaptureClientProtocolError(
        "Capture response record is invalid",
      );
    }
    let value: unknown;
    try {
      value = JSON.parse(this.decoder.decode(line)) as unknown;
    } catch {
      throw new CaptureClientProtocolError(
        "Capture response record is invalid",
      );
    }
    const type = record(value).type;
    if (type === "accepted") {
      if (this.accepted !== undefined || this.terminal !== undefined) {
        throw new CaptureClientProtocolError(
          "Accepted record order is invalid",
        );
      }
      const accepted = parseAccepted(value);
      this.assertEnvelope(accepted.identity, accepted.archiveBasePath);
      this.accepted = accepted;
      this.onAccepted?.(accepted);
      return;
    }
    if (type === "terminal") {
      if (this.terminal !== undefined) {
        throw new CaptureClientProtocolError("Duplicate terminal record");
      }
      const terminal = parseTerminal(value);
      this.assertEnvelope(terminal.identity, terminal.archiveBasePath);
      if (this.accepted === undefined) {
        if (
          terminal.outcome.status === "captured" ||
          terminal.acceptedAt !== undefined
        ) {
          throw new CaptureClientProtocolError(
            "Terminal acceptance order is invalid",
          );
        }
      } else if (
        terminal.startedAt !== this.accepted.startedAt ||
        terminal.deadlineAt !== this.accepted.deadlineAt ||
        terminal.acceptedAt !== this.accepted.acceptedAt
      ) {
        throw new CaptureClientProtocolError(
          "Terminal acceptance fields do not match",
        );
      }
      this.terminal = terminal;
      return;
    }
    throw new CaptureClientProtocolError("Unexpected capture record");
  }

  private assertEnvelope(
    recordIdentity: CaptureIdentity,
    recordArchiveBasePath: string,
  ): void {
    if (
      !sameIdentity(recordIdentity, this.expectedIdentity) ||
      recordArchiveBasePath !== this.expectedArchiveBasePath
    ) {
      throw new CaptureClientProtocolError(
        "Capture response identity is invalid",
      );
    }
  }
}

async function consume(
  response: IncomingMessage,
  maximum: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of response) {
    const bytes = Buffer.from(chunk as Uint8Array);
    length += bytes.length;
    if (length > maximum) {
      response.destroy(
        new CaptureClientProtocolError("Capture response is too large"),
      );
      throw new CaptureClientProtocolError("Capture response is too large");
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function decodeUtf8(bytes: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CaptureClientProtocolError("Capture response UTF-8 is invalid");
  }
}

function cancellationCause(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Operation aborted", "AbortError");
}

export function createCaptureClient(
  options: CaptureClientOptions,
): CaptureClient {
  const requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
  const captureTimeoutMs = options.captureTimeoutMs ?? 920_000;

  async function send(
    method: string,
    path: string,
    requestBody: unknown | undefined,
    timeoutMs: number,
    signal?: AbortSignal,
    maximum = JSON_LIMIT,
  ): Promise<{ readonly statusCode: number; readonly value: unknown }> {
    const bodyBytes =
      requestBody === undefined
        ? undefined
        : Buffer.from(JSON.stringify(requestBody));
    return await new Promise((resolve, reject) => {
      let settled = false;
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        callback();
      };
      const request = httpRequest(
        {
          socketPath: options.socketPath,
          path,
          method,
          headers: {
            Connection: "close",
            ...(bodyBytes === undefined
              ? {}
              : {
                  "Content-Type": "application/json",
                  "Content-Length": bodyBytes.length,
                }),
          },
        },
        (response) => {
          try {
            assertMediaType(
              response.headers["content-type"],
              "application/json",
            );
          } catch (error) {
            response.resume();
            settle(() => reject(error));
            return;
          }
          void consume(response, maximum).then(
            (bytes) => {
              try {
                const value = JSON.parse(decodeUtf8(bytes)) as unknown;
                settle(() =>
                  resolve({ statusCode: response.statusCode ?? 0, value }),
                );
              } catch (error) {
                settle(() => reject(error));
              }
            },
            (error) => settle(() => reject(error)),
          );
        },
      );
      const timer = setTimeout(() => {
        const error = new DOMException(
          "Capture request timed out",
          "TimeoutError",
        );
        request.destroy(error);
        settle(() => reject(error));
      }, timeoutMs);
      const abort = () => {
        const error = cancellationCause(signal as AbortSignal);
        request.destroy(error);
        settle(() => reject(error));
      };
      request.once("error", (error) => settle(() => reject(error)));
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
      request.end(bodyBytes);
    });
  }

  const client: CaptureClient = {
    async getStatus(signal) {
      const response = await send(
        "GET",
        "/v1/status",
        undefined,
        requestTimeoutMs,
        signal,
      );
      if (response.statusCode !== 200) {
        throw new Error("Capture status request failed");
      }
      return parseServiceStatus(response.value);
    },

    async startCapture(captureRequest, startOptions) {
      const expectedIdentity: CaptureIdentity = {
        supervisorInstanceId: captureRequest.expectedSupervisorInstanceId,
        captureWindowId: captureRequest.captureWindowId,
        releaseId: captureRequest.expectedReleaseId,
        sourceVolumeId: captureRequest.expectedSourceVolumeId,
        nodeVersion: captureRequest.expectedNodeVersion,
        strapiVersion: captureRequest.expectedStrapiVersion,
      };
      return await new Promise((resolve, reject) => {
        const bytes = Buffer.from(JSON.stringify(captureRequest));
        let decoder: CaptureNdjsonDecoder | undefined;
        let settled = false;
        let reconciling = false;
        let rejectionResponse = false;
        let rejectionExchangeClosed = false;
        let provisionalRejection: CaptureAdmissionRejectedError | undefined;
        const settle = (callback: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          startOptions?.signal?.removeEventListener("abort", abort);
          callback();
        };
        const settleProvisionalRejection = () => {
          if (provisionalRejection !== undefined && rejectionExchangeClosed) {
            settle(() => reject(provisionalRejection));
          }
        };
        const reconcileAfterLoss = () => {
          if (settled || reconciling) return;
          let terminal: CaptureTerminalRecord | undefined;
          try {
            terminal = decoder?.terminalAfterTransportLoss();
          } catch (error) {
            settle(() => reject(error));
            return;
          }
          if (terminal !== undefined) {
            settle(() => resolve(terminal));
            return;
          }
          reconciling = true;
          void client.reconcile(expectedIdentity).then(
            (status) => {
              if (
                status.type === "terminal" &&
                sameIdentity(status.identity, expectedIdentity)
              ) {
                settle(() => resolve(status));
              } else {
                settle(() =>
                  resolve({
                    status: "reconciliation-required",
                    identity: expectedIdentity,
                  }),
                );
              }
            },
            () =>
              settle(() =>
                resolve({
                  status: "reconciliation-required",
                  identity: expectedIdentity,
                }),
              ),
          );
        };
        const request = httpRequest(
          {
            socketPath: options.socketPath,
            path: "/v1/captures",
            method: "POST",
            headers: {
              Connection: "close",
              "Content-Type": "application/json",
              "Content-Length": bytes.length,
            },
          },
          (response) => {
            if (response.statusCode !== 200) {
              rejectionResponse = true;
              try {
                assertMediaType(
                  response.headers["content-type"],
                  "application/json",
                );
              } catch (error) {
                response.resume();
                settle(() => reject(error));
                return;
              }
              void consume(response, JSON_LIMIT).then(
                (body) => {
                  try {
                    const value = JSON.parse(decodeUtf8(body)) as unknown;
                    const rejection = parseCaptureAdmissionRejection(
                      response.statusCode ?? 0,
                      value,
                    );
                    provisionalRejection = rejection;
                    settleProvisionalRejection();
                  } catch (error) {
                    settle(() => reject(error));
                  }
                },
                (error) => settle(() => reject(error)),
              );
              return;
            }
            try {
              assertMediaType(
                response.headers["content-type"],
                "application/x-ndjson",
              );
              decoder = new CaptureNdjsonDecoder(
                expectedIdentity,
                captureRequest.archiveBasePath,
                startOptions?.onAccepted,
              );
            } catch (error) {
              response.resume();
              settle(() => reject(error));
              return;
            }
            response.on("data", (chunk: Uint8Array) => {
              try {
                decoder?.push(chunk);
              } catch (error) {
                response.destroy(error instanceof Error ? error : undefined);
                settle(() => reject(error));
              }
            });
            response.once("aborted", reconcileAfterLoss);
            response.once("error", reconcileAfterLoss);
            response.once("end", () => {
              try {
                const terminal = decoder?.finish();
                if (terminal !== undefined) {
                  settle(() => resolve(terminal));
                } else if (!settled) {
                  reconcileAfterLoss();
                }
              } catch (error) {
                settle(() => reject(error));
              }
            });
          },
        );
        const timer = setTimeout(() => {
          request.destroy(
            new DOMException("Capture request timed out", "TimeoutError"),
          );
        }, captureTimeoutMs);
        const abort = () =>
          request.destroy(
            cancellationCause(startOptions?.signal as AbortSignal),
          );
        request.once("error", (error) => {
          if (settled) return;
          if (rejectionResponse) {
            settle(() => reject(error));
          } else {
            reconcileAfterLoss();
          }
        });
        request.once("close", () => {
          rejectionExchangeClosed = true;
          settleProvisionalRejection();
        });
        if (startOptions?.signal?.aborted) abort();
        else {
          startOptions?.signal?.addEventListener("abort", abort, {
            once: true,
          });
        }
        request.end(bytes);
      });
    },

    async reconcile(expected, signal) {
      const path = `/v1/captures/${encodeURIComponent(expected.captureWindowId)}?supervisorInstanceId=${encodeURIComponent(expected.supervisorInstanceId)}`;
      const response = await send(
        "GET",
        path,
        undefined,
        requestTimeoutMs,
        signal,
      );
      if (![200, 404, 409].includes(response.statusCode)) {
        throw new Error("Capture reconciliation failed");
      }
      const status = parseWindowStatus(response.value);
      if (response.statusCode === 200 && status.type === "unusable") {
        throw new CaptureClientProtocolError(
          "Reconciliation status is invalid",
        );
      }
      if (
        response.statusCode === 404 &&
        (status.type !== "unusable" || status.reason !== "unknown_window")
      ) {
        throw new CaptureClientProtocolError(
          "Reconciliation status is invalid",
        );
      }
      if (
        response.statusCode === 409 &&
        (status.type !== "unusable" || status.reason !== "supervisor_replaced")
      ) {
        throw new CaptureClientProtocolError(
          "Reconciliation status is invalid",
        );
      }
      if (
        status.type !== "unusable" &&
        !sameIdentity(status.identity, expected)
      ) {
        throw new CaptureClientProtocolError(
          "Reconciliation identity mismatch",
        );
      }
      return status;
    },

    async cancel(expected, signal) {
      const response = await send(
        "DELETE",
        `/v1/captures/${encodeURIComponent(expected.captureWindowId)}`,
        { version: 1, supervisorInstanceId: expected.supervisorInstanceId },
        requestTimeoutMs,
        signal,
      );
      if (![200, 202].includes(response.statusCode)) {
        throw new Error("Capture cancellation failed");
      }
      parseCancellationResponse(response.value);
    },
  };
  return client;
}

export const captureClientTestHooks = {
  parseAccepted,
  parseTerminal,
  parseServiceStatus,
  parseWindowStatus,
  parseCancellationResponse,
  sameIdentity,
  assertMediaType,
  parseCaptureAdmissionRejection,
  createNdjsonDecoder(
    expectedIdentity: CaptureIdentity,
    expectedArchiveBasePath: string,
    onAccepted?: (record: CaptureAcceptedRecord) => void,
  ) {
    return new CaptureNdjsonDecoder(
      expectedIdentity,
      expectedArchiveBasePath,
      onAccepted,
    );
  },
};

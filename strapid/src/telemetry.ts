import { performance } from "node:perf_hooks";

import {
  type Context,
  diag,
  ROOT_CONTEXT,
  SeverityNumber,
  SpanStatusCode,
  type TextMapGetter,
  trace,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  ExportResultCode,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  type LogRecordExporter,
} from "@opentelemetry/sdk-logs";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  type SpanExporter,
  TracerProvider,
} from "@opentelemetry/sdk-trace";

import type { CaptureIdentity } from "./capture-contract.ts";
import type {
  CaptureCoordinatorObserver,
  CaptureOutputSession,
} from "./capture-coordinator.ts";
import {
  createExportOutputSession,
  type ExportAttention,
  type ExportDiagnosticRecord,
} from "./export-output.ts";
import type { SupervisorObserver } from "./strapi-supervisor.ts";

const EXPORT_TIMEOUT_MS = 2_000;
const CLOSE_TIMEOUT_MS = 5_000;
const INSTRUMENTATION_VERSION = "0.1.0";
const TRACE_HEADER_GETTER: TextMapGetter<
  Readonly<Record<string, string | undefined>>
> = {
  get(carrier, key) {
    return carrier[key];
  },
  keys(carrier) {
    return Object.keys(carrier);
  },
};

export interface StrapidTelemetry {
  readonly captureObserver: Partial<CaptureCoordinatorObserver>;
  readonly supervisorObserver: Partial<SupervisorObserver>;
  createOutputSession(identity: CaptureIdentity): CaptureOutputSession;
  runCapture<Result>(
    headers: { readonly traceparent?: string; readonly tracestate?: string },
    operation: () => Promise<Result>,
  ): Promise<Result>;
  close(deadline: number): Promise<void>;
}

export interface StrapidTelemetryOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly fallback?: (line: string) => void;
  readonly onInternalFailure?: (cause: unknown) => void;
  readonly now?: () => number;
  readonly exporters?: {
    readonly trace: SpanExporter;
    readonly metric: PushMetricExporter;
    readonly log: LogRecordExporter;
  };
}

interface TelemetryConfig {
  readonly serviceVersion: string;
  readonly deploymentEnvironment: string;
  readonly tracesUrl: string;
  readonly metricsUrl: string;
  readonly logsUrl: string;
}

type SafeLogAttributeName =
  | "phase"
  | "outcome"
  | "trigger"
  | "failure.code"
  | "diagnostic.stream"
  | "diagnostic.severity"
  | "diagnostic.truncated"
  | "diagnostic.invalid_utf8";

class FailureLatch {
  private failed = false;
  private readonly fallback: (line: string) => void;
  private readonly internal: (cause: unknown) => void;

  constructor(
    fallback: (line: string) => void,
    internal: (cause: unknown) => void,
  ) {
    this.fallback = fallback;
    this.internal = internal;
  }

  report(cause: unknown): void {
    try {
      this.internal(cause);
    } catch {
      // Test-only internal diagnostics are not production output.
    }
    if (this.failed) return;
    this.failed = true;
    try {
      this.fallback("strapid telemetry unavailable");
    } catch {
      // The fixed fallback is the final non-telemetry boundary.
    }
  }
}

function identifier(value: string | undefined): string {
  if (
    value === undefined ||
    Buffer.byteLength(value) > 64 ||
    !/^[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?$/.test(value)
  ) {
    throw new Error("invalid telemetry identity");
  }
  return value;
}

function parseConfig(environment: NodeJS.ProcessEnv): TelemetryConfig {
  if (
    environment.OTEL_EXPORTER_OTLP_PROTOCOL !== undefined &&
    environment.OTEL_EXPORTER_OTLP_PROTOCOL !== "http/protobuf"
  ) {
    throw new Error("invalid telemetry protocol");
  }
  const endpoint = new URL(
    environment.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel-collector:4318",
  );
  if (
    (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") ||
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    endpoint.pathname !== "/" ||
    endpoint.search !== "" ||
    endpoint.hash !== ""
  ) {
    throw new Error("invalid telemetry endpoint");
  }
  return {
    serviceVersion: identifier(environment.STRAPID_RELEASE_ID),
    deploymentEnvironment: identifier(
      environment.STRAPID_TELEMETRY_ENVIRONMENT,
    ),
    tracesUrl: new URL("/v1/traces", endpoint).toString(),
    metricsUrl: new URL("/v1/metrics", endpoint).toString(),
    logsUrl: new URL("/v1/logs", endpoint).toString(),
  };
}

function wrapSpanExporter(
  exporter: SpanExporter,
  failure: FailureLatch,
): SpanExporter {
  return {
    export(spans, callback) {
      try {
        exporter.export(spans, (result) => {
          if (result.code !== ExportResultCode.SUCCESS) {
            failure.report(result.error ?? new Error("trace export failed"));
          }
          callback(result);
        });
      } catch (cause) {
        failure.report(cause);
        callback({ code: ExportResultCode.FAILED });
      }
    },
    async forceFlush() {
      try {
        await exporter.forceFlush?.();
      } catch (cause) {
        failure.report(cause);
        throw cause;
      }
    },
    async shutdown() {
      try {
        await exporter.shutdown();
      } catch (cause) {
        failure.report(cause);
        throw cause;
      }
    },
  };
}

function wrapMetricExporter(
  exporter: PushMetricExporter,
  failure: FailureLatch,
): PushMetricExporter {
  return {
    export(metrics, callback) {
      try {
        exporter.export(metrics, (result) => {
          if (result.code !== ExportResultCode.SUCCESS) {
            failure.report(result.error ?? new Error("metric export failed"));
          }
          callback(result);
        });
      } catch (cause) {
        failure.report(cause);
        callback({ code: ExportResultCode.FAILED });
      }
    },
    async forceFlush() {
      try {
        await exporter.forceFlush();
      } catch (cause) {
        failure.report(cause);
        throw cause;
      }
    },
    async shutdown() {
      try {
        await exporter.shutdown();
      } catch (cause) {
        failure.report(cause);
        throw cause;
      }
    },
  };
}

function wrapLogExporter(
  exporter: LogRecordExporter,
  failure: FailureLatch,
): LogRecordExporter {
  return {
    export(records, callback) {
      try {
        exporter.export(records, (result) => {
          if (result.code !== ExportResultCode.SUCCESS) {
            failure.report(result.error ?? new Error("log export failed"));
          }
          callback(result);
        });
      } catch (cause) {
        failure.report(cause);
        callback({ code: ExportResultCode.FAILED });
      }
    },
    async forceFlush() {
      try {
        await exporter.forceFlush();
      } catch (cause) {
        failure.report(cause);
        throw cause;
      }
    },
    async shutdown() {
      try {
        await exporter.shutdown();
      } catch (cause) {
        failure.report(cause);
        throw cause;
      }
    },
  };
}

function withDeadline(
  operations: readonly Promise<unknown>[],
  milliseconds: number,
  failure: FailureLatch,
): Promise<void> {
  if (milliseconds <= 0) {
    failure.report(new Error("telemetry close deadline expired"));
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      failure.report(new Error("telemetry close deadline expired"));
      finish();
    }, milliseconds);
    void Promise.allSettled(operations).then(finish);
  });
}

function attempt(operation: () => Promise<unknown>): Promise<unknown> {
  return Promise.resolve().then(operation);
}

function disabled(failure: FailureLatch, cause: unknown): StrapidTelemetry {
  failure.report(cause);
  return {
    captureObserver: {},
    supervisorObserver: {},
    createOutputSession: () => ({
      output: { onStdout: () => undefined, onStderr: () => undefined },
      close: () => undefined,
    }),
    runCapture: async (_headers, operation) => await operation(),
    close: async () => undefined,
  };
}

export function createStrapidTelemetry(
  options: StrapidTelemetryOptions = {},
): StrapidTelemetry {
  const failure = new FailureLatch(
    options.fallback ?? ((line) => process.stderr.write(`${line}\n`)),
    options.onInternalFailure ?? (() => undefined),
  );
  let config: TelemetryConfig;
  try {
    diag.disable();
    config = parseConfig(options.environment ?? process.env);
  } catch (cause) {
    return disabled(failure, cause);
  }

  try {
    const resource = resourceFromAttributes({
      "service.namespace": "us-alb",
      "service.name": "strapid",
      "service.version": config.serviceVersion,
      "deployment.environment.name": config.deploymentEnvironment,
    });
    const traceExporter = wrapSpanExporter(
      options.exporters?.trace ??
        new OTLPTraceExporter({
          url: config.tracesUrl,
          timeoutMillis: EXPORT_TIMEOUT_MS,
          concurrencyLimit: 1,
        }),
      failure,
    );
    const metricExporter = wrapMetricExporter(
      options.exporters?.metric ??
        new OTLPMetricExporter({
          url: config.metricsUrl,
          timeoutMillis: EXPORT_TIMEOUT_MS,
          concurrencyLimit: 1,
        }),
      failure,
    );
    const logExporter = wrapLogExporter(
      options.exporters?.log ??
        new OTLPLogExporter({
          url: config.logsUrl,
          timeoutMillis: EXPORT_TIMEOUT_MS,
          concurrencyLimit: 1,
        }),
      failure,
    );
    const tracerProvider = new TracerProvider({
      resource,
      spanProcessors: [
        new BatchSpanProcessor({
          exporter: traceExporter,
          maxQueueSize: 512,
          maxExportBatchSize: 128,
          scheduledDelayMillis: 5_000,
          exportTimeoutMillis: EXPORT_TIMEOUT_MS,
        }),
      ],
    });
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60_000,
      exportTimeoutMillis: EXPORT_TIMEOUT_MS,
      maxExportBatchSize: 64,
      cardinalityLimits: { default: 64 },
    });
    const meterProvider = new MeterProvider({
      resource,
      readers: [metricReader],
    });
    const loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor({
          exporter: logExporter,
          maxQueueSize: 1_024,
          maxExportBatchSize: 256,
          scheduledDelayMillis: 1_000,
          exportTimeoutMillis: EXPORT_TIMEOUT_MS,
        }),
      ],
      logRecordLimits: {
        attributeCountLimit: 16,
        attributeValueLengthLimit: 256,
      },
    });
    const tracer = tracerProvider.getTracer("strapid", INSTRUMENTATION_VERSION);
    const meter = meterProvider.getMeter("strapid", INSTRUMENTATION_VERSION);
    const logger = loggerProvider.getLogger("strapid", INSTRUMENTATION_VERSION);
    const contextManager = new AsyncLocalStorageContextManager().enable();
    const propagator = new W3CTraceContextPropagator();
    const now = options.now ?? performance.now.bind(performance);
    const captureOutcome = meter.createCounter("strapid.capture.outcome");
    const captureDuration = meter.createHistogram("strapid.capture.duration", {
      unit: "s",
    });
    const phaseDuration = meter.createHistogram("strapid.phase.duration", {
      unit: "s",
    });
    const recoveryOutcome = meter.createCounter("strapid.recovery.outcome");
    const attention = meter.createCounter("strapid.export.attention");
    let closing = false;
    let closePromise: Promise<void> | undefined;
    let activeContext: Context | undefined;
    let captureSpan: ReturnType<typeof tracer.startSpan> | undefined;
    let captureStarted = 0;
    let phaseSpan: ReturnType<typeof tracer.startSpan> | undefined;
    let phaseStarted = 0;

    const invoke = (operation: () => void) => {
      if (closing) return;
      try {
        operation();
      } catch (cause) {
        failure.report(cause);
      }
    };
    const emit = (
      eventName: string,
      attributes: Partial<
        Record<SafeLogAttributeName, string | boolean | undefined>
      >,
      body?: {
        readonly message?: string;
        readonly correlation?: { readonly captureWindowId: string };
      },
      severityNumber: SeverityNumber = SeverityNumber.INFO,
    ) =>
      invoke(() =>
        logger.emit({
          eventName,
          severityNumber,
          body: { event: eventName, ...body },
          attributes: Object.fromEntries(
            Object.entries({ "event.name": eventName, ...attributes }).filter(
              ([, value]) => value !== undefined,
            ),
          ),
          ...(activeContext === undefined ? {} : { context: activeContext }),
        }),
      );
    const diagnostic = (
      identity: CaptureIdentity,
      record: ExportDiagnosticRecord,
    ) =>
      emit(
        "strapid.export.output",
        {
          "diagnostic.stream": record.stream,
          "diagnostic.severity": record.severity,
          "diagnostic.truncated": record.truncated,
          "diagnostic.invalid_utf8": record.invalidUtf8,
        },
        {
          message: record.message,
          correlation: { captureWindowId: identity.captureWindowId },
        },
        record.severity === "error"
          ? SeverityNumber.ERROR
          : record.severity === "warning"
            ? SeverityNumber.WARN
            : SeverityNumber.INFO,
      );
    const attentionEvent = (
      identity: CaptureIdentity,
      event: ExportAttention,
    ) => {
      invoke(() => attention.add(1, { outcome: event.category }));
      emit(
        "strapid.export.attention",
        { outcome: event.category },
        { correlation: { captureWindowId: identity.captureWindowId } },
        SeverityNumber.WARN,
      );
    };

    const captureObserver: CaptureCoordinatorObserver = {
      admitted(event) {
        invoke(() => {
          captureSpan?.setAttribute(
            "capture.window.id",
            event.identity.captureWindowId,
          );
          emit(
            "strapid.capture.admitted",
            {},
            {
              correlation: {
                captureWindowId: event.identity.captureWindowId,
              },
            },
          );
        });
      },
      phaseStarted(event) {
        invoke(() => {
          phaseStarted = now();
          phaseSpan = tracer.startSpan(
            `strapi.${event.phase}`,
            { attributes: { "capture.phase": event.phase } },
            activeContext,
          );
          emit("strapid.phase.started", { phase: event.phase });
        });
      },
      phaseFinished(event) {
        invoke(() => {
          phaseDuration.record(Math.max(0, now() - phaseStarted) / 1_000, {
            phase: event.phase,
            outcome: event.outcome,
          });
          if (event.outcome !== "succeeded") {
            phaseSpan?.setStatus({ code: SpanStatusCode.ERROR });
          }
          phaseSpan?.end();
          phaseSpan = undefined;
          emit("strapid.phase.finished", {
            phase: event.phase,
            outcome: event.outcome,
          });
        });
      },
      outputClosed() {
        emit("strapid.export.output_closed", { outcome: "succeeded" });
      },
      terminal(event) {
        invoke(() => {
          const outcome =
            event.outcome.status === "captured"
              ? "succeeded"
              : event.outcome.status === "supervisor-shutdown"
                ? "cancelled"
                : "failed";
          captureOutcome.add(1, { outcome });
          captureDuration.record(Math.max(0, now() - captureStarted) / 1_000, {
            outcome,
          });
          if (outcome !== "succeeded") {
            captureSpan?.setStatus({ code: SpanStatusCode.ERROR });
          }
          emit(
            "strapid.capture.terminal",
            { outcome },
            {
              correlation: {
                captureWindowId: event.identity.captureWindowId,
              },
            },
          );
          captureSpan?.end();
          captureSpan = undefined;
          activeContext = undefined;
        });
      },
    };
    const supervisorObserver: SupervisorObserver = {
      recoveryStarted(event) {
        emit("strapid.recovery.started", { phase: event.source });
      },
      recoveryFinished(event) {
        invoke(() =>
          recoveryOutcome.add(1, {
            source: event.source,
            outcome: event.outcome,
          }),
        );
        emit("strapid.recovery.outcome", {
          phase: event.source,
          outcome: event.outcome,
        });
      },
    };

    return {
      captureObserver,
      supervisorObserver,
      createOutputSession(identity) {
        return createExportOutputSession({
          onRecord: (record) => diagnostic(identity, record),
          onAttention: (event) => attentionEvent(identity, event),
          onFailure: (cause) => failure.report(cause),
        });
      },
      async runCapture(headers, operation) {
        if (closing) return await operation();
        const carrier: Record<string, string> = {
          ...(headers.traceparent === undefined
            ? {}
            : { traceparent: headers.traceparent }),
          ...(headers.tracestate === undefined
            ? {}
            : { tracestate: headers.tracestate }),
        };
        const parent = propagator.extract(
          ROOT_CONTEXT,
          carrier,
          TRACE_HEADER_GETTER,
        );
        captureStarted = now();
        const span = tracer.startSpan("strapi.capture", {}, parent);
        const captureContext = trace.setSpan(parent, span);
        captureSpan = span;
        activeContext = captureContext;
        try {
          return await contextManager.with(captureContext, operation);
        } catch (cause) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw cause;
        } finally {
          if (captureSpan === span) {
            span.end();
            captureSpan = undefined;
            activeContext = undefined;
          }
        }
      },
      close(deadline) {
        if (closePromise !== undefined) return closePromise;
        closing = true;
        const absoluteDeadline = Math.min(
          deadline,
          Date.now() + CLOSE_TIMEOUT_MS,
        );
        closePromise = (async () => {
          const flushMs = Math.min(
            EXPORT_TIMEOUT_MS,
            Math.max(0, absoluteDeadline - Date.now()),
          );
          if (flushMs > 0) {
            await withDeadline(
              [
                attempt(() =>
                  tracerProvider.forceFlush({ timeoutMillis: flushMs }),
                ),
                attempt(() =>
                  meterProvider.forceFlush({ timeoutMillis: flushMs }),
                ),
                attempt(() =>
                  loggerProvider.forceFlush({ timeoutMillis: flushMs }),
                ),
              ],
              flushMs,
              failure,
            );
          } else {
            failure.report(new Error("telemetry close deadline expired"));
          }
          const shutdownMs = Math.max(0, absoluteDeadline - Date.now());
          if (shutdownMs > 0) {
            await withDeadline(
              [
                attempt(() => tracerProvider.shutdown()),
                attempt(() =>
                  meterProvider.shutdown({ timeoutMillis: shutdownMs }),
                ),
                attempt(() => loggerProvider.shutdown()),
              ],
              shutdownMs,
              failure,
            );
          }
        })()
          .catch((cause) => failure.report(cause))
          .finally(() => contextManager.disable());
        return closePromise;
      },
    };
  } catch (cause) {
    return disabled(failure, cause);
  }
}

export const strapidTelemetryTestHooks = { parseConfig };

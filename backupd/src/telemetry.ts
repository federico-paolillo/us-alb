import { performance } from "node:perf_hooks";

import {
  type Context,
  diag,
  ROOT_CONTEXT,
  SeverityNumber,
  SpanStatusCode,
  type TextMapSetter,
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
  type ReadableLogRecord,
} from "@opentelemetry/sdk-logs";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
  type ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
  TracerProvider,
} from "@opentelemetry/sdk-trace";

import type {
  BackupDaemonEvent,
  BackupLifecycleObserver,
} from "./backup-lifecycle.ts";
import type {
  RunLifecycleRequest,
  RunLifecycleResult,
} from "./daily-scheduler.ts";
import type { StateRepository } from "./state-repository.ts";

const EXPORT_TIMEOUT_MS = 2_000;
const CLOSE_TIMEOUT_MS = 5_000;
const INSTRUMENTATION_VERSION = "0.1.0";

export interface BackupTelemetry {
  readonly observer: Partial<BackupLifecycleObserver>;
  onEvent(event: BackupDaemonEvent): void;
  runInContext<Result>(
    request: RunLifecycleRequest,
    operation: () => Promise<Result>,
  ): Promise<Result>;
  traceHeaders(): {
    readonly traceparent?: string;
    readonly tracestate?: string;
  };
  startFreshness(repository: StateRepository): void;
  close(deadline: number): Promise<void>;
}

export interface BackupTelemetryOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly serviceVersion: string;
  readonly deploymentEnvironment: string;
  readonly fallback?: (line: string) => void;
  readonly onInternalFailure?: (cause: unknown) => void;
  readonly now?: () => number;
  readonly setInterval?: (
    callback: () => void,
    milliseconds: number,
  ) => unknown;
  readonly clearInterval?: (timer: unknown) => void;
  readonly exporters?: {
    readonly trace: SpanExporter;
    readonly metric: PushMetricExporter;
    readonly log: LogRecordExporter;
  };
}

interface TelemetryConfig {
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
  private readonly onInternalFailure: (cause: unknown) => void;

  constructor(
    fallback: (line: string) => void,
    onInternalFailure: (cause: unknown) => void,
  ) {
    this.fallback = fallback;
    this.onInternalFailure = onInternalFailure;
  }

  report(cause: unknown): void {
    try {
      this.onInternalFailure(cause);
    } catch {
      // Internal test diagnostics are not production output.
    }
    if (this.failed) return;
    this.failed = true;
    try {
      this.fallback("backupd telemetry unavailable");
    } catch {
      // The local fallback is the final non-telemetry boundary.
    }
  }
}

class SafeSpanExporter implements SpanExporter {
  private readonly inner: SpanExporter;
  private readonly failure: FailureLatch;

  constructor(inner: SpanExporter, failure: FailureLatch) {
    this.inner = inner;
    this.failure = failure;
  }

  export(
    spans: ReadableSpan[],
    callback: Parameters<SpanExporter["export"]>[1],
  ): void {
    try {
      this.inner.export(spans, (result) => {
        if (result.code !== ExportResultCode.SUCCESS) {
          this.failure.report(result.error ?? new Error("trace export failed"));
        }
        callback(result);
      });
    } catch (cause) {
      this.failure.report(cause);
      callback({ code: ExportResultCode.FAILED });
    }
  }

  async forceFlush(): Promise<void> {
    try {
      await this.inner.forceFlush?.();
    } catch (cause) {
      this.failure.report(cause);
      throw cause;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.inner.shutdown();
    } catch (cause) {
      this.failure.report(cause);
      throw cause;
    }
  }
}

class SafeMetricExporter implements PushMetricExporter {
  private readonly inner: PushMetricExporter;
  private readonly failure: FailureLatch;

  constructor(inner: PushMetricExporter, failure: FailureLatch) {
    this.inner = inner;
    this.failure = failure;
  }

  export(
    metrics: ResourceMetrics,
    callback: Parameters<PushMetricExporter["export"]>[1],
  ): void {
    try {
      this.inner.export(metrics, (result) => {
        if (result.code !== ExportResultCode.SUCCESS) {
          this.failure.report(
            result.error ?? new Error("metric export failed"),
          );
        }
        callback(result);
      });
    } catch (cause) {
      this.failure.report(cause);
      callback({ code: ExportResultCode.FAILED });
    }
  }

  async forceFlush(): Promise<void> {
    try {
      await this.inner.forceFlush();
    } catch (cause) {
      this.failure.report(cause);
      throw cause;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.inner.shutdown();
    } catch (cause) {
      this.failure.report(cause);
      throw cause;
    }
  }
}

class SafeLogExporter implements LogRecordExporter {
  private readonly inner: LogRecordExporter;
  private readonly failure: FailureLatch;

  constructor(inner: LogRecordExporter, failure: FailureLatch) {
    this.inner = inner;
    this.failure = failure;
  }

  export(
    records: ReadableLogRecord[],
    callback: Parameters<LogRecordExporter["export"]>[1],
  ): void {
    try {
      this.inner.export(records, (result) => {
        if (result.code !== ExportResultCode.SUCCESS) {
          this.failure.report(result.error ?? new Error("log export failed"));
        }
        callback(result);
      });
    } catch (cause) {
      this.failure.report(cause);
      callback({ code: ExportResultCode.FAILED });
    }
  }

  async forceFlush(): Promise<void> {
    try {
      await this.inner.forceFlush();
    } catch (cause) {
      this.failure.report(cause);
      throw cause;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.inner.shutdown();
    } catch (cause) {
      this.failure.report(cause);
      throw cause;
    }
  }
}

function parseConfig(environment: NodeJS.ProcessEnv): TelemetryConfig {
  if (
    environment.OTEL_EXPORTER_OTLP_PROTOCOL !== undefined &&
    environment.OTEL_EXPORTER_OTLP_PROTOCOL !== "http/protobuf"
  ) {
    throw new Error("invalid telemetry protocol");
  }
  const parsed = new URL(
    environment.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel-collector:4318",
  );
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("invalid telemetry endpoint");
  }
  return {
    tracesUrl: new URL("/v1/traces", parsed).toString(),
    metricsUrl: new URL("/v1/metrics", parsed).toString(),
    logsUrl: new URL("/v1/logs", parsed).toString(),
  };
}

function identity(value: string, pattern: RegExp): string {
  if (Buffer.byteLength(value) > 64 || !pattern.test(value)) {
    throw new Error("invalid telemetry identity");
  }
  return value;
}

function safeFallback(line: string): void {
  process.stderr.write(`${line}\n`);
}

function disabledTelemetry(
  failure: FailureLatch,
  cause: unknown,
): BackupTelemetry {
  failure.report(cause);
  return {
    observer: {},
    onEvent: () => undefined,
    runInContext: async (_request, operation) => await operation(),
    traceHeaders: () => ({}),
    startFreshness: () => undefined,
    close: async () => undefined,
  };
}

function boundedOutcome(result: RunLifecycleResult): string {
  if (result === "completed") return "succeeded";
  if (result === "publication-pending") return "pending";
  if (result === "retryable-failure") return "retryable-failure";
  return "failed";
}

class FreshnessTracker {
  private confirmedGeneration = 0;
  private currentMilliseconds: number | undefined;

  get seconds(): number | undefined {
    return this.currentMilliseconds === undefined
      ? undefined
      : this.currentMilliseconds / 1_000;
  }

  beginRead(): number {
    return this.confirmedGeneration;
  }

  applyRead(generation: number, capturedAt: string | undefined): boolean {
    if (generation !== this.confirmedGeneration) return false;
    return this.apply(capturedAt);
  }

  confirm(capturedAt: string): boolean {
    this.confirmedGeneration += 1;
    return this.apply(capturedAt);
  }

  private apply(capturedAt: string | undefined): boolean {
    if (capturedAt === undefined) return false;
    const milliseconds = Date.parse(capturedAt);
    if (
      !Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !== capturedAt ||
      (this.currentMilliseconds !== undefined &&
        milliseconds <= this.currentMilliseconds)
    ) {
      return false;
    }
    this.currentMilliseconds = milliseconds;
    return true;
  }
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

export function createBackupTelemetry(
  options: BackupTelemetryOptions,
): BackupTelemetry {
  const failure = new FailureLatch(
    options.fallback ?? safeFallback,
    options.onInternalFailure ?? (() => undefined),
  );
  let config: TelemetryConfig;
  try {
    diag.disable();
    config = parseConfig(options.environment ?? process.env);
  } catch (cause) {
    return disabledTelemetry(failure, cause);
  }

  try {
    const serviceVersion = identity(options.serviceVersion, /^[0-9a-f]{7,64}$/);
    const deploymentEnvironment = identity(
      options.deploymentEnvironment,
      /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/,
    );
    const resource = resourceFromAttributes({
      "service.namespace": "us-alb",
      "service.name": "backupd",
      "service.version": serviceVersion,
      "deployment.environment.name": deploymentEnvironment,
    });
    const traceExporter = new SafeSpanExporter(
      options.exporters?.trace ??
        new OTLPTraceExporter({
          url: config.tracesUrl,
          timeoutMillis: EXPORT_TIMEOUT_MS,
          concurrencyLimit: 1,
        }),
      failure,
    );
    const metricExporter = new SafeMetricExporter(
      options.exporters?.metric ??
        new OTLPMetricExporter({
          url: config.metricsUrl,
          timeoutMillis: EXPORT_TIMEOUT_MS,
          concurrencyLimit: 1,
        }),
      failure,
    );
    const logExporter = new SafeLogExporter(
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
    const tracer = tracerProvider.getTracer("backupd", INSTRUMENTATION_VERSION);
    const meter = meterProvider.getMeter("backupd", INSTRUMENTATION_VERSION);
    const logger = loggerProvider.getLogger("backupd", INSTRUMENTATION_VERSION);
    const propagator = new W3CTraceContextPropagator();
    const contextManager = new AsyncLocalStorageContextManager().enable();
    const now = options.now ?? performance.now.bind(performance);
    const runOutcome = meter.createCounter("backupd.run.outcome");
    const runDuration = meter.createHistogram("backupd.run.duration", {
      unit: "s",
    });
    const phaseDuration = meter.createHistogram("backupd.phase.duration", {
      unit: "s",
    });
    const heartbeat = meter.createObservableGauge("backupd.heartbeat");
    const captureTime = meter.createObservableGauge(
      "backupd.snapshot.capture_time",
      { unit: "s" },
    );
    heartbeat.addCallback((result) => result.observe(1));
    const freshness = new FreshnessTracker();
    captureTime.addCallback((result) => {
      if (freshness.seconds !== undefined) result.observe(freshness.seconds);
    });

    let closing = false;
    let closePromise: Promise<void> | undefined;
    let freshnessTimer: unknown;
    let activeContext: Context | undefined;
    let rootSpan: ReturnType<typeof tracer.startSpan> | undefined;
    let rootStarted = 0;
    let trigger: RunLifecycleRequest["trigger"] | undefined;
    let phaseSpan: ReturnType<typeof tracer.startSpan> | undefined;
    let phaseStarted = 0;
    let runIdentity:
      | { readonly runId: string; readonly captureWindowId?: string }
      | undefined;

    const invoke = (operation: () => void) => {
      if (closing) return;
      try {
        operation();
      } catch (cause) {
        failure.report(cause);
      }
    };
    const correlation = () =>
      runIdentity === undefined
        ? undefined
        : {
            runId: runIdentity.runId,
            ...(runIdentity.captureWindowId === undefined
              ? {}
              : { captureWindowId: runIdentity.captureWindowId }),
          };
    const emit = (
      eventName: string,
      attributes: Partial<
        Record<SafeLogAttributeName, string | boolean | undefined>
      >,
      severityNumber: SeverityNumber = SeverityNumber.INFO,
    ) =>
      invoke(() =>
        logger.emit({
          eventName,
          severityNumber,
          body: {
            event: eventName,
            ...(correlation() === undefined
              ? {}
              : { correlation: correlation() }),
          },
          attributes: Object.fromEntries(
            Object.entries({ "event.name": eventName, ...attributes }).filter(
              ([, value]) => value !== undefined,
            ),
          ),
          ...(activeContext === undefined ? {} : { context: activeContext }),
        }),
      );

    const observer: BackupLifecycleObserver = {
      runStarted(event) {
        emit("backupd.run.started", { trigger: event.trigger });
      },
      runIdentified(event) {
        invoke(() => {
          runIdentity = event;
          rootSpan?.setAttribute("backup.run.id", event.runId);
          if (event.captureWindowId !== undefined) {
            rootSpan?.setAttribute(
              "backup.capture.window.id",
              event.captureWindowId,
            );
          }
        });
      },
      phaseStarted(event) {
        invoke(() => {
          phaseStarted = now();
          phaseSpan = tracer.startSpan(
            `backup.${event.phase}`,
            { attributes: { "backup.phase": event.phase } },
            activeContext,
          );
          emit("backupd.phase.started", { phase: event.phase });
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
          if (event.failureCode !== undefined) {
            phaseSpan?.setAttribute("failure.code", event.failureCode);
          }
          phaseSpan?.end();
          phaseSpan = undefined;
          emit(
            "backupd.phase.finished",
            {
              phase: event.phase,
              outcome: event.outcome,
              "failure.code": event.failureCode,
            },
            event.outcome === "succeeded"
              ? SeverityNumber.INFO
              : SeverityNumber.ERROR,
          );
        });
      },
      freshnessConfirmed(event) {
        invoke(() => {
          freshness.confirm(event.capturedAt);
          emit("backupd.freshness.confirmed", { outcome: "succeeded" });
        });
      },
      runFinished(event) {
        invoke(() => {
          const outcome = boundedOutcome(event.outcome);
          const runTrigger = trigger ?? "manual";
          runOutcome.add(1, { trigger: runTrigger, outcome });
          runDuration.record(Math.max(0, now() - rootStarted) / 1_000, {
            trigger: runTrigger,
            outcome,
          });
          if (event.outcome !== "completed") {
            rootSpan?.setStatus({ code: SpanStatusCode.ERROR });
          }
          if (event.failureCode !== undefined) {
            rootSpan?.setAttribute("failure.code", event.failureCode);
          }
          emit("backupd.run.finished", {
            trigger: runTrigger,
            outcome,
            "failure.code": event.failureCode,
          });
          rootSpan?.end();
          rootSpan = undefined;
          activeContext = undefined;
        });
      },
    };

    const setIntervalFn =
      options.setInterval ??
      ((callback: () => void, milliseconds: number) =>
        setInterval(callback, milliseconds));
    const clearIntervalFn =
      options.clearInterval ??
      ((timer: unknown) => clearInterval(timer as NodeJS.Timeout));

    return {
      observer,
      onEvent(event) {
        emit(
          `backupd.${event.code}`,
          {
            phase: event.phase,
            trigger: event.trigger,
            "failure.code": event.code,
          },
          event.code === "publication-pending"
            ? SeverityNumber.WARN
            : SeverityNumber.ERROR,
        );
      },
      async runInContext(request, operation) {
        if (closing) return await operation();
        trigger = request.trigger;
        rootStarted = now();
        runIdentity = undefined;
        rootSpan = tracer.startSpan("backup.run", {
          attributes: { "backup.trigger": request.trigger },
        });
        activeContext = trace.setSpan(ROOT_CONTEXT, rootSpan);
        return await contextManager.with(activeContext, operation);
      },
      traceHeaders() {
        if (activeContext === undefined || closing) return {};
        const carrier: Record<string, string> = {};
        const setter: TextMapSetter<Record<string, string>> = {
          set(target, key, value) {
            target[key] = value;
          },
        };
        propagator.inject(activeContext, carrier, setter);
        return {
          ...(carrier.traceparent === undefined
            ? {}
            : { traceparent: carrier.traceparent }),
          ...(carrier.tracestate === undefined
            ? {}
            : { tracestate: carrier.tracestate }),
        };
      },
      startFreshness(repository) {
        const refresh = () => {
          const generation = freshness.beginRead();
          void repository.load().then(
            (state) => {
              const capturedAt = state.lastCompletedSnapshot?.capturedAt;
              freshness.applyRead(generation, capturedAt);
            },
            () => emit("backupd.freshness.read_failed", { outcome: "failed" }),
          );
        };
        refresh();
        freshnessTimer = setIntervalFn(refresh, 60_000);
        if (
          freshnessTimer !== null &&
          typeof freshnessTimer === "object" &&
          "unref" in freshnessTimer
        ) {
          (freshnessTimer as NodeJS.Timeout).unref();
        }
      },
      close(deadline) {
        if (closePromise !== undefined) return closePromise;
        closing = true;
        if (freshnessTimer !== undefined) clearIntervalFn(freshnessTimer);
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
    return disabledTelemetry(failure, cause);
  }
}

export const backupTelemetryTestHooks = {
  parseConfig,
  createFreshnessTracker: () => new FreshnessTracker(),
};

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryLogRecordExporter } from "@opentelemetry/sdk-logs";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace";

import type { CaptureIdentity } from "../../strapid/src/capture-contract.ts";
import { createStrapidTelemetry } from "../../strapid/src/telemetry.ts";
import type { StateRepository } from "../src/state-repository.ts";
import {
  backupTelemetryTestHooks,
  createBackupTelemetry,
} from "../src/telemetry.ts";

const environment = {
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318",
  OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
};

function retainedSpanExporter() {
  const memory = new InMemorySpanExporter();
  return {
    memory,
    exporter: {
      export: memory.export.bind(memory),
      forceFlush: memory.forceFlush.bind(memory),
      shutdown: async () => undefined,
    },
  };
}

function retainedLogExporter() {
  const memory = new InMemoryLogRecordExporter();
  return {
    memory,
    exporter: {
      export: memory.export.bind(memory),
      forceFlush: memory.forceFlush.bind(memory),
      shutdown: async () => undefined,
    },
  };
}

function backupTelemetry() {
  const trace = retainedSpanExporter();
  const metric = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const log = retainedLogExporter();
  return {
    telemetry: createBackupTelemetry({
      environment,
      serviceVersion: "abcdef1",
      deploymentEnvironment: "test",
      exporters: { trace: trace.exporter, metric, log: log.exporter },
    }),
    trace,
    metric,
    log,
  };
}

test("backup telemetry configuration is origin-only and protocol-strict", () => {
  assert.deepEqual(backupTelemetryTestHooks.parseConfig(environment), {
    tracesUrl: "http://127.0.0.1:4318/v1/traces",
    metricsUrl: "http://127.0.0.1:4318/v1/metrics",
    logsUrl: "http://127.0.0.1:4318/v1/logs",
  });
  for (const endpoint of [
    "ftp://collector:4318",
    "https://user:password@collector:4318",
    "https://collector:4318/prefix",
    "https://collector:4318/#secret",
  ]) {
    assert.throws(() =>
      backupTelemetryTestHooks.parseConfig({
        ...environment,
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
      }),
    );
  }
});

test("backup run propagates one W3C trace to strapid without metric identity labels", async () => {
  const backup = backupTelemetry();
  const strapiTrace = retainedSpanExporter();
  const strapiMetric = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE,
  );
  const strapiLog = retainedLogExporter();
  const strapid = createStrapidTelemetry({
    environment: {
      ...environment,
      STRAPID_RELEASE_ID: "release-1",
      STRAPID_TELEMETRY_ENVIRONMENT: "test",
    },
    exporters: {
      trace: strapiTrace.exporter,
      metric: strapiMetric,
      log: strapiLog.exporter,
    },
  });
  const runId = "11111111-1111-4111-8111-111111111111";
  const captureWindowId = "22222222-2222-4222-8222-222222222222";
  const captureIdentity: CaptureIdentity = {
    supervisorInstanceId: "33333333-3333-4333-8333-333333333333",
    captureWindowId,
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    nodeVersion: "v24.20.0",
    strapiVersion: "5.52.0",
  };

  await backup.telemetry.runInContext({ trigger: "scheduled" }, async () => {
    backup.telemetry.observer.runStarted?.({ trigger: "scheduled" });
    backup.telemetry.observer.runIdentified?.({ runId, captureWindowId });
    backup.telemetry.observer.phaseStarted?.({ phase: "capture" });
    const headers = backup.telemetry.traceHeaders();
    assert.match(
      headers.traceparent ?? "",
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
    );
    await strapid.runCapture(headers, async () => {
      strapid.captureObserver.admitted?.({ identity: captureIdentity });
      strapid.captureObserver.terminal?.({
        identity: captureIdentity,
        outcome: {
          status: "invalid",
          reason: "client_cancelled",
          servingRecoveredAt: "2026-10-29T03:00:03.000Z",
        },
      });
    });
    backup.telemetry.observer.phaseFinished?.({
      phase: "capture",
      outcome: "succeeded",
    });
    backup.telemetry.observer.freshnessConfirmed?.({
      capturedAt: "2026-10-29T03:00:02.000Z",
    });
    backup.telemetry.observer.runFinished?.({ outcome: "completed" });
  });
  await strapid.close(Date.now() + 1_000);
  await backup.telemetry.close(Date.now() + 1_000);

  const backupRoot = backup.trace.memory
    .getFinishedSpans()
    .find((span) => span.name === "backup.run");
  const strapiRoot = strapiTrace.memory
    .getFinishedSpans()
    .find((span) => span.name === "strapi.capture");
  assert.ok(backupRoot);
  assert.ok(strapiRoot);
  assert.equal(
    strapiRoot.spanContext().traceId,
    backupRoot.spanContext().traceId,
  );
  assert.equal(
    strapiRoot.parentSpanContext?.spanId,
    backupRoot.spanContext().spanId,
  );
  assert.equal(backupRoot.resource.attributes["service.name"], "backupd");
  assert.equal(backupRoot.resource.attributes["service.version"], "abcdef1");

  const metricText = JSON.stringify(backup.metric.getMetrics());
  assert.equal(metricText.includes(runId), false);
  assert.equal(metricText.includes(captureWindowId), false);
  assert.equal(metricText.includes("scheduled"), true);
  const logText = JSON.stringify(
    backup.log.memory.getFinishedLogRecords().map((record) => ({
      attributes: record.attributes,
      body: record.body,
    })),
  );
  assert.equal(logText.includes(runId), true);
  assert.equal(logText.includes("archive"), false);
});

test("pending publication is exported as a bounded phase and run outcome", async () => {
  const backup = backupTelemetry();
  await backup.telemetry.runInContext({ trigger: "manual" }, async () => {
    backup.telemetry.observer.runStarted?.({ trigger: "manual" });
    backup.telemetry.observer.phaseStarted?.({ phase: "publication" });
    backup.telemetry.observer.phaseFinished?.({
      phase: "publication",
      outcome: "pending",
    });
    backup.telemetry.observer.runFinished?.({
      outcome: "publication-pending",
    });
  });
  await backup.telemetry.close(Date.now() + 1_000);
  const metrics = JSON.stringify(backup.metric.getMetrics());
  assert.equal(metrics.includes("publication"), true);
  assert.equal(metrics.includes("pending"), true);
});

test("freshness polling reads only durable completed state and close is idempotent", async () => {
  const backup = backupTelemetry();
  let interval: (() => void) | undefined;
  const telemetry = createBackupTelemetry({
    environment,
    serviceVersion: "abcdef1",
    deploymentEnvironment: "test",
    exporters: {
      trace: new InMemorySpanExporter(),
      metric: new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE),
      log: new InMemoryLogRecordExporter(),
    },
    setInterval: (callback) => {
      interval = callback;
      return { unref() {} };
    },
    clearInterval: () => undefined,
  });
  const repository = {
    async load() {
      return {
        version: 1,
        lastCompletedSnapshot: {
          capturedAt: "2026-10-28T03:00:00.000Z",
        },
      };
    },
  } as StateRepository;
  telemetry.startFreshness(repository);
  await new Promise<void>((resolve) => setImmediate(resolve));
  interval?.();
  await Promise.all([
    telemetry.close(Date.now() + 1_000),
    telemetry.close(Date.now() + 1_000),
  ]);
  await backup.telemetry.close(Date.now() + 1_000);
});

test("freshness ignores a deferred stale read after durable confirmation", async () => {
  const tracker = backupTelemetryTestHooks.createFreshnessTracker();
  const staleRead = Promise.withResolvers<string>();
  const generation = tracker.beginRead();
  const applied = staleRead.promise.then((capturedAt) =>
    tracker.applyRead(generation, capturedAt),
  );

  assert.equal(tracker.confirm("2026-10-29T03:00:00.000Z"), true);
  staleRead.resolve("2026-10-28T03:00:00.000Z");
  assert.equal(await applied, false);
  assert.equal(tracker.seconds, Date.parse("2026-10-29T03:00:00.000Z") / 1_000);
});

test("freshness accepts only valid monotonically newer timestamps", () => {
  const tracker = backupTelemetryTestHooks.createFreshnessTracker();
  let generation = tracker.beginRead();
  assert.equal(tracker.applyRead(generation, "2026-10-28T03:00:00.000Z"), true);
  generation = tracker.beginRead();
  assert.equal(
    tracker.applyRead(generation, "2026-10-28T03:00:00.000Z"),
    false,
  );
  assert.equal(
    tracker.applyRead(generation, "2026-10-27T03:00:00.000Z"),
    false,
  );
  assert.equal(tracker.applyRead(generation, "not-a-timestamp"), false);
  assert.equal(tracker.applyRead(generation, "2026-10-30T03:00:00.000Z"), true);
  assert.equal(tracker.seconds, Date.parse("2026-10-30T03:00:00.000Z") / 1_000);
});

test("invalid configuration reports one fixed fallback and remains fail-open", async () => {
  const fallback: string[] = [];
  const causes: unknown[] = [];
  const telemetry = createBackupTelemetry({
    environment: { OTEL_EXPORTER_OTLP_PROTOCOL: "grpc" },
    serviceVersion: "abcdef1",
    deploymentEnvironment: "test",
    fallback: (line) => fallback.push(line),
    onInternalFailure: (cause) => causes.push(cause),
  });
  assert.equal(
    await telemetry.runInContext(
      { trigger: "manual" },
      async () => "domain-success",
    ),
    "domain-success",
  );
  await telemetry.close(Date.now());
  assert.deepEqual(fallback, ["backupd telemetry unavailable"]);
  assert.equal(causes.length, 1);
});

test("hung providers return inside the supplied shutdown deadline", async () => {
  const never = () => new Promise<void>(() => undefined);
  const fallbacks: string[] = [];
  const telemetry = createBackupTelemetry({
    environment,
    serviceVersion: "abcdef1",
    deploymentEnvironment: "test",
    fallback: (line) => fallbacks.push(line),
    exporters: {
      trace: { export() {}, forceFlush: never, shutdown: never },
      metric: { export() {}, forceFlush: never, shutdown: never },
      log: { export() {}, forceFlush: never, shutdown: never },
    },
  });
  const started = performance.now();
  const first = telemetry.close(Date.now() + 25);
  assert.equal(first, telemetry.close(Date.now() + 25));
  await first;
  assert.ok(performance.now() - started < 500);
  assert.deepEqual(fallbacks, ["backupd telemetry unavailable"]);
});

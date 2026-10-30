import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryLogRecordExporter } from "@opentelemetry/sdk-logs";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace";

import type {
  CaptureIdentity,
  CaptureTerminalRecord,
} from "../src/capture-contract.ts";
import {
  createStrapidTelemetry,
  strapidTelemetryTestHooks,
} from "../src/telemetry.ts";

const environment = {
  STRAPID_RELEASE_ID: "release-1",
  STRAPID_TELEMETRY_ENVIRONMENT: "test",
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

function identity(): CaptureIdentity {
  return {
    supervisorInstanceId: "11111111-1111-4111-8111-111111111111",
    captureWindowId: "22222222-2222-4222-8222-222222222222",
    releaseId: "release-1",
    sourceVolumeId: "source-1",
    nodeVersion: "v24.20.0",
    strapiVersion: "5.52.0",
  };
}

function terminal(captureIdentity: CaptureIdentity): CaptureTerminalRecord {
  return {
    version: 1,
    type: "terminal",
    identity: captureIdentity,
    archiveBasePath:
      "/staging/runs/33333333-3333-4333-8333-333333333333/strapi-export",
    startedAt: "2026-10-29T00:00:00.000Z",
    deadlineAt: "2026-10-29T00:15:00.000Z",
    acceptedAt: "2026-10-29T00:00:01.000Z",
    completedAt: "2026-10-29T00:00:04.000Z",
    outcome: {
      status: "captured",
      exportClosedAt: "2026-10-29T00:00:02.000Z",
      servingRecoveredAt: "2026-10-29T00:00:03.000Z",
    },
  };
}

test("telemetry configuration accepts only an origin and fixed protocol", () => {
  assert.deepEqual(strapidTelemetryTestHooks.parseConfig(environment), {
    serviceVersion: "release-1",
    deploymentEnvironment: "test",
    tracesUrl: "http://127.0.0.1:4318/v1/traces",
    metricsUrl: "http://127.0.0.1:4318/v1/metrics",
    logsUrl: "http://127.0.0.1:4318/v1/logs",
  });
  for (const endpoint of [
    "http://user:secret@collector:4318",
    "http://collector:4318/prefix",
    "http://collector:4318/?token=secret",
  ]) {
    assert.throws(() =>
      strapidTelemetryTestHooks.parseConfig({
        ...environment,
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
      }),
    );
  }
  assert.throws(() =>
    strapidTelemetryTestHooks.parseConfig({
      ...environment,
      OTEL_EXPORTER_OTLP_PROTOCOL: "grpc",
    }),
  );
});

test("capture telemetry keeps resources, correlation, diagnostics, and metrics bounded", async () => {
  const spans = retainedSpanExporter();
  const metrics = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const logs = retainedLogExporter();
  const telemetry = createStrapidTelemetry({
    environment,
    exporters: { trace: spans.exporter, metric: metrics, log: logs.exporter },
  });
  const captureIdentity = identity();

  await telemetry.runCapture(
    {
      traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
      tracestate: "vendor=value",
    },
    async () => {
      telemetry.captureObserver.admitted?.({ identity: captureIdentity });
      telemetry.captureObserver.phaseStarted?.({ phase: "export" });
      const output = telemetry.createOutputSession(captureIdentity);
      output.output.onStderr(Buffer.from("ERROR token=supersecret\n"));
      output.close();
      telemetry.captureObserver.outputClosed?.({ identity: captureIdentity });
      telemetry.captureObserver.phaseFinished?.({
        phase: "export",
        outcome: "succeeded",
      });
      telemetry.captureObserver.terminal?.({
        identity: captureIdentity,
        outcome: terminal(captureIdentity).outcome,
      });
    },
  );
  telemetry.supervisorObserver.recoveryStarted?.({ source: "capture" });
  telemetry.supervisorObserver.recoveryFinished?.({
    source: "capture",
    outcome: "succeeded",
  });
  await telemetry.close(Date.now() + 1_000);

  const captureSpan = spans.memory
    .getFinishedSpans()
    .find((span) => span.name === "strapi.capture");
  assert.equal(
    captureSpan?.spanContext().traceId,
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(captureSpan?.resource.attributes["service.name"], "strapid");
  assert.equal(captureSpan?.resource.attributes["service.namespace"], "us-alb");
  const exportedLogs = logs.memory.getFinishedLogRecords();
  const serialized = JSON.stringify(
    exportedLogs.map((record) => ({
      eventName: record.eventName,
      attributes: record.attributes,
      body: record.body,
    })),
  );
  assert.equal(serialized.includes("supersecret"), false);
  assert.equal(serialized.includes(captureIdentity.captureWindowId), true);
  const metricAttributes = JSON.stringify(metrics.getMetrics());
  assert.equal(
    metricAttributes.includes(captureIdentity.captureWindowId),
    false,
  );
  assert.equal(metricAttributes.includes("capture"), true);
});

test("invalid configuration disables once without changing operations", async () => {
  const fallback: string[] = [];
  const internal: unknown[] = [];
  const telemetry = createStrapidTelemetry({
    environment: { ...environment, OTEL_EXPORTER_OTLP_PROTOCOL: "grpc" },
    fallback: (line) => fallback.push(line),
    onInternalFailure: (cause) => internal.push(cause),
  });
  assert.equal(await telemetry.runCapture({}, async () => 42), 42);
  await telemetry.close(Date.now());
  assert.deepEqual(fallback, ["strapid telemetry unavailable"]);
  assert.equal(internal.length, 1);
});

test("hung exporters cannot extend the close deadline and fallback is once-only", async () => {
  const never = () => new Promise<void>(() => undefined);
  const fallbacks: string[] = [];
  const telemetry = createStrapidTelemetry({
    environment,
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
  assert.deepEqual(fallbacks, ["strapid telemetry unavailable"]);
});

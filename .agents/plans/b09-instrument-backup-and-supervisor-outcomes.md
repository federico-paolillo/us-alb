# Instrument backup and supervisor outcomes

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, `Outcomes & Retrospective`, and `Revision Notes` current as implementation and review proceed.

The repository root for every path and command in this plan is `/home/codex/src/us-alb`. The implementation baseline is the pushed `backup-system` commit `e941f698b6bcdbb7c72bb6acb51c338a6c8020a4` (B08). Do not switch branches. Preserve the unrelated untracked `.agents/skills/imagen/scripts/` directory without inspecting, staging, or modifying it.

## Purpose / Big Picture

B09 makes the already-composed backup lifecycle and the independent Strapi supervisor observable without changing their decisions. Operators should receive correlated traces for a backup run and its phases, safe structured lifecycle logs, bounded low-cardinality metrics, a one-minute heartbeat, and the timestamp of the last snapshot whose manifest B06 actually confirmed. Strapi export output should be forwarded through a bounded, secret-filtering policy that treats recognizable warning/error prefixes as advisory evidence, emits at most one attention event per capture, and never infers export completeness from prose.

The observable result is deliberately fail-open. `strapid` and `backupd` start and continue when the Collector is absent. An advisory export diagnostic does not turn a successful capture or publication into a failure. A telemetry exporter failure cannot roll back durable state, delete or retain staging differently, alter a process result, or consume more than B08's existing shutdown window. The sole local response to a telemetry-path failure is one fixed, secret-free operational line per process through an injected non-telemetry fallback.

This task does not configure or package the Collector, Grafana, alerting, Compose, or images. B10 owns process packaging and configuration wiring, B11 owns Collector transport/routing/authentication/batching/sampling, and B13 owns dashboards and alerts. B09 owns application event meaning, filtering, bounded buffering, correlation, and metric cardinality.

## Progress

- [x] (2026-10-29) Read root `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, and the complete `implement-task` and `canonical-validation` skills.
- [x] (2026-10-29) Confirm branch, exact pushed B08 baseline, and the sole unrelated untracked Imagen directory without inspecting it.
- [x] (2026-10-29) Read the pushed B01-B08 plans and inspect the relevant current `strapid` and `backupd` production and test interfaces.
- [x] (2026-10-29) Use Context7, beginning with the complete B09 question, to inspect current official OpenTelemetry JavaScript documentation; inspect exact installed-runtime-compatible package metadata and public typings where the docs were incomplete.
- [x] (2026-10-29) Resolve package pins, telemetry composition, output filtering, correlation, freshness, shutdown, narrow lifecycle hooks, tests, validation, and later-task ownership in this plan.
- [x] (2026-10-29) Added this plan's relative link beneath B09 in `TODO.md` while leaving B09 unchecked, pinned the approved dependency set independently in both packages, and implemented explicit application-local telemetry adapters.
- [x] (2026-10-29) Added narrow no-throw lifecycle, recovery, output-session, and W3C context hooks and integrated them at the existing `backupd` and `strapid` composition roots without moving domain authority.
- [x] (2026-10-29) Added process-free output/config/provider tests, in-memory causal trace and cardinality evidence, deadline/hung-exporter tests, durable-freshness ordering evidence, and a task-owned Unix-socket W3C transport integration test.
- [x] (2026-10-29) Ran both clean installs; canonical format/check/full test suites (`strapid` 77/77, `backupd` 143/143 including the isolated B06 SDK integration); exact dependency/version/tree checks; generated-artifact, temporary-path, fixture-process, B06-container, protected-input, scope, and `git diff --check` audits. All passed with no owned residue.
- [x] (2026-10-29) Remediation cycle 1: replaced escape regexes with bounded per-stream CSI/OSC parser state, paired every unexpected-serving recovery observation, made telemetry close unconditional after domain settlement, made freshness monotonic and stale-read-safe, classified recoverable publication as pending, and replaced the main-test spin helper with monotonic deadline polling.
- [x] (2026-10-29) Remediation cycle 1 focused evidence: repeated the adversarial output/recovery suite and the scheduler-close/freshness/publication-pending races three times; all 45 focused test executions passed before full canonical validation.
- [x] (2026-10-29) Remediation cycle 1 final validation: repeated clean installs with zero vulnerabilities; canonical format/check/full suites passed (`strapid` 81/81, `backupd` 148/148); exact dependency/prohibited-package, artifact, temporary-path, fixture-process, B06-container, protected-input, scope, staging, and `git diff --check` audits all passed without residue.
- [x] (2026-10-29) Remediation cycle 2: routed every daemon error-reporting path through one no-throw `safeReport`, added rejected-domain/throwing-reporter/throwing-telemetry listener-leak evidence, and made malformed CSI/OSC states resynchronize at preserved LF/CRLF record boundaries.
- [x] (2026-10-29) Remediation cycle 2 focused evidence: the six export-output policy tests and the rejected-shutdown no-throw test were repeated five times each (35/35 focused executions passed).
- [x] (2026-10-29) Remediation cycle 2 final validation: removed only the confirmed stale runner PIDs, repeated clean installs with zero vulnerabilities, passed canonical format/check/full suites (`strapid` 82/82, `backupd` 148/148), and passed exact dependency/prohibited-package, artifact, temporary-path, fixture-process, B06-container, protected-input, scope, staging, and `git diff --check` audits without owned residue.
- [x] (2026-10-30) Independent review approved remediation cycle 2 with `APPROVED` and `REVIEW_READY`; marked B09 complete as queue bookkeeping.
- [ ] Commit only the approved B09 implementation, tests, dependency metadata, this plan, and B09 bookkeeping with the title `B09 — Instrument backup and supervisor outcomes`; do not push unless the workflow explicitly authorizes it.

## Surprises & Discoveries

- Observation: Current OpenTelemetry JavaScript packages are on split release trains. The API is `1.10.0`, stable SDK packages are `3.0.0`, OTLP exporters are `0.300.0`, and semantic conventions are `1.44.0`.
  Evidence: Context7 resolved the official `/open-telemetry/opentelemetry-js/v3.0.0` documentation. Exact npm metadata and package declarations reported these versions and require Node `>=22.15.0`, which the repository's Node `24.20.0` satisfies.

- Observation: `@opentelemetry/sdk-node` exposes `start()` and one unparameterized `shutdown()`, but B09 must bound tracer, meter, and logger flushing separately inside B08's already-running deadline.
  Evidence: Current public declarations expose timeout-aware `forceFlush` methods on all three providers, a timeout-aware meter shutdown, and unparameterized trace/log shutdown. Explicit provider composition supplies the needed handles; `NodeSDK` does not.

- Observation: Current `@opentelemetry/sdk-trace-node` is still on an older release line with a peer constraint that excludes `@opentelemetry/api@1.10.0`.
  Evidence: Current npm metadata for `sdk-trace-node@2.12.x` conflicts with the official 3.0 core resource/API train. B09 therefore uses `@opentelemetry/sdk-trace@3.0.0` with the official async-hooks context manager and W3C propagator instead of mixing release trains.

- Observation: The current B03 output callback is part of the child-control path: if it throws, the process-group adapter converts it to `ChildOutputError` and terminates export.
  Evidence: `strapid/src/process-group.ts` pipes `Uint8Array` output through the callbacks supplied by `strapi-supervisor.ts`. Every B09 output/observer adapter must catch its own failures and return normally.

- Observation: B08 already has a neutral `onEvent` seam for bounded failure events, but success, phase timing, and freshness transitions are not observable through it. B03/B04 likewise expose export byte callbacks but not neutral capture/recovery phase observations.
  Evidence: `backupd/src/backup-lifecycle.ts` emits failure-oriented `BackupDaemonEvent` values; `strapid/src/capture-coordinator.ts` accepts `ExportOutput`; `strapid/src/main.ts` and `backupd/src/main.ts` remain the composition roots. Small observer additions are required, while lifecycle rules remain in their present owners.

- Observation: The logs SDK/exporter remains on the `0.x` package line, and the documentation includes experimental logger-configuration facilities.
  Evidence: Context7 did not document a stable all-in-one logging setup or every provider shutdown signature. Pin exact versions, use only `LoggerProvider`, `BatchLogRecordProcessor`, and direct logger emission, avoid experimental logger configurators, and cover shutdown/failure behavior with repository tests.

- Observation: The installed `3.0.0` declarations use the consolidated constructor form `new BatchSpanProcessor({ exporter, ...options })` and the corresponding log processor form, rather than the two-argument form copied into the initial plan from mixed documentation.
  Evidence: TypeScript rejected the two-argument form; `sdk-trace/dist/types.d.mts` and `sdk-logs/dist/types.d.mts` declare `exporter` inside their processor option objects. The implementation uses those exact pinned declarations; queue, batch, delay, and timeout values are unchanged, so this is a bounded API-syntax correction rather than a design change.

- Observation: Starting provider shutdown after the outer deadline is already exhausted can create late SDK timeout work even when the application no longer awaits it.
  Evidence: The deterministic hung-exporter test exposed a late metric-reader timeout. Both adapters now decline to start a provider phase with zero remaining time, while already-started operations remain observed through `Promise.allSettled`; the fixed fallback remains once-only.

- Observation: Adding the advisory-output fixture made the original three-second integration budget sensitive to Node test-runner parallel load even though the production budget was unchanged.
  Evidence: The isolated scenario completed in under one second but one parallel full-suite run crossed its 700 ms export allocation. The task-owned integration fixture budget was increased coherently to 5.9 seconds (all phase allocations still sum exactly); the focused scenario and repeated full 77-test suite then passed, with no production timing change.

- Observation: Sanitizing completed decoded lines cannot safely handle an unterminated OSC sequence because its payload is indistinguishable from later text and may include newlines.
  Evidence: The cycle-1 OSC-52 probe retained payload with the former regex approach. A per-stream byte parser now carries only one bounded state across chunks (`text`, `escape`, `csi`, `osc`, or `osc-escape`), emits no control payload bytes, and discards an unterminated sequence at close without buffering it.

- Observation: The freshness poll and durable lifecycle callback are independent asynchronous writers to one gauge value.
  Evidence: A deferred pre-confirmation read could resolve after `freshnessConfirmed` and overwrite the new value. The tracker now invalidates prior read generations on confirmation and accepts only canonical, strictly newer timestamps, retaining the last proven value after invalid, older, equal, or failed reads.

- Observation: The shutdown success and rejection branches had diverged before telemetry close, so a rejected scheduler completion bypassed close entirely.
  Evidence: Shutdown now reduces domain settlement to its authoritative exit code first and then attempts the single idempotent telemetry close under the original deadline in both branches. The deterministic rejection test preserves the scheduler cause/nonzero result while an injected telemetry rejection is fail-open.

- Observation: Catching the shutdown-domain reporter at only one call site was insufficient because the same injected callback is also used by coordinator, scheduler, manual-completion, startup, and final asynchronous handling paths.
  Evidence: Review found direct `catch(onError)` and unguarded calls after cycle 1. `runBackupDaemon` now creates one `safeReport` wrapper and supplies or invokes it at every reporting boundary. The deterministic test combines a rejected scheduler completion, throwing reporter, and throwing telemetry close while observing process-level late failure channels and listener counts.

- Observation: Constant-state control parsing still needs a resynchronization boundary for malformed or unterminated control records; otherwise one OSC can suppress all later safe records until process exit.
  Evidence: CR or LF now terminates any `escape`, `csi`, `osc`, or `osc-escape` state, is emitted back into line assembly, and therefore preserves LF/CRLF framing while dropping only the malformed control payload. Split adversarial tests prove later safe records survive and the prior payload does not.

- Observation: One worker-owned validation tree from the earlier fixture-budget failure remained live after its shell parent stopped.
  Evidence: The exact tree was shell PID 151515 with focused runner PID 151556 and worker PID 151562 in PGID 151515, started at 19:45. Only PID 151515 and then the confirmed orphaned runner PID 151556 were sent `SIGTERM`; both exact descendants disappeared, with no broad process cleanup.

## Decision Log

- Decision: Use explicit OpenTelemetry providers, not `NodeSDK` or auto-instrumentation.
  Rationale: B09 needs direct ownership of bounded queues, readers/processors, signal-specific flushing, no automatic environment/resource capture, and no framework instrumentation. Explicit providers keep telemetry secondary to domain shutdown.
  Date/Author: 2026-10-29 / planner.

- Decision: Install the same exact telemetry dependency set in both independently packaged applications: `@opentelemetry/api@1.10.0`, `@opentelemetry/context-async-hooks@3.0.0`, `@opentelemetry/core@3.0.0`, `@opentelemetry/resources@3.0.0`, `@opentelemetry/sdk-trace@3.0.0`, `@opentelemetry/sdk-metrics@3.0.0`, `@opentelemetry/sdk-logs@3.0.0`, `@opentelemetry/exporter-trace-otlp-proto@0.300.0`, `@opentelemetry/exporter-metrics-otlp-proto@0.300.0`, `@opentelemetry/exporter-logs-otlp-proto@0.300.0`, and `@opentelemetry/semantic-conventions@1.44.0`.
  Rationale: `strapid` and `backupd` are separate package/runtime boundaries. Exact pins and their lockfiles prevent mixed release trains. HTTP/protobuf is the intended OTLP protocol to the later B11 Collector. Do not add `sdk-node`, `sdk-trace-node`, `api-logs`, contrib instrumentation, or an application logging framework.
  Date/Author: 2026-10-29 / planner.

- Decision: Treat telemetry as a no-throw observer with a one-way domain dependency.
  Rationale: Lifecycle code may call neutral observers, but observer exceptions are caught at that call site and cannot change a state transition, result, cleanup, recovery, publication, or exit code. Telemetry never calls lifecycle decision methods.
  Date/Author: 2026-10-29 / planner.

- Decision: Correlate the private capture request with W3C `traceparent` and `tracestate` HTTP headers and no baggage or wire-body change.
  Rationale: `backupd` can create the run/phase trace, `strapid` can continue the capture under that remote parent, and the existing B04 JSON contract stays unchanged. A resumed pending publication starts a new trace because B07 state must not persist trace context.
  Date/Author: 2026-10-29 / planner.

- Decision: Permit run IDs, capture-window IDs, and object identity only as trace span attributes or bounded structured log-body correlation fields; prohibit them from resource attributes, metric attributes, and indexed log attributes.
  Rationale: IDs help incident correlation but are unbounded. Trace IDs remain native OpenTelemetry context rather than copied into metrics or log labels. B11 must not promote body correlation fields to indexed attributes.
  Date/Author: 2026-10-29 / planner.

- Decision: Derive freshness only from B07's persisted `lastCompletedSnapshot.capturedAt`, initially and every 60 seconds, with an immediate cache update only after B08's successful `recordPublishedSnapshot` transition.
  Rationale: B06 manifest confirmation is the sole publication confirmation, and B08 durable-state success is the sole freshness transition. An upload, archive validation, advisory-free export, or unconfirmed publication cannot advance freshness.
  Date/Author: 2026-10-29 / planner.

- Decision: A line beginning with a syntactically recognizable `WARN`, `WARNING`, or `ERROR` prefix is advisory only; all unfamiliar output is still forwarded under the same safe policy.
  Rationale: Strapi prose is not a stable API and cannot prove success or failure. The existing exit/health/recovery protocol remains authoritative. Aggregate recognized diagnostics into exactly one attention event per capture after both output streams close.
  Date/Author: 2026-10-29 / planner.

- Decision: Domain shutdown precedes telemetry flush. Flush/shutdown has a five-second application ceiling and, in `backupd`, receives only the time still available before B08's absolute shutdown deadline, retaining a small forced-exit safety margin.
  Rationale: Observability must not extend the 30-second B08 shutdown contract. A hung exporter may lose queued telemetry but may not keep children, sockets, staging, or the process alive.
  Date/Author: 2026-10-29 / planner.

- Decision: Treat processor construction syntax from the installed pinned public declarations as authoritative while preserving every approved capacity and timeout setting.
  Rationale: This avoids mixing the older documented constructor form with the pinned `3.0.0` runtime and does not change telemetry ownership, behavior, or dependencies.
  Date/Author: 2026-10-29 / worker.

- Decision: Parse terminal control sequences before UTF-8 line assembly with constant parser state and no control-payload storage.
  Rationale: This is the smallest boundary that handles arbitrary chunk and newline splits, BEL or `ESC\\` OSC termination, and final unterminated CSI/OSC input while preserving the existing line/output memory caps and UTF-8 diagnostics.
  Date/Author: 2026-10-29 / worker remediation cycle 1.

- Decision: Complete the observed publication phase explicitly as `pending` before transitioning to the durable pending-publication state.
  Rationale: Generic state transition completion cannot infer that a recoverable publisher rejection is neither success nor terminal failure. Explicit completion preserves one phase finish, the existing `publication-pending` run result, and all publication authority.
  Date/Author: 2026-10-29 / worker remediation cycle 1.

- Decision: Treat CR/LF as an invalid-sequence recovery boundary in every non-text control-parser state and pass that byte through to the existing line assembler.
  Rationale: This preserves ordinary record framing and CRLF normalization, prevents a malformed record from suppressing later diagnostics, stores no control payload, and leaves valid CSI finals and OSC BEL/`ESC\\` terminators unchanged.
  Date/Author: 2026-10-29 / worker remediation cycle 2.

## Outcomes & Retrospective

B09 is implemented and independently approved after two remediation cycles. Both independently packaged applications lock the approved dependency trains: API `1.10.0`, context/core/resources/trace/metrics/log SDK `3.0.0`, OTLP protobuf exporters `0.300.0`, and semantic conventions `1.44.0`. They construct explicit providers and application resources, retain bounded queues/export phases, disable SDK diagnostic output, fail open through one fixed fallback, and close only after domain shutdown under the existing deadlines.

The narrow observer/context/output hooks leave B03-B08 authority unchanged. `backupd` traces one admitted lifecycle and its phases, injects only validated W3C headers, records low-cardinality run/phase metrics plus heartbeat/durable freshness, and advances observed freshness only after the durable completed-snapshot transition. `strapid` extracts the remote parent, observes capture/recovery separately, and installs a per-capture output assembler that bounds, strips, redacts, forwards unfamiliar output, and aggregates recognized advisory severity once. A task-owned real export fixture emits split warning and unfamiliar output with a representative secret; capture remains successful and the emitted diagnostics are safe.

Current validation evidence after remediation cycle 2: `mise exec -- npm ci --prefix strapid` and `backupd` both reported zero vulnerabilities; `mise run strapid:format`, `strapid:check`, and `strapid:test` passed with 82/82 tests; `mise run backupd:format`, `backupd:check`, and `backupd:test` passed with 148/148 tests, including the isolated B06 SDK/LocalStack integration. Cycle 2's six output-policy tests and rejected-shutdown no-throw test were each repeated five times, for 35/35 passing focused executions; cycle 1's 45/45 focused evidence remains green in the full suites. Both `npm ls --depth=0` trees report the exact pins and no direct `sdk-node`, `sdk-trace-node`, `api-logs`, or auto-instrumentation package. The exact stale shell/runner/worker PIDs 151515, 151556, and 151562 are absent. Artifact, `/tmp/b09-*`/`b04-*`, exact fixture-process, and `us-alb.task=B06` container checks were empty. `BACKUP.md` and every protected/out-of-scope path have an empty diff; `git diff --check` passes; HEAD and upstream remain the pushed B08 commit. The independent reviewer approved the task with `APPROVED` and `REVIEW_READY` after verifying remediation cycle 2. The B09 checkbox is checked as approved queue bookkeeping; nothing is staged, committed, or pushed yet.

No live Collector, Grafana, alerting, remote telemetry backend, or cloud telemetry behavior was claimed. The initial Context7 limitation remains: current logging API coverage was incomplete, so the implementation follows the exact installed pinned declarations and repository-owned in-memory/hung-exporter evidence. The only implementation difference from the plan's copied API snippets is the pinned `3.0.0` processor option-object constructor form recorded above.

## Context and Orientation

`strapid/src/main.ts` is the B03/B04 composition root. It starts and monitors Strapi serving, owns capture transport startup, handles intentional signals, and shuts children down. `strapid/src/strapi-supervisor.ts` and `strapid/src/process-group.ts` exclusively own child/process-group control. `strapid/src/capture-coordinator.ts` owns the capture admission/window and passes byte callbacks to the export child. `strapid/src/capture-http.ts` owns the private HTTP boundary. None of those responsibilities moves to telemetry.

`backupd/src/main.ts` is B08's complete daemon composition root and signal/deadline owner. `backupd/src/backup-lifecycle.ts` composes B01-B07 behavior. `backupd/src/capture-client.ts` owns the private request to `strapid`. `backupd/src/state-repository.ts` owns strict durable-state interpretation, including the last confirmed snapshot timestamp. B09 observes these boundaries but does not weaken or duplicate their rules.

At baseline, `strapid` has no runtime dependencies. `backupd` has B05/B06 runtime dependencies. Both are ESM TypeScript applications using explicit `.ts` imports and erasable syntax. Preserve those conventions, use `import type` for types, and preserve error causes internally. No B09 diagnostic may emit a raw environment value, endpoint containing credentials, archive/object path, workspace diagnostic file, exception message, or child output before filtering.

## OpenTelemetry Dependencies and Current APIs

Context7 was called first with the complete B09 design question and resolved the official high-reputation `/open-telemetry/opentelemetry-js/v3.0.0` source. Two documentation fetches covered OTLP HTTP exporters, batch span/log processing, periodic metric reading, resources, and provider shutdown. This exhausted the three-command limit for that question. The docs showed exporter `url`, `concurrencyLimit`, and `timeoutMillis`; batch queue/delay/batch/export-timeout controls; `LoggerProvider({ processors })`; and `PeriodicExportingMetricReader` interval/export-timeout/batch options. They did not expose all requested provider shutdown signatures or a clear stability statement for the logs pipeline, and some snippets reflected older constructor forms.

Exact current package declarations resolve that gap for this pinned version:

- construct resources with `resourceFromAttributes`;
- construct `TracerProvider` with `spanProcessors: [new BatchSpanProcessor(exporter, options)]`;
- construct `MeterProvider` with `readers: [new PeriodicExportingMetricReader(options)]`;
- construct `LoggerProvider` with `processors: [new BatchLogRecordProcessor(exporter, options)]`;
- use `AsyncLocalStorageContextManager` and `W3CTraceContextPropagator` explicitly;
- call provider-local `getTracer`, `getMeter`, and `getLogger` rather than registering mutable global providers;
- use `forceFlush({ timeoutMillis })` for tracer, meter, and logger providers; use a timeout option for meter shutdown and an application-level deadline around the unparameterized tracer/logger shutdown methods.

Use these exact bounded settings in both processes unless a focused test injects smaller values:

| Facility | Setting |
| --- | --- |
| All OTLP exporters | `timeoutMillis: 2_000`, `concurrencyLimit: 1` |
| Batch spans | queue 512, batch 128, scheduled delay 5,000 ms, export timeout 2,000 ms |
| Batch logs | queue 1,024, batch 256, scheduled delay 1,000 ms, export timeout 2,000 ms |
| Periodic metrics | interval 60,000 ms, export timeout 2,000 ms, max export batch 64, attribute cardinality limit 64 |
| Application telemetry close | 5,000 ms maximum, further shortened by B08's remaining shutdown time |

The fixed OTLP protocol is HTTP/protobuf. Parse `OTEL_EXPORTER_OTLP_ENDPOINT` as an origin-only `http:` or `https:` base URL, defaulting to `http://otel-collector:4318`; reject userinfo, query, fragment, and a path other than `/`. Build `/v1/traces`, `/v1/metrics`, and `/v1/logs` locally. Accept `OTEL_EXPORTER_OTLP_PROTOCOL` only when absent or exactly `http/protobuf`. Do not consume `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_RESOURCE_ATTRIBUTES`, cloud credentials, or environment dumps; B11 owns Collector-side authentication. Invalid telemetry configuration disables telemetry, reports the fixed local operational line once, and leaves normal startup intact.

Create only explicit resource attributes:

- `service.namespace = "us-alb"`;
- `service.name = "strapid"` or `"backupd"`;
- `service.version = STRAPID_RELEASE_ID` in `strapid` or `BACKUPD_GIT_REVISION` in `backupd`, after the current configuration policy validates it;
- `deployment.environment.name = STRAPID_TELEMETRY_ENVIRONMENT` in `strapid` or the already-validated `BACKUPD_SNAPSHOT_ENVIRONMENT` in `backupd`.

Add `STRAPID_TELEMETRY_ENVIRONMENT` to `strapid`'s application configuration as the same bounded identifier form used for other identity fields. B10 will wire its concrete value. Do not use `service.instance.id`: it would add unnecessary cardinality.

## Telemetry Semantics and Safe Fields

Add `strapid/src/telemetry.ts` and `backupd/src/telemetry.ts`. Each file owns its application's provider construction, resource, safe event/metric/span adapters, failure latch, and bounded close. Cohesive private helpers can remain in those files; split a helper only if it becomes independently reused. Keep each public surface small: `create...Telemetry(config, dependencies?)` returns a no-throw observer, output/context facilities needed by that application, and `close(deadline)`.

Application code owns a closed vocabulary. Structured log attributes may contain only `event.name`, `phase`, `outcome`, `trigger`, `failure.code`, `diagnostic.stream`, `diagnostic.severity`, `diagnostic.truncated`, and `diagnostic.invalid_utf8`. Span attributes may additionally contain the bounded identity/correlation values needed to connect a run and capture. A structured log body may hold a correlation object with the run/capture identity, but never an object key, archive path, endpoint, exception text, raw child bytes, secret, or trace ID. Metrics accept only the enumerated dimensions below. Implement named builders for these attributes so arbitrary objects cannot flow into the SDK.

Emit stable event identities rather than testing prose. Preserve current B08 failure codes, and add success/admission/cancellation events only when needed for observable transitions. Do not record raw errors with `recordException`; set span status and stable failure code while retaining the original `cause` in the domain error chain. One representative test per policy class checks required and forbidden fields, not exact human wording.

Wrap SDK/exporter failure reporting in a process-wide latch. On the first construction, enqueue, export, force-flush, or shutdown failure, write exactly one fixed line through an injectable fallback, such as `backupd telemetry unavailable` or `strapid telemetry unavailable`. Do not include a cause, endpoint, record, or configuration value. Disable OpenTelemetry diagnostic output or route it through this same fixed latch so the SDK cannot print unfiltered errors. Keep typed causes available to an injected test observer, never to production output. Collector absence must not be checked at startup; OTLP exporters work asynchronously.

## Export Output Policy

Add `strapid/src/export-output.ts` as a pure, process-free byte-stream policy used by the existing B03/B04 `ExportOutput` callbacks. It maintains separate stdout and stderr assemblers and has these exact bounds per capture:

- retain at most 4,096 sanitized UTF-8 bytes for an emitted line;
- forward at most 512 output records and 512 KiB of sanitized output across both streams;
- retain only a small prefix-sized buffer after the emission cap so warning/error prefix counts remain bounded and detectable;
- emit one bounded dropped/truncated summary and no unbounded counters, arrays, or original bytes.

Handle arbitrary chunk boundaries, CRLF, a final unterminated line, split multibyte sequences, and invalid UTF-8. Decode a complete line with a fatal decoder; on failure, decode with replacement characters and mark `diagnostic.invalid_utf8 = true`. Remove ANSI CSI/OSC sequences and disallowed control characters, then redact before byte truncation and emission. Redact URI userinfo/query/fragment; authorization, bearer/basic, cookie/set-cookie, password/passwd, secret, token, API key, access/secret key, signature, credential, and `x-amz-*` assignments; JWT-like values; and opaque token-like strings of at least 32 characters. Preserve only enough punctuation to make the safe line useful. Tests own representative values and prove none survive.

After ANSI/control removal and leading whitespace, recognize only case-insensitive beginning-of-line `WARN`, `WARNING`, or `ERROR`, including bracketed forms and a normal delimiter. This classifies an advisory diagnostic, not a lifecycle failure. Forward unfamiliar stdout and stderr as `info`; stderr alone has no failure meaning. At output close, emit exactly one `strapid.export.attention` event for the capture if at least one recognized marker occurred, with only bounded warning/error presence and count categories. The capture, recovery, publication, and freshness results remain whatever B03-B08 established.

The callback installed into `CaptureCoordinatorOptions.output` catches every filtering or telemetry failure. It must never throw into `process-group.ts`. B09 does not read the Strapi workspace diagnostic file, archive, environment, or any process other than the current export child's stdout/stderr streams.

For each admitted capture, construct one output session before `runExport`, pass its two byte callbacks unchanged through the current supervisor boundary, and finalize it exactly once in `finally` after `runExport` settles. That settlement retains B03's existing callback-close contract: the direct child's `close` and confirmed process-group disappearance precede return. Finalization flushes the last unterminated lines and then emits the optional attention aggregate before the capture terminal observation is recorded. Filtering/finalization failure is caught and reported through the telemetry failure latch; it never replaces the already-authoritative export or recovery result.

## Traces, Logs, Metrics, Heartbeat, and Freshness

In `backupd`, create one `backup.run` root span for each run accepted by B07's single-flight gate. Manual/scheduled skips are lifecycle events but not full run traces. Use child spans for `preflight`, `capture`, `validation`, `publication`, `cleanup`, and `state`, starting only phases actually entered. A B07 restart resume of accepted pending publication creates a new root trace and correlates by the safe persisted run identity; never add trace context to durable state or reset its accepted-at/deadline.

Inject only `traceparent` and `tracestate` on the private B04 capture request. Add a narrow header-injection option to `backupd/src/capture-client.ts`; it may set only those two headers and cannot override content, framing, or protocol headers. Add a narrow context-extraction/runner seam to `strapid/src/capture-http.ts`; under the extracted remote parent, start `strapi.capture` and phase spans for `stop-serving`, `export`, and `recover-serving`. If the HTTP client disconnects, the independent B03 recovery uses the already-captured context until recovery concludes. No baggage is accepted or emitted.

Supervisor recovery evidence is independent from backup evidence. Record `strapid.recovery.outcome` for capture recovery and unexpected-serving-loss recovery with a bounded source and outcome. A successful backup does not imply a healthy supervisor except where B03 reported recovery; a later supervisor recovery does not convert an unknown/failed capture or publication into success.

Define low-cardinality metrics with seconds as the duration unit:

- `backupd.heartbeat`: observable gauge value `1`, no attributes, observed every 60 seconds;
- `backupd.snapshot.capture_time`: observable gauge containing Unix seconds for persisted `lastCompletedSnapshot.capturedAt`, no attributes, omitted when no snapshot is confirmed;
- `backupd.run.outcome`: counter with only enumerated `trigger` and `outcome`;
- `backupd.run.duration`: histogram with only enumerated `trigger` and `outcome`;
- `backupd.phase.duration`: histogram with only enumerated `phase` and `outcome`;
- `strapid.capture.outcome` and `strapid.capture.duration`: counter/histogram with bounded outcome only;
- `strapid.phase.duration`: histogram with bounded phase/outcome;
- `strapid.recovery.outcome`: counter with bounded source/outcome;
- `strapid.export.attention`: one counter addition per affected capture with `warning`, `error`, or `both`.

Do not attach run IDs, capture-window IDs, object keys, release IDs, timestamps, trace IDs, error text, endpoints, or arbitrary output to metric attributes. Implement exact enum-to-attribute maps and configure the reader's cardinality limit at 64 as defense in depth. Timing begins/ends in the observer for already-authoritative lifecycle transitions; it does not reproduce timeouts or make lifecycle assertions.

`backupd` initially loads freshness through `StateRepository.load()` without blocking daemon readiness, then refreshes its cache every 60 seconds. The B08 success observer updates the cache only after `recordPublishedSnapshot` has durably succeeded. A periodic load may reinforce or restore the persisted value after restart. On a state-read error, retain the last proven persisted value, report one bounded operational event, and never advance it from in-memory capture/publication claims. The heartbeat remains independent. B13 will later define the five-minute missing-heartbeat and 26-hour stale-snapshot alerts required by `BACKUP.md`.

## Narrow Interface Extensions and File Ownership

Keep the architecture and current public interfaces except for these neutral, optional extensions:

- In `backupd/src/backup-lifecycle.ts`, add a typed `BackupLifecycleObserver` with no-throw notifications for accepted run identity, phase start/end, terminal outcome, and durable freshness confirmation. Continue using current `BackupDaemonEvent` for stable lifecycle events. Invoke each observer through a safe wrapper after the authoritative transition; do not expose decision methods.
- In `backupd/src/main.ts`, construct telemetry, pass both the existing event sink and new observer, run the lifecycle in the root span context, start/stop freshness reporting, and close telemetry only after B08 domain shutdown work.
- In `backupd/src/capture-client.ts`, add the W3C header injection hook described above. It is transport metadata only, not a B04 wire-contract change.
- In `strapid/src/capture-coordinator.ts`, add optional `CaptureCoordinatorObserver` callbacks for admission, capture phase transitions, terminal result, and export-output close. Keep cancellation, the non-resetting deadline, and recovery ownership unchanged.
- In `strapid/src/strapi-supervisor.ts` or the existing supervisor-facing options type, add optional `SupervisorObserver` notifications for serving loss and recovery start/outcome. Do not move child control into telemetry.
- In `strapid/src/capture-http.ts`, extract W3C context at the private HTTP boundary and invoke capture under it; invalid/missing trace headers yield a fresh local context and never reject capture.
- In `strapid/src/main.ts`, construct telemetry and the output policy, connect the neutral observers, and close telemetry after child/socket cleanup.
- Add `strapid/src/export-output.ts`, `strapid/src/telemetry.ts`, and `backupd/src/telemetry.ts` as the new implementation modules.
- Update only `strapid/package.json`, `strapid/package-lock.json`, `backupd/package.json`, and `backupd/package-lock.json` for the exact dependencies above.

All observer methods and context/output hooks are optional with no-op defaults, so existing lower-boundary tests need no fake telemetry. Keep dependency interfaces structurally typed and inject clocks/exporters/fallbacks only where focused tests need them. Do not add a shared package, a general event bus, a new durable field, or telemetry concerns to B01-B07 domain modules that have no relevant boundary.

Use exact closed observer models so implementation does not expose arbitrary attributes:

    export type BackupObservedPhase =
      | "preflight"
      | "capture"
      | "validation"
      | "publication"
      | "cleanup"
      | "state";

    export type ObservedOutcome =
      | "succeeded"
      | "failed"
      | "cancelled"
      | "pending"
      | "expired";

    export interface BackupLifecycleObserver {
      runStarted(event: { trigger: RunLifecycleRequest["trigger"]; runId?: string }): void;
      runIdentified(event: { runId: string; captureWindowId?: string }): void;
      phaseStarted(event: { phase: BackupObservedPhase }): void;
      phaseFinished(event: { phase: BackupObservedPhase; outcome: ObservedOutcome; failureCode?: BackupDaemonEventCode }): void;
      freshnessConfirmed(event: { capturedAt: string }): void;
      runFinished(event: { outcome: RunLifecycleResult; failureCode?: BackupDaemonEventCode }): void;
    }

`runStarted` occurs as the admitted `runLifecycle` call begins; a fresh run is correlated later with `runIdentified` when B08 has created its run identity, while pending-publication resume supplies its persisted identity immediately. `freshnessConfirmed` occurs only after the durable freshness write. The implementation may make event fields individually named readonly types rather than inline objects, but it must not broaden their vocabulary.

Use corresponding closed `CaptureCoordinatorObserver` events for `admitted`, `phaseStarted`, `phaseFinished`, and `terminal`, where capture phases are exactly `preflight`, `stop-serving`, `export`, and `recover-serving`; and closed `SupervisorObserver` recovery events with source `capture` or `unexpected-serving-loss` and the current supervisor result mapped to a bounded outcome. Observers receive only current domain result types and safe identity, never a process environment, command line, workspace path, raw error, or child byte buffer. Optional methods are invoked through one shared no-throw helper in their owning module.

## Shutdown and Failure Ordering

`backupd` preserves B08's signal and absolute shutdown owner. On `SIGTERM` or `SIGINT`: stop signal admission and scheduler/timers; abort the active lifecycle; wait for existing B08 cleanup and coordinator idleness; stop freshness polling; then compute time remaining until B08's original deadline minus a 100 ms forced-exit margin. Run provider `forceFlush` calls in parallel with at most two seconds and provider shutdown calls in parallel under the remainder, with an overall telemetry cap of five seconds. If no safe time remains, skip telemetry close and use the fixed fallback. B08's forced exit remains authoritative and telemetry never starts a new hard timer beyond it.

`strapid` first stops capture admission/socket activity and completes B03 child/process-group shutdown. Only then stop telemetry and apply the same two-second flush/five-second total bound. Intentional shutdown still cannot restart serving. A telemetry hang or failure may lose telemetry but cannot leave a child alive or alter supervisor exit semantics.

For both applications, make `close()` idempotent. Prevent new telemetry records once closing begins. Use `Promise.allSettled` plus an outer monotonic deadline; do not let one provider prevent attempts to close the others. The OTLP exporter timeout and batch bounds are part of the proof, but the outer deadline is still necessary because trace/log shutdown have no timeout parameter. Tests use injected exporters that never callback/resolve to prove bounded return.

## Milestones

### Milestone 1: Pin and compose bounded providers

Add the exact dependencies and implement the two application-local provider factories, explicit resources, strict endpoint/protocol parsing, safe failure latch, bounded queues, enum field builders, and idempotent deadline-aware close. At this milestone, in-memory exporters prove records and resource identity, while unavailable/hung exporters prove non-blocking startup and bounded close.

### Milestone 2: Observe backup lifecycle and persisted freshness

Add the neutral B08 observer and use the existing event sink to produce run/phase traces, structured transition logs, low-cardinality metrics, heartbeat, and the persisted freshness gauge. Connect W3C injection in the existing capture client. Prove that publication plus durable-state confirmation—not advisory-free output or upload alone—is the only freshness transition.

### Milestone 3: Observe supervisor/capture lifecycle and filter export output

Implement the byte-stream filter, connect it to B03/B04 output ownership, add capture/supervisor observers, and extract W3C context at the private HTTP boundary. Prove that output cannot throw into child management, advisory messages produce exactly one attention event, unfamiliar output follows the same safe policy, and recovery evidence remains distinct from backup success.

### Milestone 4: Integrate shutdown and prove cross-boundary behavior

Place telemetry close after domain cleanup in both composition roots, bounded by B08's remaining deadline. Add only the integration evidence that cannot be owned by pure policy tests: cross-process trace propagation/advisory aggregation with fixture children, successful publication/freshness despite advisory output, and exporter failure isolation. Then run canonical validation and scope/residue audits.

## Test Strategy and Material Evidence

Unit tests start no processes. Use the Node test runner, in-memory OpenTelemetry exporters/readers or very small injected exporter doubles, injected monotonic clocks, and the existing ESM TypeScript conventions.

Add `strapid/test/export-output.test.ts` to cover chunk-split multibyte UTF-8, invalid bytes, CRLF/final lines, ANSI/OSC/control stripping, no-newline and overlong input, record/byte caps, every secret-redaction policy class, recognized prefix variants, unfamiliar stdout/stderr, and exactly one attention aggregate. Assert stable fields and absence of representative secrets, not exact Strapi prose.

Add focused telemetry unit tests in each package for strict endpoint/protocol parsing, resource fields, exact event/metric attribute allowlists, absence of IDs/keys/trace IDs from metric attributes, fixed enum cardinality, no-throw observer behavior, provider close idempotence, and a hung exporter returning before the injected bound. Test one representative SDK/export failure produces one fixed fallback even if later signals also fail. Verify error causes through an injected internal observer without emitting them.

Use in-memory exporters to establish the causal relationship `backup.run` -> backup phases -> remote-parent `strapi.capture` -> Strapi phases, and that resumed publication uses a new trace rather than persisted context. Test supervisor recovery as a separate event/metric source. These tests validate telemetry wiring only; reuse B03/B04/B08 tests for process exit, recovery health, capture deadlines, publication ordering, and lifecycle state transitions.

Add or narrowly extend one material integration scenario using only the existing task-owned Node fixture export child, private Unix socket, isolated staging/state, and isolated storage dependency. Have the fixture emit split recognized and unfamiliar lines containing representative secrets. Prove capture and B06 publication still succeed, durable freshness advances only after manifest confirmation/state write, safe output records contain no secret, and exactly one attention event is emitted. Do not start Strapi or require a prestarted stack.

For exporter-failure isolation, use a task-owned Node HTTP fixture bound to `127.0.0.1` on an OS-assigned ephemeral port: one case returns 503 and one withholds a response. With short injected bounds, prove domain success/freshness is unchanged, only one local fallback is emitted, queues remain bounded, and shutdown completes within the test allowance. Close servers, sockets, timers, readers, providers, and fixture children in `finally` blocks. Do not add smoke, E2E, deployment, frontend, or Strapi backend tests.

## Concrete Steps

1. From the exact B08 baseline, install the pinned dependencies with Mise/npm so each package manifest and lockfile agree:

       mise exec -- npm install --prefix strapid --save-exact @opentelemetry/api@1.10.0 @opentelemetry/context-async-hooks@3.0.0 @opentelemetry/core@3.0.0 @opentelemetry/resources@3.0.0 @opentelemetry/sdk-trace@3.0.0 @opentelemetry/sdk-metrics@3.0.0 @opentelemetry/sdk-logs@3.0.0 @opentelemetry/exporter-trace-otlp-proto@0.300.0 @opentelemetry/exporter-metrics-otlp-proto@0.300.0 @opentelemetry/exporter-logs-otlp-proto@0.300.0 @opentelemetry/semantic-conventions@1.44.0
       mise exec -- npm install --prefix backupd --save-exact @opentelemetry/api@1.10.0 @opentelemetry/context-async-hooks@3.0.0 @opentelemetry/core@3.0.0 @opentelemetry/resources@3.0.0 @opentelemetry/sdk-trace@3.0.0 @opentelemetry/sdk-metrics@3.0.0 @opentelemetry/sdk-logs@3.0.0 @opentelemetry/exporter-trace-otlp-proto@0.300.0 @opentelemetry/exporter-metrics-otlp-proto@0.300.0 @opentelemetry/exporter-logs-otlp-proto@0.300.0 @opentelemetry/semantic-conventions@1.44.0

2. Implement the explicit provider factories and unit-test their strict configuration, safe field vocabulary, no-throw failure path, and bounded close before connecting them to lifecycle code.

3. Add `BackupLifecycleObserver`, connect run/phase/freshness observations in B08's exact event ordering, and add capture-request W3C injection. Keep the current event/error callbacks behaviorally compatible.

4. Implement the pure export-output policy, then add the optional capture/supervisor observers and W3C extraction. Install the output callbacks at the current B04 ownership boundary, not in generic child-process code.

5. Compose telemetry in both `main.ts` files. In `backupd`, retain B08's one shutdown deadline. In `strapid`, retain B03's intentional-signal and child cleanup order. Verify telemetry construction cannot block startup.

6. Add the representative integration cases and run the focused package tests while iterating. Do not amend lower-level lifecycle tests merely to repeat already-owned assertions.

7. Run the complete canonical and audit commands below. Record actual results in `Progress` and `Outcomes & Retrospective`.

8. At the start of approved worker implementation and before production edits, add the relative link `.agents/plans/b09-instrument-backup-and-supervisor-outcomes.md` directly beneath B09 in `TODO.md`, leaving the checkbox unchecked. After implementation validation and independent reviewer approval, mark B09 checked as final queue bookkeeping. Stage only B09-owned files and create the expected commit; do not push unless separately directed.

## Validation and Acceptance

Run the repository's canonical tasks, not hand-written substitutes:

    mise exec -- npm ci --prefix strapid
    mise exec -- npm ci --prefix backupd
    mise run strapid:format
    mise run strapid:check
    mise run strapid:test
    mise run backupd:format
    mise run backupd:check
    mise run backupd:test

`backupd:test` retains B06's rootless ephemeral storage integration. It must provision its own dependency, publish any test port only on `127.0.0.1`, and require no shared stack. The new telemetry HTTP fixture follows the same loopback/ephemeral rule.

Audit exact dependency resolution and absence of unintended telemetry packages:

    mise exec -- npm ls --prefix strapid --depth=0
    mise exec -- npm ls --prefix backupd --depth=0
    rg -n 'sdk-node|sdk-trace-node|api-logs|auto-instrument' strapid/package.json backupd/package.json strapid/package-lock.json backupd/package-lock.json

The `rg` command should find no direct dependency owned by this task. Transitive lockfile text is acceptable only if `npm ls --depth=0` and the manifests prove it is not direct and package compatibility remains valid.

Audit scope and protected files without inspecting the Imagen directory:

    git status --short
    git diff --check
    git diff -- BACKUP.md backend frontend compose.yaml compose.yml docker-compose.yml docker-compose.yaml .github mise.toml mise-tasks
    git diff --name-only

The protected-file diff must be empty. The name list may contain only this plan; B09-owned `strapid`/`backupd` production and tests; their two manifests and lockfiles; and, after approval, the B09 `TODO.md` bookkeeping line. No backend, frontend, schema, Strapi version, Compose, image, CI/release, machine/user environment, or generated API artifact changes are authorized.

Audit build/test residue using explicit task paths and labels; never target a broad workspace directory:

    find strapid backupd -path '*/node_modules' -prune -o \( -name '*.js' -o -name '*.js.map' -o -name '*.tsbuildinfo' \) -print
    find /tmp -maxdepth 1 \( -name 'b09-*' -o -name 'b04-*' \) -print
    docker ps -a --filter label=us-alb.task=B06

No source-tree JavaScript/maps/tsbuildinfo, B09/B04 sockets or fixture roots, task-owned containers, live fixture children, HTTP servers, timers, or metric readers may remain. Existing `node_modules` and npm caches are expected dependency state, not generated artifacts to commit.

Acceptance is observable when:

- each admitted backup and its entered phases produce causally related traces, and capture carries W3C parent context to `strapid`;
- supervisor recovery evidence is distinct from backup lifecycle evidence;
- structured logs and export output obey the safe field/redaction/bounds policy, with exactly one advisory attention event per affected capture;
- recognized or unfamiliar export output does not change successful capture, publication, or freshness;
- metrics have only the enumerated bounded dimensions; heartbeat and persisted freshness are observed every 60 seconds without inventing freshness;
- Collector/exporter absence cannot block startup, corrupt/roll back completed work, or alter lifecycle results, and produces one safe local fallback;
- provider flush/shutdown is bounded inside existing application shutdown, including exporter hangs;
- all canonical validation and scope/residue audits pass.

## Idempotence and Recovery

Provider construction either returns a fully usable adapter or a disabled no-op adapter plus the once-only fallback; partial construction must close any already-created provider under a short injected bound. `close()` is idempotent. Freshness polling can restart from the durable state repository without a new schema or replay. Duplicate observer delivery can at worst emit duplicate non-authoritative telemetry; it can never repeat publication or mutate state.

The output policy is per-capture and discarded after output close, so it cannot leak attention state between runs. Pending-publication restart does not reuse trace context, reset a deadline, adopt staging, or change B07/B08 recovery. Re-running npm installation at the same exact versions is lockfile-idempotent. Tests allocate unique temporary directories, socket paths, and ephemeral loopback ports and clean exact owned resources in `finally` blocks.

If an implementation step fails, do not delete or reset user work. Correct the B09-owned files and rerun the lowest failed command, followed by the complete package canonical commands before handoff.

## Artifacts and Notes

The important implementation evidence is the two exact lockfiles, safe adapter/output unit tests, material integration tests, canonical command output, and the final scope/residue audit. No generated API artifacts apply because B09 changes neither backend nor frontend. Do not add README or standalone architecture documentation; this required ExecPlan is the durable design record.

Residual external prerequisites are explicit: B10 must include both applications and wire their telemetry identity/endpoint configuration; B11 must provide the Collector's OTLP HTTP receiver, authentication to remote telemetry backends, routing, retries, batching, and sampling while preserving B09 application semantics; B13 must provision Grafana data sources, queries, panels, and alerts, including missing heartbeat and stale persisted freshness. B09 cannot claim those live outcomes.

## Later-Task Boundaries and Commit Scope

B09 does not change capture deadlines/budgets, archive validation, object publication/reconciliation, schedule/state schema, lifecycle ordering, cleanup, or recovery. It does not add a latest pointer, pruning, storage credentials, Collector config, Grafana resources, Compose/image entrypoints, CI/release changes, content types, frontend code, backend code, or schema validation.

B10 owns image/Compose embedding and concrete environment wiring. B11 owns Collector transport policy; it must not duplicate B09's application field allowlist or promote unbounded body correlation values to labels. B12 owns operational restore/upgrade verification. B13 owns dashboard and alert query behavior. B09 only exposes stable low-cardinality signals those later tasks consume.

The final implementation commit may contain only:

- `.agents/plans/b09-instrument-backup-and-supervisor-outcomes.md`;
- B09-owned `strapid/src`, `strapid/test`, `backupd/src`, and `backupd/test` changes described above;
- `strapid/package.json`, `strapid/package-lock.json`, `backupd/package.json`, and `backupd/package-lock.json` for the exact pins;
- the approved B09 plan link/check bookkeeping in `TODO.md`.

Use commit title `B09 — Instrument backup and supervisor outcomes`. Do not commit or push during planning.

## Revision Notes

- 2026-10-29: Initial B09 ExecPlan created from the pushed B08 baseline. It records the official OpenTelemetry documentation and exact package/API audit, explicit-provider choice, application-owned safety/cardinality policy, narrow B03/B04/B08 hooks, shutdown proof, focused tests, validation, and later-task boundaries. No production, test, package, queue, or protected file was changed during planning.
- 2026-10-29: Worker implementation update: linked the unchecked queue item, pinned both package dependency sets, added explicit bounded providers and fail-open adapters, wired lifecycle/recovery/output/context observers, and added focused output, telemetry, propagation, freshness-ordering, shutdown-ordering, and hung-exporter evidence. Recorded the pinned `3.0.0` processor-constructor declaration correction and late-timeout discovery; full canonical validation and final audits remain to be recorded.
- 2026-10-29: Worker completion update: added the task-owned advisory export fixture and durable-freshness/shutdown-ordering assertions, remediated the fixture-only parallel timing allowance without changing production budgets, and recorded clean installs, exact dependency trees, 77 passing `strapid` tests, 143 passing `backupd` tests, and empty residue/protected-scope audits. B09 remains unchecked and no commit or push was made pending independent review.
- 2026-10-29: Remediation cycle 1 implementation update: addressed all six review findings at their owning boundaries, added deterministic adversarial/parser, observer-pairing, rejected-shutdown, freshness-generation, pending-phase/metric, and monotonic-polling evidence, and repeated the focused race set three times. Full post-remediation canonical validation and final audits remain to be recorded.
- 2026-10-29: Remediation cycle 1 completion update: recorded 45/45 repeated focused executions, clean installs, 81 passing `strapid` tests, 148 passing `backupd` tests, exact unchanged dependency trees, and empty artifact/process/container/protected/scope/staging audits. B09 remains unchecked and no staging, commit, or push occurred.
- 2026-10-29: Remediation cycle 2 implementation update: added the single no-throw daemon reporter and process-level late-failure/listener regression, added LF/CRLF control-parser resynchronization and split adversarial tests, and removed only the confirmed stale focused-runner process tree. Recorded 35/35 repeated focused executions; full clean-install/canonical/audit evidence remains to be recorded.
- 2026-10-29: Remediation cycle 2 completion update: recorded clean installs, 35/35 repeated focused executions, 82 passing `strapid` tests, 148 passing `backupd` tests, exact unchanged dependency trees, narrow stale-PID cleanup, and empty artifact/process/container/protected/scope/staging audits. B09 remains unchecked and no staging, commit, or push occurred.
- 2026-10-30: Coordinator finalization after independent review: recorded the reviewer's `APPROVED`/`REVIEW_READY` handoff for remediation cycle 2, closed review progress, finalized the outcome, and checked B09 in `TODO.md`. No implementation scope, technical decision, validation claim, or implementation file changed during this bookkeeping update.

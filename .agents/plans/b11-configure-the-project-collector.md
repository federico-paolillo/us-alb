# Configure the project Collector

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B11 — Configure the project Collector` in `TODO.md`. The repository root is `/home/codex/src/us-alb`, the active branch is `backup-system`, and the implementation baseline is pushed commit `c144fbe8a1454fb38ed6a76991d9c3b98e74ecf3` (B10). Do not switch branches. Keep `BACKUP.md` byte-for-byte unchanged. Preserve the unrelated untracked `.agents/skills/imagen/scripts/` directory without listing its contents, reading it, formatting it, staging it, or modifying it.

## Purpose / Big Picture

After B11, `backupd` and the backend-hosted `strapid` supervisor can send their existing OpenTelemetry traces, metrics, and structured logs to a Collector inside the application Compose project. The Collector receives only OTLP over HTTP on the private project-network endpoint `otel-collector:65103`, batches and samples signals, retries and queues failed exports, authenticates to Grafana Cloud, and forwards all three signal types over HTTPS. Operators place only the Grafana Cloud OTLP endpoint, instance ID, and access-policy token in the project-local `.env`; none of those values enters an application container or the committed YAML.

The feature is visible without a live Grafana account. The exact pinned Collector image must accept the project-owned `otel-config.yml` through its native `validate` command when supplied obvious non-secret placeholders, and both development and production Compose definitions must render quietly with `.env.example`. A focused existing configuration-boundary integration test must prove the Collector's exact image, three-setting environment allowlist, read-only configuration mount, private networking, and absence from every application dependency chain. Live Grafana delivery and Grafana-side alerts remain external prerequisites.

## Progress

- [x] (2026-10-30 06:10Z) Confirmed `backup-system`, `HEAD`, and `origin/backup-system` are all at pushed B10 commit `c144fbe8a1454fb38ed6a76991d9c3b98e74ecf3`, with only the protected unrelated Imagen directory untracked.
- [x] (2026-10-30 06:10Z) Read the complete `TODO.md` preamble and B11 item, all of unchanged `BACKUP.md`, root and frontend `AGENTS.md`, `.agents/docs/PLANS.md`, the B01-B10 plans and relevant implementation, and the `implement-task` and `canonical-validation` skills.
- [x] (2026-10-30 06:10Z) Used Context7 as required to resolve current official OpenTelemetry Collector, Collector Contrib, Docker Compose, and Grafana Cloud documentation; checked current official release and image metadata where the documentation corpus contained older examples.
- [x] (2026-10-30 06:10Z) Resolved and inspected the exact official multi-platform image, its runtime identity/entrypoint/default configuration contract, the sole private receiver, all processors/exporter/authentication/queue settings, service-specific environment mapping, Compose independence, native validation, security boundaries, and B12/B13 ownership.
- [x] (2026-10-30 06:10Z) Proved the complete proposed YAML graph with `otelcol-contrib` 0.164.0's native `validate` command and non-secret placeholders; validation exited zero without contacting Grafana Cloud.
- [x] (2026-10-30 06:15Z) Added the project-owned `otel-config.yml` with the exact validated receiver, processors, exporter, authentication extension, and three signal pipelines from this plan.
- [x] (2026-10-30 06:15Z) Added the identical Collector service boundary to `compose.yml` and `compose.prod.yml`, and added only its three non-secret placeholder settings to `.env.example`.
- [x] (2026-10-30 06:15Z) Extended the existing Compose configuration-boundary integration test for the Collector without adding a second YAML parser or duplicating native configuration validation.
- [x] (2026-10-30 06:15Z) Ran the focused integration test, canonical backupd check and full test suite, native Collector validation, both quiet Compose renders, image/runtime inspection, protected-file and scope audits, and `git diff --check`; all final validation passed.
- [x] (2026-10-30 06:20Z) Independent review returned `APPROVED` and `REVIEW_READY`; the coordinator linked this plan and checked B11 as approved queue bookkeeping.

## Surprises & Discoveries

- Observation: Context7's versioned Collector Contrib result currently tops out at 0.141.0, while the current official Collector release repository publishes 0.164.0; the Contrib source repository has a 0.164.1 patch tag but there is no official `otel/opentelemetry-collector-contrib:0.164.1` image.
  Evidence: The official release page identifies 0.164.0 as the current distribution release, `docker buildx imagetools inspect otel/opentelemetry-collector-contrib:0.164.0` resolves successfully, and the same command for 0.164.1 reports `not found`. This plan pins the available official distribution rather than a source-only tag or `latest`.

- Observation: The official 0.164.0 image already runs as a dedicated nonroot identity and carries its own executable and default configuration path.
  Evidence: Image inspection reports `User` `10001:10001`, `Entrypoint` `/otelcol-contrib`, and `Cmd` `--config /etc/otelcol-contrib/config.yaml`; `/otelcol-contrib --version` reports 0.164.0. B11 must mount the file at that supported path and must not replace the user, wrap the image, or impose project-image filesystem hardening.

- Observation: The image metadata declares its upstream default ports 4317, 4318, and 55679 even though B11's project configuration enables none of those listeners.
  Evidence: Image inspection shows those inert `ExposedPorts`. Docker image exposure metadata does not publish a host port or create a listener. `otel-config.yml` enables only OTLP/HTTP on 65103 and disables the Collector's internal metrics listener; Compose declares no `ports`, host networking, or additional receiver.

- Observation: The existing application endpoint is already fixed and fail-open.
  Evidence: B10 maps `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:65103` and `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` into backend and backupd. B09 validates an origin-only endpoint, appends `/v1/traces`, `/v1/metrics`, and `/v1/logs`, exports asynchronously, emits one fixed local error on telemetry failure, and leaves domain startup, recovery, publication, durable state, and cleanup unchanged.

- Observation: Application SDK batch processors and the Collector's deployment-level batching have different responsibilities.
  Evidence: B09's bounded application processors decouple domain work from OTLP I/O and make failure fail-open. B11's `batch` processor combines already received OTLP data before Grafana transport and its exporter owns transport retries and the sending queue. The Collector does not recreate application filtering, cardinality, or event semantics.

- Observation: Making the existing `app` network Docker-internal would prevent the Collector from reaching Grafana Cloud.
  Evidence: Current Compose uses one project-scoped bridge network for application DNS and outbound access. Private reception is achieved by omitting host `ports`, not by setting `networks.app.internal: true`; the latter would contradict required HTTPS egress.

- Observation: Docker Compose renders the short read-only bind with an empty `bind` metadata object and resolves its source to an absolute path.
  Evidence: The first focused-test run showed `bind: {}` and `/home/codex/src/us-alb/otel-config.yml`. The durable test therefore asserts the planned stable boundary directly: one bind, exact repository-root source, supported target, and `read_only: true`, without coupling to incidental empty renderer metadata.

## Decision Log

- Decision: Pin `otel/opentelemetry-collector-contrib:0.164.0@sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b` identically in both Compose files.
  Rationale: The version is the current official Collector distribution release, and the digest is its official multi-platform manifest, with Linux architecture selection left to Docker. The Contrib distribution supplies the basic-auth extension and probabilistic sampler in addition to core OTLP reception, batching, and OTLP/HTTP export. A tag-plus-digest reference is reproducible and avoids mutable `latest`.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Follow the third-party image's runtime contract unchanged: retain UID/GID `10001:10001`, `/otelcol-contrib`, and `/etc/otelcol-contrib/config.yaml`; add no `user`, custom command, wrapper image, `read_only`, capability, tmpfs, or writable-volume override.
  Rationale: The repository's distroless/read-only hardening applies to project-owned images, while B11 explicitly requires the supported third-party runtime. The Collector needs only a read-only bind mount of the configuration file. There is no application-data, Docker socket, host-log, journal, or persistent-queue mount.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Enable exactly one receiver, `otlp` with only its HTTP protocol bound to `0.0.0.0:65103`, and disable Collector self-metrics with `service.telemetry.metrics.level: none`.
  Rationale: B09 clients use OTLP/HTTP protobuf and B10 already targets service DNS at port 65103. Binding all container interfaces makes the receiver reachable on the project bridge, while the absence of Compose `ports` keeps it inaccessible from the host. Omitting gRPC, file, host, journal, and Docker receivers avoids unused listeners and duplicate stdout ingestion. Disabling the default self-metrics endpoint leaves 65103 as the sole network listener configured by this project.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use one `probabilistic_sampler` processor with `sampling_percentage: 100` before `batch` in the traces pipeline; use only `batch` for metrics and logs.
  Rationale: Sampling is a Collector transport policy, not an application semantic rule. This small operational workload initially retains every trace so rare capture/recovery failures are not randomly discarded, while the explicit processor centralizes the policy for later evidence-based calibration. Metrics and logs, including heartbeat, freshness, outcomes, and advisory events, must not be sampled because B13's alerts depend on their presence.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Configure `batch` with a five-second timeout, preferred batch size 1024, and maximum batch size 2048.
  Rationale: These bounded values reduce request overhead without creating long buffering delays for prompt failure and recovery evidence. They are Collector transport behavior and do not replace the applications' bounded fail-open SDK buffers.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Use one `otlphttp/grafana_cloud` exporter with a ten-second per-attempt timeout, retry enabled at 5-second initial/30-second maximum intervals for at most five minutes, and an in-memory sending queue of 1000 requests with two consumers.
  Rationale: The Collector, not either application, owns Grafana transport, retry, and queue behavior. A bounded in-memory queue is sufficient because telemetry loss on Collector crash is explicitly tolerated and detected through missing remote series; no requirement makes telemetry a durable backup artifact. Avoiding `file_storage` avoids an unnecessary writable volume and ownership protocol. None of these retry windows can delay Strapi startup, backup completion, or durable snapshot state.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Authenticate the OTLP/HTTP exporter through `basicauth/grafana_cloud`, with endpoint `${env:GRAFANA_CLOUD_OTLP_ENDPOINT}`, username `${env:GRAFANA_CLOUD_INSTANCE_ID}`, and password `${env:GRAFANA_CLOUD_API_KEY}`.
  Rationale: This is Grafana Cloud's documented Collector configuration. The endpoint is the stack's unified HTTPS OTLP endpoint ending in `/otlp`; the instance ID is the Basic Auth username; a least-privilege access-policy token with OTLP write scopes is the password. The committed YAML contains only environment references and no credential or deployment endpoint.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Pass exactly the three `GRAFANA_CLOUD_*` variables from the single project-local `.env` into `otel-collector`, require each through Compose interpolation, and pass none of them to backend, backupd, frontend, or gateway.
  Rationale: These are the only deployment-specific Collector values. B10 already replaced whole-file environment distribution with per-service allowlists. Sampling, batching, retry, receiver port, and configuration path are project-owned policy and therefore remain in committed Compose/YAML rather than becoming extra deployment variables.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Put `otel-collector` only on the existing project-scoped `app` bridge, give it `restart: unless-stopped`, publish no host port, and define no `depends_on` in either direction.
  Rationale: The bridge supplies private service DNS and required outbound HTTPS. The restart policy recovers a crash while respecting an intentional stop. Backend and backupd already export asynchronously and must start and operate if the Collector is absent or failing; the Collector also needs no application readiness gate.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Keep application-field safety entirely in B09 and include no `filter`, `transform`, `attributes`, `resource`, routing-by-field, or relabeling processor in `otel-config.yml`.
  Rationale: B09 owns secret filtering, allowed structured fields, metric cardinality, correlation placement, advisory aggregation, and event meaning. B11 owns only signal pipeline routing and transport policy. Repeating field allowlists in the Collector would create a second authority and could silently diverge.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Extend `backupd/test/compose-config.integration.test.ts` for the new deployment boundary, but use the Collector binary itself as the sole validator of `otel-config.yml`.
  Rationale: The existing integration test is already the authoritative cross-service environment/mount/dependency assertion and must be updated because it pins the complete service set. Native Collector validation proves YAML schema, component availability, environment expansion, authentication wiring, and pipeline references more strongly than a bespoke YAML parser. Tests must not duplicate that work.
  Date/Author: 2026-10-30 / Codex planner

## Outcomes & Retrospective

B11 implementation is complete and ready for independent review. The repository now has one digest-pinned third-party Collector with one private OTLP/HTTP listener, 100-percent initial trace sampling, bounded batching and in-memory retry queues, Grafana Cloud basic authentication, and strict three-setting credential isolation. Both Compose definitions carry the same independent service with no host publication or dependency edge; application environment, volumes, health, dependency, and read-only boundaries remain unchanged. The applications remain authoritative for safe fields and event meaning, and neither their startup nor backup authority depends on telemetry.

The focused configuration test passed both Compose variants. `mise run backupd:check` passed Biome and strict TypeScript checking, and `mise run backupd:test` passed all 150 tests with zero failures, skips, or todos. The exact digest-pinned image accepted `otel-config.yml` through `validate`, both `.env.example` Compose renders exited quietly, and selected inspection confirmed user `10001:10001`, entrypoint `/otelcol-contrib`, default configuration command, and version 0.164.0. Scope, protected-file hashes, task-residue inspection, and `git diff --check` passed. Live Grafana delivery, external credentials, alerting, deployment, queue bookkeeping, commit, and push remain intentionally outside worker scope; independent review is the only remaining B11 workflow step.

Independent review approved B11 with no findings after reproducing the exact image/runtime contract, native configuration validation, both quiet Compose renders, 2/2 boundary tests, `backupd:check`, 150/150 backupd tests, Collector-only credentials, dependency isolation, protected scope, and zero task residue. Live Grafana delivery and Grafana-side alerting remain external B13 prerequisites.

## Context and Orientation

The repository deploys two Compose definitions. `compose.yml` builds the project-owned backend, backupd, and frontend images for local/development use. `compose.prod.yml` runs immutable released images. Both files currently define backend, backupd, frontend, and gateway services on one project-scoped bridge named `app`; only gateway publishes a host port, at loopback `127.0.0.1:65102`. B11 must add the same Collector service to both files so their runtime contracts do not diverge.

The backend container runs `strapid`, which supervises the Strapi serving/export children and emits recovery/capture telemetry. The separate `backupd` container emits scheduling, lifecycle, publication, heartbeat, and freshness telemetry. B09 implemented both clients with official OpenTelemetry JavaScript SDKs and three OTLP/HTTP protobuf exporters. B10 gives both containers the fixed base endpoint `http://otel-collector:65103`. Each client constructs the three standard paths under that origin. They do not carry Grafana credentials and do not synchronously probe the Collector.

`backupd/test/compose-config.integration.test.ts` invokes `docker compose config --format json` for both Compose files using a controlled placeholder environment. It asserts complete service environment allowlists, named-volume boundaries, dependency/health rules, restart/read-only policy, networks, forbidden mounts, and host publications without printing environment values. The test currently expects exactly four services and forbids any `GRAFANA_` key because B10 deliberately deferred the Collector. B11 must update this existing owner rather than create a parallel test.

The root `.env.example` is the non-secret template for the single project-local `.env`. Compose reads that file for interpolation but passes only explicitly mapped keys into each service. Add the three Grafana Cloud values in a Collector-only section. An “instance ID” is the numeric or textual username shown on the Grafana Cloud OpenTelemetry connection page; an “access-policy token” is the secret used as the HTTP Basic Auth password. Neither belongs in committed YAML or validation output.

An OTLP receiver accepts OpenTelemetry Protocol requests. An exporter sends accepted signals to the remote observability service. A processor changes transport behavior between those points. In this plan, the sampler makes the trace-retention decision, while the batch processor groups records. A sending queue holds exporter requests in memory while the exporter retries transient failures. It is intentionally not backup storage and is lost if the Collector process is destroyed.

## Interfaces and Dependencies

Create repository-root `otel-config.yml` with exactly this component graph and policy. Keep the environment expressions literal; do not replace them with example or live values.

    receivers:
      otlp:
        protocols:
          http:
            endpoint: 0.0.0.0:65103

    processors:
      probabilistic_sampler:
        sampling_percentage: 100
      batch:
        timeout: 5s
        send_batch_size: 1024
        send_batch_max_size: 2048

    exporters:
      otlphttp/grafana_cloud:
        endpoint: ${env:GRAFANA_CLOUD_OTLP_ENDPOINT}
        auth:
          authenticator: basicauth/grafana_cloud
        timeout: 10s
        retry_on_failure:
          enabled: true
          initial_interval: 5s
          max_interval: 30s
          max_elapsed_time: 300s
        sending_queue:
          enabled: true
          num_consumers: 2
          queue_size: 1000

    extensions:
      basicauth/grafana_cloud:
        client_auth:
          username: ${env:GRAFANA_CLOUD_INSTANCE_ID}
          password: ${env:GRAFANA_CLOUD_API_KEY}

    service:
      extensions: [basicauth/grafana_cloud]
      telemetry:
        metrics:
          level: none
      pipelines:
        traces:
          receivers: [otlp]
          processors: [probabilistic_sampler, batch]
          exporters: [otlphttp/grafana_cloud]
        metrics:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlphttp/grafana_cloud]
        logs:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlphttp/grafana_cloud]

Add this service shape, unchanged, to `compose.yml` and `compose.prod.yml`:

    otel-collector:
      image: otel/opentelemetry-collector-contrib:0.164.0@sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b
      environment:
        GRAFANA_CLOUD_OTLP_ENDPOINT: ${GRAFANA_CLOUD_OTLP_ENDPOINT:?GRAFANA_CLOUD_OTLP_ENDPOINT is required}
        GRAFANA_CLOUD_INSTANCE_ID: ${GRAFANA_CLOUD_INSTANCE_ID:?GRAFANA_CLOUD_INSTANCE_ID is required}
        GRAFANA_CLOUD_API_KEY: ${GRAFANA_CLOUD_API_KEY:?GRAFANA_CLOUD_API_KEY is required}
      restart: unless-stopped
      volumes:
        - ./otel-config.yml:/etc/otelcol-contrib/config.yaml:ro
      networks:
        - app

Do not add `ports`, `expose`, `depends_on`, `env_file`, Compose secrets, `read_only`, `user`, `command`, `entrypoint`, `healthcheck`, `privileged`, `network_mode`, a named volume, or a host log/journal/Docker mount. The upstream command already loads the mounted path. The applications reach port 65103 through project DNS without a published or declared exposed port.

Add these obvious placeholders to `.env.example` under a Collector-only comment:

    GRAFANA_CLOUD_OTLP_ENDPOINT=https://otlp-gateway.example.invalid/otlp
    GRAFANA_CLOUD_INSTANCE_ID=replace-with-grafana-cloud-instance-id
    GRAFANA_CLOUD_API_KEY=replace-with-grafana-cloud-access-policy-token

The real endpoint must be the unified OTLP HTTPS endpoint copied from the target Grafana Cloud stack. The real access-policy token must carry the required OTLP write scopes. B11 does not provision or verify those external values.

## Plan of Work

### Milestone 1: Add the Collector's project-owned transport policy

Create `otel-config.yml` beside the two Compose files using the exact configuration above. This file must have one OTLP/HTTP receiver on 65103, one trace sampler, one shared batch processor, one authenticated OTLP/HTTP exporter with bounded retry and queue behavior, and traces/metrics/logs pipelines. It must not receive stdout, files, the journal, Docker events, host metrics, or gRPC; scrape application or Collector endpoints; define a field allowlist; promote correlation values to labels; or add Grafana-side alert semantics.

At this milestone, validate the file with the exact pinned image and non-secret placeholders. The native command must exit zero with no output required and without starting the Collector or contacting Grafana. If the image rejects any field, treat its current schema and documented component contract as authoritative, update this living plan before implementation, and preserve the ownership decisions rather than silently deleting required batching, retry, queue, sampling, or authentication behavior.

### Milestone 2: Wire an independent private Compose service

Edit both `compose.yml` and `compose.prod.yml` with the identical service definition above. Mount only repository-root `otel-config.yml` at the image's supported default path and make that bind read-only. Keep the service on `app` with outbound access and no host publication. Do not make backend, backupd, frontend, or gateway depend on it; do not make it depend on backend. Preserve backend's existing healthcheck and backupd's sole healthy-backend dependency exactly.

Edit `.env.example` with the three Collector-only placeholders. Do not rename the existing application OTLP variables or add Grafana values to any application mapping. Do not add a general `OTEL_EXPORTER_OTLP_HEADERS`, because Grafana authentication belongs only to the Collector's exporter. Quietly render both Compose files with `.env.example` and expect success without exposing resolved values.

At the end of this milestone, stopping or failing `otel-collector` changes only telemetry delivery. Backend startup has no dependency edge to it, `strapid` continues recovery independently, backupd retains publication and state authority, completed remote manifests remain valid, and the apps' B09 fail-open exporters may emit only their fixed local operational line. No volume or credential crosses from the Collector into an application service.

### Milestone 3: Extend the existing configuration trust-boundary evidence

Edit `backupd/test/compose-config.integration.test.ts`. Add the three safe Grafana placeholders to its controlled `environment` object. Extend `ComposeService` only with the `image` and `user` properties needed for the new assertions. Keep `docker compose --env-file /dev/null ... config --format json`, in-memory parsing, and secret-free failure messages.

Update the exact service set to include `otel-collector`. Add a `collectorEnvironment` allowlist containing only `GRAFANA_CLOUD_API_KEY`, `GRAFANA_CLOUD_INSTANCE_ID`, and `GRAFANA_CLOUD_OTLP_ENDPOINT`. Assert the rendered image is the exact tag-plus-digest reference; its environment keys are exactly that allowlist; it has `restart: unless-stopped`; it is only on `app`; it has no `depends_on`, ports, tmpfs, named volume, `env_file`, Compose secret, privileged or host namespace; and it deliberately has no project `read_only`/user override. Assert its sole mount is a bind from repository-root `otel-config.yml` to `/etc/otelcol-contrib/config.yaml` with `read_only: true`.

Replace B10's temporary assertion that no service has a `GRAFANA_` key with the durable rule that only `otel-collector` has any such key and that its exact key set is the three-setting allowlist. Retain every existing backend, backupd, frontend, gateway, volume, network, health, dependency, and loopback-port assertion. Explicitly preserve that backend has no dependency on the Collector, backupd depends only on healthy backend, and no application receives Collector credentials or configuration mounts.

Do not parse `otel-config.yml` in TypeScript, assert YAML text, open a network listener, start the Compose stack, or add an OTLP/Grafana fake. The selected Collector's native validator owns component and pipeline correctness. The Compose test owns cross-service credential, mount, network, and dependency isolation.

## Concrete Steps

Work from `/home/codex/src/us-alb`. Before editing, reconfirm the baseline and protected unrelated state:

    git branch --show-current
    git rev-parse HEAD
    git status --short

Expect `backup-system`, `c144fbe8a1454fb38ed6a76991d9c3b98e74ecf3` before task edits, and only `?? .agents/skills/imagen/scripts/`. Never expand or inspect that path.

Create or edit only `otel-config.yml`, `compose.yml`, `compose.prod.yml`, `.env.example`, `backupd/test/compose-config.integration.test.ts`, and this living plan. Use the exact definitions in this plan. Do not use a live `.env` for validation.

Run the focused configuration-boundary test first:

    mise exec -- node --test backupd/test/compose-config.integration.test.ts

Expect both Compose-file subtests to pass with zero failures, skips, and todos. Assertion errors may name services, setting names, mounts, or policies, but must not print resolved environment values.

Validate the Collector configuration with the same digest-pinned image Compose uses:

    docker run --rm \
      --env GRAFANA_CLOUD_OTLP_ENDPOINT=https://otlp-gateway.example.invalid/otlp \
      --env GRAFANA_CLOUD_INSTANCE_ID=instance-placeholder \
      --env GRAFANA_CLOUD_API_KEY=token-placeholder \
      --mount type=bind,src="${PWD}/otel-config.yml",dst=/etc/otelcol-contrib/config.yaml,readonly \
      otel/opentelemetry-collector-contrib:0.164.0@sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b \
      validate --config=/etc/otelcol-contrib/config.yaml

Expect exit status zero. This command parses and resolves the complete graph but does not run pipelines or attempt live delivery.

Render both Compose definitions quietly from the non-secret template:

    docker compose --env-file .env.example --file compose.yml config --quiet
    docker compose --env-file .env.example --file compose.prod.yml config --quiet

Expect both commands to exit zero and print no rendered configuration. Do not use non-quiet output because it would render credential-shaped values in a real deployment.

Inspect only selected non-secret image metadata and version:

    docker image inspect \
      otel/opentelemetry-collector-contrib:0.164.0@sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b \
      --format 'user={{.Config.User}} entrypoint={{json .Config.Entrypoint}} command={{json .Config.Cmd}}'
    docker run --rm \
      otel/opentelemetry-collector-contrib:0.164.0@sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b \
      --version

Expect user `10001:10001`, entrypoint `["/otelcol-contrib"]`, command `["--config","/etc/otelcol-contrib/config.yaml"]`, and version `0.164.0`. Do not dump the complete image inspection document.

Run canonical validation for the only package whose integration test changed:

    mise run backupd:check
    mise run backupd:test

Expect Biome and strict TypeScript checks to pass and the complete native backupd suite, including the focused Compose integration and isolated storage integration, to report zero failures. Record actual counts rather than editing tests to match an estimate. Clean only task-owned resources if a test is interrupted; never use broad container, process, volume, or filesystem cleanup.

Finish with scope and formatting audits:

    git diff --check
    git diff --name-only
    git diff --exit-code -- BACKUP.md AGENTS.md frontend/AGENTS.md backend frontend .github mise.toml backupd/package.json backupd/package-lock.json strapid/package.json strapid/package-lock.json
    git status --short

Before coordinator bookkeeping, the combined tracked-diff and short-status task paths may include only `.agents/plans/b11-configure-the-project-collector.md`, `.env.example`, `backupd/test/compose-config.integration.test.ts`, `compose.yml`, `compose.prod.yml`, and `otel-config.yml`, in addition to the preserved unrelated untracked directory. Remember that `git diff --name-only` omits untracked files, so use `git status --short` to account for the new plan and configuration. `BACKUP.md`, application production code, dependencies, lockfiles, workflows, generated API artifacts, and the protected unrelated directory must remain untouched.

## Validation and Acceptance

B11 is acceptable when the pinned Collector's native validator accepts `otel-config.yml` with non-secret placeholders. The enabled graph must have one OTLP/HTTP receiver at port 65103; trace sampling followed by batch; metric and log batch; one authenticated Grafana Cloud OTLP/HTTP exporter; and explicit bounded retry and sending-queue behavior. There must be no second receiver that reads application stdout, files, Docker logs, the journal, host metrics, or another OTLP protocol.

Both Compose definitions must render quietly from `.env.example`. Their Collector definitions must be identical, digest-pinned, configured only through the three required Grafana values, and mounted to the image's default configuration path read-only. There must be no host port, host namespace, privileged mode, Docker socket, host log mount, application data/state/staging/coordination volume, or custom project-image hardening. The configured receiver is reachable only through the project bridge at `otel-collector:65103`; the Collector retains outbound HTTPS access.

The updated integration test must prove that only the Collector receives `GRAFANA_CLOUD_*`; every existing service retains its prior exact environment and storage boundary; backend does not depend on backupd or Collector; backupd still depends only on healthy backend; and the Collector has no dependency edge. Combined with B09's already-owned fail-open telemetry tests, this demonstrates that Collector loss cannot block Strapi startup, alter recovery, roll back durable state, delete staging, or invalidate a confirmed remote manifest. Do not add a duplicate lifecycle or startup test in B11.

The configuration must contain no application field allowlist or transformation. Run IDs, object keys, trace IDs, safe log fields, metric dimensions, severity interpretation, secret filtering, and one-attention-event aggregation remain exactly as B09 emits them. The Collector may route by signal pipeline but must not reinterpret those fields or promote them to labels.

Live Grafana delivery is not local acceptance. Do not place real endpoint or credentials in commands, bring up a long-running Collector against Grafana, create dashboards or alert rules, claim delivery, or weaken native validation because external values are absent. B13 records the external connection, queries, thresholds, No Data behavior, and notification routing.

No backend or frontend source changes occur, so Strapi startup, OpenAPI generation, frontend build/check/test, and generated artifact refresh are not applicable. No project image changes occur, so project image builds are not applicable. The third-party image's native validator, version/runtime inspection, Compose rendering, configuration-boundary integration, and canonical backupd package validation are the lowest stable boundaries for this task.

## Idempotence and Recovery

All edits are declarative and safe to reapply. Native Collector validation and Compose rendering are read-only. Re-running the integration/canonical tests may recreate only their existing task-owned temporary files or isolated dependency container; the test suite owns cleanup. The Collector image pull may remain in the local Docker cache and is not a deployment.

If native validation fails, first compare the error against the exact 0.164.0 component schema and verify all three placeholder variables were supplied. Do not remove authentication, retry, queue, batch, or sampling merely to obtain a zero exit. Update this living plan with the discovered supported spelling or setting and rerun validation. Do not switch to `latest`, an unpinned image, Grafana Alloy, a custom Collector build, or another distribution without returning the material design change for review.

If Compose rendering fails, use `.env.example`, not a live `.env`, and correct only the named missing placeholder or structural error. Never print a rendered real deployment or use `docker compose up` as validation. If the focused test fails after an intentional boundary change, update its exact allowlists and assertions in the same edit; do not loosen it to substring checks or value dumps.

No data migration, destructive operation, or rollback command is required. Before review, remove only task-owned temporary containers/resources confirmed by exact name or label. Do not delete named production volumes, images, broad Docker state, repository files, or the unrelated untracked directory.

## Artifacts and Notes

The researched image contract is:

    image:      otel/opentelemetry-collector-contrib:0.164.0
    digest:     sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b
    user:       10001:10001
    entrypoint: /otelcol-contrib
    command:    --config /etc/otelcol-contrib/config.yaml
    validator:  /otelcol-contrib validate --config=/etc/otelcol-contrib/config.yaml

The expected signal path is:

    backupd or strapid
      -> OTLP/HTTP protobuf on app-network otel-collector:65103
      -> trace: probabilistic_sampler(100%) -> batch
         metric/log: batch
      -> bounded in-memory sending queue and retry_on_failure
      -> otlphttp with Collector-only Basic Auth
      -> Grafana Cloud unified OTLP HTTPS endpoint

Retain concise evidence only: the native validator's zero exit, both quiet Compose render exits, selected image runtime fields/version, focused/full test pass counts, exact environment key names by service, the Collector mount target/read-only flag, no-port/no-dependency booleans, protected-file equality, and final changed-path list. Never retain a real endpoint, instance ID, token, authorization header, complete environment map, non-quiet Compose output, application content, archive data, or signed URL.

## B12 and B13 Boundaries

B11 creates the repository configuration and makes both Compose definitions complete. It does not edit `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, release actions, build contexts, image publication, attestations, provenance, SBOMs, or deployment bundles. B12 owns running the established validation in CI where appropriate, publishing backupd, and ensuring `compose.yml`, `compose.prod.yml` where applicable, and `otel-config.yml` travel together through the repository's deployment delivery mechanism. B11 must not redesign that mechanism.

B11 does not provision a Grafana Cloud stack, generate or rotate an access-policy token, perform live OTLP delivery, create dashboards, import alert rules, or select notification channels. B13 owns the operator handoff with exact application signal names and queries, one-minute heartbeat/five-minute missing-heartbeat behavior, 26-hour freshness threshold, prompt failure/upload-exhaustion and highest-priority recovery alerts, per-run advisory notification, absent-series and No Data handling, and explicit live-delivery prerequisite. B11 supplies only the transport needed for that later work.

B11 does not change B09's telemetry SDKs, filtering, event fields, cardinality, correlation, application buffers, fallback lines, or shutdown semantics; B10's project images, volumes, entrypoints, healthcheck, source identity, release attribution, frontend version, or public gateway; the backup lifecycle, storage publication, state, schedule, Strapi schema/content/bootstrap, Next.js SSR/ISR/CMS pipeline, README, machine/user environment, or host services.

The worker-owned implementation scope is limited to the files named in `Concrete Steps`. The worker must not edit `TODO.md`, stage, commit, or push. After `WORK_READY`, independent review must reproduce the material native/configuration boundary evidence. Only after `APPROVED` and `REVIEW_READY` may the coordinator update this plan for review evidence, link/check B11 in `TODO.md`, stage only B11 changes and bookkeeping, commit with exact title `B11 — Configure the project Collector`, and push to `origin/backup-system`.

Revision note (2026-10-30 / Codex planner): Created the initial self-contained B11 ExecPlan from pushed B10 commit `c144fbe8a1454fb38ed6a76991d9c3b98e74ecf3`. Context7 and current official release/image inspection resolved the digest-pinned Collector Contrib 0.164.0 runtime, one private OTLP/HTTP listener, lossless initial trace sampling, bounded batch/retry/in-memory queue policy, Grafana Cloud Basic Auth environment mapping, application-field ownership boundary, fail-open Compose dependency graph, native validation, focused configuration evidence, and B12/B13 boundaries. The exact proposed graph passed the selected image's native validator with non-secret placeholders. No production, test, queue, design, protected, or unrelated file was changed during planning.

Revision note (2026-10-30 / Codex worker): Implemented the approved Collector graph, identical private Compose services, Collector-only example settings, and existing configuration-boundary integration coverage. Recorded the Compose renderer's stable bind shape, final focused and canonical test results, native digest-pinned validation, quiet rendering, selected runtime inspection, and scope/protected/residue audits. No design deviation, live external write, dependency change, queue bookkeeping, commit, push, or deployment occurred.

Revision note (2026-10-30 / Codex coordinator): Recorded the independent reviewer's no-finding `APPROVED`/`REVIEW_READY` handoff, closed review progress, finalized the outcome with independently reproduced evidence, linked this plan under B11 in `TODO.md`, and checked the task. No implementation scope, technical decision, validation claim, or implementation file changed during this bookkeeping update.

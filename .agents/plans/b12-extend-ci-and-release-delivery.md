# Extend CI and release delivery

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B12 — Extend CI and release delivery` in `TODO.md`, with `BACKUP.md` as the authoritative design. The repository root is `/home/codex/src/us-alb`, the active branch is `backup-system`, and the implementation baseline is the pushed B11 commit `463b7af6c9dcc113f3e758b29adc7783e5b85738`. Do not switch branches. Keep `BACKUP.md` byte-for-byte unchanged. Preserve the unrelated untracked `.agents/skills/imagen/scripts/` directory without listing its contents, reading it, formatting it, staging it, or modifying it.

## Purpose / Big Picture

After B12, every push to `main` runs the existing backend/frontend validation plus reproducible installation, non-mutating checks, and native tests for both backup daemons. A manually dispatched release publishes three application images—frontend, backend with embedded `strapid`, and backupd—through the existing digest, provenance, SBOM, signing, verification, and summary path. Backend and backupd publication both receive the sibling `strapid/` source as an explicit named Docker build context, so their already-defined Dockerfiles can package all runtime TypeScript outside `node_modules`.

The same successful release run also exposes one commit-specific deployment artifact containing `compose.prod.yml`, `otel-config.yml`, `Caddyfile`, and `.env.example`. This makes production Compose, its Collector configuration, its gateway configuration, and its non-secret configuration template travel together without embedding a live `.env`, credentials, or mutable image references. The behavior is demonstrated locally by running the exact package validation commands, native Compose and Collector validation, Dockerfile build checks and builds, image runtime probes, and a deterministic deployment-archive assembly check. Do not dispatch either workflow, publish an image or artifact, deploy a stack, contact a live cloud service, or use production data during implementation or validation.

## Progress

- [x] (2026-10-30 06:24Z) Confirmed `backup-system`, `HEAD`, and `origin/backup-system` are at the pushed B11 baseline `463b7af6c9dcc113f3e758b29adc7783e5b85738`, with no tracked worktree edits.
- [x] (2026-10-30 06:24Z) Read the complete authoritative planning/skill instructions, TODO preamble and B12 item, all of `BACKUP.md`, the canonical-validation skill, current workflows, image definitions, Compose definitions, Collector configuration, package scripts, environment template, relevant B10/B11 plans, and release history while leaving the protected unrelated directory uninspected.
- [x] (2026-10-30 06:24Z) Used Context7 to resolve current official GitHub Actions, `actions/upload-artifact` 7.0.1, and `docker/build-push-action` documentation; confirmed named `build-contexts`, artifact immutability/digest outputs, and the permissions required by the existing image attestations.
- [x] (2026-10-30 06:24Z) Resolved the exact CI steps, publication matrix, build arguments/contexts, deployment-artifact contents and ordering, validation boundary, safety constraints, and B13 boundary.
- [x] (2026-10-30 06:33Z) Extended `.github/workflows/ci.yml` with reproducible backupd/strapid installation and their non-mutating checks/tests while preserving every existing backend/frontend step.
- [x] (2026-10-30 06:33Z) Extended `.github/workflows/cd.yml` with backend/backupd named contexts, backupd publication through the unchanged common provenance/attestation path, and exact-commit post-publication deployment delivery.
- [x] (2026-10-30 06:40Z) Passed focused and canonical package/application validation, native Compose/Collector and three-image checks/builds, runtime/layout probes, exact release-archive assembly, cleanup, YAML syntax, and final scope/index audits without triggering workflows or external publication.
- [x] (2026-10-30 06:47Z) Independent review found no issues and reproduced the material package, configuration, image, runtime-layout, archive, YAML, and scope checks; the reviewer returned `APPROVED` and `REVIEW_READY`.

## Surprises & Discoveries

- Observation: The current CD workflow is the repository's only release-delivery automation, but it publishes only frontend and backend images; it does not deliver `compose.prod.yml` or any deployment archive.
  Evidence: `.github/workflows/cd.yml` contains only `prepare` and matrix `publish` jobs. Repository history shows no upload-artifact, GitHub Release, deploy job, or separate delivery script.

- Observation: Backend and backupd both already require the named Docker context `strapid`, but the release action currently sends only `./${{ matrix.image }}`.
  Evidence: `backend/Dockerfile` uses `COPY --from=strapid` for the complete supervisor package. `backupd/Dockerfile` uses `COPY --from=strapid src/capture-contract.ts` for the authoritative runtime value dependency. Both `compose.yml` build definitions already provide `additional_contexts: strapid: ./strapid`; `.github/workflows/cd.yml` provides no `build-contexts` input.

- Observation: The complete production deployment definition has two repository-relative bind dependencies in addition to its local `.env`.
  Evidence: `compose.prod.yml` mounts `./otel-config.yml` into the Collector and `./Caddyfile` into the gateway. A delivery artifact with Compose but without either referenced file is incomplete. The real `.env` is operator-owned secret material and must not be included; `.env.example` is the safe committed template.

- Observation: The current image release path already has stronger provenance behavior than a new parallel path should recreate.
  Evidence: Each matrix image uses max BuildKit provenance, a pinned Syft SBOM generator, GitHub provenance and SBOM attestations pushed to the registry, verification constrained to this exact workflow and source digest, OCI source/revision labels, immutable build digest output, and a tag/commit/digest summary.

- Observation: The exact runtime Node version is established by the Dockerfiles, not by the distroless image's `nodejs24` label.
  Evidence: frontend, backend, and backupd builders all pin `node:24.20.0-trixie` and copy `/usr/local/bin/node` to `/nodejs/bin/node` in the final image. B10 found the pinned distroless base's built-in Node was v24.21.0, so validation must execute `/nodejs/bin/node --version` and compare it with `mise exec -- node --version`.

- Observation: Current `actions/upload-artifact` can expose a single already-assembled file without wrapping it in another ZIP.
  Evidence: Context7's official 7.0.1 action documentation defines `archive: false` for a single file, `if-no-files-found: error`, explicit retention, and `artifact-id`, `artifact-url`, and SHA-256 `artifact-digest` outputs. The exact v7.0.1 tag resolves to commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.

- Observation: Running the unchanged Strapi OpenAPI generator from the non-secret root template rewrites only generated example data, even when the application/schema is unchanged.
  Evidence: The post-generation diff contained current `publishedAt` defaults and changed the server URL from the committed local backend endpoint to the template `SITE_URL`; no operation, schema, property, or type changed. The worker restored `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` byte-for-byte to `HEAD` as required by the B12 scope.

## Decision Log

- Decision: Limit production changes to `.github/workflows/ci.yml` and `.github/workflows/cd.yml`.
  Rationale: B10/B11 already completed image packaging, Compose runtime boundaries, the production definition, environment ownership, and Collector configuration. B12 only has to connect those established assets to CI and release delivery. No package, lockfile, Dockerfile, Compose, application, test, README, or design change is needed unless validation exposes a genuine B12 defect.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Add six explicit CI steps—`npm ci`, check, and test for both daemon packages—without consolidating or reordering away any current backend/frontend validation.
  Rationale: Each daemon is an independent private package with its own committed lockfile and native scripts. `npm ci --prefix backupd` and `npm ci --prefix strapid` are reproducible; `mise run <daemon>:check` is non-mutating Biome plus strict `tsc --noEmit`; `mise run <daemon>:test` is the repository's native `node:test` suite. Existing backend type generation/build/OpenAPI, frontend OpenAPI/build/check/test, configuration preparation, checkout, and Mise setup remain intact.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Add backupd as a third entry in the existing publication matrix and give matrix entries an optional `build_contexts` value.
  Rationale: Reusing the one established publish job automatically preserves permissions, platform, tag identity, OCI labels, max provenance, pinned SBOM generation, GitHub attestations, registry verification, digest output, and summary formatting. Backend and backupd set `strapid=./strapid`; frontend uses an empty value. Do not create a second image-publishing implementation.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Pass `APPLICATION_SOURCE_URL` and `APPLICATION_GIT_REVISION` as build arguments for backend and backupd while retaining the action-owned OCI source/revision labels for every image.
  Rationale: The two changed Dockerfiles consume these arguments to label their final images, and the workflow already knows the exact repository URL and full source commit. The duplicate values at Dockerfile and action label boundaries must agree. Frontend does not declare these build arguments and continues using the release action labels plus `NEXT_PUBLIC_APP_VERSION=<full SHA>` exactly as before.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Add a `delivery` job after successful completion of the entire image matrix, and have it build one commit-specific tar.gz with `git archive` from the exact prepared full SHA.
  Rationale: A post-publication dependency prevents an incomplete image release from being presented with a deployment artifact. `git archive` reads tracked bytes from the released commit and produces the same archive for the same commit without copying live configuration. The archive contains `.env.example`, `Caddyfile`, `compose.prod.yml`, and `otel-config.yml` under one `us-alb-deployment/` prefix. Development `compose.yml` remains available in the source repository but is not a standalone deployment deliverable because its image builds also require the full source contexts.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Upload the assembled tar.gz with commit-pinned `actions/upload-artifact` v7.0.1 using `archive: false`, `if-no-files-found: error`, and 30-day retention, then summarize its source commit, URL, and SHA-256 action digest.
  Rationale: This is the smallest extension of the manually dispatched repository release workflow and does not invent a GitHub Release, host deployment, OCI configuration artifact, or long-lived package format. The source files remain permanently recoverable from Git; the Actions artifact is the convenient deployment handoff for that release run. The action's immutable per-run artifact and digest make accidental replacement visible. Thirty days is delivery convenience, not backup retention or an application-image retention guarantee.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Do not add provenance attestations for the deployment tarball in B12.
  Rationale: The acceptance criterion says to preserve existing release provenance and attestations, which currently apply to images. Adding a new attestation subject and verification policy for configuration delivery would broaden the release system. The archive is generated from and named for the exact checked-out commit, has an upload digest, and contains only tracked non-secret files; B13 can describe operator retention without changing provenance ownership.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Validate release wiring locally and by inspection; never dispatch CI/CD as a test.
  Rationale: `ci.yml` runs only on pushes to `main`, and `cd.yml` is manually dispatched but writes images, attestations, and an artifact. Local package commands, native Buildx checks/builds, Compose/Collector validation, exact image probes, and an equivalent `git archive` establish all repository-owned behavior without external writes. GitHub expression/job semantics must be reviewed against the official interfaces and the small scoped diff.
  Date/Author: 2026-10-30 / Codex planner

- Decision: Discard the OpenAPI generator's timestamp and endpoint churn instead of expanding B12's commit scope.
  Rationale: B12 changes no backend schema, frontend contract, or environment ownership. Retaining regenerated examples would create unrelated API-artifact noise and contradict the approved three-file worker scope, while restoring the committed artifacts preserves the already-validated contract.
  Date/Author: 2026-10-30 / Codex worker

## Outcomes & Retrospective

B12 implementation, validation, and independent review are complete. CI retains the existing application sequence and adds lockfile installs plus non-mutating checks and native tests for backupd and strapid. Backupd passed 150 tests, strapid passed 82 tests, and the unchanged frontend suite passed 92 tests across 12 files. The CD matrix now has exactly frontend, backend, and backupd; backend and backupd receive the named `strapid` context and source/revision arguments, while all three continue through the same build, max-provenance, pinned-SBOM, GitHub attestation, verification, and immutable-reference summary steps. The delivery job depends on both `prepare` and the complete `publish` matrix and uploads only the exact-commit four-file tarball. Independent review found no issues and reproduced the material local acceptance checks before returning `APPROVED` and `REVIEW_READY`.

Native local checks and builds passed for all three Dockerfiles. The validation image IDs were backend `sha256:bed3e50f95acd508d077f1ff7bcc734cce2d7c08f62bc363c2123177eb435002`, backupd `sha256:88c84867d2b267f5f6ce0eaf9135588edc1d1d18a925c895993fe5395457b74f`, and frontend `sha256:b4bd561a24de8e05c516ea87fbe695bd9b2dc612106213aa4c2bb574d39a18d5`. Each project image's `/nodejs/bin/node` matched Mise at `v24.20.0`; required daemon and shared-contract paths were present outside `node_modules`; and backupd's eager main-module import succeeded. Both Compose definitions and the pinned Collector configuration validated without starting services. The local archive contained exactly the directory entry and `.env.example`, `Caddyfile`, `compose.prod.yml`, and `otel-config.yml`, matched all four tracked files byte-for-byte, and had local SHA-256 `2b8a9fd8a660924c9bc8fcec618817dd8f91682c11c3f305f6b0d40d7f593da7` before safe cleanup.

No workflow was dispatched, image or artifact was published, stack was deployed, registry login was performed, live credential was used, or live cloud service was contacted. Coordinator-only commit and push remain. Operators still own the secure live `.env`, immutable published image references, retention, deployment, provider checks, and recovery rehearsal described for B13.

## Context and Orientation

`.github/workflows/ci.yml` is the push-to-`main` validation workflow. It checks out the source, copies package-local example environment files, installs backend/frontend dependencies through the Node version configured by root `mise.toml`, then runs backend type generation/build/OpenAPI generation and frontend OpenAPI generation/build/check/test. It currently does not install or validate `backupd/` or `strapid/`.

`backupd/` and `strapid/` are separate private npm packages. Each owns a committed `package-lock.json`, uses ESM TypeScript executed directly by Node 24, and exposes `check` and `test` through both `package.json` and root Mise tasks. “Non-mutating check” here means Biome's `check` command plus `tsc --noEmit`; it does not run either package's formatting command. Their native tests use `node:test`. Some integration tests create only task-owned temporary files, fixture children, Unix sockets, or isolated storage containers with Docker-assigned ports. They require no production stack, fixed shared host port, cloud credential, or Strapi test suite.

`.github/workflows/cd.yml` is the manually dispatched publication workflow. Its `prepare` job resolves the exact full/short commit and GHCR prefix. Its matrix `publish` job currently builds frontend and backend for Linux AMD64, pushes the short-SHA tag, and applies the common provenance/SBOM/signing/verification/summary sequence. “Named build context” means an additional BuildKit input identified by name rather than the primary Docker context. The Dockerfiles refer to the sibling source as `strapid`; current `docker/build-push-action` maps a line such as `strapid=./strapid` from its `build-contexts` input to Buildx `--build-context strapid=./strapid`.

`backend/Dockerfile` packages compiled Strapi at `/strapi` and the entire production strapid package at `/strapid-daemon`. `backupd/Dockerfile` packages backupd at `/backupd` and the one authoritative shared runtime module at `/strapid/src/capture-contract.ts`. Both final images execute TypeScript outside `node_modules`, because Node native type stripping rejects TypeScript under `node_modules`. Both use production-only dependency installation and copy the exact Node v24.20.0 executable from the pinned builder. `frontend/Dockerfile` uses the same exact runtime copy and embeds `NEXT_PUBLIC_APP_VERSION`, which the current CD workflow sets to the full commit SHA.

`compose.prod.yml` consumes immutable released image references through `BACKEND_IMAGE_REPOSITORY` plus `APPLICATION_IMAGE_DIGEST`, `FRONTEND_IMAGE`, and `BACKUPD_IMAGE`. `APPLICATION_IMAGE_DIGEST` is the backend digest that also enters backup manifests, while `APPLICATION_GIT_REVISION` enters supervisor/capture/manifest attribution. The workflow's per-image summary remains the source of published immutable references. The production definition bind-mounts repository-root `otel-config.yml` and `Caddyfile`; `.env.example` documents every non-secret input name, but the operator must create and protect the real `.env` separately.

An Actions artifact is a file retained with a workflow run, not a backup snapshot and not a container image. The B12 artifact is only a transport for deployment configuration. It must contain no real `.env`, object-storage/Grafana credential, deployment secret, archive content, generated database, image layer, or mutable “latest” pointer.

## Interfaces and Dependencies

In `.github/workflows/ci.yml`, keep the existing trigger, permissions, runner, checkout, example-configuration preparation, Mise setup, and every current install/generation/build/check/test step. Add these steps with names that make package ownership clear:

    - name: Install backupd dependencies
      run: mise exec -- npm ci --prefix backupd
    - name: Install strapid dependencies
      run: mise exec -- npm ci --prefix strapid
    - name: Check backupd
      run: mise run backupd:check
    - name: Test backupd
      run: mise run backupd:test
    - name: Check strapid
      run: mise run strapid:check
    - name: Test strapid
      run: mise run strapid:test

Place dependency installation beside the existing package installs and daemon checks/tests after installation. Do not run `backupd:format` or `strapid:format`, add caches, split jobs, change triggers/permissions/runners, add credentials, start Compose, or remove any existing validation.

In `.github/workflows/cd.yml`, retain the current `prepare` outputs and all current publish-job steps. Extend the matrix entries conceptually as follows; preserve the current frontend/backend build arguments not shown as changed:

    matrix:
      include:
        - image: frontend
          build_contexts: ""
          build_args: |
            CMS_MEDIA_URL=${{ vars.CMS_MEDIA_URL }}
            SITE_URL=${{ vars.SITE_URL }}
            NEXT_PUBLIC_APP_VERSION=${{ needs.prepare.outputs.full_sha }}
        - image: backend
          build_contexts: |
            strapid=./strapid
          build_args: |
            APPLICATION_SOURCE_URL=${{ github.server_url }}/${{ github.repository }}
            APPLICATION_GIT_REVISION=${{ needs.prepare.outputs.full_sha }}
            SITE_URL=${{ vars.SITE_URL }}
            CMS_PUBLIC_URL=${{ vars.CMS_PUBLIC_URL }}
            CMS_ADMIN_COOKIE_PATH=${{ vars.CMS_ADMIN_COOKIE_PATH }}
        - image: backupd
          build_contexts: |
            strapid=./strapid
          build_args: |
            APPLICATION_SOURCE_URL=${{ github.server_url }}/${{ github.repository }}
            APPLICATION_GIT_REVISION=${{ needs.prepare.outputs.full_sha }}

Add this input to the existing `docker/build-push-action` step:

    build-contexts: ${{ matrix.build_contexts }}

Keep its primary `context`, platform, `push: true`, short-SHA tag, build arguments, OCI labels, `provenance: mode=max`, and pinned SBOM generator unchanged. Keep the exact Buildx setup, GHCR login, `actions/attest` steps, registry attestation verification, and image summary unchanged so the new backupd matrix entry receives exactly the same controls.

Add a new `delivery` job with `needs: [prepare, publish]`, `runs-on: ubuntu-24.04`, and only `contents: read`. Check out `needs.prepare.outputs.full_sha` with `persist-credentials: false`. Assemble the artifact without reading the working tree's live `.env`:

    - name: Assemble deployment artifact
      shell: bash
      env:
        FULL_SHA: ${{ needs.prepare.outputs.full_sha }}
        SHORT_SHA: ${{ needs.prepare.outputs.short_sha }}
      run: |
        archive="$RUNNER_TEMP/us-alb-deployment-$SHORT_SHA.tar.gz"
        git archive \
          --format=tar.gz \
          --prefix=us-alb-deployment/ \
          --output="$archive" \
          "$FULL_SHA" \
          .env.example \
          Caddyfile \
          compose.prod.yml \
          otel-config.yml

        mapfile -t members < <(tar -tzf "$archive")
        expected=(
          us-alb-deployment/
          us-alb-deployment/.env.example
          us-alb-deployment/Caddyfile
          us-alb-deployment/compose.prod.yml
          us-alb-deployment/otel-config.yml
        )
        if [[ "${members[*]}" != "${expected[*]}" ]]; then
          printf '::error::Deployment artifact member set is not exact\n'
          exit 1
        fi

The member comparison deliberately reports no file contents or environment values. Give the upload step an `id`, and pin it exactly:

    - name: Upload deployment artifact
      id: deployment
      uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
      with:
        path: ${{ runner.temp }}/us-alb-deployment-${{ needs.prepare.outputs.short_sha }}.tar.gz
        if-no-files-found: error
        retention-days: 30
        archive: false

Append a compact deployment table to `$GITHUB_STEP_SUMMARY` containing the full commit, `${{ steps.deployment.outputs.artifact-url }}`, `${{ steps.deployment.outputs.artifact-digest }}`, and the four logical files. Do not print a live environment, add contents/packages/attestation write permission to this job, create a GitHub Release, deploy Compose, or download images.

## Plan of Work

### Milestone 1: Make daemon validation first-class CI work

Edit `.github/workflows/ci.yml` only at the existing install and validation step lists. Install both daemon packages with `npm ci` under Mise and their committed lockfiles. Run backupd check/test and strapid check/test without formatting. Keep backend/frontend preparation and validation present and semantically unchanged; do not optimize, cache, rename packages, introduce a workspace, or alter Node configuration.

This milestone is complete when the workflow has explicit reproducible installs before daemon commands, all four daemon commands are present, and a local run of those exact installs/checks/tests passes. The tests must obtain only placeholder/local inputs already owned by the suites. No live S3 or Grafana credential, prestarted Compose project, fixed port, Strapi process, deployment test, or backend test is added.

### Milestone 2: Publish all required images through the existing release controls

Edit the CD matrix to add the optional named-context field and the third `backupd` entry. Add the `APPLICATION_*` build arguments to backend and backupd. Feed `matrix.build_contexts` to the existing build-push action. Do not copy or fork the publish steps: the matrix must continue into one common provenance, SBOM extraction/signing, attestation verification, and summary sequence.

This milestone is complete when frontend retains its exact current build inputs and full-SHA visible version, backend and backupd both receive `strapid=./strapid`, backupd's registry name is the existing prefix plus `/backupd`, and all three entries use short-SHA tags while producing immutable digest summaries. Local native builds must prove that the two named-context builds succeed, the normal backupd module graph resolves the packaged shared runtime module, and `/nodejs/bin/node` in all three images reports v24.20.0.

### Milestone 3: Deliver a complete non-secret production configuration set

Add the post-publication `delivery` job. Check out the exact prepared source commit, use `git archive` to assemble the four tracked files under a stable directory prefix, verify the exact member set, upload the one tar.gz without a second archive wrapper, and summarize the action's URL and digest. Keep it dependent on all matrix publications so it cannot advertise a deployable release after any image entry fails.

This milestone is complete when an equivalent local archive has exactly the five tar members shown above (one directory plus four files), each archived file compares byte-for-byte with the tracked baseline, `compose.prod.yml` and `otel-config.yml` render/validate together with the template placeholders, and no live `.env`, secret, image content, or backup data is present. The artifact's 30-day lifetime is only workflow delivery; Git and immutable container references remain the durable recovery inputs.

### Milestone 4: Validate the complete change and audit scope

Run the package/application commands that the edited CI workflow declares, followed by the native configuration and image checks needed by the release change. Validate the deployment archive locally. Review every CD matrix entry against the common build/sign/verify steps and confirm the delivery job runs only after `publish`. Do not use workflow dispatch, `docker push`, `gh release`, `gh workflow run`, a registry login, live cloud endpoints, or `docker compose up`.

This milestone is complete when every applicable canonical command passes, both Compose definitions render quietly, the Collector's pinned native validator accepts its shipped config, all project images build through the exact named contexts and report the project Node version, the archive check passes, and the final diff contains only the two workflows plus this living plan before coordinator bookkeeping.

## Concrete Steps

Work from `/home/codex/src/us-alb`. Before editing, reconfirm the protected baseline without enumerating untracked paths:

    git branch --show-current
    git rev-parse HEAD
    git status --short --untracked-files=no

Expect `backup-system`, `463b7af6c9dcc113f3e758b29adc7783e5b85738`, and no tracked status. Edit only `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, and this plan. Never run a broad file listing beneath `.agents/skills/imagen/`.

Install exact package dependencies through the project runtime:

    mise exec -- npm ci --prefix backend
    mise exec -- npm ci --prefix frontend
    mise exec -- npm ci --prefix backupd
    mise exec -- npm ci --prefix strapid

Run daemon canonical validation:

    mise run backupd:check
    mise run backupd:test
    mise run strapid:check
    mise run strapid:test

Expect both Biome/TypeScript checks and both native test suites to exit zero. Record actual test counts. Do not run format scripts. Any isolated storage integration must allocate and remove its own dependency container and Docker-assigned loopback port; stop if a test attempts a live endpoint or shared service.

Run the existing application validation in a subprocess scoped to the committed non-secret template. This proves B12 did not accidentally remove or invalidate the existing CI sequence while leaving the invoking environment unchanged:

    (
      set -a
      . ./.env.example
      set +a
      mise run be:types
      mise run be:build
      mise run be:openapi
      mise run fe:openapi
      mise run fe:build
      mise run fe:check
      mise run fe:test
    )

Expect every command to pass. Because B12 changes no backend/frontend source or schema, generated types/OpenAPI files must remain unchanged. If a generator creates timestamp or endpoint churn, compare it to the baseline, remove only proven nondeterministic churn, and do not retain an unexplained generated-artifact change.

Validate the shipped configuration without exposing resolved values:

    docker compose --env-file .env.example -f compose.yml config --quiet
    docker compose --env-file .env.example -f compose.prod.yml config --quiet
    docker run --rm \
      --env GRAFANA_CLOUD_OTLP_ENDPOINT=https://otlp-gateway.example.invalid/otlp \
      --env GRAFANA_CLOUD_INSTANCE_ID=instance-placeholder \
      --env GRAFANA_CLOUD_API_KEY=token-placeholder \
      --mount type=bind,src="${PWD}/otel-config.yml",dst=/etc/otelcol-contrib/config.yaml,readonly \
      otel/opentelemetry-collector-contrib:0.164.0@sha256:340c9ca6a36617084c6661bdc4f0fe92b7cda5a805d61673ec8db375fddc522b \
      validate --config=/etc/otelcol-contrib/config.yaml

Expect zero exit status and no rendered Compose values or live Grafana request. This is native configuration/build validation, not a deployment or automated deployment test.

Run Buildx Dockerfile checks and builds with the exact contexts the release action will use. Use collision-resistant local tags beginning with `b12-validation-`; do not push them:

    docker buildx build --check --build-context strapid=./strapid -f backend/Dockerfile backend
    docker buildx build --check --build-context strapid=./strapid -f backupd/Dockerfile backupd
    docker buildx build --check -f frontend/Dockerfile frontend

    docker buildx build --load \
      --build-context strapid=./strapid \
      --build-arg APPLICATION_SOURCE_URL=https://example.invalid/us-alb \
      --build-arg APPLICATION_GIT_REVISION=463b7af6c9dcc113f3e758b29adc7783e5b85738 \
      --build-arg SITE_URL=http://us-alb.localhost:65102 \
      --build-arg CMS_PUBLIC_URL= \
      --build-arg CMS_ADMIN_COOKIE_PATH= \
      --tag b12-validation-backend \
      -f backend/Dockerfile backend

    docker buildx build --load \
      --build-context strapid=./strapid \
      --build-arg APPLICATION_SOURCE_URL=https://example.invalid/us-alb \
      --build-arg APPLICATION_GIT_REVISION=463b7af6c9dcc113f3e758b29adc7783e5b85738 \
      --tag b12-validation-backupd \
      -f backupd/Dockerfile backupd

    docker buildx build --load \
      --build-arg CMS_MEDIA_URL= \
      --build-arg SITE_URL=http://us-alb.localhost:65102 \
      --build-arg NEXT_PUBLIC_APP_VERSION=463b7af6c9dcc113f3e758b29adc7783e5b85738 \
      --tag b12-validation-frontend \
      -f frontend/Dockerfile frontend

The spaces after empty build-argument equals signs above are shell separators, not part of the values. If the shell or Buildx version rejects that spelling, use quoted `--build-arg 'CMS_PUBLIC_URL='`, `--build-arg 'CMS_ADMIN_COOKIE_PATH='`, and `--build-arg 'CMS_MEDIA_URL='` without changing repository files.

Probe the runtime contracts without starting any daemon, Strapi, frontend server, or backup:

    project_node_version=$(mise exec -- node --version)
    backend_node_version=$(docker run --rm --entrypoint /nodejs/bin/node b12-validation-backend --version)
    backupd_node_version=$(docker run --rm --entrypoint /nodejs/bin/node b12-validation-backupd --version)
    frontend_node_version=$(docker run --rm --entrypoint /nodejs/bin/node b12-validation-frontend --version)
    test "$project_node_version" = v24.20.0
    test "$backend_node_version" = "$project_node_version"
    test "$backupd_node_version" = "$project_node_version"
    test "$frontend_node_version" = "$project_node_version"
    docker run --rm --entrypoint /nodejs/bin/node b12-validation-backupd \
      -e 'await import("/backupd/src/main.ts")'

Expect all comparisons to pass and the module import to exit zero with no output. Use direct Node filesystem probes or selected image-inspection fields to confirm backend contains `/strapid-daemon/package.json`, `/strapid-daemon/package-lock.json`, `/strapid-daemon/src/main.ts`, and `/strapid-daemon/node_modules`; backupd contains `/backupd/package.json`, `/backupd/package-lock.json`, `/backupd/src/main.ts`, `/backupd/node_modules`, and `/strapid/src/capture-contract.ts`; and the TypeScript source paths are not under `node_modules`. Do not print package contents, environment values, or a full image inspection document.

Validate the release assembly in a task-owned temporary directory and delete only that directory afterward:

    b12_bundle_dir=$(mktemp -d)
    b12_short_sha=$(git rev-parse --short HEAD)
    b12_archive="$b12_bundle_dir/us-alb-deployment-$b12_short_sha.tar.gz"
    git archive \
      --format=tar.gz \
      --prefix=us-alb-deployment/ \
      --output="$b12_archive" \
      HEAD \
      .env.example \
      Caddyfile \
      compose.prod.yml \
      otel-config.yml
    tar -tzf "$b12_archive"
    for b12_file in .env.example Caddyfile compose.prod.yml otel-config.yml; do
      tar -xOf "$b12_archive" "us-alb-deployment/$b12_file" | cmp - "$b12_file"
    done

Expect exactly the directory plus four members, all comparisons equal, and no extra output except the member list. Remove only the validated temporary directory by its resolved `mktemp` path after checking it is nonempty, is under `/tmp`, and contains the expected archive basename. Do not use a glob or broad recursive cleanup target.

Remove only the three task-owned local validation images after evidence collection:

    docker image rm b12-validation-backend b12-validation-backupd b12-validation-frontend

If an image removal reports a task-owned Buildx child reference, leave the cache in place rather than pruning Docker. Do not remove base images, dependency images, containers, networks, volumes, or another task's resources broadly.

Finish with scope, generated-artifact, and formatting audits:

    git diff --check
    git diff --exit-code -- BACKUP.md AGENTS.md frontend/AGENTS.md TODO.md README.md mise.toml compose.yml compose.prod.yml otel-config.yml Caddyfile .env.example backend frontend backupd strapid
    git diff --name-only
    git status --short --untracked-files=no

Before coordinator bookkeeping, the tracked diff may contain only `.agents/plans/b12-extend-ci-and-release-delivery.md`, `.github/workflows/ci.yml`, and `.github/workflows/cd.yml`. The index must remain clean. Do not inspect or mention the contents of the protected unrelated directory. After independent approval, the coordinator alone may add the plan link/checkmark to `TODO.md`, finalize review evidence in this plan, stage the exact B12 files, commit with title `B12 — Extend CI and release delivery`, and push to `origin/backup-system`.

## Validation and Acceptance

B12 is acceptable when `.github/workflows/ci.yml` still performs every pre-B12 frontend/backend install, generation, build, check, and test step, and additionally installs backupd and strapid from their committed lockfiles before running both packages' non-mutating checks and native tests. No CI step formats files, starts a production stack, needs a shared fixed port, talks to live S3/Grafana, or runs Strapi automated tests. Integration tests remain isolated and self-cleaning.

The CD publication matrix must have exactly frontend, backend, and backupd entries. Frontend must retain `NEXT_PUBLIC_APP_VERSION=<full release SHA>`. Backend must retain its current URL/cookie build inputs and gain exact source/revision arguments plus `strapid=./strapid`. Backupd must receive the same source/revision arguments and named context. The common build action must retain Linux AMD64, registry push, short-SHA image tags, source/revision labels, max provenance, the pinned SBOM generator, and digest output.

For all three matrix entries, the same subsequent steps must sign build provenance, extract the registry SBOM, sign the SBOM, verify both SLSA provenance and SPDX predicates against this exact workflow/full source digest/non-self-hosted runner constraint, and summarize the immutable digest reference. Do not weaken permissions, `persist-credentials: false`, BuildKit pin/flags, verification constraints, subject naming, or `create-storage-record: false`. Backupd must not bypass any existing control.

Native local builds must show that backend and backupd can consume the named context. The built backend must contain the complete strapid production runtime outside `node_modules`; the built backupd must contain all backupd source plus the shared capture contract outside `node_modules`. Their eager module graphs must resolve, and all three project images must execute the exact Mise Node v24.20.0 binary. These checks validate packaging and runtime identity without starting Strapi or a backup.

The `delivery` job must run only after all image matrix jobs succeed. Its checkout, archive source, filename, and summary must use the exact `prepare` full/short SHA. The tarball must contain only `us-alb-deployment/{.env.example,Caddyfile,compose.prod.yml,otel-config.yml}` plus its directory entry, and each file must be the tracked byte sequence from that released commit. Upload must fail if missing, avoid an extra wrapper archive, expire after 30 days, and expose its artifact URL and SHA-256 digest in the run summary.

The artifact must contain no `.env`, credential, backup archive, application data, database, node_modules, Docker context, image layer, or generated secret. `compose.prod.yml` and `otel-config.yml` must validate with non-secret placeholders. The operator still owns a secure live `.env`, immutable image references, storage/Grafana credentials, image retention, and deployment; B13 owns the final handoff. B12 neither performs nor claims deployment, cloud delivery, production recovery, provider checksum verification, timing/capacity calibration, or release execution.

Local validation must pass daemon/app canonical commands, quiet Compose rendering, pinned Collector native validation, three Dockerfile checks/builds, runtime layout/Node/module probes, exact archive assembly/comparison, and scope/hygiene checks. Generated API/type artifacts must remain unchanged. No commit, push, workflow dispatch, image publication, artifact upload, registry login, GitHub Release, or deployment occurs during planner or worker work.

## Idempotence and Recovery

Workflow edits are declarative and safe to reapply. `npm ci` replaces only each ignored package `node_modules` tree from its lockfile. Package checks and tests are repeatable; their integration fixtures own temporary resources and must clean them even after failure. Compose rendering and Collector validation are read-only. Docker build checks and builds may populate the local BuildKit cache; cache retention is harmless and must not be cleaned broadly.

Local validation images use three exact task-owned tags. If validation is interrupted, inspect those exact tags and any task-owned test container labels before removing only known B12 resources. Never run `docker system prune`, delete another project's container/volume/network, or use a broad image filter. The deployment archive lives beneath a fresh `mktemp -d` directory; validate the resolved directory and expected archive filename before deleting only that directory.

If package validation changes a tracked generated file, stop and determine whether the change is deterministic and required. B12 has no application/schema change, so unexplained output is not acceptable. If a Docker build fails, correct workflow context/build arguments only if the same local command proves the established Dockerfile contract; do not redesign image layout in B12. If the archive member check fails, correct the exact four-file assembly rather than loosening the comparison or adding a live `.env`.

If workflow syntax or an action input remains materially uncertain after official documentation review and local native checks, stop before coordinator commit and request a bounded decision or independent-review finding. Never resolve uncertainty by dispatching CD. A later authorized release rerun creates a new immutable Actions artifact for that run; `overwrite` remains false and no cleanup of earlier run artifacts is part of B12.

## Artifacts and Notes

The expected CI ownership after B12 is:

    root mise.toml Node 24.20.0
      -> backend npm ci and existing build/type/OpenAPI work
      -> frontend npm ci and existing OpenAPI/build/check/test work
      -> backupd npm ci -> backupd:check -> backupd:test
      -> strapid npm ci -> strapid:check -> strapid:test

The expected release flow is:

    prepare exact full/short SHA and ghcr.io prefix
      -> publish matrix
         -> frontend image (full SHA embedded as NEXT_PUBLIC_APP_VERSION)
         -> backend image + named strapid context
         -> backupd image + named strapid context
      -> each image: max provenance + SBOM + GitHub attestations + verification + digest summary
      -> after all succeed: exact-commit deployment tar.gz + Actions artifact URL/digest

The production recovery identity path remains unchanged:

    backend published digest
      -> compose.prod.yml APPLICATION_IMAGE_DIGEST
      -> backupd BACKUPD_APPLICATION_IMAGE_DIGEST
      -> completion manifest application.imageDigest

    release full Git SHA
      -> backend/backupd OCI revision labels
      -> frontend NEXT_PUBLIC_APP_VERSION
      -> Compose APPLICATION_GIT_REVISION
      -> capture and manifest release attribution

Record concise evidence only: command names and pass counts, local image IDs, actual Node versions, required path booleans, archive member names, upload-action pin, and diff/scope results. Never record environment values, tokens, passwords, signed URLs, archive content, database content, or full image/Compose inspection documents.

## Later-Task Boundaries and Commit Scope

B12 does not change backup capture/publication/state/telemetry logic, daemon dependencies, Dockerfile contents, Compose services, Collector pipelines, environment names/defaults, Strapi application/bootstrap/content types, frontend SSR/ISR or CMS behavior, generated API contracts, storage credentials, Grafana credentials, image retention policy, remote backup retention, or recovery procedure. It does not upgrade Strapi, Node, GitHub actions already in use, Docker actions, the Collector, or any npm dependency.

B12 does not add a deployment job, GitHub environment, host SSH access, cloud authentication, Compose startup, smoke/E2E/browser/deployment test, live storage test, live Grafana test, automated Strapi test, mutable image tag, “latest” pointer, GitHub Release, release notes system, or release-system redesign. The Actions artifact is configuration delivery only and cannot establish that deployment or recovery works.

B13 owns the complete implementation audit and operator handoff: exact immutable image references and retention expectations, live Scaleway checksum confirmation, bucket policies, Grafana queries/alerts/No Data behavior, capacity/timing calibration, off-host secret/image recovery, manual recovery procedure, and explicit unperformed prerequisites. B12 must leave those external activities honest and unclaimed.

The worker-owned implementation scope is limited to the two workflows and updates to this living plan. After `WORK_READY`, independent review must inspect the workflow diff and reproduce material local validation. Only after `APPROVED` and `REVIEW_READY` may the coordinator update this plan solely for review evidence/outcome, link and check B12 in `TODO.md`, stage the exact task files, commit, and push. The planner and worker do not edit `TODO.md`, stage, commit, push, publish, or deploy.

Revision note (2026-10-30 / Codex planner): Created the initial self-contained B12 ExecPlan from pushed B11 commit `463b7af6c9dcc113f3e758b29adc7783e5b85738`. Repository inspection and current official Context7 documentation resolved lockfile-based daemon CI, named Buildx contexts for backend/backupd, reuse of the existing three-image provenance/SBOM/signing path, exact Node/runtime-source validation, and an exact-commit post-publication deployment artifact containing production Compose plus every repository-relative configuration dependency and the non-secret environment template. No production, workflow, test, queue, design, protected, or unrelated file was changed during planning.

Revision note (2026-10-30 / Codex worker): Implemented the approved CI and CD workflow changes without altering the established application-validation or image-control sequences. Marked the two implementation milestones complete; local validation and evidence recording remain in progress.

Revision note (2026-10-30 / Codex worker): Recorded worker validation evidence, the nondeterministic OpenAPI timestamp/endpoint discovery and restoration decision, actual package test counts, local image identities and Node/runtime-layout probes, configuration validation, and exact archive contents/digest. Independent review and final coordinator bookkeeping remain intentionally open.

Revision note (2026-10-30 / Codex worker): Completed validation and cleanup, marked the worker validation milestone complete, and confirmed the index is clean and the only tracked implementation diffs are `.github/workflows/ci.yml` and `.github/workflows/cd.yml`. The repository-ignored living plan is updated in place for coordinator staging; the protected unrelated directory remains untouched and uninspected.

Revision note (2026-10-30 / Codex coordinator): Recorded independent approval with no findings after the reviewer reproduced the material package, configuration, image, runtime-layout, archive, YAML, and scope checks; finalized the outcome and queue bookkeeping for the exact B12 commit scope.

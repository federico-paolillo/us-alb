# Prepare the compiled Strapi runtime

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is `B02 — Prepare the compiled Strapi runtime` in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After B02, the backend image contains one immutable, already-compiled Strapi application at `/strapi`. The same image can start Strapi by passing `start` directly to its installed CLI through `/nodejs/bin/node`, and later supervisor work can invoke `export` or `import` from a small writable workspace without copying the application, compiling TypeScript, or writing diagnostics into the read-only image. Large archives are constrained to the disk-backed `/staging` path, while only transient CLI diagnostics live below `/tmp`.

The outcome is observable without running an export or import. A native image inspection shows compiled JavaScript, content schemas and components, the admin bundle, package metadata, production dependencies, public assets, favicon, and the migrations directory in their application-root locations; it also shows that application TypeScript, `tsconfig.json`, and the old nested `dist/` layout are absent. The actual image binary reports Node v24.20.0, and Strapi reaches its normal started state from an empty SQLite volume while the root filesystem is read-only and only `/data`, `/config`, `/staging`, and `/tmp` are writable.

## Progress

- [x] (2026-10-29 11:43Z) Read all of `TODO.md` and `BACKUP.md`, root `AGENTS.md`, the applicable nested instruction inventory, `.agents/docs/PLANS.md`, the `implement-task` and `canonical-validation` skills, and the completed B01 plan and implementation.
- [x] (2026-10-29 11:43Z) Confirmed branch `backup-system` is at pushed B01 commit `6eb812c436605d56b3c1baae358d8eaf5ba3b600`, with only the unrelated untracked `.agents/skills/imagen/scripts/` directory present.
- [x] (2026-10-29 11:43Z) Consulted current official Strapi, Node.js 24, and Docker documentation through Context7 and inspected the installed Strapi 5.52.0 CLI, compiler, configuration, migrations, favicon, export, import, and diagnostic implementations.
- [x] (2026-10-29 11:43Z) Proved that the pinned distroless digest currently contains Node v24.21.0 and that replacing `/nodejs/bin/node` with the executable from the pinned Node v24.20.0 build image works in that distroless filesystem.
- [x] (2026-10-29 11:55Z) Added the indented ExecPlan link beneath B02 in `TODO.md` while leaving B02 unchecked.
- [x] (2026-10-29 11:55Z) Reworked `backend/Dockerfile` to assemble and package only the compiled application-root layout, a disk-backed staging mount point, and the exact project Node executable.
- [x] (2026-10-29 11:55Z) Added the reusable `strapid` data-transfer workspace module and focused process-free unit tests for symlinks, absolute paths, staging placement, and cleanup timing.
- [x] (2026-10-29 12:03Z) Refreshed `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` through the required generators, identified timestamp-only nondeterminism, and retained no generated API-surface change.
- [x] (2026-10-29 12:03Z) Ran all canonical package, image, layout, runtime-parity, empty-database startup, scope, and repository-hygiene validation successfully; removed the exact labeled validation container and volumes afterward.
- [x] (2026-10-29 12:16Z) Completed remediation cycle 1 after independent review: rejected every Commander short `-f` form, added deterministic cleanup-failure coverage through a cleanup-only filesystem seam, and passed formatting, canonical checks, and all 16 native tests.
- [x] (2026-10-29 12:20Z) Obtained independent reviewer approval after one remediation cycle; the coordinator then checked B02 and finalized review evidence and outcomes.

## Surprises & Discoveries

- Observation: The runtime image name `nodejs24` does not provide exact patch parity with the project pin.
  Evidence: Running `/nodejs/bin/node --version` from `gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e` reports `v24.21.0`, while `mise exec -- node --version` and the pinned builder report `v24.20.0`.

- Observation: Copying the exact builder executable is compatible with the pinned distroless Debian 13 runtime.
  Evidence: A disposable two-stage image copied `/usr/local/bin/node` from `node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608` over `/nodejs/bin/node` in the current distroless base; the resulting executable reported `/nodejs/bin/node v24.20.0` and exited successfully.

- Observation: The current backend image copies the entire build application directory into `/strapi`, including `tsconfig.json`, TypeScript application source, generated types, and `dist/`, so data-transfer commands would recognize it as a TypeScript project and compile at runtime.
  Evidence: `backend/Dockerfile` currently performs `COPY --from=build ... /strapi /strapi/`. Installed `@strapi/core/dist/compile.js` calls `isUsingTypeScript(process.cwd())`; installed `@strapi/typescript-utils` defines that check as the presence of `tsconfig.json`.

- Observation: Strapi start and Strapi data-transfer commands resolve the application root differently but both work with the flattened compiled layout.
  Evidence: Installed `start.js` uses the current working directory directly when no `tsconfig.json` exists. Installed `compile.js`, used by export and import, returns `appDir` and `distDir` as the current working directory when no `tsconfig.json` exists. Configuration then loads `package.json`, `config/`, `src/`, and public paths from that root.

- Observation: Data-transfer diagnostics require a writable current working directory even when the application itself is immutable.
  Evidence: Installed Strapi 5.52.0 `formatDiagnostic()` resolves `export_<timestamp>.log` or `import_<timestamp>.log` against `process.cwd()` and configures a file logger there. The export destination separately accepts an absolute `--file` path.

- Observation: Application database migrations are rooted at `<appDir>/database/migrations`, not below compiled `src/`.
  Evidence: Installed `@strapi/core/dist/Strapi.js` constructs the migrations directory by joining the application project directory with `database/migrations`. The repository currently contains only `backend/database/migrations/.gitkeep`, so no compiled migration file is emitted today, but the runtime must retain that location for future compiled migrations.

- Observation: The canonical backend build requires the tracked example environment when the worktree has no local `backend/.env`.
  Evidence: The first bare `mise run be:build` compiled TypeScript and then stopped while loading `dist/config/admin.js` because `SITE_URL` was absent. Re-running `be:build` and `be:openapi` with the process-local absolute `ENV_PATH=/home/codex/src/us-alb/backend/.env.example` passed without creating or changing an environment file.

- Observation: The OpenAPI generator refreshes example `publishedAt` defaults from its ephemeral database even when the API schema is unchanged.
  Evidence: `be:openapi` plus `fe:openapi` produced 41 timestamp-only replacements in each generated artifact and no structural delta. Those nondeterministic replacements were removed with targeted patches, leaving both generated files byte-identical to the B01 baseline.

- Observation: Biome correctly rejected throwing from a `finally` block even though the initial implementation attempted to preserve both callback and cleanup failures there.
  Evidence: `strapid:check` reported `lint/correctness/noUnsafeFinally`. The helper now records a discriminated callback outcome, performs cleanup afterward, and then returns or throws; the next check and the then-current 12 native tests passed.

- Observation: Commander treats an attached short option value as the value for `-f`, so rejecting only an argument equal to `-f` does not protect the validated staging path.
  Evidence: Independent review reproduced `acceptedByWorkspace=true` and `commanderFile=/tmp/bypass` with an attached short form. Remediation now rejects any additional argument beginning with the single-dash `-f` token; native cases for `-f`, `-f/tmp/bypass`, and `-f=/tmp/bypass` all stop before callback invocation.

- Observation: The implementation distinguished cleanup failure after callback success from simultaneous callback and cleanup failures, but the initial suite exercised neither cleanup-error branch.
  Evidence: A cleanup-only injected test seam now deterministically fails removal after the callback settles. One native test proves the cleanup error is the `cause` and the message names the exact workspace; another proves `AggregateError.errors` preserves the callback error followed by the cleanup error.

## Decision Log

- Decision: Flatten build output into `/strapi/config`, `/strapi/src`, and `/strapi/build`, and package `/strapi/database/migrations`, `/strapi/node_modules`, `/strapi/package.json`, `/strapi/package-lock.json`, `/strapi/public`, `/strapi/favicon.png`, and the existing example-derived `/strapi/.env` beside them.
  Rationale: This is the application-root layout required by `BACKUP.md`. `dist/src` already includes compiled bootstrap code, API modules, content-type schemas, and component JSON. `dist/build` is the admin bundle. Keeping both package files gives the runtime its application identity and reproducible dependency metadata. Retaining the existing non-secret example `.env` preserves direct-image defaults, while production continues to set the absolute `ENV_PATH=/run/secrets/backend.env`; no live environment file is copied.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Assemble the flattened tree in a dedicated builder directory after `npm run build`, prune development-only dependencies with `npm prune --omit=dev`, and copy only that tree into the distroless stage.
  Rationale: An explicit assembly root makes inclusion and exclusion auditable and prevents an accidental whole-project copy. Pruning after the build retains Strapi's runtime dependency graph, including `@strapi/typescript-utils` and TypeScript where they are transitive production dependencies of Strapi, while excluding this application's development-only packages. No application compilation occurs after the builder stage.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Always create `/strapi/database/migrations` in the assembled tree and conditionally copy files from `dist/database/migrations` when that build output exists.
  Rationale: The present `.gitkeep` correctly produces no compiled file, but Strapi resolves this directory from the application root. The conditional copy supports future JavaScript emitted from repository migrations without failing today's image build or copying TypeScript source.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Keep the pinned distroless base, but overwrite `/nodejs/bin/node` from the exact pinned Node v24.20.0 builder stage.
  Rationale: The current distroless digest is still nonroot, shell-free, and suitable for the project, but its embedded v24.21.0 violates exact project parity. Copying the proven builder executable gives image preparation and runtime the same patch version without changing the project pin or relying on a mutable image name.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use `/staging` as the sole container path for export bases and import archives, `/tmp/strapi-workspaces` as the transient workspace parent, `/strapi` as the immutable application root, `/nodejs/bin/node` as the executable, and `/strapi/node_modules/@strapi/strapi/bin/strapi.js` as the CLI entrypoint.
  Rationale: Absolute fixed paths eliminate current-directory ambiguity. `/staging` is a declared disk-backed volume location and must never be placed on tmpfs; `/tmp` is appropriate only for small diagnostics and symlink workspaces. B10 will replace the image's anonymous/default staging volume behavior with the named project-scoped volume shared with `backupd`.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add `strapid/src/strapi-runtime.ts` with a callback-scoped workspace interface rather than starting any child process in B02.
  Rationale: B02 owns application mapping, path policy, CLI invocation shape, workspace creation, and cleanup. B03 owns `node:child_process`, signal propagation, stdout/stderr draining, process-tree termination, and the definition of confirmed child closure. The callback promise must settle only after B03 observes the child's `close` event; the B02 helper records the callback outcome and removes the workspace after that promise settles. This makes cleanup ordering reusable without implementing supervision early.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Symlink `config`, `src`, `build`, `database`, `node_modules`, `package.json`, `package-lock.json`, `public`, and `favicon.png` from each workspace to their absolute `/strapi` targets; do not link `tsconfig.json`, TypeScript source, data, staging, secrets, or diagnostics.
  Rationale: These names make the workspace a valid compiled Strapi application root. `ENV_PATH`, `DATABASE_FILENAME`, `SERVER_PUBLIC_FOLDER`, and the archive path remain absolute and therefore need no mutable application copy. The diagnostic file is the only expected workspace-local output.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Require the workspace helper's `filePath` to be absolute and contained by `/staging`, forbid every single-dash argument beginning with `-f` plus `--file` and `--file=...` in caller-supplied additional arguments, and require inherited `ENV_PATH`, SQLite `DATABASE_FILENAME`, and `SERVER_PUBLIC_FOLDER` to be absolute before invoking the callback.
  Rationale: Export must not silently write beneath the tmpfs workspace, and import must identify a deliberate disk-backed archive. Rejecting a second file option prevents the caller from overriding the validated path through Commander argument parsing. Absolute configuration paths keep the data-transfer child attached to the production or recovery storage selected by the caller rather than to workspace-relative files.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Test only the workspace's filesystem and invocation contract in B02; do not invoke Strapi export or import in an automated test.
  Rationale: Process-free Node unit tests are the lowest stable boundary for symlink targets, path rejection, writable diagnostics, and cleanup-after-callback behavior. Empty-database image startup is the repository-authorized Strapi verification. Actual export/import and recovery remain manual or belong to later lifecycle work, exactly as the queue requires.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Do not change `compose.yml`, `compose.prod.yml`, backend application code, content types, frontend application code, CI, release workflows, or image entrypoint ownership in B02.
  Rationale: B03 owns supervision, B10 owns Compose volumes and embedding `strapid`, and B12 owns CI/release delivery. B02 keeps the existing direct Node-to-Strapi CLI entrypoint and supplies the runtime/workspace foundation those later tasks consume.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Represent callback success or failure explicitly before workspace removal rather than throwing from `finally`.
  Rationale: This preserves the child result or original failure, lets a cleanup failure remain visible, aggregates the two failures when both occur, satisfies Biome's control-flow safety rule, and still guarantees that removal begins only after the callback promise settles.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Retain no generated OpenAPI artifact changes from B02.
  Rationale: The authoritative generators were run, but every observed delta was only a current-time example default from the ephemeral generator database. B02 changes no schema, so retaining nondeterministic timestamp churn would falsely suggest an API-surface change.
  Date/Author: 2026-10-29 / Codex worker

- Decision: Inject only the workspace-removal callback through an explicitly test-oriented hook for cleanup-failure tests; keep application roots, staging policy, symlink targets, executable, CLI path, environment validation, and production removal fixed.
  Rationale: Native filesystem permission tricks are not deterministic across execution identities. A cleanup-only seam is the smallest process-free mechanism that reaches both production error branches without creating a broader layout or invocation override and lets each test remove its exact leftover workspace in its own `finally` block.
  Date/Author: 2026-10-29 / Codex worker, remediation cycle 1

## Outcomes & Retrospective

B02 implementation and worker validation are complete. The backend image now contains a compiled-only application-root layout, exact Node v24.20.0, the direct Node-to-Strapi CLI interface, root-owned application assets, and nonroot writable seeds for `/data`, `/config`, and disk-backed `/staging`. `strapid` now provides the fixed-path callback-scoped export/import workspace boundary with absolute immutable symlinks, validated staging/configuration paths, writable diagnostics, and cleanup only after callback-confirmed child closure.

Canonical package checks and 16 process-free native tests pass after remediation cycle 1. The reviewer found no Docker/runtime-image issue, so the already-green backend compilation, API generators, native Docker build and layout inspection, exact Node comparison, and fresh empty-database startup remain authoritative and were not rerun. Strapi 5.52.0 reached its normal started state as `nonroot` with a read-only root filesystem, tmpfs `/tmp`, no published port, and task-owned empty volumes. The labeled validation container and volumes were removed after evidence. Generated artifacts have no retained semantic or timestamp-only diff, and `BACKUP.md` remains unchanged.

The first review found two workspace gaps: attached Commander `-f` forms could override the validated archive path, and cleanup-error behavior lacked canonical coverage. Remediation now rejects bare and attached short forms before workspace creation or callback invocation and deterministically covers cleanup failure after callback success plus simultaneous callback/cleanup failure. The same reviewer reran focused canonical validation, confirmed every Commander-supported `-f` form is blocked and the cleanup seam is narrowly scoped, and returned `APPROVED` and `REVIEW_READY`. B02 has no remaining implementation or plan gap and is checked in `TODO.md`.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. The active branch is `backup-system`; it tracks `origin/backup-system` at B01 commit `6eb812c436605d56b3c1baae358d8eaf5ba3b600` and must not be switched. The only unrelated worktree item is the untracked `.agents/skills/imagen/scripts/` directory. Preserve it exactly: do not read it into task output, format it, stage it, delete it, or include it in any cleanup.

`backend/Dockerfile` has a Debian 13 Node v24.20.0 build stage and a nonroot distroless Node 24 runtime stage. The builder installs all dependencies, compiles the TypeScript application, prunes development-only packages, and assembles a separate `/runtime/strapi` tree from emitted output. The runtime copies only that tree to `/strapi` and overwrites the distroless executable with the exact builder Node binary. It uses a read-only root filesystem under Compose, writable `/data`, `/config`, and `/staging` volumes, `/tmp` tmpfs, and this shell-free command interface:

    ENTRYPOINT ["/nodejs/bin/node", "/strapi/node_modules/@strapi/strapi/bin/strapi.js"]
    CMD ["start"]

Keep that direct CLI interface in B02. B03 will later make the supervisor own child invocation, and B10 will embed the complete `strapid` package and change container integration. B02 must not anticipate those entrypoint changes.

`backend/tsconfig.json` emits to `backend/dist`. Today the relevant build output is `dist/config/*.js`, `dist/src/index.js`, compiled bootstrap/config/application modules, content-type schema JSON, component JSON, and the built admin application in `dist/build/`. The repository has `backend/database/migrations/.gitkeep` but no migration implementation, so `dist/database/migrations` is absent today. The assembled runtime must nevertheless contain an empty `database/migrations` directory and copy compiled files into it whenever the build produces them.

Strapi calls the current directory the application directory. Its start command loads the current directory directly when `tsconfig.json` is absent. Export and import call `compileStrapi()`, but the installed compiler treats a directory without `tsconfig.json` as JavaScript and returns that same directory without compiling. It still loads `package.json`, configuration, schemas, components, bootstrap, plugins, database, public files, and migrations from application-root-relative locations. Therefore `/strapi` is a valid compiled application for serving, while a workspace containing symlinks to the same names is a valid application for data-transfer commands and a writable destination for their diagnostic log.

The workspace is a small temporary directory, not a second build and not a recovery point. Each invocation gets a unique directory below `/tmp/strapi-workspaces`. Its application entries are symlinks to immutable `/strapi`; Strapi writes its `export_<timestamp>.log` or `import_<timestamp>.log` into the workspace. The archive itself is addressed by an absolute path below `/staging`, which is disk-backed. `/data` remains the selected SQLite and media storage, `/config` remains XDG CLI state, and the process environment points at those absolute locations.

`strapid/` is the private ESM TypeScript package created by B01. It runs `.ts` directly under Node v24.20.0, uses explicit `.ts` imports and erasable syntax, and exposes `strapid:check` and `strapid:test` through root `mise.toml`. B02 adds a reusable module and unit tests there but does not package `strapid` into the backend image; B10 owns that image-context and service integration. This separation is intentional and must be clear in code and in the final review evidence.

The frontend's SSR and ISR architecture, CMS pipeline, and visible `NEXT_PUBLIC_APP_VERSION` are unaffected. No content-type change is authorized. `BACKUP.md` remains byte-for-byte unchanged. Because the backend image definition changes, repository policy requires regenerating `frontend/cms/schema.json` through `be:openapi` and `frontend/cms/schema.d.ts` through `fe:openapi`. No backend TypeScript type or schema changes are planned, so `be:types` is not required unless implementation unexpectedly changes backend types; such a change would be out of scope and should normally be reverted rather than accepted.

## Milestone 1: Package the compiled application and exact Node runtime

This milestone changes only `backend/Dockerfile`. At its end the build stage still compiles the current Strapi 5.52.0 application once, but it then assembles a separate runtime tree containing the compiled application and production dependency graph. The distroless stage receives that tree, the exact Node v24.20.0 executable from the builder, writable mount points owned by the nonroot user, and no application TypeScript or `tsconfig.json`.

In the build stage, retain the existing build arguments and `npm ci --include=dev`, source copies, example `.env`, and `npm run build`. After the build succeeds, run `npm prune --omit=dev`. Create an assembly directory such as `/runtime/strapi` and copy into it `dist/config` as `config`, `dist/src` as `src`, `dist/build` as `build`, pruned `node_modules`, `package.json`, `package-lock.json`, `public`, `favicon.png`, and the existing example-derived `.env`. Create `/runtime/strapi/database/migrations` unconditionally. If `dist/database/migrations` exists, copy its contents into that directory; never fall back to `backend/database` because that would package application TypeScript or other uncompiled source in a future revision.

In the distroless stage, copy the assembly directory to `/strapi` as root-owned immutable application content without applying a blanket executable mode to every file. Copy `/usr/local/bin/node` from the v24.20.0 builder to `/nodejs/bin/node` with root ownership and executable mode. Seed `/data/public` from the assembled public directory, and create or copy `/data`, `/config`, and `/staging` with `nonroot:nonroot` ownership so fresh Docker volumes inherit usable ownership without a privileged init process. Keep `USER nonroot`, the direct JSON `ENTRYPOINT`, `CMD ["start"]`, port 65101, absolute environment defaults, and distroless runtime. Declare `/data`, `/config`, and `/staging` as volumes; `/tmp` remains a runtime tmpfs supplied by Compose or by validation commands, never an image volume and never archive staging.

The expected application tree is:

    /strapi/
      .env
      build/
      config/
      database/migrations/
      favicon.png
      node_modules/
      package-lock.json
      package.json
      public/
      src/

There must be no `/strapi/dist`, `/strapi/tsconfig.json`, `/strapi/types`, application `.ts` or `.tsx` file under `/strapi/config`, `/strapi/src`, or `/strapi/database`, source `backend/config` copy, source `backend/src` copy, or development-time application build directory. TypeScript declarations or source shipped inside third-party `node_modules` are dependency-owned and are not prohibited by the application-source rule.

Build the image and inspect it as described under Concrete Steps. Milestone acceptance is a successful Docker build; a direct `/nodejs/bin/node` check reporting v24.20.0; all required paths present; all prohibited application paths absent; and `package.json` still reporting `@strapi/strapi` 5.52.0.

## Milestone 2: Establish the reusable data-transfer workspace boundary

This milestone adds `strapid/src/strapi-runtime.ts` and focused tests under `strapid/test/`. At its end later child supervision can ask the module for a complete direct-execution description, run one child until its streams have closed, and rely on the module to remove the transient workspace afterward. B02 itself starts no child and runs no Strapi export or import.

Define the exported immutable layout values for `/strapi`, `/nodejs/bin/node`, the installed CLI, `/tmp/strapi-workspaces`, and `/staging`. Define a `StrapiDataTransferOperation` union containing only `"export"` and `"import"`. Define a `StrapiCliInvocation` object with `executable`, `arguments`, `cwd`, and `environment`; its executable is the absolute Node path, its first argument is the absolute CLI path, its second is the operation, and its next arguments include `--file` followed by the separately supplied absolute staging path. Additional operation arguments remain explicit caller input so B04 can own export flags and manual recovery can own import confirmation behavior.

Expose one callback-scoped asynchronous function with this semantic interface; exact property readonly modifiers may follow the package's idiomatic TypeScript style, but the behavior and ownership must not vary:

    export type StrapiDataTransferOperation = "export" | "import";

    export interface StrapiWorkspaceRequest {
      operation: StrapiDataTransferOperation;
      filePath: string;
      arguments?: readonly string[];
      environment?: NodeJS.ProcessEnv;
    }

    export interface StrapiCliInvocation {
      executable: string;
      arguments: readonly string[];
      cwd: string;
      environment: NodeJS.ProcessEnv;
    }

    export async function withStrapiDataTransferWorkspace<T>(
      request: StrapiWorkspaceRequest,
      waitForChildClose: (invocation: StrapiCliInvocation) => Promise<T>,
    ): Promise<T>;

For testability, a private or explicitly test-oriented cleanup seam may replace only recursive workspace removal in tests; production callers receive the fixed layout, executable, and real removal and cannot redirect the immutable application root or executable through untrusted environment values. The function merges the current environment with request overrides, validates that `filePath` is an absolute descendant of `/staging`, rejects every Commander short file form beginning with `-f` plus `--file` and `--file=...` in the additional argument list, and validates that effective `ENV_PATH`, `DATABASE_FILENAME`, and `SERVER_PUBLIC_FOLDER` are absolute. Use path-relative containment logic, not string-prefix matching, so `/staging-other` is rejected. Reject invalid paths before creating a workspace.

Create the parent and a unique per-operation directory with `node:fs/promises`. Add absolute symlinks named `config`, `src`, `build`, `database`, `node_modules`, `package.json`, `package-lock.json`, `public`, and `favicon.png`. Pass the invocation to `waitForChildClose` and await it. Record the callback outcome, then remove only that unique workspace recursively, never the parent, application root, staging root, data root, or diagnostics before callback settlement. Preserve the child result or error while still surfacing cleanup failure meaningfully; do not silently leave a workspace or hide both failures. A concise comment should state the non-obvious invariant that B03's callback promise settles on child `close`, not merely after `spawn` or the earlier `exit` event.

Add process-free Node tests using `node:test`, `node:assert/strict`, and task-owned temporary directories. One test must prove every workspace entry is a symlink to the intended immutable asset, a diagnostic file can be written in `cwd`, the invocation is direct Node-to-CLI with no shell/npm/npx, and the workspace still exists while a deliberately deferred callback is pending but is gone after it resolves. A second test must prove relative configuration paths, paths outside staging, a `/tmp` archive path, bare and attached short `-f` forms, and long duplicate file options are rejected before the callback. A third test must prove callback rejection still cleans the workspace and preserves the failure. Two cleanup-seam tests must prove callback success plus cleanup failure reports the exact workspace and original cause, while callback failure plus cleanup failure produces an `AggregateError` preserving both errors in order. Do not spawn a fixture child here; B03 owns child-process integration coverage.

Run `mise run strapid:format`, `mise run strapid:check`, and `mise run strapid:test`. Expect the package check and all focused tests to pass with no generated JavaScript or build directory.

## Milestone 3: Regenerate contracts and prove the runtime from empty storage

This milestone refreshes the required generated API artifacts and validates the built image as it will run. It introduces no automated Strapi backend, export/import, smoke, end-to-end, browser, or deployment test. The startup check is a manual validation command against task-owned empty volumes, which is the repository's required Strapi verification boundary.

Run `mise run be:build`, `mise run be:openapi`, and `mise run fe:openapi`. The first command proves the authoritative compiler still emits the expected application. The latter two refresh `frontend/cms/schema.json` and `frontend/cms/schema.d.ts`. Because B02 changes no schema or API behavior, expect no semantic generated-artifact diff; if one appears, investigate the current source and generator determinism rather than accepting an unrelated API change. Do not run `be:types` unless an actual backend type change is discovered and authorized; none is planned.

Rebuild the backend image with the same public-URL build arguments Compose supplies. Use a direct Node filesystem inspection in the shell-free image because Docker's build and copy operations prove inclusion but do not natively prove the required absence of application TypeScript. The inspection must check the required and forbidden paths, recursively reject `.ts` and `.tsx` below application-owned `config`, `src`, and `database`, confirm package Strapi version 5.52.0, confirm `process.execPath` is `/nodejs/bin/node`, and compare `process.version` exactly with `mise exec -- node -p 'process.version'`.

Finally start the image with `--read-only`, task-owned fresh `/data`, `/config`, and `/staging` volumes, and a `/tmp` tmpfs. Pass non-secret disposable configuration values directly to this one container, publish no port, and mount no Docker socket or host path. Observe the normal Strapi startup banner and confirm the container remains running. This proves compiled configuration, schemas/components, bootstrap, dependencies, admin bundle paths, public assets, native SQLite dependency, and writable storage cooperate from an empty database. Stop and remove the container, then remove only the three volumes bearing the B02 validation label.

Milestone acceptance is green canonical validation, a green native image/layout inspection, an exact v24.20.0 runtime match, successful empty-database startup as nonroot with a read-only root filesystem, no unexpected generated API change, no content-type or frontend architecture change, and a scoped diff that preserves `BACKUP.md` and the unrelated untracked Imagen directory.

## Plan of Work

After this plan is approved and before production edits, modify `TODO.md` immediately under B02 to add:

    - Plan: [ExecPlan](.agents/plans/b02-prepare-the-compiled-strapi-runtime.md)

Leave the checkbox as `- [ ]`, and do not change the label, description, acceptance criteria, task order, or any later queue item. The coordinator may check B02 only after the reviewer returns both `APPROVED` and `REVIEW_READY`.

Implement Milestone 1 in `backend/Dockerfile`. Preserve Strapi 5.52.0, build arguments, bootstrap code, port and public URL behavior, the nonroot user, distroless base, read-only runtime expectation, direct CLI entrypoint, and existing public-data seeding. Replace the broad `/strapi` runtime copy with the assembled compiled-only root and add `/staging` as the disk-backed archive path. Copy the exact builder Node executable after the runtime base is selected.

Implement Milestone 2 in `strapid/src/strapi-runtime.ts` and `strapid/test/strapi-runtime.test.ts`, splitting the tests only if distinct cohesive helpers make another file clearer. Keep local imports explicit with `.ts`, type imports type-only, and all syntax erasable. Do not modify `strapid/src/main.ts` to start supervision, do not add runtime dependencies, and do not embed the package into the image in this task.

Then format only the changed `strapid` files, refresh required API artifacts, run Milestone 3 validation, and inspect the full scoped diff. Update this plan's living sections at each stopping point with timestamps, evidence, discoveries, decisions, and final outcomes. Do not edit `BACKUP.md`, content types, Compose, frontend presentation or data flow, `NEXT_PUBLIC_APP_VERSION`, CI, release workflows, host configuration, machine/user environment variables, or the unrelated Imagen directory.

## Concrete Steps

Work from `/home/codex/src/us-alb`. Before edits, reconfirm the protected baseline:

    git branch --show-current
    git rev-parse HEAD
    git rev-parse '@{upstream}'
    git status --short --branch
    mise exec -- node --version

Expect branch `backup-system`, both revisions at `6eb812c436605d56b3c1baae358d8eaf5ba3b600`, only `?? .agents/skills/imagen/scripts/`, and `v24.20.0`. Stop if the branch moved, if B01 is no longer pushed, or if an overlapping edit appears.

After approval, add the B02 plan link with a targeted patch. Implement the Dockerfile and workspace changes with targeted patches. Format and validate the package boundary:

    mise run strapid:format
    mise run strapid:check
    mise run strapid:test

Expect Biome and strict `tsc --noEmit` to pass and the process-free workspace tests to report zero failures. Confirm no emitted daemon artifact exists:

    find strapid -path 'strapid/node_modules' -prune -o -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print
    test ! -d strapid/dist
    test ! -d strapid/build

The `find` command must print nothing.

Refresh the compiled backend and API artifacts:

    ENV_PATH=/home/codex/src/us-alb/backend/.env.example mise run be:build
    ENV_PATH=/home/codex/src/us-alb/backend/.env.example mise run be:openapi
    mise run fe:openapi

All commands must exit zero. Inspect `git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts`; B02 should not produce a semantic API change. If generation changes either file, record why before retaining it. Do not run `be:types` unless implementation actually and permissibly changes backend types.

Build the image under a task-local tag:

    B02_IMAGE=us-alb/backend:b02-runtime
    docker build \
      --tag "$B02_IMAGE" \
      --build-arg SITE_URL=http://127.0.0.1:65102 \
      --build-arg CMS_PUBLIC_URL=http://127.0.0.1:65101 \
      --build-arg CMS_ADMIN_COOKIE_PATH=/admin \
      backend

The build must complete without compiling after the build stage. Inspect the shell-free image with its actual Node binary. The worker may place the following JavaScript in a carefully quoted `node -e` argument; do not add a tracked validator because this focused native inspection has no production owner:

    docker run --rm --read-only \
      --entrypoint /nodejs/bin/node \
      "$B02_IMAGE" \
      -e '
        const fs = require("node:fs");
        const path = require("node:path");
        const required = [
          "/strapi/config",
          "/strapi/src/index.js",
          "/strapi/src/components",
          "/strapi/build/index.html",
          "/strapi/database/migrations",
          "/strapi/node_modules/@strapi/strapi/bin/strapi.js",
          "/strapi/package.json",
          "/strapi/package-lock.json",
          "/strapi/public",
          "/strapi/favicon.png",
        ];
        const forbidden = [
          "/strapi/dist",
          "/strapi/tsconfig.json",
          "/strapi/types",
        ];
        for (const entry of required) fs.accessSync(entry, fs.constants.R_OK);
        for (const entry of forbidden) {
          if (fs.existsSync(entry)) throw new Error(`unexpected runtime path: ${entry}`);
        }
        const walk = (root) => {
          for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            const candidate = path.join(root, entry.name);
            if (entry.isDirectory()) walk(candidate);
            if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
              throw new Error(`application TypeScript in runtime: ${candidate}`);
            }
          }
        };
        for (const root of ["/strapi/config", "/strapi/src", "/strapi/database"]) walk(root);
        const pkg = require("/strapi/package.json");
        if (pkg.dependencies["@strapi/strapi"] !== "5.52.0") throw new Error("Strapi version changed");
        if (process.execPath !== "/nodejs/bin/node") throw new Error(`unexpected node path: ${process.execPath}`);
        console.log(JSON.stringify({ node: process.version, strapi: pkg.dependencies["@strapi/strapi"] }));
      '

Compare exact Node versions rather than visually comparing an image name:

    B02_EXPECTED_NODE="$(mise exec -- node -p 'process.version')"
    B02_ACTUAL_NODE="$(docker run --rm --entrypoint /nodejs/bin/node "$B02_IMAGE" -p 'process.version')"
    test "$B02_ACTUAL_NODE" = "$B02_EXPECTED_NODE"

Both values must be `v24.20.0`.

The absolute process-local `ENV_PATH` above supplies the tracked non-secret example values required by the current admin configuration. It does not create a project `.env` or alter machine/user environment configuration. A bare build in a worktree without `backend/.env` stops after compilation because `SITE_URL` is intentionally required.

For empty-database startup, reserve these exact task-owned resources: container `us-alb-b02-backend`, and volumes `us-alb-b02-data`, `us-alb-b02-config`, and `us-alb-b02-staging`. Before creating anything, inspect any existing resource with those names. Reuse or remove it only if its label `us-alb.validation=b02` proves it belongs to an interrupted B02 validation; otherwise stop rather than deleting another user's resource.

Create the volumes with the ownership-seeding behavior of the image:

    docker volume create --label us-alb.validation=b02 us-alb-b02-data
    docker volume create --label us-alb.validation=b02 us-alb-b02-config
    docker volume create --label us-alb.validation=b02 us-alb-b02-staging

Start the backend without publishing a port and without a host bind mount:

    docker run --detach \
      --name us-alb-b02-backend \
      --label us-alb.validation=b02 \
      --read-only \
      --tmpfs /tmp:rw,nosuid,nodev,noexec,mode=1777 \
      --mount type=volume,src=us-alb-b02-data,dst=/data \
      --mount type=volume,src=us-alb-b02-config,dst=/config \
      --mount type=volume,src=us-alb-b02-staging,dst=/staging \
      --env ENV_PATH=/dev/null \
      --env DATABASE_CLIENT=sqlite \
      --env DATABASE_FILENAME=/data/b02-empty.db \
      --env SERVER_PUBLIC_FOLDER=/data/public \
      --env HOST=127.0.0.1 \
      --env PORT=65101 \
      --env SITE_URL=http://127.0.0.1:65100 \
      --env CMS_PUBLIC_URL=http://127.0.0.1:65101 \
      --env APP_KEYS=b02-key-one,b02-key-two \
      --env API_TOKEN_SALT=b02-api-token-salt \
      --env ADMIN_JWT_SECRET=b02-admin-jwt-secret \
      --env TRANSFER_TOKEN_SALT=b02-transfer-token-salt \
      --env JWT_SECRET=b02-jwt-secret \
      --env ENCRYPTION_KEY=b02-encryption-key \
      --env PREVIEW_SECRET=b02-preview-secret \
      "$B02_IMAGE"

Follow the logs until Strapi prints its ordinary started banner, then detach from log following with Ctrl-C; exact prose and timing are not an API and must not become an assertion:

    docker logs --follow us-alb-b02-backend

Confirm the container is still running as the distroless nonroot user with a read-only root filesystem:

    docker inspect --format '{{.State.Running}} {{.Config.User}} {{.HostConfig.ReadonlyRootfs}}' us-alb-b02-backend

Expect `true nonroot true`. This startup is against the newly created empty SQLite volume. It is not an automated backend or smoke test and does not invoke export/import.

Stop and remove only the labeled task-owned resources after evidence is recorded:

    docker stop --time 10 us-alb-b02-backend
    docker rm us-alb-b02-backend
    docker volume rm us-alb-b02-data us-alb-b02-config us-alb-b02-staging

If startup fails, retain the labeled volumes long enough to inspect secret-free logs and image layout, then remove only these same exact resources after diagnosis. Never use `docker system prune`, a broad volume prune, a privileged container, `sudo`, or a published host port.

Finish with scope and hygiene checks:

    git diff --check
    git diff -- BACKUP.md
    git status --short --branch
    git diff -- backend/Dockerfile strapid TODO.md frontend/cms/schema.json frontend/cms/schema.d.ts .agents/plans/b02-prepare-the-compiled-strapi-runtime.md

`git diff -- BACKUP.md` must be empty. The status must still show the unrelated `.agents/skills/imagen/scripts/` directory untracked and untouched. The task diff must contain only the approved plan link, Dockerfile/runtime work, workspace module/tests, generated artifacts if the generators made justified changes, and this living plan. Do not commit or push as the planner or worker in the planning-only request; the configured workflow coordinator owns those later actions after review.

## Validation and Acceptance

B02 is accepted when a human can build the backend image and see that the runtime is a compiled application rather than a TypeScript project. `/strapi/config` and `/strapi/src` contain emitted JavaScript and schema/component JSON, `/strapi/build` contains the admin bundle, `/strapi/database/migrations` exists and contains emitted migrations when any exist, and matching dependencies, package metadata, public assets, favicon, and the example-derived fallback environment file are present. `/strapi/dist`, application TypeScript, `tsconfig.json`, and generated application type source are absent.

The image must execute `/nodejs/bin/node /strapi/node_modules/@strapi/strapi/bin/strapi.js start` through JSON `ENTRYPOINT` and `CMD`, with no shell, npm, npx, loader, or runtime compiler. Direct inspection of the actual binary must report `/nodejs/bin/node` and `v24.20.0`, exactly matching root Mise. Merely retaining a `nodejs24` base name is not evidence.

The workspace API is accepted when focused native Node tests prove that it creates one unique writable directory below `/tmp/strapi-workspaces`, links every required application-root asset by absolute target, builds a direct Node-to-Strapi invocation, accepts only absolute configuration paths and a file below `/staging`, rejects every Commander-supported duplicate file option before callback invocation, and removes the workspace only after the callback representing child closure has settled. It must clean on both success and failure without removing immutable assets, staging, data, configuration, or the workspace parent. Cleanup failure after success must preserve its cause and exact workspace path; simultaneous callback and cleanup failures must preserve both through `AggregateError`. No test may invoke Strapi export/import or start an external process.

The runtime is accepted when the built image starts Strapi 5.52.0 from fresh task-owned empty data and config volumes, with a disk-backed staging volume and `/tmp` tmpfs, as `nonroot` under a read-only root filesystem. No port is published. The normal startup banner plus a still-running container establishes the allowed empty-database verification; no health request, browser, smoke suite, or export/import run is added.

Canonical validation for the changed areas is `mise run strapid:check`, `mise run strapid:test`, `mise run be:build`, `mise run be:openapi`, and `mise run fe:openapi`, followed by the native Docker build, image inspection, exact binary comparison, and empty-database startup above. `mise.toml` defines no backend test or lint task, and repository policy forbids adding Strapi backend tests. Run `be:types` only if backend types change; no such change is in scope. All applicable commands must pass without errors before worker handoff.

Acceptance also requires no Strapi upgrade, content-type change, bootstrap change, Compose integration, frontend SSR/ISR or CMS pipeline change, `NEXT_PUBLIC_APP_VERSION` regression, machine/user environment alteration, unsafe port, privileged container, automated recovery claim, or change to `BACKUP.md`. The unrelated Imagen scripts remain untracked and untouched. B02 remained unchecked until independent reviewer approval and was checked only after the required handoff.

## Idempotence and Recovery

The Docker build, package checks, generators, and image inspection are repeatable. The builder always starts from `npm ci`, rebuilds `dist`, prunes only its container-local dependency tree, and assembles a fresh runtime root. It never edits the host's `backend/node_modules` or copies host `dist` because both are excluded by `backend/.dockerignore`. Re-running package formatting is idempotent after the first pass.

Workspace creation uses a unique directory and cleanup targets only the path returned by `mkdtemp`. Path validation occurs before directory creation. The helper must not recursively remove a caller-supplied path, `/tmp/strapi-workspaces` itself, `/tmp`, `/staging`, `/data`, `/config`, or `/strapi`. If cleanup fails, report the exact workspace path without exposing environment values or diagnostic contents; a later operator may remove that one path after confirming no child is using it. B03 remains responsible for ensuring its callback does not settle until child closure is confirmed.

The three validation volumes use fixed names and the label `us-alb.validation=b02`. A rerun begins by inspecting those exact resources. If they exist with the matching label and no associated container is running, they are recoverable leftovers and may be removed before a fresh run. If the label is absent or a container still uses them, stop and investigate. Never broaden cleanup with globs, unresolved variables, or Docker prune commands.

If empty-database startup fails, first preserve the task-owned volumes and inspect `docker logs`, `docker inspect`, and the image layout. Correct the Dockerfile or runtime configuration, rebuild under the same local tag, and rerun with freshly recreated labeled volumes so the database is genuinely empty. Do not point validation at the repository's development database or a prestarted Compose stack.

If generated API artifacts change unexpectedly, do not hand-edit them. Re-run the authoritative generators under root Mise, compare the schema-producing backend source, and retain a change only when it follows from an authorized source change. B02 authorizes no schema or content-type change, so an unexplained generated diff is a blocker to handoff.

If the copied Node executable ceases to run in a future distroless base, do not weaken the exact-version assertion or switch to a shell-bearing runtime. Stop and select a pinned compatible distroless base or matching exact Node artifact, record the new evidence in this plan, and preserve root `mise.toml` as the single project version authority.

## Artifacts and Notes

Planning established this version mismatch:

    $ docker run --rm --entrypoint /nodejs/bin/node \
        gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e \
        --version
    v24.21.0

    $ mise exec -- node --version
    v24.20.0

The selected correction was prototyped without changing repository files:

    copied /usr/local/bin/node from the pinned node:24.20.0-trixie builder
    into /nodejs/bin/node in the pinned distroless runtime

    $ <disposable-image> --version
    v24.20.0

    $ <disposable-image> -p 'process.execPath + " " + process.version'
    /nodejs/bin/node v24.20.0

Installed Strapi 5.52.0 source establishes these contracts used by the plan:

    start without tsconfig.json: appDir = cwd, distDir = cwd
    export/import compileStrapi without tsconfig.json: appDir = cwd, distDir = cwd
    diagnostic output: path.resolve(process.cwd(), `${operation}_${Date.now()}.log`)
    migration directory: path.join(projectDir, "database/migrations")
    public directory: absolute configured server.dirs.public resolved from appDir
    package identity: require(path.resolve(appDir, "package.json"))

The final worker evidence should record command outcomes, not full secret-bearing logs. Include Node and Strapi versions, required/forbidden layout success, focused workspace-test counts, generated-artifact diff status, container user/read-only state, and confirmation that the empty-database startup used task-owned volumes with no published port. Do not retain SQLite contents, diagnostic files, environment dumps, or an export archive as evidence.

Worker validation produced this concise evidence:

    strapid:check: Biome clean; tsc --noEmit passed
    strapid:test after remediation cycle 1: 16 passed, 0 failed; no external process started
    duplicate file options: -f, -fVALUE, -f=VALUE, --file, and --file=VALUE rejected before callback
    cleanup failure: success path preserved cause/path; dual-failure path preserved both errors in AggregateError
    be:build, be:openapi, fe:openapi: passed with tracked example ENV_PATH where required
    generated artifacts: refreshed; timestamp-only generator churn removed; final diff empty
    image layout: required compiled paths present; application TypeScript, dist, tsconfig.json, and types absent
    runtime identity: {"node":"v24.20.0","strapi":"5.52.0"}
    entrypoint: /nodejs/bin/node /strapi/node_modules/@strapi/strapi/bin/strapi.js; command start
    empty startup: Strapi started successfully; true running 0 nonroot true; no port bindings
    cleanup: us-alb-b02-backend and us-alb-b02-data/config/staging removed after label verification

Independent review repeated the native package checks, backend build, Docker build, compiled-layout inspection, exact runtime identity check, and fresh empty-database startup. The reviewer verified shell/npm/npx absence, nonroot read-only operation, no published ports, and removal of the exact labeled validation resources. After remediation cycle 1, focused re-review passed `strapid:check`, all 16 process-free tests, `git diff --check`, workspace-residue checks, and argument-parser reproduction, then returned `APPROVED` and `REVIEW_READY`.

## Interfaces and Dependencies

`backend/Dockerfile` remains the only backend image definition. Its build stage uses the exact existing Node v24.20.0 image and npm lockfile, Strapi's existing `npm run build`, and ordinary builder shell/file utilities. Its runtime stage remains the exact pinned distroless Debian 13 image, with `/nodejs/bin/node` replaced by the exact builder executable. No package version changes are needed: `backend/package.json` and `backend/package-lock.json` continue to pin `@strapi/strapi`, `@strapi/database`, `@strapi/plugin-cloud`, and `@strapi/plugin-users-permissions` at 5.52.0.

The immutable runtime interface is:

    application root       /strapi
    Strapi CLI              /strapi/node_modules/@strapi/strapi/bin/strapi.js
    Node executable         /nodejs/bin/node
    SQLite/media storage    /data
    XDG CLI state           /config
    archive staging         /staging
    temporary scratch       /tmp
    workspace parent        /tmp/strapi-workspaces

`/data`, `/config`, and `/staging` are disk-backed volume locations. `/tmp` is tmpfs and holds only bounded scratch, workspace symlinks, and Strapi diagnostic logs. `ENV_PATH`, `DATABASE_FILENAME`, `SERVER_PUBLIC_FOLDER`, and every export/import file path are absolute. Archives never use `/tmp`.

`strapid/src/strapi-runtime.ts` depends only on Node built-ins, principally `node:fs/promises` and `node:path`. It adds no npm runtime dependency and follows B01's native TypeScript rules. Its public interface is `StrapiDataTransferOperation`, `StrapiWorkspaceRequest`, `StrapiCliInvocation`, and `withStrapiDataTransferWorkspace`. Production layout constants may also be exported for B03 and B13, but there must be one authoritative mapping rather than duplicated literal paths across future modules.

`strapiRuntimeTestHooks.withCleanup` is an explicitly test-oriented seam that replaces only the unique workspace's removal callback. It cannot redirect application assets, staging, Node, the Strapi CLI, environment validation, workspace creation, or invocation arguments. Production callers use `withStrapiDataTransferWorkspace`, which always selects the real recursive removal implementation.

The callback passed to `withStrapiDataTransferWorkspace` is the ownership boundary. B02 guarantees a complete workspace before calling it and cleanup after its returned promise settles. B03 must later implement that promise by spawning `invocation.executable` with `invocation.arguments`, `cwd`, `environment`, and no shell, and resolving only after the child `close` event confirms exit plus stdio closure. B02 does not define lifecycle deadlines, signals, forced termination, serving/export mutual exclusion, or health checks; those are B03 responsibilities.

B04 will supply export-specific arguments such as `--no-encrypt` and `--no-compress` and the run-specific file base below `/staging`. B05 will own staging allocation, size enforcement, archive validation, and cleanup after exporter ownership is released. B10 will embed `strapid` in the backend image and wire the named project staging and coordination volumes. B13 will document the exact manual import invocation and recovery storage identity. These later owners may consume this interface but must not duplicate or weaken its application mapping, absolute path checks, disk-staging rule, or cleanup-after-close invariant.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B02 implementation plan after full authoritative-input review, current official documentation research, installed Strapi 5.52.0 source inspection, and a disposable exact-Node compatibility prototype. The plan resolves the compiled runtime tree, v24.20.0 binary parity, direct CLI invocation, reusable workspace/child-close boundary, `/staging` versus `/tmp` ownership, generated artifacts, native image checks, empty-database startup, later-task boundaries, and safe cleanup without changing `BACKUP.md` or production files.

Revision note (2026-10-29 / Codex worker): Recorded completed implementation and worker validation, the explicit callback-outcome cleanup structure selected after Biome rejected `finally` throws, the process-local example environment needed by canonical backend commands, generator timestamp nondeterminism and its non-retention, exact image/runtime/startup evidence, and safe removal of the labeled B02 validation resources. B02 remains unchecked and uncommitted pending independent review and coordinator bookkeeping.

Revision note (2026-10-29 / Codex worker, remediation cycle 1): Recorded the independent review findings, broadened duplicate file-option rejection to every Commander short `-f` form, added the cleanup-only deterministic test seam and both cleanup-error outcome tests, updated acceptance and interface ownership, and corrected validation evidence from 12 to 16 passing native tests. Docker/runtime-image evidence was not rerun because the reviewer found it green and remediation changed only `strapid` workspace code, tests, and this plan.

Revision note (2026-10-29 / Codex coordinator): Recorded independent approval and repeated validation evidence after remediation cycle 1, closed the final review Progress item, finalized Outcomes & Retrospective, reconciled the checked task state, and checked B02 in `TODO.md` only after the reviewer returned `APPROVED` and `REVIEW_READY`.

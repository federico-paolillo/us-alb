# Establish daemon packages and tooling

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md` from the repository root. The authoritative task is the `B01 — Establish daemon packages and tooling` item in `TODO.md`; `BACKUP.md` is the authoritative backup design and must remain unchanged.

## Purpose / Big Picture

After this task, the repository has two independent private npm packages, `backupd/` for the future backup scheduler and publisher and `strapid/` for the future Strapi process supervisor. A contributor can reproducibly install either package, format and lint it with its own Biome configuration, type-check it under strict settings compatible with Node's native TypeScript type stripping, invoke its `.ts` entrypoint directly with the project-pinned Node runtime, and run its native Node test command. Root Mise tasks expose the same checks without adding a second runtime pin.

This milestone deliberately adds no scheduling, process supervision, sockets, storage, telemetry, or other daemon behavior. The observable result is a working toolchain: both no-op entrypoints execute without a loader or generated JavaScript, both package checks pass, and both native test commands run successfully with zero tests until later queue items introduce behavior worth testing.

## Progress

- [x] (2026-10-29 11:21Z) Read `AGENTS.md`, all of `TODO.md` and `BACKUP.md`, `.agents/docs/PLANS.md`, and the `implement-task` and `canonical-validation` skills; inspected the active branch, worktree, existing frontend tooling, root Mise tasks, CI, and current runtime.
- [x] (2026-10-29 11:21Z) Consulted current Node.js 24, TypeScript 5.9, and Biome documentation through Context7 and recorded the package and compiler decisions below.
- [x] (2026-10-29 11:25Z) Added the approved ExecPlan link beneath B01 in `TODO.md` without checking the B01 checkbox.
- [x] (2026-10-29 11:25Z) Added the independent `backupd/` package manifest, local TypeScript and Biome configurations, no-op TypeScript entrypoint, and npm-generated lockfile.
- [x] (2026-10-29 11:25Z) Added the matching independent `strapid/` package manifest, local TypeScript and Biome configurations, no-op TypeScript entrypoint, and npm-generated lockfile.
- [x] (2026-10-29 11:25Z) Added root `mise.toml` tasks for each package's lint, format, typecheck, check, and native test scripts.
- [x] (2026-10-29 11:28Z) Installed both packages reproducibly, formatted them through their package scripts, and ran direct-entrypoint, canonical check, native test, task-listing, symmetry, artifact, and repository hygiene validations successfully after adding the package-local ignore files required by Biome 2.4.2.
- [x] (2026-10-29 11:35Z) Remediated independent-review plan findings by adding an independently verifiable narrative milestone and correcting ignore-pattern ownership; implementation files remained unchanged.
- [x] (2026-10-29 11:37Z) Obtained independent reviewer approval after one plan-only remediation cycle; the workflow coordinator then checked B01 and finalized this living plan with the review result and evidence.

## Surprises & Discoveries

- Observation: The current worktree is clean except for the pre-existing unrelated untracked `.agents/skills/imagen/scripts/` directory.
  Evidence: `git status --short --branch` reported only `?? .agents/skills/imagen/scripts/` on `backup-system...origin/backup-system`. This directory must remain untracked and untouched.

- Observation: A TypeScript project with only `include` globs and no source files fails rather than acting as a valid empty scaffold.
  Evidence: TypeScript 5.9.3 reports `TS18003: No inputs were found` for an otherwise valid configuration. Each package therefore needs one minimal `src/main.ts` input, but no fabricated runtime behavior or test.

- Observation: On the exact project runtime, `node --test` succeeds when no test files exist and reports a truthful zero-test summary.
  Evidence: Node v24.20.0 reported `tests 0`, `pass 0`, and `fail 0` with exit status zero. This allows the native test interface to exist without adding meaningless scaffold assertions.

- Observation: Node 24 discovers `.test.ts` and `test/**/*.ts` files under `node --test` when native type stripping is enabled.
  Evidence: The current Node 24 test-runner documentation lists `.ts`, `.mts`, and `.cts` alongside JavaScript in its default discovery patterns. Later tasks can therefore add TypeScript tests without a loader or transpilation.

- Observation: Biome 2.4.2 requires an ignore file in each independent package project even when `vcs.root` points to the enclosing repository.
  Evidence: Both first `mise run <package>:format` invocations failed with `Biome couldn't find an ignore file in the following folder` and named the package directory. Current official Biome documentation retrieved through Context7 recommends `vcs.root: "../"` for a nested configuration, but both commands returned the same package-directory error after that change under the pinned 2.4.2 binary. Minimal package-local `.gitignore` files are therefore required for independent invocation.

## Decision Log

- Decision: Keep Node `24.20.0` pinned only in the repository-root `mise.toml`; do not add `engines.node`, `.nvmrc`, `.node-version`, `.tool-versions`, nested `mise.toml`, or another runtime declaration to either package.
  Rationale: `BACKUP.md` makes the root Mise pin the single project-wide runtime authority and expressly forbids independent runtime pins. Validation will prove the selected binary with `mise exec -- node --version`.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use exact development dependency versions `@biomejs/biome` `2.4.2`, `typescript` `5.9.3`, and `@types/node` `24.19.2` in both package manifests.
  Rationale: Biome must match the frontend's exact version. TypeScript 5.9.3 is the existing frontend lockfile's resolved TypeScript 5 version and supports `erasableSyntaxOnly`; Node's documentation recommends TypeScript 5.8 or newer for native type stripping. The Node type declarations follow the runtime major and are the latest available Node 24 declarations found during planning. Exact manifest versions plus committed npm lockfiles make both small tooling packages reproducible and symmetrical.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Give each package a minimal `src/main.ts` containing only `export {};` and a `start` script that runs `node src/main.ts`.
  Rationale: TypeScript needs an input file for `tsc --noEmit`, and the task must demonstrate direct `.ts` execution. An empty ESM module has no artificial daemon behavior and creates no premature interface for later tasks to preserve.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Add a native `test` script with the exact command `node --test`, but add no test files in B01.
  Rationale: The command natively discovers and executes future `.ts` tests. A test of `export {};`, a constant, or package metadata would be meaningless and would violate the explicit calibration in B01 and the repository verification guidelines.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Use `backupd:<action>` and `strapid:<action>` for the ten new root Mise task names, without aggregate tasks or install tasks.
  Rationale: This follows the existing concern-prefixed Mise task convention while keeping the service names unambiguous. Existing dependency installation is performed directly with `npm ci`; duplicating it as a Mise task would not expose one of the check, format, or test interfaces required by `BACKUP.md`.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Do not modify CI in B01.
  Rationale: B12 explicitly owns CI and release delivery. B01 establishes local package and root Mise interfaces that B12 can call later, avoiding an out-of-order queue change.
  Date/Author: 2026-10-29 / Codex planner

- Decision: Give each package a minimal `.gitignore` for `node_modules/`, `dist/`, and `build/`, and leave `vcs.root` implicit in the otherwise identical package-local Biome configurations.
  Rationale: The pinned Biome binary continued to require an ignore file in the package directory even with the documented parent VCS root configured. These package-local patterns match the package's dependency and forbidden output directories, let `useIgnoreFile` remain enabled, and make each package toolchain independently runnable without an ineffective configuration option.
  Date/Author: 2026-10-29 / Codex worker

## Outcomes & Retrospective

The completed B01 implementation gives the repository symmetric, independent `backupd/` and `strapid/` private packages with npm-generated lockfiles, strict no-emit erasable TypeScript configurations, package-local Biome 2.4.2 tooling, direct `.ts` entrypoints, honest zero-test native test commands, and ten root Mise task interfaces. No runtime daemon behavior, loader, transpilation path, nested runtime pin, generated JavaScript, backend/frontend/CI/environment change, or `BACKUP.md` change was introduced.

The only implementation adjustment from the initial plan is a matching `.gitignore` in each package because the pinned Biome binary requires an ignore file at the independent package project root when `useIgnoreFile` is enabled. Worker and independent-review validation remained green after that correction. The initial review found two documentation-only gaps: the plan needed a narrative milestone and precise ignore-pattern ownership. The worker corrected both without changing implementation files, and the same reviewer then returned `APPROVED` and `REVIEW_READY`. B01 has no remaining implementation or plan gap and is checked in `TODO.md`.

## Context and Orientation

The active branch is `backup-system` and it must not be switched. At planning time it tracks `origin/backup-system` at commit `a02a11b`. The repository root is `/home/codex/src/us-alb`. The only pre-existing worktree item is the unrelated untracked `.agents/skills/imagen/scripts/` directory; never add, delete, format, stage, or otherwise alter it as part of B01.

`mise.toml` is the only project runtime configuration. Its `[tools]` section selects Node `24.20.0`, and its existing tasks use a concern-prefixed name, a package directory, and an npm script. `frontend/package.json` pins `@biomejs/biome` `2.4.2` and supplies the script conventions that B01 must follow. `frontend/biome.json` establishes the applicable style: Git-aware ignores, recommended lint rules, import organization, two-space indentation, double quotes, and semicolons. Its Next.js, React, Tailwind CSS, and CSS parser settings do not apply to server-side daemon packages.

The B01 implementation creates `backupd/` and `strapid/` as tooling-only package boundaries. In the backup design, a daemon is a long-running Node process, but the current `src/main.ts` files are intentionally empty ESM modules. Later tasks will give `backupd` scheduling, staging, archive, upload, state, and telemetry responsibilities and will give `strapid` Strapi child-process, capture-window, socket, and recovery responsibilities. B01 must not anticipate those implementations.

Node's native type stripping means Node removes erasable TypeScript type syntax while loading `.ts` files; it does not type-check code and does not read `tsconfig.json`. Consequently, runtime execution uses `node src/main.ts`, while static correctness is a separate `tsc --noEmit` command. `erasableSyntaxOnly` rejects constructs such as runtime enums, parameter properties, and instantiated namespaces that would require JavaScript generation. `verbatimModuleSyntax` and `allowImportingTsExtensions` support the design rule that local value imports include `.ts` and types use `import type`. There is no `tsx`, `ts-node`, custom loader, bundler, emitted JavaScript, or path alias.

The root `.gitignore` ignores `node_modules/` at any depth for Git, but it does not list `dist/` or `build/`. Each package-local `.gitignore` owns all three package patterns—`node_modules/`, `dist/`, and `build/`—so the pinned Biome 2.4.2 binary can apply them when either package is invoked independently with `useIgnoreFile` enabled. `TODO.md` is workflow bookkeeping: the approved plan link is indented immediately beneath the B01 checkbox label using the repository-relative target `.agents/plans/b01-establish-daemon-packages-and-tooling.md`. B01 remained unchecked throughout implementation and review; the coordinator changed it to `- [x]` only after the reviewer returned both `APPROVED` and `REVIEW_READY`.

## Milestone

The single B01 milestone establishes the two behavior-free daemon package boundaries and their complete local tooling. At its end, `backupd/` and `strapid/` are independent private npm packages with committed lockfiles, strict no-emit erasable TypeScript policy, package-local Biome 2.4.2 policy, direct `.ts` entrypoints, native test commands, and matching root Mise interfaces. The milestone adds no daemon behavior; its resulting capability is that a contributor can install, execute, check, and test either scaffold using only the repository-root Node 24.20.0 pin.

Verify the milestone from `/home/codex/src/us-alb` with these exact commands:

    mise exec -- npm ci --prefix backupd
    mise exec -- npm ci --prefix strapid
    mise exec -- npm start --prefix backupd
    mise exec -- npm start --prefix strapid
    mise run backupd:check
    mise run backupd:test
    mise run strapid:check
    mise run strapid:test
    mise tasks

Both clean installs must succeed independently. Each start command must run `node src/main.ts`, exit zero without application output, and create no JavaScript or build directory. Each check must report a clean Biome pass followed by a successful strict `tsc --noEmit`; each native test command must report zero failures and, while B01 remains behavior-free, zero tests. `mise tasks` must list lint, format, typecheck, check, and test entries for both packages. These observable results independently establish completion of the milestone.

## Plan of Work

First, after plan approval and before implementation begins, update `TODO.md` under B01 with an indented plan link. A suitable line is:

    - Plan: [ExecPlan](.agents/plans/b01-establish-daemon-packages-and-tooling.md)

Do not change the B01 label, order, description, acceptance criteria, or checkbox state.

Create `backupd/package.json` and `strapid/package.json` as intentionally identical tooling manifests except for the package `name`. Each manifest has version `0.1.0`, `private: true`, and `type: "module"`. It defines `start` as `node src/main.ts`, `lint` as `biome check`, `format` as `biome format --write`, `typecheck` as `tsc --noEmit`, `check` as `npm run lint && npm run typecheck`, and `test` as `node --test`. It has no runtime dependencies and no Node pin. Its development dependencies are exactly `@biomejs/biome: "2.4.2"`, `@types/node: "24.19.2"`, and `typescript: "5.9.3"`.

Create `backupd/tsconfig.json` and `strapid/tsconfig.json` with identical compiler policy. Enable `allowImportingTsExtensions`, `erasableSyntaxOnly`, `noEmit`, `noUncheckedIndexedAccess`, `strict`, and `verbatimModuleSyntax`. Use `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `target: "ESNext"`, and `types: ["node"]`. Include `src/**/*.ts` and `test/**/*.ts`. Do not add output directories, path aliases, decorators, JSX, JavaScript inputs, or options that generate code. All future relative local imports in source and tests must spell the `.ts` extension, and any import used only as a type must use `import type` or an inline `type` specifier.

Create `backupd/biome.json` and `strapid/biome.json` with identical package-local configuration. Point `$schema` to `https://biomejs.dev/schemas/2.4.2/schema.json`. Enable Git VCS integration and `useIgnoreFile`, set `files.ignoreUnknown` to true, and include all package files except `node_modules`, `dist`, and `build`. Enable the formatter with spaces and width two. Enable recommended linter rules. Enable source import organization under `assist.actions.source.organizeImports`. Under `javascript`, enable assist and configure double quotes and always-present semicolons. Do not copy frontend-only CSS, Tailwind, Next.js, or React settings.

Add matching `backupd/.gitignore` and `strapid/.gitignore` files containing only `node_modules/`, `dist/`, and `build/`. The package-local files own all three package patterns, are required by the pinned Biome version when `useIgnoreFile` is enabled, and make each package invocation self-contained. The root `.gitignore` separately covers only `node_modules/` repository-wide; it does not list `dist/` or `build/`.

Create `backupd/src/main.ts` and `strapid/src/main.ts`, each containing only:

    export {};

These files establish a valid ESM TypeScript entrypoint and satisfy TypeScript's need for an input without pretending either daemon is implemented. Do not add test files, fixtures, logs, timers, signal handlers, configuration parsing, placeholder assertions, or generated JavaScript in B01.

Generate `backupd/package-lock.json` and `strapid/package-lock.json` from their manifests with the root-selected Node/npm toolchain. Keep both lockfiles as task-owned files for the coordinator's eventual workflow commit. Do not hand-edit npm resolution, integrity, optional platform package, or lockfile metadata. Each lockfile must be usable by `npm ci` from a clean package installation.

Extend root `mise.toml` with five tasks for each package. Every task names its purpose in `description`, sets `dir` to the package directory, and delegates to the matching npm script. The exact task names and runs are:

    [tasks."backupd:lint"]       dir = "backupd"  run = "npm run lint"
    [tasks."backupd:format"]     dir = "backupd"  run = "npm run format"
    [tasks."backupd:typecheck"]  dir = "backupd"  run = "npm run typecheck"
    [tasks."backupd:check"]      dir = "backupd"  run = "npm run check"
    [tasks."backupd:test"]       dir = "backupd"  run = "npm test"
    [tasks."strapid:lint"]       dir = "strapid"  run = "npm run lint"
    [tasks."strapid:format"]     dir = "strapid"  run = "npm run format"
    [tasks."strapid:typecheck"]  dir = "strapid"  run = "npm run typecheck"
    [tasks."strapid:check"]      dir = "strapid"  run = "npm run check"
    [tasks."strapid:test"]       dir = "strapid"  run = "npm test"

Write normal multi-line TOML task blocks in the same form as the existing tasks rather than the aligned shorthand above. Do not add nested Mise files, an aggregate task, a dependency-install task, CI changes, backend/frontend changes, or changes under `/strapi`.

Finally, run formatting once through each local package script, then run the non-mutating validation sequence. Review the diff to ensure the two packages remain structurally symmetrical, the only intentional difference in their manifests is the name, `BACKUP.md` is unchanged, no content type or environment file changed, and the unrelated Imagen directory remains untouched.

## Concrete Steps

Work from `/home/codex/src/us-alb` and remain on `backup-system`. Before edits, confirm the baseline:

    git branch --show-current
    git status --short --branch
    mise exec -- node --version

Expect `backup-system`, only the pre-existing `?? .agents/skills/imagen/scripts/` worktree entry, and `v24.20.0`.

After creating the package manifests and configuration files described above, generate lockfiles using the root toolchain:

    mise exec -- npm install --package-lock-only --prefix backupd
    mise exec -- npm install --package-lock-only --prefix strapid

Then prove each lockfile independently drives a clean install:

    mise exec -- npm ci --prefix backupd
    mise exec -- npm ci --prefix strapid

Both commands must finish successfully and report no lockfile/package-manifest mismatch. Installed `node_modules/` directories remain ignored and are not staged.

Use the local formatters once while implementing:

    mise run backupd:format
    mise run strapid:format

Inspect any formatting changes rather than blindly accepting unrelated rewrites. The package-local Biome configurations must not traverse into the other package or repository applications.

Prove direct TypeScript execution with no loader, build, or generated output:

    mise exec -- npm start --prefix backupd
    mise exec -- npm start --prefix strapid

Each command must exit zero. npm may print its normal lifecycle header, but the no-op entrypoint itself emits no application output. No `.js`, `dist/`, or `build/` artifact should appear.

Run the canonical daemon checks and applicable tests through the new root interfaces:

    mise run backupd:check
    mise run backupd:test
    mise run strapid:check
    mise run strapid:test

Each `check` must show a clean Biome check followed by a successful strict `tsc --noEmit`. Each `test` must exit zero and truthfully report zero tests and zero failures. A zero count is expected for B01 because there is no behavior to test.

Finish with repository-level inspection:

    mise tasks
    git diff --check
    git status --short
    git diff -- BACKUP.md
    git diff -- TODO.md mise.toml backupd strapid .agents/plans/b01-establish-daemon-packages-and-tooling.md

`mise tasks` must list all ten new daemon tasks. `git diff --check` and `git diff -- BACKUP.md` must produce no errors or BACKUP changes. The status and scoped diff must contain only B01 files plus the preserved untracked Imagen directory. Do not run backend or frontend canonical tasks because B01 changes neither area; the new daemon check and test tasks are the applicable canonical validation for this milestone.

## Validation and Acceptance

Acceptance requires independent reproducibility. `mise exec -- npm ci --prefix backupd` and the corresponding `strapid` command must both succeed from their own committed lockfile. Neither installation may depend on the other package or on frontend/backend `node_modules`.

Acceptance requires local tool ownership. `mise run backupd:check` and `mise run strapid:check` must each use the package-local Biome binary, local `biome.json`, local TypeScript compiler, and local `tsconfig.json`. Biome must check formatting, recommended lint rules, and organized imports. TypeScript must perform strict no-emit checking with `erasableSyntaxOnly`; compiler success must create no output files.

Acceptance requires native execution. `mise exec -- npm start --prefix backupd` and the corresponding `strapid` command must execute `src/main.ts` directly under Node v24.20.0, exit zero without application output, and emit no build artifact. The manifests and lockfiles must contain no `tsx`, `ts-node`, Babel, SWC, runtime loader, bundler, or transpiler dependency.

Acceptance requires a ready but honest native test boundary. `mise run backupd:test` and `mise run strapid:test` must invoke only `node --test`, exit zero, and report zero failing tests. B01 must not add a test whose only purpose is to prove a constant, the empty entrypoint, package metadata, compiler behavior, or the test runner itself. Later queue items add `node:test` and `node:assert/strict` coverage as soon as production behavior exists.

Acceptance also requires the root task interface and scope boundaries. `mise tasks` must expose lint, format, typecheck, check, and test for both services. There must be no nested Mise configuration or independent Node pin, no generated JavaScript, no package configuration under `/strapi`, no CI/backend/frontend/content-type/environment change, no automated backend/smoke/end-to-end/browser/deployment test, and no change to `BACKUP.md`. The B01 checkbox remains unchecked until independent reviewer approval.

## Idempotence and Recovery

All package creation and validation steps are repeatable. `npm install --package-lock-only` deterministically refreshes lockfile metadata from the declared versions, while `npm ci` removes and recreates only that package's ignored `node_modules/` directory. Re-running Biome formatting is idempotent after the first successful pass, and the check, typecheck, test, direct-entrypoint, and Mise listing commands are non-destructive.

If a lockfile and manifest disagree, do not patch integrity or resolution fields manually. Confirm Node v24.20.0 is selected through root Mise, remove only the affected package's ignored `node_modules/` directory if necessary, regenerate that package's lockfile with the prescribed command, and rerun its `npm ci` and checks. Never remove a repository-wide directory or the pre-existing Imagen scripts.

If formatting changes files outside the intended package, stop and inspect the package's `biome.json` scope before proceeding. Restore only task-owned accidental edits with a targeted patch; do not use `git reset --hard`, `git clean`, or broad checkout commands. If task work overlaps an unexpected user edit, preserve it and stop for coordinator direction when it cannot be isolated.

If a later implementation needs a compiler option or dependency change, update both package configurations only when the requirement is common. Record service-specific divergence in this plan's Decision Log instead of silently breaking symmetry. Any revision to this ExecPlan must update all affected sections and add a revision note at the bottom.

## Artifacts and Notes

The expected Node runtime evidence is:

    $ mise exec -- node --version
    v24.20.0

The expected native empty-suite evidence for each package is structurally:

    tests 0
    pass 0
    fail 0

Exact durations are not stable and must not be asserted. The direct entrypoints intentionally emit no application output; npm's ordinary script header is not daemon output.

Worker validation on 2026-10-29 produced the following evidence:

    mise exec -- node --version
    v24.20.0

    mise exec -- npm ci --prefix backupd
    added 5 packages; audited 6 packages; found 0 vulnerabilities

    mise exec -- npm ci --prefix strapid
    added 5 packages; audited 6 packages; found 0 vulnerabilities

    mise run backupd:format
    Formatted 4 files. No fixes applied.

    mise run strapid:format
    Formatted 4 files. No fixes applied.

    mise exec -- npm start --prefix backupd
    > node src/main.ts

    mise exec -- npm start --prefix strapid
    > node src/main.ts

    mise run backupd:check
    Checked 4 files. No fixes applied. tsc --noEmit exited zero.

    mise run strapid:check
    Checked 4 files. No fixes applied. tsc --noEmit exited zero.

    mise run backupd:test
    tests 0; pass 0; fail 0

    mise run strapid:test
    tests 0; pass 0; fail 0

`mise tasks` listed all ten daemon package tasks. Package-pair diffs were empty after normalizing the manifest and lockfile package name. Artifact inspection found no generated `.js`, `dist/`, or `build/` output and no nested runtime or Mise pin. `git diff --check` and `git diff -- BACKUP.md` were clean.

The independent reviewer repeated the Node version, clean-install, direct-start, canonical check, native test, task-listing, symmetry, artifact, scope, and whitespace validations successfully. After the worker corrected two plan-only findings, focused re-review confirmed the milestone and ignore-ownership text, verified that implementation files were unchanged, and returned `APPROVED` and `REVIEW_READY`.

The final scoped diff should add these files:

    backupd/biome.json
    backupd/.gitignore
    backupd/package-lock.json
    backupd/package.json
    backupd/src/main.ts
    backupd/tsconfig.json
    strapid/biome.json
    strapid/.gitignore
    strapid/package-lock.json
    strapid/package.json
    strapid/src/main.ts
    strapid/tsconfig.json

It should modify `mise.toml` for task exposure and `TODO.md` only for the approved-plan link during implementation. This ExecPlan itself is `.agents/plans/b01-establish-daemon-packages-and-tooling.md`. After reviewer approval, the coordinator will also update `TODO.md` to check B01 and will finalize this plan's living sections; those later bookkeeping edits belong to the same B01 workflow.

## Interfaces and Dependencies

Each package manifest must have this interface, substituting only the package name:

    {
      "name": "backupd",
      "version": "0.1.0",
      "private": true,
      "type": "module",
      "scripts": {
        "start": "node src/main.ts",
        "lint": "biome check",
        "format": "biome format --write",
        "typecheck": "tsc --noEmit",
        "check": "npm run lint && npm run typecheck",
        "test": "node --test"
      },
      "devDependencies": {
        "@biomejs/biome": "2.4.2",
        "@types/node": "24.19.2",
        "typescript": "5.9.3"
      }
    }

`strapid/package.json` uses `"name": "strapid"`; every other field remains identical. `private: true` prevents accidental publication. `type: "module"` makes `.ts` files follow ESM package semantics during Node's native type stripping. The packages have no runtime dependencies in B01.

Each TypeScript configuration must have this interface:

    {
      "compilerOptions": {
        "allowImportingTsExtensions": true,
        "erasableSyntaxOnly": true,
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "noEmit": true,
        "noUncheckedIndexedAccess": true,
        "strict": true,
        "target": "ESNext",
        "types": ["node"],
        "verbatimModuleSyntax": true
      },
      "include": ["src/**/*.ts", "test/**/*.ts"]
    }

`allowImportingTsExtensions` permits the explicit `.ts` specifiers required by the design. `module` and `moduleResolution` model Node ESM resolution during static checking. `noEmit` ensures TypeScript is a checker, not a build step. `strict` and `noUncheckedIndexedAccess` provide the required strict checking. `erasableSyntaxOnly` rejects syntax that Node would need to transform into JavaScript. `verbatimModuleSyntax` preserves the distinction between value and type-only imports. `types: ["node"]` exposes Node built-in types without browser globals.

Each package-local Biome file must have this interface:

    {
      "$schema": "https://biomejs.dev/schemas/2.4.2/schema.json",
      "vcs": {
        "enabled": true,
        "clientKind": "git",
        "useIgnoreFile": true
      },
      "files": {
        "ignoreUnknown": true,
        "includes": ["**", "!node_modules", "!dist", "!build"]
      },
      "formatter": {
        "enabled": true,
        "indentStyle": "space",
        "indentWidth": 2
      },
      "linter": {
        "enabled": true,
        "rules": {
          "recommended": true
        }
      },
      "assist": {
        "enabled": true,
        "actions": {
          "source": {
            "organizeImports": "on"
          }
        }
      },
      "javascript": {
        "assist": {
          "enabled": true
        },
        "formatter": {
          "quoteStyle": "double",
          "semicolons": "always"
        }
      }
    }

These files are complete local configuration interfaces, not shared configuration or extends chains. Keeping the small policy in each package proves either directory can be checked independently. They intentionally match applicable frontend conventions while omitting framework-specific domains and parsers.

The root Mise task interface is the stable repository entrypoint for local work and later CI. Each task delegates rather than reimplementing package commands, so `package.json` remains the single owner of lint, format, typecheck, check, and test behavior. The only Node version authority remains root `mise.toml`.

Revision note (2026-10-29 / Codex planner): Created the initial self-contained B01 implementation plan after repository inspection and current-documentation research, then made the local Biome interface and direct-execution evidence explicit during self-review. The plan intentionally uses empty ESM entrypoints and zero test files to establish direct TypeScript and native test tooling without inventing daemon behavior.

Revision note (2026-10-29 / Codex worker): Began implementation by recording the approved plan link, adding both symmetric daemon package scaffolds, and exposing their package scripts through root Mise tasks. Progress now distinguishes the remaining generated lockfiles and validation work.

Revision note (2026-10-29 / Codex worker): Generated both package lockfiles with the root-selected npm toolchain and updated Progress to record that the package-creation milestone is complete; reproducible installation and validation remain.

Revision note (2026-10-29 / Codex worker): Updated both Biome configurations and the plan after formatter runs showed that nested package invocations require package-local ignore files under the pinned 2.4.2 binary, including when the documented parent `vcs.root` is set. The final configuration keeps `useIgnoreFile`, adds only package dependency/output ignore patterns, and records the unsuccessful intermediate correction rather than retaining it.

Revision note (2026-10-29 / Codex worker): Completed implementation and all worker-owned validation, recorded concise command evidence, and updated Outcomes & Retrospective to distinguish the green implementation from the still-pending independent review, coordinator bookkeeping, commit, and push.

Revision note (2026-10-29 / Codex worker): Reconciled Context and Orientation with the completed worker state and the package-local ignore-file discovery so the living plan no longer describes the new package directories or ignore policy as absent.

Revision note (2026-10-29 / Codex worker): Remediated independent-review cycle 1 by adding the narrative, independently verifiable B01 milestone required by `.agents/docs/PLANS.md` and correcting Context and Plan of Work to state precisely that the root ignore file covers only `node_modules/` while each package-local ignore file owns `node_modules/`, `dist/`, and `build/`. No implementation scope or validation claim changed.

Revision note (2026-10-29 / Codex coordinator): Recorded the independent review approval and repeated validation evidence, closed the final review Progress item, finalized Outcomes & Retrospective, reconciled the task's checked state throughout the plan, and checked B01 in `TODO.md` after the required `APPROVED` and `REVIEW_READY` handoff.

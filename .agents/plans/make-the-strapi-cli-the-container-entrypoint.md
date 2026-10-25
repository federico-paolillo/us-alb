# Make the Strapi CLI the container entrypoint

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `.agents/docs/PLANS.md` from the repository root.

## Purpose / Big Picture

The production backend image currently relies on the Node.js entrypoint inherited from the distroless base image and supplies both the Strapi CLI script and `start` as its default command. After this change, the image will explicitly launch Node.js and the Strapi CLI as its entrypoint, while `start` remains the default command. A normal container launch will therefore continue to start Strapi, and an operator can replace the default command with a Strapi subcommand such as `transfer` without requiring a shell or repeating the CLI script path.

The result is observable by building the backend image and inspecting its image configuration. The inspection must report an entrypoint of `["/nodejs/bin/node","/strapi/node_modules/@strapi/strapi/bin/strapi.js"]` and a command of `["start"]`.

## Progress

- [x] (2026-10-25 09:59Z) Inspected the active `main` branch, relevant Docker and Compose configuration, canonical Mise tasks, repository requirements, and pre-existing unrelated worktree changes.
- [x] (2026-10-25 10:01Z) Updated only the final startup instructions in `backend/Dockerfile`; the focused diff contains the requested exec-form `ENTRYPOINT` and `CMD ["start"]`.
- [x] (2026-10-25 10:02Z) Ran `mise run be:build`, `mise run be:openapi`, and `mise run fe:openapi`. All succeeded; the generated schemas contained timestamp-only churn and were restored to their prior tracked contents.
- [x] (2026-10-25 10:04Z) Built `us-alb-backend` with Compose and inspected the newly tagged image, which reports the exact requested entrypoint and default command.
- [x] (2026-10-25 10:05Z) Corrected the ExecPlan after review identified stale worktree-history wording: the user confirmed that they concurrently reverted their own pre-task `.env.example` change, so the current unrelated modifications are `.gitignore` and `frontend/package.json`.
- [x] (2026-10-25 10:14Z) Independent review approved the focused Dockerfile change, validation evidence, generated-artifact state, and resolution of the user-confirmed concurrent `.env.example` reversion with no remaining findings.

## Surprises & Discoveries

- Observation: The distroless Node.js image currently supplies the Node.js executable implicitly, so the existing Dockerfile can use the Strapi script as the first `CMD` element.
  Evidence: The current final instruction is `CMD ["/strapi/node_modules/@strapi/strapi/bin/strapi.js", "start"]`; the requested result makes the inherited behavior explicit with `/nodejs/bin/node` in `ENTRYPOINT`.

- Observation: The worktree already contains unrelated user modifications.
  Evidence: Before planning, `git status --short` reported `.env.example`, `.gitignore`, and `frontend/package.json` as modified. During implementation, the user concurrently reverted their own `.env.example` change and confirmed it was accidental. The remaining unrelated modifications are `.gitignore` and `frontend/package.json`; none belong in this task's commit.

- Observation: The Dockerfile change is limited to replacing one final `CMD` instruction with the requested `ENTRYPOINT` and default command.
  Evidence: The focused `git diff -- backend/Dockerfile` at 2026-10-25 10:01Z shows no other lines changed.

- Observation: OpenAPI generation updates `publishedAt` default timestamps even when the API surface is unchanged.
  Evidence: Both generated artifacts differed only in 41 timestamp defaults after generation, so the task-owned generated changes were restored and their focused diff is empty.

- Observation: `docker compose images -q backend` reports the image of an existing backend container, which can be older than the image just built.
  Evidence: It returned `10f926d729d6`, whose metadata still contained the inherited Node entrypoint, while the Compose build produced the `us-alb-backend` tag with the requested metadata.

## Decision Log

- Decision: Use an exec-form `ENTRYPOINT` containing the absolute Node.js and Strapi CLI paths, followed by `CMD ["start"]`.
  Rationale: This preserves direct signal delivery in the shell-free distroless image, keeps ordinary startup behavior, and lets Docker command overrides supply Strapi CLI subcommands.
  Date/Author: 2026-10-25 / Planner

- Decision: Do not add `start.js`, a shell wrapper, a dependency patch, or a PATH modification.
  Rationale: The absolute executable and CLI paths provide the requested behavior directly, and the user explicitly excluded those alternatives.
  Date/Author: 2026-10-25 / Planner

- Decision: Validate image metadata through Docker's native build and inspect operations rather than add automated tests or launch a deployment-style scenario.
  Rationale: The observable behavior in this task is Docker image configuration. Repository rules treat image building as build validation, prohibit Strapi backend tests, and prohibit smoke, end-to-end, and deployment tests.
  Date/Author: 2026-10-25 / Planner

- Decision: Inspect the `us-alb-backend` tag created by the successful Compose build rather than the image associated with an existing container.
  Rationale: The Compose image-list command may resolve a running container's older image, while the tag identifies the newly built image whose configuration must be validated.
  Date/Author: 2026-10-25 / Worker

- Decision: Leave `.env.example` in its current state after the user confirmed that the now-reverted modification was their accidental, user-owned change.
  Rationale: The entrypoint change never edited that file, and restoring it would overwrite a user-owned correction outside this task's scope.
  Date/Author: 2026-10-25 / Worker

## Outcomes & Retrospective

Implementation and independent review are complete. The backend image now declares the Node.js executable and Strapi CLI script as its entrypoint and retains `start` as its default command, so ordinary startup behavior is preserved while Docker command overrides can invoke Strapi subcommands directly. Canonical backend build and OpenAPI generation completed successfully; timestamp-only generated schema churn was inspected and restored, leaving both API artifacts unchanged. The Compose backend image built successfully, and native image inspection proved the exact requested entrypoint and command while retaining the `nonroot` user and `/strapi` working directory. Independent review approved the result with no remaining findings. The user-confirmed concurrent `.env.example` reversion was outside this task and remains untouched; the unrelated `.gitignore` and `frontend/package.json` modifications remain isolated from this task.

## Context and Orientation

`backend/Dockerfile` is a multi-stage image definition for the Strapi 5 backend. Its final stage uses a pinned `gcr.io/distroless/nodejs24-debian13:nonroot` image, runs as the `nonroot` user, and expects writable state only in the mounted `/data` and `/config` volumes plus the Compose-provided `/tmp` temporary filesystem. Distroless means the runtime image deliberately has no shell. These rootless, distroless, and read-only properties must remain unchanged.

Docker distinguishes an image entrypoint from its default command. `ENTRYPOINT` identifies the executable that always runs, while `CMD` supplies default arguments that a container invocation may replace. The only production-code edit belongs at the end of `backend/Dockerfile`: replace the combined existing `CMD` with the exact entrypoint and command required below. `compose.yml` supplies build arguments, runtime secrets, volumes, and the read-only filesystem policy; it requires no edit.

The repository uses `mise.toml` for canonical commands. `mise run be:build` builds Strapi. Repository policy also requires API surface artifacts to be refreshed after backend changes: `mise run be:openapi` writes `frontend/cms/schema.json`, and `mise run fe:openapi` derives `frontend/cms/schema.d.ts`. No backend TypeScript types or content schemas change in this task, so `mise run be:types` is not applicable. No public API, TypeScript interface, dependency version, database schema, or content type changes are expected.

The active branch is `main` and must not be changed. Before this task began, `.env.example`, `.gitignore`, and `frontend/package.json` contained unrelated modifications. During implementation, the user concurrently reverted their accidental `.env.example` modification; leave that file in its current user-owned state. The remaining unrelated changes are `.gitignore` and `frontend/package.json`; preserve and exclude them from all task diffs and staging. The Worker may edit only `backend/Dockerfile` and this ExecPlan, plus generated API artifacts only if the required generation commands produce a legitimate change. The Worker must not commit; the Coordinator owns final bookkeeping, commit, and push after independent approval.

## Plan of Work

First, use `apply_patch` to replace the last line of `backend/Dockerfile` with two exec-form instructions in this exact order:

    ENTRYPOINT ["/nodejs/bin/node", "/strapi/node_modules/@strapi/strapi/bin/strapi.js"]
    CMD ["start"]

Do not change the image stages, user, permissions, volumes, exposed port, environment, comments, or any other startup file. Do not create a `start.js` file. Update this plan's living sections after the edit and after each validation stopping point.

Next, run the repository's relevant canonical build and generated-artifact commands from the repository root. Run `mise run be:build`, then `mise run be:openapi`, then `mise run fe:openapi`. Inspect `git status --short` and focused diffs afterward. The API commands are required refresh operations; because the Docker metadata change does not affect the API surface, `frontend/cms/schema.json` and `frontend/cms/schema.d.ts` should remain byte-for-byte unchanged. If either changes, inspect the change and report a blocker rather than folding an unrelated API alteration into this task.

Finally, build the backend image with Compose using the repository-local `.env.example` file, which satisfies required build argument interpolation without changing machine or user environment variables. Resolve the built backend image ID and inspect its configuration with Docker's native image inspection. Do not execute `transfer`, start a shared stack, publish a port, or create any backend automated test. Preserve concise command evidence in this plan and hand the work to independent review.

## Concrete Steps

Run all commands from `/Users/federico.paolillo/src/us-alb` on the existing `main` branch.

After applying the Dockerfile edit, verify the focused diff:

    git diff -- backend/Dockerfile

The diff must show only the final combined `CMD` replaced by the specified `ENTRYPOINT` and `CMD`.

Run canonical build and artifact refresh commands sequentially:

    mise run be:build
    mise run be:openapi
    mise run fe:openapi

Each command must exit successfully. Then inspect repository state without altering the pre-existing files:

    git status --short
    git diff -- frontend/cms/schema.json frontend/cms/schema.d.ts

The focused generated-artifact diff should be empty. The status output may still contain the known unrelated modifications to `.gitignore` and `frontend/package.json`; `.env.example` was concurrently restored by the user and is not part of this task.

Build only the backend service image:

    docker compose --env-file .env.example build backend

The build must exit successfully. Inspect the `us-alb-backend` tag that the completed Compose build creates:

    docker image inspect us-alb-backend --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}}'

The final command must print exactly:

    ["/nodejs/bin/node","/strapi/node_modules/@strapi/strapi/bin/strapi.js"] ["start"]

Validation evidence from 2026-10-25 is:

    mise run be:build                         # passed
    mise run be:openapi                       # passed
    mise run fe:openapi                       # passed
    docker compose --env-file .env.example build backend  # passed
    docker image inspect us-alb-backend --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}}'
    ["/nodejs/bin/node","/strapi/node_modules/@strapi/strapi/bin/strapi.js"] ["start"]

The generated schemas had timestamp-only churn and were restored, leaving their focused diff empty. Independent review approved this evidence and the final focused diff.

## Validation and Acceptance

Acceptance requires all three levels of evidence. First, `mise run be:build` must complete successfully, proving the Strapi project remains buildable. Second, `mise run be:openapi` and `mise run fe:openapi` must complete successfully with no resulting API artifact diff, proving the required generated documentation remains current. Third, the Compose backend image build must succeed and Docker image inspection must report the exact entrypoint and command shown above.

The Docker metadata inspection is the authoritative behavior check: with no command override, Docker appends `start` to the Strapi CLI entrypoint; with a command override, Docker replaces `start` and passes the requested Strapi subcommand to that same entrypoint. No server launch is needed to prove this metadata relationship, and no automated backend, smoke, end-to-end, browser, or deployment test may be added or run for this task.

The final focused implementation diff must contain only `backend/Dockerfile`, the maintained ExecPlan, and any review bookkeeping. It must not include the remaining pre-existing `.gitignore` or `frontend/package.json` changes, and it must leave the user's concurrent `.env.example` reversion untouched. No generated API artifact should need committing because the API surface is unchanged.

## Idempotence and Recovery

The Dockerfile edit is idempotent: once the exact `ENTRYPOINT` and `CMD` exist, do not add duplicates. All validation commands are safe to repeat. Docker may reuse cached layers on subsequent image builds, which is acceptable because the final image metadata is still inspected directly.

If a validation command fails, preserve its output, update this plan with the failure and next action, and correct only a task-related cause. Do not discard or rewrite unrelated user changes. If API generation changes tracked schema artifacts despite this metadata-only edit, stop and investigate rather than accept the drift. If the tagged `us-alb-backend` image is absent after a successful Compose build, inspect the completed build output and `docker image ls us-alb-backend` before retrying; do not broaden the build to the full stack.

To revert this task before commit, restore only the final startup instructions in `backend/Dockerfile` to the original combined command. Never use a destructive worktree-wide reset because unrelated modifications are present.

## Artifacts and Notes

The intended final Dockerfile excerpt is:

    EXPOSE 65101

    ENTRYPOINT ["/nodejs/bin/node", "/strapi/node_modules/@strapi/strapi/bin/strapi.js"]
    CMD ["start"]

The completed image inspection reported:

    ["/nodejs/bin/node","/strapi/node_modules/@strapi/strapi/bin/strapi.js"] ["start"]

## Interfaces and Dependencies

This task changes only the container invocation interface. The final image entrypoint must be the JSON array `["/nodejs/bin/node", "/strapi/node_modules/@strapi/strapi/bin/strapi.js"]`, and its default command must be the JSON array `["start"]`. Docker combines them into the normal process invocation `/nodejs/bin/node /strapi/node_modules/@strapi/strapi/bin/strapi.js start`; a command override replaces only `start`.

No package dependency, application API, TypeScript type, Strapi schema, Compose service contract, port, volume, user, or filesystem permission changes. The existing pinned distroless Node.js 24 runtime already provides `/nodejs/bin/node`, and the build stage already copies the installed Strapi CLI into `/strapi/node_modules/@strapi/strapi/bin/strapi.js`.

Revision note (2026-10-25): Created the initial ExecPlan from the approved direct task, repository state, and validation requirements so implementation can proceed without further design decisions.

Revision note (2026-10-25): Recorded the completed Dockerfile edit and its focused-diff evidence before validation.

Revision note (2026-10-25): Recorded successful build and image-inspection evidence, timestamp-only generated-artifact churn, and the use of the newly built image tag after discovering that Compose's image listing can report an older running container image.

Revision note (2026-10-25): Corrected stale worktree-history wording after independent review. The user confirmed their concurrent `.env.example` reversion was accidental and user-owned, so it remains untouched and the current unrelated modifications are `.gitignore` and `frontend/package.json`.

Revision note (2026-10-25): Recorded independent approval, closed the final review progress item, and finalized the outcome with the validated image metadata and preserved unrelated worktree state.

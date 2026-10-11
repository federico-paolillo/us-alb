# Verify editorial updates, remediate fragment scrolling, and pass release gates

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `.agents/docs/PLANS.md`. A future contributor must be able to resume from this file and the working tree alone.

## Purpose / Big Picture

This task completes release validation for the CMS-backed Home contacts delivered by tasks 01–05 and repairs the one release-blocking behavior found during the first validation run. Editors must still be able to publish a Home contact-method change and a Location visibility change in Strapi and see the correct running Next.js pages update through the existing authenticated webhook and cache tags without a frontend rebuild. Visitors must be able to reach `/#contatti` from Home and from another route on desktop and mobile, including cold delayed-CMS loads and warm hard reloads, with the contact heading and first action visible.

The first Worker proved every canonical, generated-artifact, archive-import, live webhook, restoration, cleanup, desktop, and cold delayed-CMS requirement it ran. It then found that a warm 412×914 hard reload retained `#contatti` but remained near the upper Home content; the heading and first action were thousands of pixels below the viewport. The old validation-only stop rule is therefore superseded. This revision authorizes the smallest correct frontend remediation at the section that owns the late-rendered fragment target, focused Node unit coverage for its non-visual matching policy, a rebuilt production artifact, a fresh isolated runtime proof, and completion of every visual inspection. It does not authorize a schema, CMS pipeline, route-dispatch, style/design, dependency, archive, backend, or content-model change.

Playwright CLI remains an interactive manual-inspection tool. Do not add an automated browser, end-to-end, smoke, deployment, or Strapi backend test.

## Progress

- [x] (2026-10-11 16:32Z) Read `AGENTS.md`, `frontend/AGENTS.md`, task 06 in `TODOS2.md`, `PLAN2.md`, `.agents/docs/PLANS.md`, task-01 through task-05 ExecPlans, and the `implement-task`, `canonical-validation`, and `playwright-cli` skills plus relevant browser references.
- [x] (2026-10-11 16:32Z) Used Context7 to resolve official `/vercel/next.js` and `/strapi/documentation` material and inspected pinned Next.js 16.3.1 documentation for Cache Components, revalidation, links, hash scrolling, and scroll offsets.
- [x] (2026-10-11 16:45Z) Passed the initial focused and canonical release gates: 3 focused files / 15 tests, 9 total files / 78 tests, `be:build`, `fe:check`, `fe:build`, and isolated `be:openapi` plus `fe:openapi` with timestamp-only raw churn and no normalized difference.
- [x] (2026-10-11 16:56Z) Imported the demonstration archive into task-owned storage, proved the cold four-second delayed-CMS hard hash load, published and observed both reversible editorial edits, proved their page matrices and unchanged build/listener identity, restored exact preimages through Strapi, and passed desktop contact inspection.
- [x] (2026-10-11 16:57Z) Recorded the blocking warm 412×914 hard-reload evidence, intentionally skipped the remaining cross-route, focus, and final-action-clearance screenshots under the old stop rule, then restored uploads/editorial/runtime/browser/port state completely. The tracked diff and index were empty; only this plan and unrelated Imagen scripts remained untracked.
- [x] (2026-10-11 17:02Z) Planner revision diagnosed the post-stream fragment-scroll owner, replaced the validation-only decision with a bounded remediation, and defined the exact source/test scope, rerun boundary, five visual inspections, acceptance, expected diff, and recovery procedure. No implementation, tracker, staging, commit, push, or non-plan file change was made.
- [x] (2026-10-11 17:12Z) Added the target-local post-render fragment-scroll enhancement and exactly two focused matcher tests without changing layout, navigation, styles, route dispatch, or CMS behavior.
- [x] (2026-10-11 17:13Z) Passed the new focused test, combined contact tests, complete 80-test frontend suite, canonical frontend check/build, and isolated generated-artifact refresh; recorded the new build identity and Partial Prerender route markers.
- [x] (2026-10-11 17:22Z) Recreated the isolated archive-backed stack and repeated both real-admin editorial/webhook transitions and exact restorations against one normal listener from the rebuilt artifact.
- [x] (2026-10-11 17:21Z) Repeated the cold delayed-CMS load, proved the warm mobile hard reload regression fixed, and passed all five named visual inspections including cross-route navigation, native Tab focus, footer/version, and final-action clearance.
- [x] (2026-10-11 17:24Z) Restored all editorial/local state, stopped exact task processes and browser sessions, restored the byte-identical ordinary upload tree, removed only positively resolved task artifacts, and passed final branch/index/archive/port/scope guards.
- [x] (2026-10-11 17:39Z) Independent Reviewer approved with no actionable findings after direct source review, canonical builds/tests, isolated generation/import, real admin webhook edits/restoration, reduced-motion and all five browser checks, and final cleanup/state verification. Reviewer remediation cycles: 0.

## Surprises & Discoveries

- Observation: all release gates except one mobile fragment-scroll case passed before any product remediation.
  Evidence: initial validation passed backend/frontend builds, generated-contract equivalence, 78 frontend tests, archive import, one-build webhook updates and restoration, cold delayed-CMS hard loading, desktop contact navigation, and complete cleanup. Those results remain useful historical evidence but are not claims about the rebuilt artifact after this revision.
- Observation: the failure is timing, not a wrong URL, missing id, insufficient scroll padding, horizontal overflow, or CMS data failure.
  Evidence: the failed warm reload ended at `/#contatti` with navigation type `reload`; the sole target existed after render; the long email wrapped with zero horizontal overflow; but the heading rectangle was 5,146–5,182 px and the first action began at 5,290 px in a 914 px viewport.
- Observation: the pinned Next.js scroll handler consumes a fragment intent when the target is not present at the handler's lookup time.
  Evidence: `frontend/node_modules/next/dist/esm/client/components/layout-router.js` calls `getElementById(hashFragment)` and, when it returns null, explicitly clears `scrollRef.current`, `onlyHashChange`, and `hashFragment`. The official Link documentation promises hash scrolling and documents `scroll-padding-top`, but it cannot retry an intent that was already cleared before streamed content introduced the target.
- Observation: Home's contact target is rendered below request-time work in a Cache Components / Partial Prerender route.
  Evidence: `frontend/app/(content)/page.tsx` calls `await io()` before loading Home; `frontend/components/home/page.tsx` calls `await io()`, awaits three cached collections, and only then renders `ContactSection` as the last child of `<main>`. The section's own mount is therefore the narrow deterministic signal that `#contatti` now exists.
- Observation: the existing global owners are correct and must remain in place.
  Evidence: `frontend/components/layout/site-nav.tsx`, `site-footer.tsx`, and Activity registration already use `/#contatti`; `frontend/app/globals.css` supplies seven-rem scroll padding, mobile-bar clearance, visible focus, smooth scrolling, and `prefers-reduced-motion: reduce`; `frontend/app/layout.tsx` applies `data-scroll-behavior="smooth"`. The failure does not justify replacing these policies.
- Observation: the initial slow-load command needed `/api` in the proxy-facing CMS base URL.
  Evidence: `CMS_URL=http://127.0.0.1:65102/api` correctly delays server-side Strapi requests; omitting `/api` produces a 404. All revised slow-load starts must use the corrected URL.
- Observation: Next.js tag revalidation uses stale-while-revalidate semantics.
  Evidence: the initial live edits each produced one stale response and fresh content on bounded attempt 2. Final proof must continue to allow one stale read and use bounded polling rather than treating the first response as authoritative.
- Observation: generated OpenAPI refresh has known volatile timestamps even when the interface is unchanged.
  Evidence: the initial isolated refresh changed 82 removed/added timestamp lines per artifact and had no normalized structural difference. Repeat generation after the frontend source change in an isolated copy so the final diff stays limited to meaningful task files.

## Decision Log

- Decision: replace the original validation-only boundary with authority to implement one bounded frontend fix and its focused test.
  Rationale: the user explicitly requires the task to continue through acceptance. The observed failure is release-blocking and reproducible, while every mutable runtime/editorial resource was restored cleanly.
  Date/Author: 2026-10-11 / Planner revision
- Decision: add a generic client leaf in `frontend/components/shared/fragment-scroll-target.tsx` and mount it only inside `frontend/components/home/contact-section.tsx` beside the authoritative `id="contatti"` target.
  Rationale: the target's client mount occurs only after the streamed section exists, which is the exact missing signal. A root-layout observer would broaden responsibility to every route; a navigation click handler would not cover hard reloads; CSS cannot retry a missing element; and changing the server/CMS path would address the wrong boundary.
  Date/Author: 2026-10-11 / Planner revision
- Decision: on mount, compare the current URL fragment with the supplied target id and, only when they match, call that existing element's native `scrollIntoView` with block-start alignment and no explicit animation behavior.
  Rationale: one mount-time effect is sufficient for post-stream arrival and needs no timer, retry loop, `MutationObserver`, global listener, router interception, or retained resource. Omitting an explicit `behavior: "smooth"` delegates motion to the existing root CSS, whose reduced-motion media query switches scrolling to `auto`.
  Date/Author: 2026-10-11 / Planner revision
- Decision: do not move focus, add `tabIndex`, synthesize a click, or mutate history.
  Rationale: fragment arrival should correct only viewport position. Native links, later Tab navigation, the existing focus outline, browser history, and assistive-technology semantics must remain authoritative.
  Date/Author: 2026-10-11 / Planner revision
- Decision: keep the fragment-matching rule as a small exported pure function in the client-leaf module and cover exact, percent-decoded, unrelated, empty, and malformed fragments in `frontend/components/shared/fragment-scroll-target.test.ts`.
  Rationale: matching is the only stable non-visual policy introduced. A Node unit test proves it without DOM fixtures or a browser test; geometry and actual scrolling remain manual acceptance at the browser boundary.
  Date/Author: 2026-10-11 / Planner revision
- Decision: use one private `contactSectionId` constant in `contact-section.tsx` for both the section id and client-leaf prop.
  Rationale: this prevents the recovery target from drifting away from the semantic fragment owner without creating a global registry or altering navigation data.
  Date/Author: 2026-10-11 / Planner revision
- Decision: preserve earlier evidence as a historical baseline but rerun every frontend/build-dependent or behavior-dependent proof after implementation.
  Rationale: the unchanged backend/archive evidence remains informative, but final release claims must refer to the new source and new production build. Therefore rerun focused/full frontend tests, `fe:check`, `fe:build`, isolated generators, fresh archive import, both live editorial edits/restorations, the cold delayed load, the warm reload, and all five visual inspections. `be:build` may be retained because backend source and dependencies remain byte-identical; rerunning it is allowed but not required.
  Date/Author: 2026-10-11 / Planner revision
- Decision: continue using the same isolated database/upload strategy, official Strapi admin mutations, bounded revalidation polls, one normal Next listener, and immutable build-hash evidence.
  Rationale: those mechanisms passed, protect ordinary state, and directly prove editorial updates without rebuild. Reusing the validated method is lower risk than inventing another harness.
  Date/Author: 2026-10-11 / Planner revision

Superseded decision: the initial plan said every failed assertion must stop without product changes. The observed failure and the user's remediation instruction replace that decision only for the narrow source/test scope above. It remains forbidden to broaden into schema, CMS, design, dependency, or architecture work.

## Outcomes & Retrospective

The revised outcome is achieved and independently approved with no actionable findings. The target-local client leaf retries the exact matching fragment once when the streamed section mounts, without converting its server owner, introducing polling/listeners/state, moving focus, changing history, or overriding reduced-motion-aware CSS. Focused and complete tests, canonical frontend validation, isolated generators, fresh archive import, cold delayed loading, live authenticated editorial refresh/restoration, warm reload regression, all five visual inspections, footer/version assertions, and one-build/listener identity passed. The earlier failed 5,146/5,290 px geometry remains recorded as regression evidence; the rebuilt warm reload places the same heading/action at 193/337 px. The Reviewer independently reproduced the critical paths, including reduced-motion behavior and exact state restoration. Reviewer remediation cycles: 0.

## Context and Orientation

The repository root is `/home/codex/src/us-alb`. `backend/` is Strapi 5.52.0 and `frontend/` is Next.js 16.3.1 with React 19.2.8 and Cache Components. The active branch is `main`; at revision time `HEAD` and `origin/main` are `f0aadf9bd21aa27f93667ceb52f1510ebf864941`. The index and tracked diff are empty. The only untracked paths are this ExecPlan and unrelated `.agents/skills/imagen/scripts/`; never modify, stage, remove, or include those scripts.

The Home route enters through `frontend/app/(content)/page.tsx`, calls `await io()`, reads the Home DTO from `frontend/cms/data.ts`, and sends it through `frontend/components/page-switch.tsx` to `frontend/components/home/page.tsx`. That concrete server component performs its own request-time reads and renders `frontend/components/home/contact-section.tsx` last. Preserve this SSR plus ISR route, both `io()` gates, the CMS client → mapper → connector → cached-read pipeline, and `PageSwitch` dispatch.

`ContactSection` owns the sole live `id="contatti"`, its heading/actions, long-value wrapping, semantic addresses, and mobile padding. The root layout renders the global header/footer/mobile navigation around route content. Navigation and registration links already target `/#contatti`; the footer contains no contact data or target id and still renders `NEXT_PUBLIC_APP_VERSION`.

A “client leaf” here means a tiny component marked `"use client"` that returns no visible markup and exists only to run a browser effect after its surrounding server-rendered section has arrived. It must not convert `ContactSection`, `HomePage`, `PageSwitch`, or the root layout into client components. It must not read CMS data or own navigation.

The release archive is `backend/seed-data/us-albatese-demo.tar.gz`, with SHA-256 `50d8130729f893251b3dff0ffab1e6d513cb09863646e10c914bd8f7cf5afd99`. Ordinary ignored state is `backend/.tmp/data.db`, `backend/.env`, and `frontend/.env.development`; uploads are under `backend/public/uploads`. Never import into ordinary data. The first run restored the upload tree to the sole zero-byte `.gitkeep` and left ports 65100–65199 and Playwright sessions empty.

Use Strapi on `127.0.0.1:65100`, the built Next server on `127.0.0.1:65101`, and the temporary delayed-CMS proxy on `127.0.0.1:65102`. Every bind stays on loopback. Use the installed Playwright CLI wrapper and its fixed Chromium configuration; do not pass a browser, headed mode, custom profile, extension, or alternate config. Keep snapshots/screenshots under the unique task runtime directory.

## Interfaces and Dependencies

Create `frontend/components/shared/fragment-scroll-target.tsx` with `"use client"`. Export a pure predicate and the client leaf with these conceptual interfaces (names may vary only if equally explicit):

    export function fragmentTargetsElement(hash: string, targetId: string): boolean

    export function FragmentScrollTarget({
      targetId,
    }: {
      targetId: string;
    }): null

`fragmentTargetsElement` first requires one leading `#`, removes it, safely applies `decodeURIComponent`, compares the nonempty decoded fragment exactly with `targetId`, and returns false for an empty, unrelated, missing-marker, or malformed encoded fragment. It must not accept prefix/substring matches.

`FragmentScrollTarget` uses one React effect keyed only by `targetId`. It returns immediately unless the current hash targets that id, then resolves `document.getElementById(targetId)` and calls `scrollIntoView({ block: "start", inline: "nearest" })` if the element exists. Do not pass an explicit `behavior`, because `frontend/app/globals.css` already owns smooth versus reduced motion. Do not add an event listener, timeout, interval, animation frame, observer, focus call, history mutation, or state.

In `frontend/components/home/contact-section.tsx`, import the client leaf, define one private constant for `contatti`, use it as the `<section>` id, and render `<FragmentScrollTarget targetId={contactSectionId} />` inside that section. Preserve all existing structure, classes, copy, ordering, and DTO behavior.

Create `frontend/components/shared/fragment-scroll-target.test.ts` for the pure predicate only. Use Vitest's Node environment and exactly two tests: one accepts exact and percent-decoded equality; the other rejects unrelated, empty, missing-marker, and malformed fragments. Do not add jsdom, fake DOM objects, a hook test harness, or a browser test. Existing `frontend/components/home/contact-section.test.ts` remains the owner of semantic contact markup and should stay unchanged unless the Worker finds a real assertion that breaks solely because the invisible leaf is rendered; do not add styling or pixel assertions to it.

No new package is needed. React `useEffect`, `window.location.hash`, `decodeURIComponent`, `document.getElementById`, and `Element.scrollIntoView` are the only implementation dependencies.

The reversible Home sentinel is exactly:

    segreteria-contatti-editoriali-associazione-sportiva-dilettantistica@usalbatese.example

It is valid under the existing mapper/schema rules. Change only the existing Home email method's value, after recording its exact preimage, and preserve its kind, label, sibling phone, and every other Home field. For the Location proof, record the complete `Centro Sportivo Giallonero` preimage, change only `showOnAbout` from true to false, and later restore it to the recorded true value.

The temporary slow-CMS proxy is task evidence, not product code. Create it with `apply_patch` inside the unique runtime directory. Use only Node's `node:http`: listen on `127.0.0.1:65102`, forward method/path/headers/body to `127.0.0.1:65100`, and delay paths beginning `/api/` by 4,000 milliseconds. It must not log headers or bodies, and it is removed with the runtime directory after evidence is recorded.

The expected durable implementation diff is limited to:

    .agents/plans/06-verify-editorial-updates-navigation-and-release-gates.md
    frontend/components/home/contact-section.tsx
    frontend/components/shared/fragment-scroll-target.tsx
    frontend/components/shared/fragment-scroll-target.test.ts

Generated OpenAPI files must remain structurally unchanged; timestamp-only regenerated output stays in the isolated comparison copy. No schema, backend source/type, CMS file, app route/layout, PageSwitch, navigation, footer, registration, global stylesheet, DTO, package, lockfile, Mise file, archive, README, `TYPES.md`, or `TODOS2.md` change is expected.

## Plan of Work

### Milestone 1: Implement and prove the target-local policy

Confirm the clean baseline and reread the current target, layout, global CSS, Next Link docs, and pinned layout-router fragment behavior. Add the client leaf and its pure matching test exactly at the interfaces above. Mount it from `ContactSection` using one shared id constant. Do not reproduce the bug by altering production files or adding a browser test.

Run the focused new unit test and existing contact-section test. The new file should pass its exact policy cases, and the existing two semantic tests must still pass. Review the source diff to confirm that the section's markup, classes, contact order, and styling did not change.

### Milestone 2: Refresh generated evidence and rebuild the frontend

Run the complete frontend suite, `mise run fe:check`, and `mise run fe:build`. Expect the new focused file to pass 2 tests, the combined focused run to pass 2 files / 4 tests, and the full suite to pass 10 files / 80 tests. If existing test discovery has legitimately changed before implementation, record the baseline and explain the exact delta rather than weakening assertions. The build must succeed without a live CMS and retain Partial Prerender markers for `/`, `/chi-siamo`, and `/attivita`.

Because repository policy requires generated API refresh after a frontend change, create a fresh isolated repository copy using the existing exclusions and symlink strategy, then run `mise run be:openapi` and `mise run fe:openapi` there. Compare normalized outputs against the release tree exactly as the first run did. Require no structural difference and only native `publishedAt.default` timestamp churn. Do not copy timestamp-only output back. Backend types did not change, so do not run `be:types`. The already-passing `be:build` evidence remains valid because no backend input changed; if the Worker reruns it, record the new success without treating it as necessary remediation evidence.

After `fe:build`, record the new `BUILD_ID` and SHA-256 hashes of `build-manifest.json`, `routes-manifest.json`, and `server/app-paths-manifest.json`. These replace the initial build hashes for every post-fix runtime assertion.

### Milestone 3: Recreate the isolated release stack and repeat the cold delayed load

Create new unique `backend/.tmp/task-06-generated-*` and `backend/.tmp/task-06-release-runtime-*` directories. Protect ordinary uploads with the same atomic move/manifest procedure from the first run, copy the tracked archive into task storage, and import content/files into a database whose path did not previously exist. Require the same clean current-schema transfer: 60 entities, 43 assets, 118 links, with no schema, skipped/orphaned-link, missing-target/file, stale-media, or asset-failure diagnostic.

Start built Strapi on `127.0.0.1:65100` against only the task database with its task-local administrator and webhook target `http://127.0.0.1:65101`. Verify secret-header pairing and a nonempty public version without printing values. Capture public Home and Location preimages.

Before warming the normal runtime, start the standard-library delay proxy on `127.0.0.1:65102` and a temporary Next listener from the new `.next` artifact using `CMS_URL=http://127.0.0.1:65102/api`. In a fresh named `task-06-slow-hard-load` session at 412×914, navigate directly to `/#contatti` at commit, record whether the target is initially absent, wait for it to arrive and scrolling to settle, and require the hash, delayed request, heading, and first action in the viewport. Save and inspect `slow-hard-load-412x914.png`. Close that named session and stop only the temporary Next listener and proxy; require ports 65101 and 65102 to be free while Strapi remains available. Do not rebuild or delete `.next`.

### Milestone 4: Repeat live editorial proof and complete all five inspections

Start the new production Next build normally on `127.0.0.1:65101` with `CMS_URL=http://127.0.0.1:65100/api`, `CMS_MEDIA_URL=http://127.0.0.1:65100`, empty `CMS_API_TOKEN`, and the ignored project-local webhook/version configuration. Keep this one normal listener running through both edits, all five visual inspections, and both restorations. Record listener PID/start time and the new build hashes before and after each mutation.

Through the real Strapi admin UI in named session `task-06-admin`, publish the same long valid `.example` Home email sentinel and prove bounded eventual Home freshness while About/Activity retain their baseline. Then set only `Centro Sportivo Giallonero.showOnAbout=false`, publish, and prove it disappears from About while remaining on Home and Activity and the other Location remains everywhere. Allow one stale response; cap each poll at 30 one-second attempts. The initial successful evidence is historical; this repeated proof is final evidence for the rebuilt artifact.

With the long email published and the normal listener active, perform all five inspections in one named `task-06-public` session, using snapshots after each navigation and screenshots stored in task evidence:

1. `home-contact-1600x900.png`: from unfragmented Home at 1600×900, click desktop `Contatti`. Require `/#contatti`, visible heading and first action, both club actions, both Location cards, balanced columns, readable content, and no horizontal overflow.
2. `home-contact-412x914.png`: resize to 412×914 and hard reload `/#contatti`. This is the regression. Require navigation type `reload`, intact hash, settled heading and first-action rectangles intersecting the viewport, wrapped long email, and no horizontal overflow. Record both the previous failed geometry and the new passing geometry.
3. `cross-route-contact-412x914.png`: navigate to `/attivita`, take a fresh snapshot, activate the fixed mobile `Contatti` link, and require final `/#contatti` with heading and first action visible.
4. `focused-long-email-412x914.png`: establish known body focus and use repeated native Tab presses until the long-email anchor is active. Require the full accessible name, exact safe `mailto:` href, visible non-`none` outline at least three CSS pixels wide, and no horizontal clipping. Do not focus it by script.
5. `mobile-final-action-clearance-412x914.png`: bring the last contact action and fixed mobile bar into the same viewport. Require the action's bottom edge at least eight CSS pixels above the bar's top edge and no covered text or focus outline.

Also prove the Home contact section is the sole live `contatti` id. The footer must have no address/protocol/contact value, retain its `/#contatti` link, and visibly show the exact process-local application version. Inspect every screenshot visually; DOM geometry alone is insufficient. Use Playwright CLI `eval` or `run-code` only ephemerally and do not save browser automation source.

### Milestone 5: Restore state, clean up, and hand off

In the same admin session, restore the exact Home email and `showOnAbout=true` preimages and publish both. Require webhook-driven bounded reads to return the original email and all three-page Location matrix. Recapture unchanged normal-listener identity and build hashes.

Close only the named sessions. Stop exact Next, proxy, and Strapi process groups; confirm ports 65100–65102 and all 65100–65199 task ports are free. Move imported uploads into task storage, atomically restore ordinary uploads, and compare path/size/SHA-256 manifests exactly. Record all evidence in this plan, then move only positively resolved task-prefixed directories/logs/artifacts to trash. Preserve a failed artifact until its finding is recorded.

Finish with a scope audit. The tracked diff must contain only the three implementation/test files above; status may additionally contain this untracked plan and unrelated Imagen scripts. The index stays empty, branch/upstream/archive/env/ordinary database/uploads stay unchanged, and no task process, browser, port, import log, screenshot, proxy, or database remains.

## Concrete Steps

Run from `/home/codex/src/us-alb` unless noted. Establish baseline without printing secrets:

    git status --short --branch
    git diff --cached --quiet
    git diff --check
    git rev-parse HEAD
    git rev-parse origin/main
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    find backend/public/uploads -type f -printf '%P\t%s\n' | sort
    ss -ltn '( sport >= :65100 and sport <= :65199 )'
    playwright-cli list

After implementation, run focused and applicable canonical frontend validation:

    cd /home/codex/src/us-alb/frontend
    npm test -- components/shared/fragment-scroll-target.test.ts
    npm test -- components/home/contact-section.test.ts components/shared/fragment-scroll-target.test.ts
    npm test
    cd /home/codex/src/us-alb
    mise run fe:check
    mise run fe:build

Expect every command to exit zero, the focused new file to cover the planned cases, the existing contact file's two tests to remain green, and the complete suite to contain only the planned test-count increase. Record actual totals rather than silently adjusting expectations.

Repeat generated-artifact validation in a new isolated copy. Create the copy and symlinks explicitly:

    cd /home/codex/src/us-alb
    mkdir -p backend/.tmp
    generated_root="$(mktemp -d -p backend/.tmp task-06-generated-XXXXXX)"
    mkdir "$generated_root/repo"
    rsync -a \
      --exclude '/.git/' \
      --exclude '/.agents/skills/imagen/scripts/' \
      --exclude '/backend/.env' \
      --exclude '/backend/.tmp/' \
      --exclude '/backend/node_modules/' \
      --exclude '/frontend/.env.development' \
      --exclude '/frontend/.next/' \
      --exclude '/frontend/node_modules/' \
      /home/codex/src/us-alb/ "$generated_root/repo/"
    ln -s /home/codex/src/us-alb/backend/node_modules "$generated_root/repo/backend/node_modules"
    ln -s /home/codex/src/us-alb/frontend/node_modules "$generated_root/repo/frontend/node_modules"
    ln -s /home/codex/src/us-alb/backend/.env "$generated_root/repo/backend/.env"
    ln -s /home/codex/src/us-alb/frontend/.env.development "$generated_root/repo/frontend/.env.development"
    cd "$generated_root/repo"

    mise run be:openapi
    mise run fe:openapi

Apply the established JSON normalization only to `publishedAt.default` and the established declaration normalization only to complete UTC ISO timestamps. Both normalized diffs must be silent, and every raw difference must be timestamp-only. A structural difference blocks completion and must not be copied over casually.

For the runtime directory, use a fresh resolved path; do not recreate `generated_root` if the generator step above already defined it:

    cd /home/codex/src/us-alb
    mkdir -p backend/.tmp
    runtime_dir="$(mktemp -d -p backend/.tmp task-06-release-runtime-XXXXXX)"
    runtime_base="$(basename "$runtime_dir")"
    runtime_db=".tmp/$runtime_base/data.db"
    cp --preserve=mode,timestamps backend/seed-data/us-albatese-demo.tar.gz "$runtime_dir/us-albatese-demo.tar.gz"
    test ! -e "backend/$runtime_db"

Before import, protect ordinary uploads explicitly. Record a path/size/hash manifest in the runtime directory, resolve and verify both paths, move the complete provider directory into the task directory on the same filesystem, and create the empty replacement:

    cd /home/codex/src/us-alb
    find backend/public/uploads -type f -printf '%P\t%s\t' -exec sha256sum {} \; | sort > "$runtime_dir/ordinary-uploads.before"
    ordinary_uploads="$(realpath backend/public/uploads)"
    runtime_resolved="$(realpath "$runtime_dir")"
    test "$ordinary_uploads" = /home/codex/src/us-alb/backend/public/uploads
    case "$runtime_resolved" in
      /home/codex/src/us-alb/backend/.tmp/task-06-release-runtime-*) ;;
      *) echo "Refusing unsafe runtime path: $runtime_resolved" >&2; exit 1 ;;
    esac
    mv "$ordinary_uploads" "$runtime_resolved/ordinary-uploads"
    mkdir /home/codex/src/us-alb/backend/public/uploads

Install the inverse restoration commands in the task notes before continuing: after stopping Strapi, move the imported `backend/public/uploads` to `$runtime_resolved/imported-uploads`, move `$runtime_resolved/ordinary-uploads` back to `backend/public/uploads`, regenerate the same manifest format, and require an empty `diff`. The native import is:

    cd /home/codex/src/us-alb/backend
    mise exec -- env DATABASE_FILENAME="$runtime_db" ADMIN_PASSWORD= ADMIN_PASSWORD_FILE= WEBHOOKS_NEXTJS_TARGET= npm run strapi -- import --file ".tmp/$runtime_base/us-albatese-demo.tar.gz" --force --only content,files

Before startup, source `backend/.env` and `frontend/.env.development` only with shell tracing disabled. Assert without printing values that backend and frontend webhook header names match, their values match, and `NEXT_PUBLIC_APP_VERSION` is nonempty; then unset the loaded secret/version variables. Start built Strapi in a monitored terminal and wait for `Strapi started successfully` plus health HTTP 200 or 204:

    cd /home/codex/src/us-alb/backend
    mise exec -- env HOST=127.0.0.1 PORT=65100 DATABASE_FILENAME="$runtime_db" WEBHOOKS_NEXTJS_TARGET=http://127.0.0.1:65101 npm run start

Normal frontend startup from `frontend/` uses the new build:

    mise exec -- env CMS_URL=http://127.0.0.1:65100/api CMS_MEDIA_URL=http://127.0.0.1:65100 CMS_API_TOKEN= SITE_URL=http://127.0.0.1:65101 npm run start -- --hostname 127.0.0.1 --port 65101

The slow phase uses the same build and corrected proxy URL:

    mise exec -- env CMS_URL=http://127.0.0.1:65102/api CMS_MEDIA_URL=http://127.0.0.1:65100 CMS_API_TOKEN= SITE_URL=http://127.0.0.1:65101 npm run start -- --hostname 127.0.0.1 --port 65101

Do not override version or webhook secrets. Keep shell tracing disabled while loading project-local env and unset credential/secret variables after use. Poll changed pages with `curl --fail-with-body --silent --show-error` for at most 30 attempts with one-second spacing; store bodies under task evidence and never print secrets or full payloads.

At handoff run:

    cd /home/codex/src/us-alb
    git diff --check
    git diff --cached --quiet
    git diff --name-only
    git status --short --branch
    git rev-parse HEAD
    git rev-parse origin/main
    sha256sum backend/seed-data/us-albatese-demo.tar.gz
    test -d backend/public/uploads
    git check-ignore backend/.env frontend/.env.development backend/.tmp/data.db
    test -z "$(git ls-files -- backend/.env frontend/.env.development backend/.tmp/data.db)"
    ss -ltn '( sport >= :65100 and sport <= :65199 )'
    playwright-cli list

Do not stage, commit, push, switch branches, edit `TODOS2.md`, use `git reset`, use `git checkout --`, broadly kill processes, or recursively delete the workspace root, `backend/.tmp`, ordinary uploads/database, env files, archive, or unrelated scripts.

## Validation and Acceptance

Acceptance requires every item below:

1. The durable source diff is the target-local client leaf, its focused Node unit test, and the one-line ownership integration in `ContactSection`; architecture, CMS pipeline, route dispatch, style/design, packages, schemas, archive, and backend remain unchanged.
2. The fragment predicate handles exact and decoded equality and rejects empty, unrelated, missing-marker, and malformed fragments. Its component runs once per target mount, uses no polling/observer/listener/timer/state, does not move focus/history, and leaves scroll animation to the existing reduced-motion-aware CSS.
3. The new focused test, existing contact tests, full Vitest suite, `mise run fe:check`, and `mise run fe:build` all exit zero. `/`, `/chi-siamo`, and `/attivita` remain Partial Prerender routes and no build requires live Strapi.
4. Isolated `be:openapi` and `fe:openapi` pass; normalized generated artifacts match and raw churn is timestamp-only. No `be:types` or backend test is added or required.
5. A fresh native archive import reports 60 entities, 43 assets, and 118 links with no material transfer diagnostic; public preimages contain two Home methods, two Locations, and all six true visibility values.
6. Against one normal listener from the new build, a Home email publish becomes visible only where expected and a Location `showOnAbout=false` publish produces Home present / About absent / Activity present while the other Location remains everywhere. Both edits and restorations arrive through the real authenticated Strapi webhook with no rebuild/restart and unchanged listener/build identity.
7. A cold 412×914 hard load through the four-second `/api` delay ends at `/#contatti` with heading and first action visible after the streamed target arrives.
8. The five named screenshots all exist and pass visual plus geometric inspection. In particular, the warm 412×914 hard reload retains navigation type `reload` and `#contatti` while placing heading and first action inside the 914 px viewport; desktop and cross-route navigation also land correctly with no horizontal overflow.
9. The long email wraps, retains its full accessible name and exact safe `mailto:` link, receives native keyboard focus through Tab, and shows the existing focus outline. The last mobile contact action has at least eight pixels clearance above the fixed bar.
10. The Home section is the sole live `contatti` id. The footer has no hardcoded contact/address/protocol value, retains `/#contatti`, and visibly renders the real `NEXT_PUBLIC_APP_VERSION`.
11. Editorial Home and Location values are restored exactly before shutdown. Ordinary uploads, ignored database/env files, archive, branch, upstream, and index are unchanged; task processes, ports, browsers, workspaces, logs, proxy, and screenshots are gone.
12. Final status contains only the expected task source/test diff, this plan, and unrelated Imagen scripts. No automated browser, E2E, smoke, deployment, or backend test exists.

## Idempotence and Recovery

Source edits and Node tests are repeatable. If the client leaf fails type or unit validation, repair only the three expected frontend files and rerun the focused command before full validation. Do not convert a server component to a client component, add a global observer, intercept all navigation, or compensate with CSS offsets.

Every generator/runtime retry uses a new unique task-prefixed directory. Never reuse a partially imported database. Resolve cleanup paths with `realpath` and accept only exact `backend/.tmp/task-06-generated-*` or `backend/.tmp/task-06-release-runtime-*` prefixes before moving them to trash. Unresolved variables and broad globs are forbidden.

Upload restoration remains the highest state risk. Before import, capture the ordinary tree manifest outside the provider path, move the whole directory atomically on the same filesystem, create the empty provider directory, and install the restoration steps before mutation. On failure, stop the exact process, move imported uploads into the task workspace, restore the saved directory atomically, compare manifests, and only then retry.

Record exact editorial preimages before mutation. If a later check fails, preserve sanitized evidence but restore both values through the same Strapi admin session while the webhook stack is available. If webhook delivery is broken, restore through admin and verify the isolated public API; never weaken authentication or call `/refresh` manually as proof.

One stale response after revalidation is expected. Retry only within the bounded poll. Do not clear `.next`, rebuild during editorial proof, restart the normal listener, or infer failure from the first read. If the bound expires, retain the relevant sanitized log/body, record the event/tag/page, restore content, and stop.

If the cold or warm fragment assertion fails after remediation, capture hash, navigation type, target/action rectangles, scroll position, reduced-motion state, and screenshot before cleanup. Do not stack a second workaround, add polling, change viewport dimensions, or claim the remaining inspections. Return the finding to review/planning with editorial and local state restored.

## Artifacts and Notes

Historical Worker evidence from the first run remains valid as pre-remediation evidence:

- Baseline was `main` at `f0aadf9`, equal to `origin/main`, with empty index/tracked diff, archive SHA-256 `50d813...afd99`, only upload `.gitkeep`, and no listeners/browsers.
- Focused Vitest passed 3 files / 15 tests; full Vitest passed 9 files / 78 tests; `be:build`, `fe:check`, `fe:build`, isolated generators, and normalized comparisons passed. Partial Prerender markers remained for `/`, `/chi-siamo`, and `/attivita`.
- Native import completed with 60 entities, 43 assets, 118 links, and no material diagnostic. Home and Location live edits each became fresh on bounded attempt 2, page matrices were correct, and exact preimages were restored without changing listener/build identity.
- The cold delayed load passed at 412×914 with heading top 193 px and first action top 337 px. Desktop `home-contact-1600x900.png` passed with heading top 233 px, first action top 373 px, six actions, two balanced cards, and no overflow.
- Warm `home-contact-412x914.png` failed: hash and `reload` were correct, but heading top was 5,146 px and first action top was 5,290 px. Cross-route, focus, and clearance screenshots were intentionally not run.
- Cleanup restored both editorial values, uploads, ports, sessions, archive, ignored local state, branch/upstream/index, and tracked diff exactly.

Post-remediation evidence must be appended here with actual new test totals; normalized generator result; new build/manifest identities; archive/import and listener identity; edit/restoration timings and page matrices; cold-load timing/geometry; all five screenshot filenames and measured rectangles; focus/href/outline, overflow, footer/version, and mobile-clearance results; and final cleanup/scope. Do not paste credentials, secret values, full page bodies, large logs, or generated files.

Post-remediation Worker evidence (2026-10-11):

- The implementation is limited to `frontend/components/shared/fragment-scroll-target.tsx`, its focused test, and the target-local integration in `frontend/components/home/contact-section.tsx`. The client leaf has one `useEffect([targetId])`, safely decodes one leading-hash fragment, resolves the existing id, and calls `scrollIntoView({ block: "start", inline: "nearest" })`; it adds no explicit behavior, timer, animation frame, observer, listener, state, focus, history, CSS, navigation, route, or CMS change.
- `npm test -- components/shared/fragment-scroll-target.test.ts` passed 1 file / 2 tests; the combined contact run passed 2 files / 4 tests; the complete suite passed 10 files / 80 tests. `mise run fe:check` passed Biome over 103 files, Next route type generation, and TypeScript. `mise run fe:build` passed and retained Partial Prerender markers for `/`, `/chi-siamo`, and `/attivita`.
- The rebuilt artifact has `BUILD_ID` SHA-256 `a23d5afe3a486f80ccd8189ccbc72b53d228534a7694c386db865e2751daa919`, build-manifest `2b21e5e3f49fb4e19b9a8437ea0a0c7c303097dd268e083f5b0d152d858e6191`, routes-manifest `e298d2db6f4083e2aab8b5c64f98c61dda5e81d2ffca4f124c784f19989ad5b1`, and app-paths-manifest `e8cea1f763a5e2543c45502c17aa70e7922817b5373f5257e8b0f5d01a2f3922`. Every recapture through edits and restoration matched.
- Fresh isolated `be:openapi` and `fe:openapi` passed in `task-06-generated-BCxK5B`. Normalized JSON and declaration outputs were identical to tracked artifacts; each raw diff contained only 82 removed/added timestamp lines. No generated output was copied back.
- Official archive import into `task-06-release-runtime-25jziH` completed with 60 entities, 43 assets, 118 links, and no material transfer diagnostic. Built Strapi answered health HTTP 204; public preimages had two Home methods, two Locations, and six true visibility assertions.
- The corrected four-second delayed load returned HTTP 200 after 10,328 ms with hard navigation type `navigate`, `#contatti` absent at commit, hash preserved, heading top/bottom 193/229 px, and first action 337/407 px. `slow-hard-load-412x914.png` visually showed the intended heading/actions rather than the footer or upper Home content.
- The one normal listener stayed PID 980905 with start time `Sun Oct 11 19:15:57 2026`. Publishing the Home sentinel through the real admin became fresh on bounded attempt 2 and changed Home only. Publishing `Centro Sportivo Giallonero.showOnAbout=false` became fresh on attempt 2 and produced Home present / About absent / Activity present while the other Location remained everywhere. Matched secret configuration, the real Strapi webhook, days-long cache profile, focused tag tests, and stale-then-fresh reads prove authenticated `home-page` and `locations` revalidation without rebuild or restart.
- `home-contact-1600x900.png` passed: final URL `/#contatti`, heading 233–281 px, first action 373–419 px, six actions, two balanced 538×258 cards side-by-side, zero horizontal overflow, readable long email, and normal footer transition.
- `home-contact-412x914.png` passed the regression: navigation type `reload`, hash `#contatti`, heading 193–229 px and first action 337–407 px both intersecting the viewport, long email action 423–513 px with two text-line rectangles, and zero overflow. The pre-fix failed tops were 5,146 and 5,290 px.
- `cross-route-contact-412x914.png` passed after activating the fixed mobile link from `/attivita`: final `/#contatti`, heading 193–229 px, first action 337–407 px, and zero overflow.
- `focused-long-email-412x914.png` passed after nine native Tab presses from known non-link focus. The active anchor's accessible name contained the full sentinel; its href was the exact safe `mailto:` value; its rectangle was 20–392 px horizontally and 564–654 px vertically; outline was solid 3 px gold; clipping and overflow were both false. Visual inspection showed the complete wrapped address and clear outline.
- `mobile-final-action-clearance-412x914.png` passed after native wheel positioning: the last action was 748–818 px, the fixed mobile bar began at 849 px, yielding 31 px clearance with both fully visible and no overlap or horizontal overflow.
- Source and live footer assertions passed: exactly one live `#contatti`; no footer target, address, protocol link, known contact value, or demonstration address; retained `/#contatti` link; and the exact process-local version was visible at 842–858 px. Every named screenshot plus the cold screenshot was visually inspected, not accepted from geometry alone.
- Restoration used the same admin session. `showOnAbout=true` returned through webhook freshness on attempt 1; the exact original Home email returned on attempt 2; all three pages again showed the selected Location; direct public APIs matched both preimages; listener PID and all four build hashes remained unchanged.
- Guarded cleanup stopped the exact normal Next and Strapi sessions after restoration; the slow listener/proxy had already stopped. Ports 65100–65199 and Playwright sessions are empty. The ordinary upload manifest returned exactly to the sole zero-byte `.gitkeep` with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The isolated generator/runtime directories, imported database/uploads, screenshots, proxy, and positively identified task import log were moved to trash together; no task-prefixed directory or import log remains.
- Final scope guards pass: `git diff --check` is clean; the index is empty; `HEAD` and `origin/main` remain `f0aadf9bd21aa27f93667ceb52f1510ebf864941`; the archive remains SHA-256 `50d8130729f893251b3dff0ffab1e6d513cb09863646e10c914bd8f7cf5afd99`; ordinary environment/database paths remain ignored and untracked. The only tracked diff is `frontend/components/home/contact-section.tsx`; the only task-owned untracked files are this plan and the two authorized shared component/test files. Unrelated `.agents/skills/imagen/scripts/imagen` remains untouched.

Revision note (2026-10-11 / Planner): Created the initial validation-only plan from pushed commit `f0aadf9`, defining canonical/generated gates, isolated archive runtime, real editorial mutations, cache-tag/page-matrix proof, cold delayed hash loading, exact visual checks, and cleanup.

Revision note (2026-10-11 / Worker): Recorded all passing initial gates and runtime evidence, the blocking warm mobile hard-reload geometry, intentionally skipped remaining visual checks under the then-current stop rule, restored all mutable state, and cleaned every task runtime.

Revision note (2026-10-11 / Planner revision): In response to the release-blocking warm hard-reload failure and the user's instruction to continue, replaced the validation-only boundary with a narrowly scoped target-mount client enhancement and focused unit test; documented the Next.js missing-target timing diagnosis; preserved architecture, CMS, styles, accessibility, and reduced-motion ownership; separated historical evidence from required post-build reruns; and revised work, validation, acceptance, expected diff, and recovery so the same Worker can implement, rebuild, repeat integrated webhook proof, and complete all five visual inspections.

Revision note (2026-10-11 / Worker remediation): Implemented the approved one-mount fragment target policy and exact matcher tests, rebuilt and revalidated the frontend, reproduced generated artifacts in isolation, repeated the fresh archive-backed webhook/edit/restoration proof, and passed the corrected cold load, warm reload regression, all five visual inspections, accessibility/focus, footer/version, and immutable listener/build checks. Final guarded cleanup and scope evidence follow in a separate revision note.

Revision note (2026-10-11 / Worker cleanup): Recorded exact editorial restoration, atomically restored and compared ordinary uploads, stopped the task listeners and browser sessions, removed only resolved task-owned artifacts, and confirmed free ports, unchanged branch/upstream/archive/ignored state, empty index, clean diff check, and the exact authorized final file scope.

Revision note (2026-10-11 / Coordinator): Recorded independent Reviewer approval with no actionable findings after the reviewer reproduced canonical validation, isolated import/generation, webhook/editorial restoration, cold and warm fragment behavior, reduced motion, all five visual checks, and final cleanup. Reviewer remediation cycles: 0. Marked task 06 complete in `TODOS2.md`; commit and push are the remaining coordinator actions.

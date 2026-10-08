# U.S. Albatese Website Tasks

`/goal TODOS.md` consumes unchecked top-level tasks in order. Each task must follow root `PLAN.md` and applicable `AGENTS.md`; a later task cannot start until the current task is reviewed, committed, and otherwise closed by the active workflow.

- [x] **01 — Replace the template domain with the U.S. Albatese CMS pipeline**

  Implement final Strapi schemas/components, `TYPES.md`, generated backend/OpenAPI/frontend types, DTOs, client queries, mappers, connector methods, cached reads, cache tags, webhook mapping, Draft Mode previews, Italian routes, and minimal renderers. Remove the generic Article/Event domain and English routes. Validate empty-database startup, backend build/type generation, OpenAPI/frontend generation, checks, and unit tests.

- [x] **02 — Generate placeholder media and build the importable demonstration dataset**

  Derive target-layout dimensions from the desktop/mobile HTML references and produce every image slot with repository-local `imagen` only. Include the eight semantic slots and honest Italian placeholder alt text, three sample PDFs, credible synthetic 2026/27 Strapi content, and `backend/seed-data/us-albatese-demo.tar.gz`. Verify an empty-database import, relations, media, public reads, and that the archive contains no secrets. Built-in `imagegen` must not be used.

- [x] **03 — Implement the responsive design foundation and shared chrome**

  Add Epilogue/Manrope, Tailwind tokens, global layout, deterministic crest/wordmark, desktop and mobile headers/navigation, footer/contact block, version display, and target-consistent loading/error/not-found presentation. Check both required viewports and resolve every navigation target.

- [x] **04 — Implement the high-fidelity Home page**

  Build the target hero, metrics, next fixture, featured news, activity overview, quote, partner strip, and responsive transformations. Ensure optional sections degrade cleanly and preserve request-rendered SSR + ISR behavior.

- [x] **05 — Implement the high-fidelity Chi siamo page**

  Build history, timeline, values, fictional board, facilities, and document introduction from the about DTO. Match the desktop/mobile HTML references and do not represent generated or placeholder people as real officers.

- [x] **06 — Implement the high-fidelity Attività page**

  Build programs, youth-football cards, competitive/open-team and athletics features, schedules/venues, and registration steps. Use only lightweight client-side filtering where interaction requires it, with no new dependency.

- [ ] **07 — Implement Notizie, calendario, documents, and article detail**

  Build the combined hub and `/notizie/[slug]` through `PageSwitch`, including metadata and preview. Cover scores, chronological ordering, missing-score and empty states, downloads, and cache invalidation.

- [ ] **08 — Complete SEO, import rehearsal, and release validation**

  Finalize Italian metadata, canonicals, Open Graph, Organization JSON-LD, sitemap/robots, alt text, and internal links. Rehearse a fresh archive import; start backend and frontend; inspect all routes at exactly 412x914 and 1600x900; run the canonical commands named in `PLAN.md`; and resolve every error before completion.

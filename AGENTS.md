# AGENTS.md

## Shared Engineering Guidelines

> The word "module" means a cohesive unit of code in the relevant language or
> framework.

- Prefer established language, framework, and standard-library capabilities over
  custom implementations. Use modern, idiomatic syntax.
- Apply SOLID and GRASP where they make responsibilities clearer. A little
  ceremony is welcome when it visibly produces smaller, more cohesive modules.
- Keep one module per file unless a module is private or used only by the code
  declaring it. Do not split cohesive models or private helpers solely by size.
- Keep endpoint handlers, service wiring, dependency checks, and implementations
  in concern-specific files or folders; keep composition roots small.
- Prefer guard clauses, descriptive domain names, and named conditions over
  dense control flow. Centralize genuinely repeated rules, constants, encoding,
  and validation in small intention-revealing helpers. Keep sibling paths
  behaviorally consistent.
- Refactor when it is necessary to implement or review the story cleanly. Avoid
  unrelated cleanup unless it is required for canonical validation to pass.
- At dependency boundaries, distinguish invalid data from unavailability,
  propagate cancellation, preserve exception causes, keep diagnostics
  secret-free.
- Give each filtering, normalization, validation, and configuration policy one
  authoritative enforcement owner. Add another enforcement layer only for a
  distinct trust boundary or independently stated failure mode.
- For telemetry, application code owns secret filtering, cardinality, and event
  semantics; telemetry infrastructure owns transport, routing, batching,
  authentication, and sampling. Do not duplicate application field allowlists
  downstream without a distinct trust-boundary requirement.
- This is not an enterprise-grade project. Cover the happy path and the most
  obvious and material failure paths; do not harden against every conceivable
  edge case.

## Verification Guidelines

- Do not hand off validated work until all applicable canonical validation
  passes without errors.
- Unit tests start no external processes. Integration tests may provision
  task-owned dependency containers and must not require a prestarted project
  stack, a fixed shared Compose project, or a fixed host port.
- Automated tests are limited to unit and integration tests. Do not create or
  demand smoke, end-to-end, browser end-to-end, or deployment tests.
- Native configuration rendering, image building, and release-archive assembly
  are build validation, not smoke or deployment tests. Prefer a tool's native
  parser, renderer, compiler, or build command. Add a bespoke structural
  validator only when native tooling cannot prove a required invariant.
- Test each behavior once at the lowest stable boundary that can prove it. Add a
  cross-boundary integration test only when behavior can fail despite the
  lower-level check, such as serialization compatibility, dependency semantics,
  or framework wiring.
- Log prose is not an API. Test exact text only when the wording is itself a
  stable filtering or operator contract. Otherwise test severity, event
  identity, required fields, forbidden sensitive fields, and cardinality with
  one representative event per policy class.
- Do not reproduce the same assertion across unit, integration, image,
  configuration, script, and documentation checks merely for reassurance. Reuse
  an existing test at the owning boundary and delete redundant checks when a
  stronger authoritative check supersedes them.
- Do not introduce a test seam, interface, fake, fixture family, or helper whose
  complexity exceeds the behavior it verifies.
- Test volume, branch count, mutation survival, and assertion count are not
  goals. Validation ends when the story's observable acceptance criteria and
  material regression risks are covered.

## Documentation and Comment Guidelines

- First make production code explain itself through precise names, explicit
  types, cohesive structure, ordinary control flow, and established idioms.
- Add a concise inline comment only when important reasoning cannot be recovered
  quickly from the code: a non-obvious invariant, security or compatibility
  constraint, protocol ownership, calibrated limit, or why a simpler-looking
  implementation is incorrect.
- Do not require file, module, function, or test comments merely for coverage.
  Do not narrate names or create a Markdown document instead of clarifying the
  code. Prefer a precise comment beside the constrained mechanism.
- Do not change README contents unless one of your changes directly contradicts
  the contents.
- Do not teach standard Docker, Compose, shell, Git, or service-lifecycle
  commands, and do not narrate implementation details.
- Do not create separate feature, developer, implementation, test, or
  architecture documents unless the SEED explicitly requires one. Encode
  behavior in code and focused tests; explain remaining non-obvious reasoning
  inline.

## Runtime and Container Safety

- Use ports in the range 65100-65199 for Docker Compose, Docker containers, and
  services in general.
- Bind every published Docker or Compose port explicitly to `127.0.0.1`.
- Test-only containers may use dependency-native container ports and
  Docker-assigned ephemeral host ports, but every published test port must bind
  explicitly to `127.0.0.1`.
- Never require `sudo`, privileged containers, firewall changes, or a shared
  prestarted dependency.
- Harden images made by the project as rootless and distroless with read-only
  filesystems. Do not impose project-owned hardening on third-party images.

## Architecture Guidelines

This is a reusable Strapi 5 + Next.js template meant to give a best-in-class
foundation. Treat the architecture as an asset to extend, not rewrite.

This template is deliberately SSR + ISR. Treat that rendering model as a
contract to preserve while building a specific site.

The bundled styles and components are demonstrative presentation examples, not
design laws or assets to reuse as-is.

- The frontend is SSR + ISR only. Do not add `generateStaticParams`, a static
  export, or build-time prerendering of content. On-demand revalidation flows
  through `app/refresh/route.ts`; extend `cms/tags.ts` and `cms/cache.ts` when
  adding content types.
- Static routes (no dynamic segment) are prerendered at build time by default,
  and `"use cache"` data does not change that — Next bakes the fetch into the
  static shell. Any CMS-backed route must call `await io()` (from `next/cache`,
  in page components) or `await connection()` (from `next/server`, in metadata
  routes such as `sitemap.ts`) so the content is rendered at request time
  instead of forcing a build-time dependency on the backend.
- Keep and extend the target site's design while preserving the dispatch and CMS
  pipeline model. Own page-specific presentation under
  `frontend/components/<page>/`; use `components/layout/` only for site chrome,
  `components/shared/` only for genuinely cross-page presentation, and keep the
  cross-page dispatcher at `components/page-switch.tsx`.
- The discovery layer — list endpoints in
  `cms/client.ts`/`connector.ts`/`data.ts`, list pages under
  `app/(content)/*/page.tsx`, `app/sitemap.ts`, `app/robots.ts` — must be
  extended alongside any new content type, not bolted on later.
- Collection routes (`app/(content)/articles|events|news/page.tsx`) render their
  `*-list-page.tsx` component directly; this is the one intentional exception to
  the page-switch dispatch, which exists for single-document pages.
- Never change the stack, and never alter the core frontend architecture.
- Frontend routes delegate to a single page-switch component
  (`frontend/components/page-switch.tsx`) that dispatches to concrete page
  components (`frontend/components/<page>/page.tsx`). Keep this dispatch model.
- Consume CMS data through `frontend/cms/` exactly as defined, including its
  caching approach: raw Strapi client (`client.ts`) → `connector.ts` maps raw
  data to frontend DTOs (`model.ts`) via `mappers.ts` → cached reads (`data.ts`
  using `"use cache"` with `cacheLife`/`cacheTag`) → webhook-driven revalidation
  (`webhook.ts` and `app/refresh/route.ts`). Do not replace this pipeline.
- When adding a content type, extend the existing pipeline end-to-end (schema →
  client → mapper → connector → cached read → cache tag/webhook mapping → list
  endpoint → sitemap → navigation entry → page-switch entry plus a page
  component) rather than a parallel path.
- Proactively implement the shared Strapi Preview plus Next Draft Mode path for
  an existing or new Draft & Publish content type only when unpublished
  presentation materially helps editors. Do not add Preview mechanically to
  every content type or create a parallel pipeline; the explicit confirmation
  gate below still applies before any content-type change.
- You may add cross-cutting components in `frontend/components/` and use any
  Next.js feature as long as the architecture above is unchanged.
- Frontend tests use vitest and may be skipped only when they would only assert
  visuals. Non-visual server-side logic at trust boundaries (webhook secret and
  tag mapping, mapper validation, query serialization) is recommended coverage.
- Use Tailwind CSS as-is. Normalize genuinely repeated patterns into custom
  utilities. Creating a custom theme or a component/design system is allowed and
  recommended when the site calls for it (e.g., a showcase site).
- Keep Strapi 5 changes within its default mechanisms. Using the bootstrap phase
  with small helpers (as in `backend/src/bootstrap/`) is fine; do not add extra
  API endpoints through low-level Strapi plumbing.
- Apply Strapi 5 changes through its APIs or the admin UI (browser) so they are
  applied correctly. Avoid editing schema files directly unless unavoidable.
- Before changing content types in Strapi 5, request explicit user confirmation
  unless it was given in advance in the prompt.
- Do not produce or request any type of tests for the Strapi 5 backend. The
  proper verification is simply that it starts from an empty database.
- After any backend or frontend change, refresh the generated artifacts that
  document the API surface via the mise tasks `be:openapi` (writes
  `frontend/cms/schema.json`), `fe:openapi` (writes `frontend/cms/schema.d.ts`),
  and `be:types` when backend types changed.
- Upgrading Strapi 5 to a new version is forbidden unless the user explicitly
  asks for it.
- It is important to show the value of env. var. `NEXT_PUBLIC_APP_VERSION` in
  the website footer. This information is critical to understand what version is
  being used by an user when reporting issues.
- Use files in `design/` folder for design style, guidelines and flavor.
  Already implemented conventions and styling takes precedence over `design/`.
  `design/` is the inspiration `frontend/` is the authoritative implementation.

## Environment

- NEVER alter machine or user environment variables. Always use `.env` files
  local to your project. Take advantage of Mise-en-Place
  [.env](https://mise.jdx.dev/environments/) support. If you must alter the
  machine or user environment **stop** and ask for permission.

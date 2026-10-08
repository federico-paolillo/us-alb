# U.S. Albatese Website Implementation Plan

## Authority and outcome

This document is the authoritative specification for implementing the complete U.S. Albatese website. `BRIEF.md` defines the product requirements, `design/DESIGN.md` defines the visual system, `design/HISTORY.md` grounds the club identity, historical context, nomenclature, and editorial tone, and the HTML files under `design/reference/` define the target page composition, hierarchy, responsive behavior, and expected sections. The finished site is an Italian, responsive U.S. Albatese demonstration website for the required 412x914 mobile and 1600x900 desktop viewports. It must preserve the repository's Strapi 5 and Next.js SSR + ISR architecture.

## Product and route surface

Provide these routes:

- `/`: Home, with the club's editorial entry point.
- `/chi-siamo`: history, values, fictional board, facilities, and institutional documents.
- `/attivita`: football, athletics, teams, schedules, venues, and registration.
- `/notizie`: the combined news, results, upcoming fixtures/events, and official-document hub.
- `/notizie/[slug]`: an individual editorial article.

Remove the template-only `/articles`, `/events`, and `/news` routes without redirects. Contact information belongs in the shared footer at `#contatti`; do not provide a separate contact page or a working contact form. Build one responsive component tree, rather than separate desktop and mobile sites. Reconcile small responsive differences between the desktop and mobile HTML references where necessary while preserving the visible intent.

## CMS model and frontend interfaces

Implement the following Strapi types and document every type and reusable component in root `TYPES.md`:

- `home-page`: eyebrow, headline, introduction, hero image, metrics, institutional quote, and activity teasers.
- `about-page`: hero copy and image, history, timeline, values, fictional board members, facilities, and document introduction.
- `activity-page`: hero, grouped sporting programs, schedules, venues, athletics/open-team features, and registration steps.
- `news-item`: slug and title identity, category, summary, editorial date, hero image, blocks content, and featured flag.
- `calendar-entry`: a `match | result | event` kind, date/time, competition, title, optional teams and scores, venue, summary, and optional call to action.
- `official-document`: title, category, season, uploaded PDF, and display order.

Expose `HomePageDto`, `AboutPageDto`, `ActivityPageDto`, `NewsDto`, `NewsListItemDto`, `CalendarEntryDto`, and `OfficialDocumentDto`. Add the cached reads `getHomePage`, `getAboutPage`, `getActivityPage`, `getNewsBySlug`, `listNews`, `listCalendarEntries`, and `listOfficialDocuments`. Add home, about, activity, and news-detail variants to `CmsPageDto` and `PageSwitch`. `/notizie` remains the intentional direct-rendering collection-list exception to `PageSwitch`.

Preserve the established raw Strapi client -> mapper -> connector -> cached data -> cache-tag/webhook pipeline. CMS-backed pages must call `await io()` so content renders at request time; metadata routes such as the sitemap must call `await connection()` for the same reason. Continue to use `"use cache"`, `cacheLife`, `cacheTag`, and webhook `revalidateTag`. Do not add static export or `generateStaticParams`. Add Strapi Preview and Next Draft Mode for the three institutional single types and news articles; aggregated activity, calendar, and document preview is needed only through a containing page where preview is materially useful.

## Visual system and shared chrome

Use Epilogue for headings and Manrope for body copy via `next/font`. Apply the gold, graphite, white, and pale-surface tokens from `design/DESIGN.md`, with restrained borders, shadows, radii, tabular score typography, a centered 1200px desktop grid, and mobile card layouts.

Shared chrome includes a deterministic SVG/HTML abstract crest and wordmark, a sticky desktop header, a compact mobile header with fixed bottom navigation, an institutional footer with fictional safe contact details, and visible `NEXT_PUBLIC_APP_VERSION`. The crest must not be represented as a historical official mark.

## Media, seed content, and archive

Use the repository-local `.agents/skills/imagen/` workflow for every CMS image slot. It produces exact-size solid-magenta PNG placeholders with black dimension labels. Derive their dimensions and aspect ratios from the desktop/mobile HTML reference layouts. Cover at least these semantic slots: youth football, celebration, athletics, community gathering, adult/open team, training, football facility, and oratory/facility. Generate same-dimension files in separate temporary directories or rename each immediately because `imagen` writes `WIDTHxHEIGHT.png` and overwrites an existing file with that name. Import accepted placeholders into Strapi and write truthful Italian alternative text that identifies each as a placeholder for its intended subject. Let Strapi/Next produce responsive crops; do not create separate mobile images.

Do not call, substitute, or silently introduce the built-in `imagegen` tool. Do not use stock or photorealistic images.

Seed credible, synthetic Italian content for season 2026/27. Retain only non-sensitive identity facts: the 1968 origin, Albate/Como context, yellow-black colours, CSI/FIDAL associations, and community mission. Names, contacts, fixtures, results, news, and board members must be fictional. Never associate placeholder imagery with documented real people. Keep navigation, scores, schedules, calls to action, summaries, contacts, and SEO metadata concise and unambiguous. Use deliberately ornate, baroque Italian in history, activity prose, quotations, and article bodies, with one sparse non-sequitur per long-form article and institutional page; never use that style or non-sequiturs in utility text or metadata. Do not display a demo disclaimer.

Create three simple valid sample PDFs for official documents. Export populated content and uploads, unencrypted, to `backend/seed-data/us-albatese-demo.tar.gz`, containing content and files only. A later implementation task must import it into an empty disposable database and prove that it excludes secrets, administrator users, API tokens, and environment-specific webhook configuration.

## Page composition

Home contains the hero, club metrics, next fixture, featured news, activity overview, institutional quote, partner strip, and responsive card transformations. Chi siamo contains history, timeline, values, fictional board, facilities, and document introduction. Attività contains program filters/grouping, youth-football cards, competitive/open-team and athletics features, schedules/venues, and registration steps. Notizie contains upcoming matches, results, events, featured/latest news, and official-document downloads. News detail renders through `PageSwitch`, with metadata and preview support. Optional data, scores, and collections must fail gracefully when absent.

## SEO, quality, and acceptance

Set `<html lang="it">`, canonical and page-specific metadata, Open Graph data, meaningful truthful image alt text, and Organization structured data. Add the four top-level routes and every published news article to the sitemap; keep `robots.ts` canonical. Preserve semantic HTML, native control behavior, visible focus states, and clear interactive labels. WCAG certification and a dedicated accessibility test suite are not required.

Manually validate the finished site at exactly 412x914 and 1600x900. Automated smoke, browser end-to-end, deployment, and Strapi backend tests are out of scope. Unit-test only changed non-visual server logic at stable trust boundaries: mapper validation, query serialization, preview-path handling, and webhook cache-tag mapping. Final validation includes `be:build`, `be:types`, `be:openapi`, `fe:openapi`, `fe:check`, `fe:build`, the frontend Vitest suite, Strapi startup from an empty database, and the seed-archive import rehearsal.

## Boundaries and assumptions

The reference HTML files are binding page-composition targets, subject only to small responsive reconciliation. `design/DESIGN.md` remains authoritative for the visual system, while `design/HISTORY.md` informs identity and tone without validating current people, contacts, or statistics. Deployment, analytics, authentication, contact submission, live league feeds, galleries, multilingual support, and social integration are excluded. Keep the existing Strapi 5 and Next.js versions, add no UI dependency or design-system package, and do not rewrite the core frontend architecture. Content-type changes are explicitly authorized by `BRIEF.md`.

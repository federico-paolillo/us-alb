# Strapi 5 + Next.js 16

A reusable foundation for read-only (or low-interaction) showcase websites —
company sites, football-team pages, parishes, and the like. A Strapi 5 backend
serves content; a Next.js 16 frontend renders it. This template is meant to be
extended by a coding agent or developer into a complete, styled site.

## Running locally

Refer to [mise.toml](mise.toml) file for a list of useful tasks. Use
`mise run dev` to quickly launch the backend and frontend.

On first boot, the backend creates a default admin user and provisions the
revalidation webhook when the relevant environment variables are set.

## Rendering model

The frontend is **SSR + ISR**. Content is fetched on demand through a
[Cache Components](https://nextjs.org/docs) pipeline (`"use cache"`,
`cacheLife`, `cacheTag`) and revalidated on content changes via a Strapi webhook
that calls `app/refresh/route.ts` (`revalidateTag`).

The template is intentionally **not** a static (SSG) site: there is no
`generateStaticParams`, no static export, and no build-time prerendering of
content. Pages are rendered on the server and cached for a `days` profile; edits
in Strapi invalidate the affected cache tags.

## Preview mode

Institutional pages and news details can be previewed through Strapi Preview and
Next Draft Mode. Calendar entries and official documents preview through the
aggregate `/notizie` page. Draft requests bypass caches only in the editor's
browser; public requests stay on the existing SSR + ISR path.

## Presentation examples

The bundled styles and components demonstrate one complete presentation; they
are not design laws or presentation assets to reuse as-is. Adapt the target
site's visual language while preserving the SSR + ISR model, CMS pipeline, and
route/component ownership conventions in [`AGENTS.md`](AGENTS.md).

## Environment variables

The backend reads `backend/.env` (see `backend/.env.example`). The frontend
reads `frontend/.env*` (see `frontend/.env.example`). The frontend fails fast at
startup if a required variable is missing.

## Adding a content type

Extend the existing pipeline end-to-end rather than adding a parallel path.

1. Strapi schema (via the Strapi admin UI)
2. `frontend/cms/client.ts`
3. `mappers.ts`
4. `connector.ts`
5. `cms/data.ts` (cached reads)
6. Webhook tag mapping and cache-tag ownership (`cms/tags.ts`)
7. `sitemap.ts`
8. Navigation entry
9. A page component and its route

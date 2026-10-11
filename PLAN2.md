# CMS-backed Home contacts

## Starting point and scope

Implement this plan from a clean repository. Inspect the existing Home, About,
Activity, footer, navigation, Strapi schemas, demo archive, and CMS data
pipeline before editing. Do not assume any earlier implementation, generated
artifact, local database, or build-tool change is available. The root `PLAN.md`
and `TODOS.md` belong to earlier work; a new task queue for this feature should
refer to this plan without silently replacing those files.

The user has given consensus to changing Strapi content types. Make schema changes through Strapi's APIs or admin UI
unless that is unavoidable. The feature does not require a stack, rendering,
or build-tool change.

No retro-compatibility must be preserved.

## Outcome

The `Contatti` links in desktop and mobile navigation, footer navigation, and
the registration call to action lead to a full section at the bottom of Home,
immediately before the footer. Editors can publish addresses, phone numbers,
email addresses, and the section's heading and introduction in Strapi. Existing
webhook-driven cache revalidation makes later editorial changes visible without
a Next.js rebuild or deployment. The footer keeps site identity, navigation,
legal text, and the visible `NEXT_PUBLIC_APP_VERSION`, but no contact details
or `contatti` anchor.

## CMS content model

The `home-page` single type owns optional `contactHeading`,
`contactIntroduction`, and repeatable club-wide `content.contact-method`
entries. An unset heading renders as “Contatti”. Each method has a `phone` or
`email` kind, an editor-facing label, and a value. Club-wide methods are
separate from methods for a particular location.

Use one shared `location` collection in place of the embedded About facilities
and Activity venues. A location has a required name and address; optional About
summary and image, Activity details, and contact methods; a display order; and
one visibility switch for each consuming page. Home displays a location's
address and any location-specific methods. About and Activity reuse the same
records for their existing location presentations. Activity schedule venue
labels remain free text so editors can name sub-areas within a location.

Map contact values to safe `tel:` and `mailto:` links at the CMS mapper
boundary. Define one validation policy for published values and a deliberate
policy for incomplete draft methods, so an editor can preview work in progress
without the public site inventing contact details. A location address remains
visible even when that location has no phone or email.

The revised demo archive contains the two fictional locations from the
existing About and Activity content, a club-wide `.example` email and clearly
fictional phone number, and at least one location-specific email and phone.
It includes published content, media, and the Public role's `location.find`
permission, but no administrator accounts, tokens, environment values, or
webhook configuration. Export and import the archive through Strapi and verify
a fresh import has no skipped links or stale media references. This plan does
not include migrating another CMS instance. An existing installation still
needs location records and public read permission before rollout, through
editorial entry or a separately agreed migration.

## Frontend and navigation

Preserve the existing raw Strapi client → mapper → connector → cached read
pipeline. Query published or draft locations with their methods and image,
ordered by display order then name. Cache the list under a `locations` tag and
invalidate it for `location` webhooks; the existing `home-page` tag covers the
club-wide fields. Home, About, and Activity filter the same Location DTOs by
their page visibility switches. Keep request-time CMS rendering through
`await io()` and the existing `PageSwitch` dispatch.

The Home section uses the site's Tailwind styles, semantic headings and
addresses, accessible contact links, and visible keyboard focus. On mobile,
club-wide phone and email actions come before location cards. Leave enough
space for the fixed mobile navigation below the final action. Keep the section
and its `id="contatti"` present when editors temporarily remove every method
and location; show a short updating message instead of fabricated details.
No contact form, map link, embedded map, or standalone contact route is in
scope.

Because Home is rendered from request-time CMS data and may stream, verify
`/#contatti` navigation from Home and from another route, including a hard
load and a slow CMS response. The heading and first actions should be clearly
visible after the jump, rather than merely exposing the footer. Add custom
scroll behavior only if the existing browser and Next.js behavior fails this
check.

## Work areas for TODO decomposition

1. Confirm the Strapi schema change, add the contact-method component, Home
   fields, shared location collection, and Public location read permission
   through Strapi. Replace the embedded About facilities and Activity venues.
2. Rebuild the demo archive with the fictional contacts and shared locations.
   Import it into a separate empty database and check published records,
   permissions, media references, and zero skipped links.
3. Extend the generated API types and the CMS client, mapper, connector, cached
   reads, and webhook tags. Apply location visibility consistently on Home,
   About, and Activity.
4. Add the responsive Home contact section, keep all existing `/#contatti`
   links pointing to it, and remove the footer anchor and contact details.
   Preserve the footer version display.
5. Refresh `be:types`, `be:openapi`, and `fe:openapi`, then review their diffs.
   Run the applicable canonical backend build, frontend checks and build, and
   focused frontend unit or integration tests. Do not add Strapi backend tests
   or automated browser tests.

## Acceptance checks

- Start Strapi against an empty database, then import the revised archive into
  another empty database without skipped links or missing media. Confirm the
  public API returns the published Home contacts and shared locations.
- Publish a Home contact-method edit and a location address or visibility edit.
  Confirm the selected pages update after webhook revalidation without a
  frontend build. Confirm an unselected page does not show that location.
- Inspect the Home contact section manually at 412×914 and 1600×900. Check
  the anchor from the same page and another page, the heading and first
  actions, readable long email addresses, keyboard focus, and clearance above
  the fixed mobile navigation.
- Confirm the footer has no hardcoded contact information and still displays
  `NEXT_PUBLIC_APP_VERSION`.

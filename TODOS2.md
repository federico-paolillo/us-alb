# CMS-backed Home Contacts Tasks

Start from a clean repository and use `PLAN2.md` and applicable `AGENTS.md` as the
requirements. Close each task only after its changes pass applicable canonical
validation. Run `be:openapi` and `fe:openapi` after backend or frontend changes,
and `be:types` when backend types change, as required by `AGENTS.md`. Leave the
earlier `PLAN.md` and `TODOS.md` alone.

- [x] **01 — Add the Strapi contact model without removing existing page fields**

  Obtain the explicit confirmation required by `AGENTS.md` before changing
  content types. Through Strapi's APIs or admin UI, add the repeatable
  `content.contact-method` component, optional Home contact heading,
  introduction, and club-wide methods, plus a Draft & Publish `location`
  collection with name, address, optional About and Activity content, optional
  methods, display order, and per-page visibility switches. Keep the existing
  embedded facility and venue fields until task 04 so the frontend continues
  to build. Refresh generated types and API schemas; verify Strapi starts from
  an empty database and applicable builds and checks pass. Do not change the
  project's build tooling for this feature. Update TYPES.md as necessary.

- [x] **02 — Carry contacts and locations through the CMS data pipeline**

  Populate Home methods and query published or draft locations with image and
  methods, ordered by display order then name. Add DTOs, mapper validation and
  safe `tel:`/`mailto:` links, connector methods, cached reads, location cache
  tags, and webhook invalidation within the existing client → mapper →
  connector → cache pipeline. Define and cover behavior for incomplete drafts
  and malformed published values at the mapper boundary. Keep existing
  About/Activity data paths working until task 04; add focused frontend tests
  for query serialization, mapping, and tag selection.

- [x] **03 — Put the responsive contact section on Home**

  Render an explicit `id="contatti"` section after the other Home content and
  before the footer, using the site's styles and editable Home copy. Show
  club-wide phone/email actions before visible location cards on mobile, keep
  the anchor and a short updating message when there is no contact content,
  and leave clearance above the fixed mobile navigation. Remove hardcoded
  contact details and the `contatti` anchor from the footer while preserving
  `NEXT_PUBLIC_APP_VERSION`. Keep header, mobile navigation, footer, and
  registration links targeting `/#contatti`. Check semantic addresses,
  keyboard focus, and long email rendering without adding a form or map.

- [x] **04 — Reuse the shared locations on About and Activity**

  Switch both pages to the cached Location DTOs and their respective visibility
  switches. Preserve their existing presentation, request-time `await io()`
  rendering, and `PageSwitch` dispatch; leave Activity schedule venue labels
  as editorial free text. Remove the old embedded facility and venue fields
  and components through Strapi, update the frontend models and queries, and
  refresh generated artifacts. Confirm the backend starts with an empty
  database and applicable frontend checks and build pass.

- [x] **05 — Rebuild and verify the demonstration archive**

  Use Strapi to turn the existing fictional About facilities and Activity venues
  into two published shared locations. Add a club-wide `.example` email and
  clearly fictional phone, and at least one location-specific email and phone.
  Include Public `location.find` permission. Export the revised
  archive and import it into a separate empty database; resolve any skipped
  links or stale media references. Confirm published Home contacts and
  locations are readable through the public API, and that the archive contains
  no administrator accounts, tokens, environment values, or webhook
  configuration. Migration of another CMS instance is outside this task.

- [ ] **06 — Verify editorial updates, navigation, and release gates**

  Run applicable canonical backend build, generated-artifact, frontend check,
  build, and focused unit/integration validation. Publish a Home method edit
  and a location address or visibility edit; confirm webhook revalidation
  updates only the selected pages without rebuilding the frontend. Manually
  inspect the contact section at 412×914 and 1600×900. Follow `/#contatti`
  from Home and another route, including a hard load and a slow CMS response;
  confirm the heading and first actions are visible, long emails and keyboard
  focus are usable, and the fixed mobile bar does not cover the final action.
  Confirm the footer has no hardcoded contacts and still shows
  `NEXT_PUBLIC_APP_VERSION`.
  Do not add Strapi backend tests or automated browser tests.

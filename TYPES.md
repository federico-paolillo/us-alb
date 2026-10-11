# U.S. Albatese content contract

All seven editorial content types use Strapi Draft & Publish. Required repeatable
components contain at least one item. Images are single image assets; files are
single file assets. Presentation, placeholder media, seeded content, and sample
documents belong to later tasks.

## Reusable components

### Identity / Slug

`identity.slug` is a required, non-repeatable identity on news. `slug` is a
required unique string between 3 and 120 characters. `title` is a required
string of at most 160 characters.

### Content / Metric

`content.metric` has required `value` and `label` strings. `value` is capped at
40 characters and `label` at 100. Home uses a required repeatable list of
metrics.

### Content / Institutional Quote

`content.institutional-quote` has required multi-line `text`, required
`attribution` capped at 120 characters, and optional `role` capped at 120.
Home uses exactly one required quote.

### Content / Activity Teaser

`content.activity-teaser` has an optional `eyebrow` capped at 80 characters,
required `title` capped at 160, required multi-line `summary`, and an optional
single image. Home uses a required repeatable list of activity teasers.

### Content / Contact Method

`content.contact-method` has required `kind`, `label`, and `value` fields.
`kind` is either `phone` or `email`; `label` is capped at 120 characters and
`value` at 255. Home and Location use optional repeatable contact-method lists.

### Content / Timeline Entry

`content.timeline-entry` has required `year` capped at 32 characters, required
`title` capped at 160, and required multi-line `body`. About uses a required
repeatable timeline.

### Content / Value

`content.value` has a required `title` capped at 160 characters and required
multi-line `body`. About uses a required repeatable list of values.

### Content / Board Member

`content.board-member` has required `name` and `role` strings, each capped at
160 characters, required multi-line `bio`, and an optional single portrait
image. About uses a required repeatable board. Seed content must use fictional
people.

### Content / Sport Program

`content.sport-program` has required `group`, required `title` capped at 160
characters, required multi-line `summary`, optional `audience` capped at 120,
and an optional single image. `group` is one of `youth-football`,
`competitive-football`, `athletics`, or `community`. Activity uses a required
repeatable programs list.

### Content / Schedule

`content.schedule` has required `title`, `days`, and `venue` strings capped at
160 characters and required `time` capped at 100. Activity uses a required
repeatable schedules list.

### Content / Feature

`content.feature` has an optional `eyebrow` capped at 80 characters, required
`title` capped at 160, required multi-line `body`, and an optional single image.
Activity uses one required open-team feature and one required athletics feature.

### Content / Registration Step

`content.registration-step` has a required integer `order` of at least 1,
required `title` capped at 160 characters, required multi-line `body`, and
optional multi-line `note`. Activity uses a required repeatable registration
sequence.

### Content / Call To Action

`content.call-to-action` has a required `label` capped at 120 characters and a
required `url` capped at 255. Calendar entries may contain one optional call to
action.

## Editorial content types

### Home Page

`home-page` is a single type consumed by `/` through `getHomePage`. It has
required `eyebrow` capped at 80 characters, required `headline` capped at 200,
required multi-line `introduction`, one required hero image, one required
institutional quote, and required repeatable metrics and activity teasers with
at least one item each. Optional contact content consists of `contactHeading`,
capped at 160 characters, multi-line `contactIntroduction`, and repeatable
`contactMethods` owned by the club rather than by a particular location. Its
frontend DTO is `HomePageDto` with discriminant `pageType: "home"`; it carries
the optional contact heading and introduction plus validated club-wide contact
methods. Home also reads the ordered Location collection, filters it only by
`showOnHome`, and renders the editable copy, club-wide methods, and visible
Location addresses and methods in its bottom contact section. Preview targets
`/`.

### About Page

`about-page` is a single type consumed by `/chi-siamo` through `getAboutPage`.
It has required `eyebrow` capped at 80 characters, required `headline` capped
at 200, required multi-line `introduction`, one required hero image, and
required blocks `history`. Timeline entries, values, and board members are
required repeatable components with at least one item each.
`documentEyebrow` is required and capped at 80 characters, `documentTitle` is
required and capped at 160, and `documentIntroduction` is required multi-line
text. Its frontend DTO is `AboutPageDto` with discriminant `pageType: "about"`;
the page separately reads the ordered Location collection and filters it only
by `showOnAbout`. Preview targets `/chi-siamo`.

### Activity Page

`activity-page` is a single type consumed by `/attivita` through
`getActivityPage`. It has required `eyebrow` capped at 80 characters, required
`headline` capped at 200, required multi-line `introduction`, and one required
hero image. Programs, schedules, and registration steps are required
repeatable components with at least one item each. The open-team and athletics
features are each required single components; `registrationIntroduction` is
required multi-line text. Its frontend DTO is `ActivityPageDto` with
discriminant `pageType: "activity"`; the page separately reads the ordered
Location collection and filters it only by `showOnActivity`. Preview targets
`/attivita`.

### Location

`location` is a collection type for shared club locations. It has required
`name` capped at 160 characters and required `address` capped at 240. Optional
page-specific material consists of multi-line `aboutSummary`, one About image,
and multi-line `activityDetails`; `contactMethods` is an optional repeatable
list for methods belonging to that location. Required integer `displayOrder`
defaults to zero and cannot be negative. Required `showOnHome`, `showOnAbout`,
and `showOnActivity` switches each default to `false`, so a new location is not
shown until an editor opts it into a page.

The Location collection has a status-aware `LocationDto` list read in the CMS
pipeline. Home, About, and Activity preserve its `displayOrder` then name order
and filter it only by `showOnHome`, `showOnAbout`, or `showOnActivity`,
respectively. Home presents each visible Location's name, address, and contact
methods; About uses `aboutSummary` and `aboutImage`; Activity uses
`activityDetails`. Schedule `venue` remains required editorial free text and is
not resolved against Location records. Public has Location collection read
permission through `location.find`. The demonstration archive contains two
published shared Locations plus fictional Home and Location phone/email
contacts; its other permission sets and existing demonstration content remain
preserved.

### News

`news-item` is a collection type. Every item has required identity, `category`
capped at 120 characters, a required multi-line `summary` capped at 280, a
required `editorialDate`, one required hero image, required blocks `content`,
and required `featured` with default `false`.
`/notizie/[slug]` consumes `NewsDto` through `getNewsBySlug`; the DTO has
discriminant `pageType: "news-detail"`. `/notizie` and the sitemap consume
published-only `NewsListItemDto` values through `listNews`. Preview targets the
encoded `/notizie/[slug]` detail path.

### Calendar Entry

`calendar-entry` is a collection type consumed by `/notizie` through
`listCalendarEntries`. Required fields are `kind`, `startsAt`, `competition`
capped at 160 characters, `title` capped at 160, `venue` capped at 200, and a
multi-line `summary` capped at 280. `kind` is `match`, `result`, or `event`.
`homeTeam` and `awayTeam` are optional strings capped at 160 characters;
non-negative integer `homeScore`, non-negative integer `awayScore`, and one call
to action are optional. The frontend DTO is `CalendarEntryDto`. Preview targets
`/notizie`.

### Official Document

`official-document` is a collection type consumed by `/notizie` through
`listOfficialDocuments`. It has required `title` capped at 160 characters,
required `category` capped at 120, required `season` capped at 32, one required
file, and required non-negative integer `displayOrder` defaulting to zero. The
file is editorially restricted to PDF; the frontend mapper enforces MIME
`application/pdf`. The frontend DTO is `OfficialDocumentDto`. Preview targets
`/notizie`.

## Frontend reads and rendering

The public cached reads are `getHomePage`, `getAboutPage`, `getActivityPage`,
`getNewsBySlug`, `listNews`, `listCalendarEntries`, and
`listOfficialDocuments`, plus the status-aware `listLocations`. Single-document
pages dispatch through `CmsPageDto` and `PageSwitch`; `/notizie` renders its
three collections directly.

`ContactMethodDto` owns trimmed display values and mapper-created `tel:` or
`mailto:` links. Published Home and Location payloads fail mapping when a
contact row is incomplete or unsafe. Draft payloads omit only invalid contact
rows while retaining valid siblings; they do not invent replacement contact
content. `listLocations` selects draft or published status and caches the
shared collection under the `locations` tag for webhook invalidation.

Draft Mode selects draft or published status for the three singleton reads,
news details, calendar entries, and official documents. `listNews` is always
published-only, including when `/notizie` is previewing its other two
collections. Calendar and official-document previews therefore render through
the aggregate `/notizie` route and have no standalone detail route.

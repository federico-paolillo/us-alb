---
name: Albatese Calcio Editorial
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dae0'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4fa'
  surface-container: '#ebeef4'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#dfe3e8'
  on-surface: '#181c20'
  on-surface-variant: '#4f4634'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f7'
  outline: '#817661'
  outline-variant: '#d3c5ad'
  surface-tint: '#785a00'
  primary: '#785a00'
  on-primary: '#ffffff'
  primary-container: '#d4a000'
  on-primary-container: '#4f3a00'
  inverse-primary: '#f6be2f'
  secondary: '#5d5e64'
  on-secondary: '#ffffff'
  secondary-container: '#dfdfe6'
  on-secondary-container: '#616269'
  tertiary: '#675f39'
  on-tertiary: '#ffffff'
  tertiary-container: '#b2a87d'
  on-tertiary-container: '#443d1b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdf9d'
  primary-fixed-dim: '#f6be2f'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5b4300'
  secondary-fixed: '#e2e2e9'
  secondary-fixed-dim: '#c6c6cd'
  on-secondary-fixed: '#1a1b21'
  on-secondary-fixed-variant: '#45474c'
  tertiary-fixed: '#efe3b3'
  tertiary-fixed-dim: '#d2c799'
  on-tertiary-fixed: '#211b00'
  on-tertiary-fixed-variant: '#4e4724'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#dfe3e8'
typography:
  display:
    fontFamily: Epilogue
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.75rem
  space-xl: 3rem
---

## Brand & Style

This design system expresses the storied heritage of an Italian football institution through a high-end, contemporary editorial lens. Instead of adopting the visual cacophony common to amateur sports platforms—such as aggressive betting banners, loud neon badges, and crowded data tables—the aesthetic is disciplined, elevated, and serene. It merges the gravitas of European sports journalism with the clean precision of modern Swiss layout design.

The target audience encompasses athletes, club members, supporters, families, and civic partners who seek fixtures, match reports, and institutional updates without friction. The emotional register is proud, dignified, and calm: conveying athletic excellence, local belonging, and refined sportsmanship.

### Key Visual Pillars

- **Editorial Whitespace:** Generous negative space acts as a core framing element, letting imagery and typography command attention.
- **Prestige Accents:** Restrained deployments of warm gold against deep graphite deliver authority without commercial vulgarity.
- **De-cluttered Utility:** Every fixture card, scoreline, and player bio is stripped to its essential information, honoring the clarity of high-grade editorial print.

## Colors

The palette is anchored by the historic identity of the club, calibrated for digital readability and quiet luxury.

- **Primary (`#D4A000` / `#E5B800`):** An artisanal, non-fluorescent gold reminiscent of archival trophies and embroidered crests. It is deployed strictly for active states, key interactive accents, match status callouts, and bespoke badges. It is never used as raw background for long-form reading.
- **Secondary (`#111318`):** Deep graphite black with a faint cool undertone. Replaces harsh `#000000` to deliver deep contrast while preserving an editorial, printed-ink finish for titles and primary action surfaces.
- **Tertiary (`#F4E8B8`):** A soft, champagne-tinted surface tone used for delicate container fills, subtle hover feedback, and highlight chips.
- **Neutral (`#5F6368`):** Balanced mid-grey for metadata, secondary captions, and non-active icons.
- **Surface Canvas (`#FFFFFF` & `#F9FAFB`):** Pure white canvas paired with soft, off-white foundation tiers ensures visual purity and zero visual noise.

## Typography

The typographic hierarchy pairs the structured, architectural strength of **Epilogue** for display, titles, and scorelines with the neutral, hyper-legible geometric grace of **Manrope** for analytical text, player stats, and editorial prose.

- **Epilogue (Headlines):** Gives match outcomes, statements, and editorial features an authoritative sporting voice. Negative tracking tightens large scale headings to preserve a sharp, poster-like silhouette.
- **Manrope (Body & Metadata):** Provides open counterforms and uniform rhythm across rosters, standings tables, and article reading surfaces.
- **Numbers & Scores:** All numerical metrics and match scores leverage tabular figures (`font-variant-numeric: tabular-nums`) within Epilogue or Manrope to maintain strict vertical alignment across calendars and tables.

## Layout & Spacing

The structural layout relies on an airy 12-column grid system designed around intentional emptiness. By permitting sections to breathe with deep vertical offsets, content gains intrinsic importance without relying on decorative ornament.

### Breakpoints & Canvas Widths

- **Desktop (≥ 1280px):** Max container width of `1200px` centered on canvas. Outer margins are generous (`3rem`), creating an art-book framing effect. Grid gutters rest at `1.5rem`.
- **Tablet (768px – 1279px):** 8-column layout with `2rem` outer margins. Content groups stack intuitively, preserving minimum padding inside cards.
- **Mobile (< 768px):** 4-column layout with `1.25rem` outer canvas padding. Grids collapse into vertical narrative flows. Dense tables become horizontally scrollable cards or single-column comparison units.

### Spacing Principles

- **Uncluttered Rhythm:** Section-to-section transitions consistently employ `space-xl` (or multiples thereof) to prevent visual density.
- **Internal Relaxation:** Interactive cards avoid cramped borders; content within fixture cards, event summaries, and news modules uses relaxed internal padding (`space-lg` desktop, `space-md` mobile).

## Elevation & Depth

Visual hierarchy is communicated through soft, atmospheric separation rather than high-contrast structural containment or heavy drop shadows.

### Atmospheric Shadow System

- **Subtle Layering:** Background surfaces default to pure `#FFFFFF`. Elevated modules float using extra-diffused, ambient micro-shadows tinted slightly with deep graphite: `0 4px 20px -2px rgba(17, 19, 24, 0.04)`.
- **Raised Interactive Cards:** On hover or active focus, cards rise subtly with an extended plume: `0 12px 32px -4px rgba(17, 19, 24, 0.08)`.
- **Floating Overlays & Modals:** Deep ambient depth combining `0 24px 48px -12px rgba(17, 19, 24, 0.12)` alongside a translucent graphite backdrop with a 4px blur (`backdrop-filter: blur(4px)`).

### Low-Contrast Borders

- Elements use ultra-fine hairline dividers (`1px solid rgba(17, 19, 24, 0.06)`) to establish order without visually cutting the canvas into isolated boxes.

## Shapes

The design system maintains a refined, architectural curvature level (`1` — Soft).

- **Containers & Cards:** Corner radiuses are restrained to `0.5rem` (`rounded-lg`), delivering an impeccably crisp, tailored aesthetic akin to contemporary physical match programs.
- **Interactive Controls (Inputs, Buttons):** Standardized at `0.25rem` (`rounded-default`) or `0.5rem` (`rounded-lg`). Overly playful pill-shapes and aggressive 0px brutalist cuts are avoided to retain timeless elegance.
- **Tags & Status Badges:** Small contextual indicators use `0.25rem` to sustain sharp legibility.

## Components

### Buttons

- **Primary:** Background in graphite `#111318`, crisp white typography, `0.375rem` radius, subtle top-down transition. Hover initiates a warm gold bottom accent or border reflection (`#D4A000`).
- **Accent (Editorial Gold):** Background in `#D4A000`, text in `#111318`, used strictly for high-priority club calls-to-action (e.g., "Iscrizioni Aperte", "Biglietteria").
- **Secondary / Ghost:** Transparent background, hairline border `rgba(17, 19, 24, 0.12)`, text `#111318`. Hover state fills with `#F9FAFB`.

### Fixture & Match Cards

- Pure `#FFFFFF` background with an ambient border of `1px solid rgba(17, 19, 24, 0.05)`.
- Internal layout is divided into three airy beats: Home Team, Score/Time Center, and Away Team.
- Scores use Epilogue 28px in deep graphite. Match venue and timing use small uppercase tracking (`label-caps`) in Neutral `#5F6368`.
- Live or active status displays an understated gold dot indicator (`#D4A000`) with no neon blinking.

### News & Editorial Cards

- Generous vertical whitespace between high-resolution photography and metadata.
- Category tag placed discreetly above the title in uppercase `label-caps` tinted with neutral graphite.
- Headline scales smoothly with zero visual clutter beneath—no intrusive share bars or decorative iconography.

### Chips & Badges

- Category and league filters use a neutral canvas (`#F9FAFB`) with a subtle `1px solid rgba(17, 19, 24, 0.08)`.
- Active state transitions the background to `#111318` with white text, or pale gold `#F4E8B8` with `#111318` text for tournament milestones.

### Input Fields & Controls

- Clean `1px` graphite border (`rgba(17, 19, 24, 0.15)`) over clean white surface.
- Focus state softens the border to `#D4A000` with a subtle matching halo `0 0 0 3px rgba(212, 160, 0, 0.12)`.
- Checkboxes and radios adopt sharp, minimal square/round frames with `#111318` or `#D4A000` active fills.

### Standings & Stats Tables

- Alternating zebra stripes are strictly omitted; differentiation relies on ample line height (`48px` minimum row height) and subtle horizontal dividers (`1px solid rgba(17, 19, 24, 0.04)`).
- Top positions (promotion/playoffs) receive a delicate vertical gold bar (`2px width`) along the left cell margin.

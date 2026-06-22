# Changelog

All notable changes to the landing page. Dates are deploy dates, not
authorship. Newest entries on top.

## 2026-06-22

### Added
- **Sanity CMS scaffold** (decision: Sanity, per the proposal). New
  `studio/` Sanity Studio (login/cookies/drag-drop editor) with the
  `collection` schema modeling the 4 categories
  (portafolio/comercial/personal/eventos) + a drag-to-reorder `images[]`
  gallery. New `scripts/sanity/migrate.mjs` to import the existing
  `projects-manifest.json` + 271 photos into Sanity (idempotent;
  `--dry-run` validated: 12 collections, 271 photos, 63.4 MB, nothing
  missing). Project `aqmgwuqn`, dataset `production`. See
  [`docs/sanity-setup.md`](./docs/sanity-setup.md). **Blocked on a write
  token** — the token provided is read-only (Viewer); migration + Studio
  deploy need an Editor token. `.gitignore` now excludes `node_modules/`
  and any `.env*`/`*.sanity-env` so tokens never enter the repo.

- **CMS + platform proposal** ([`docs/cms-proposal.md`](./docs/cms-proposal.md)).
  Deep research (3 parallel investigations + a local image audit) into a
  CMS for creating/editing photo collections in the 4 categories with
  login, session cookies, drag-and-drop, and visitor statistics. Two
  finalists: **Sanity** (primary — hosted SaaS, zero-ops, built-in image
  CDN that auto-serves AVIF/WebP + resize, $0) and **Sveltia CMS +
  Cloudflare** (alternative — git-based, R2 media, Transformations,
  Web Analytics, 100% on Cloudflare, $0). Rejected Decap/Pages CMS/Tina/
  Directus/Payload/Strapi with reasons. Visitor stats layer: Cloudflare
  Web Analytics (free, cookieless).
- **Optimization audit** ([`docs/optimization.md`](./docs/optimization.md)).
  304 portfolio images, 74.7 MB, all JPEG, zero WebP/AVIF. Measured
  conversions on the real photos: **AVIF −56% to −91%**, WebP irregular
  (−14% to −78%). Confirmed gzip/brotli is already automatic on Pages for
  text and is a no-op for images; the real win is **AVIF + resize** (source
  photos are 2048 px). Strategy is coupled to the CMS choice (Sanity CDN /
  Cloudflare Transformations / build-time `<picture>`), so the 304-image
  migration is deliberately deferred until the CMS path is picked.
- `_headers`: added `/*.avif` (immutable 1-week cache) so AVIF is ready for
  whichever optimization path is chosen.

- **Cursor-driven particle typography** on the "Nicolás Biondi"
  headline (`landing/assets/js/particle-text.js`,
  [`docs/particle-text.md`](./docs/particle-text.md)). The h1's
  glyphs are rasterized once into an off-screen canvas, sampled
  every 4 px, and each opaque cell becomes a particle. Particles
  disperse from the cursor with a 1/distance falloff and spring
  back to their origin (Hooke + damping). The original text stays
  in the DOM for screen readers and SEO — the `.is-particleized`
  class hides it visually so the canvas overlay does the rendering.
  Auto-mounts on any element with `data-particle-text`.
- **"Ver portafolio" CTA inside the card**. Pill-shaped link to
  `/portfolio/`, placed between the Proyectos buttons and the
  contact CTA, with an `fa-arrow-right` that nudges to the right
  on hover and a full accent-blue fill on hover. Visible on both
  desktop and mobile (the previous `.nicol-boom` was hidden on
  mobile, so the portfolio was unreachable from a phone).

### Changed
- **Particle text canvas padding**. The canvas was sized exactly
  to the host's bounding box, so dispersing particles hit the
  edge and clipped. New `data-padding-x` (100 px default) and
  `data-padding-y` (24 px default) let the canvas extend beyond
  the host with negative CSS offsets, so particles fly into the
  surrounding area and overlap neighboring elements during
  dispersion.
- **Custom cursor color**. The `#ball` ring border was hardcoded
  to the old cyan `rgba(0, 229, 255, 0.6)` predating the accent
  shift; changed to `rgba(255, 255, 255, 0.75)` so the cursor is
  the bright neutral focal point against the new blue accent.

### Removed
- **`.nicol-boom` CLIC button**. The "decorative half-circle +
  CLIC label" floating below the card had no functional purpose
  (the document already fires a fluid splat on every click). All
  CSS, the `arc-float` keyframes, the click handler in
  `fluid-animation.js`, the `.nicol-boom` reference in
  `cursor.js`'s magnetic-wiggle target list, and the
  `.nicol-boom` mobile `display:none` override are gone.

### Removed (portfolio)
- **Scroll hint ("→ desplazar").** The fixed bottom-right cue on the
  portfolio home had `pointer-events: none` — purely decorative, but
  it read like a CTA that did nothing when clicked. Removed across
  all three layers: the `<div class="scroll-hint">` markup in
  `index.html`, the `.scroll-hint` / `.scroll-hint-arrow` rule group
  + the mobile `display:none` override in `portfolio.css`, and the
  `scrollHint` const + the "hide after first scroll" listener block
  in `portfolio.js`. The horizontal-scroll gallery still works — the
  hint was never required to operate it.

### Removed — dead code (portfolio, found via audit-dead-code skill)
- **`@keyframes scaleIn`** in `portfolio.css` — defined once, never
  referenced by any `animation:` declaration anywhere. Deleted.
- A parallel 3-agent dead-code audit (unused CSS selectors,
  `portfolio.js` reachability, HTML orphaned refs) confirmed the rest
  of the portfolio is clean: every other class/id is referenced
  (statically or via JS `classList`), no unreachable code, no
  orphaned asset references, no dead internal links, no commented-out
  markup.

### Fixed (portfolio accessibility)
- **12 broken skip-links.** The sub-gallery project pages
  (`personal/*`, `comercial/*`, `eventos/*`) had
  `<a class="skip-link" href="#main">` but their `<main>` carries
  `id="gallery"`, so "Ir al contenido" jumped nowhere. Pointed them
  at `#gallery` to match. The home and the 8 root pages were already
  correct (`#gallery`/`#main` respectively) and were left untouched.

### Known / not changed
- `contacto.html` still posts to `https://formspree.io/f/placeholder`
  — a placeholder endpoint. Left as-is because the real Formspree
  form id is needed to fix it (can't be guessed). Flagged for the
  owner.

### Changed (portfolio)
- **Project breadcrumb typography.** Was `text-transform:
  uppercase; letter-spacing: 0.1em; font-size: 0.7rem; color:
  --muted` — which clashed with the title-case H1 immediately
  below ("Documental: Cementerio de Nueva Esperanza") and with
  the sentence-case nav above. Now mirrors the nav typography:
  `font-size: 0.8rem; font-weight: 400; letter-spacing: 0;
  text-transform: none; color: --grey`. The `.current` node
  picks up `color: --ink` and `font-weight: 500` for a clear
  active state. Hover lifts to the brand accent (`#1AB6FF`)
  via the new `--accent` variable in `:root`, matching the
  landing page so the two pages share an accent.
  Mobile breadcrumb size bumped 0.65rem → 0.72rem since
  sentence case at the smaller size read too cramped.
  Affects all 15 portfolio pages with `.project-breadcrumb`
  via the shared `portfolio.css`.
  Cache buster on the stylesheet `?v=20260523a → ?v=20260622-breadcrumb`.

### Clarified
- The earlier `docs/ideas-flux.md` referred to the Black Forest Labs
  image-generation Flux. The "Flux" the project owner had in mind is
  [Flux UI](https://fluxui.dev), the Livewire / Laravel premium
  component library — incompatible with this site's static stack.
  Doc kept as-is for the AI image-generation ideas; a Flux UI port
  would require migrating to Laravel + Livewire + Tailwind.

## 2026-05-24

### Added
- **Pixel canvas background** (`landing/assets/js/pixel-canvas.js`).
  Vanilla-JS port of the Pixel Canvas pattern from componentry.fun —
  a grid of cells that light up under the cursor and fade through a
  color gradient, with click events emitting expanding rings of light.
  Layered on top of the existing fluid WebGL background. Configurable
  via `data-*` attributes on `<canvas id="pixel-canvas">`. See
  [`docs/pixel-canvas.md`](./docs/pixel-canvas.md).
  Default gradient is monochrome `near-black → light-gray → white`
  so the overlay reads as crisp pixels — the color comes entirely
  from the fluid canvas underneath.
- **`mix-blend-mode: screen`** on the pixel canvas so each pixel
  LIGHTENS the fluid below instead of painting over it. The cursor
  trail and click rings now glow through the existing colors. An
  optional `data-blend-mode` attribute on the canvas exposes the
  knob for experimenting with `lighten`, `plus-lighter`,
  `color-dodge` etc.
- **`docs/ideas-flux.md`** — written proposal for using Black Forest
  Labs' Flux models (Flux.1 dev/pro, Flux Kontext, Flux Schnell) to
  generate per-route OG images, project hero banners, tag icons,
  time-of-day backgrounds and more. Ranked by impact / effort with
  cost estimates.
- **Documentation set** under `docs/` and a `README.md` at the repo
  root. Previously the project had zero markdown files.

### Changed
- **Accent color** shifted from cyan `#00E5FF` to electric blue
  `#1AB6FF`. Same vibrancy, but the hue moves from cyan-187° to
  blue-198° so it harmonizes better with the violet blob and reads
  less like a neon-mint and more like a true accent blue.

### Removed
- **All HDR / Extended Dynamic Range code.** The WebKit HDR
  experiment (anchor HLG video, `dynamic-range-limit`, `color(display-p3
  r g b)` with values > 1.0, WebGL `colorSpace: 'display-p3'`,
  `drawingBufferStorage(RGBA16F)`, `uHdrBoost` shader uniform,
  supernova click bursts) is gone. Files deleted:
  `landing/assets/js/hdr.js`, `landing/assets/video/hdr-anchor.mp4`.
  The `.hdr-on` class and all related CSS were stripped from
  `landing.css`. The HDR mp4 entry in `_headers` was removed.

## 2026-05-23

### Added
- **HDR (Extended Dynamic Range) mode**, activated by clicking the
  background. Used a hidden HLG HEVC anchor video to unlock EDR on
  iOS Safari ≥ 16.4, plus `color(display-p3 r g b)` with values > 1.0
  for the CSS accents and `drawingBufferStorage(RGBA16F)` on the
  WebGL fluid canvas so click bursts hit ~1600 nits on iPhone XDR.
  (Removed in 2026-05-24 — see above.)

### Changed
- **Bio condensed to a single paragraph.** Dropped the numeric scale
  callouts (already in `.stats-row`) and the Kendo / Bomberos
  personal paragraph (already in `.tags`). Saved ~120 px vertical
  space so the contact CTA fits without internal scroll on most
  laptops.
- **Card vertical centering** rewritten to use `max-height:
  calc(100vh - 14em)` so the card has symmetric 7 em margins above
  AND below at its tallest, instead of the previous flush-to-top
  behavior when content filled the available height.
- **Compact short-viewport layout** (≤ 920 px tall) — section
  labels ("REDES" / "PROYECTOS") hidden, social links collapsed to
  circular icon-only chips, avatar shrunk to 56 px, tags and contact
  CTA tightened. The full card fits without internal scroll on
  1280×800 and 1440×900 viewports.

## 2026-05-22 and earlier

See `git log` for the pre-HDR / pre-portfolio iteration history —
includes the initial fluid background, the portfolio scraper and
mirror page, the Instagram feed embed, the OG image and SEO setup.

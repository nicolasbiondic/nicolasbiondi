# Changelog

All notable changes to the landing page. Dates are deploy dates, not
authorship. Newest entries on top.

## 2026-06-22

### Added
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

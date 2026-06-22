# Changelog

All notable changes to the landing page. Dates are deploy dates, not
authorship. Newest entries on top.

## 2026-05-24

### Added
- **Pixel canvas background** (`landing/assets/js/pixel-canvas.js`).
  Vanilla-JS port of the Pixel Canvas pattern from componentry.fun —
  a grid of cells that light up under the cursor and fade through a
  color gradient, with click events emitting expanding rings of light.
  Layered on top of the existing fluid WebGL background. Configurable
  via `data-*` attributes on `<canvas id="pixel-canvas">`. See
  [`docs/pixel-canvas.md`](./docs/pixel-canvas.md).
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

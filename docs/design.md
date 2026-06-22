# Design system

Single-page personal landing. Dark theme, geometric Montserrat
typography, two layered background effects, a glass-morphism card
holding the bio.

## Color

| Token              | Value      | Used for                                       |
| ------------------ | ---------- | ---------------------------------------------- |
| `--bg`             | `#0E0F1A`  | page background                                |
| `--bg-light`       | `#151727`  | avatar initials fallback                       |
| `--text`           | `#d9d9d9`  | body copy                                      |
| `--title`          | `#ffffff`  | the "Nicolás Biondi" headline                  |
| `--accent`         | `#1AB6FF`  | tags, social-btn hover, name underline, cursor |
| `--border`         | `#525357`  | unused — kept for forwards compat              |

The accent was previously `#00E5FF` (cyan, hue 187°). It was shifted
to `#1AB6FF` (blue, hue 198°) so it harmonizes better with the violet
blob (`#7B00FF`) in the background — the two now sit on the same
half of the color wheel.

When the display supports P3, the accent upgrades to
`color(display-p3 0 0.71 1)` for a slightly richer blue. Browsers
without P3 fall back to the sRGB hex.

```css
@supports (color: color(display-p3 1 1 1)) {
  :root { --accent: color(display-p3 0 0.71 1); }
}
```

> The Color Module Level 4 `color(display-p3 ...)` syntax with values
> ≤ 1.0 is purely a wide-gamut upgrade — it does **not** turn on HDR.
> The HDR experiment (values > 1.0, `dynamic-range-limit: no-limit`,
> WebGL `RGBA16F` backing, anchor HLG video) was removed on
> 2026-05-24 — see `CHANGELOG.md`.

## Typography

- **Family:** Montserrat (300 / 400 / 500 / 600 / 700) from Google
  Fonts. Hero is bundled as a fallback under `assets/css/fonts/`.
- **Base size:** 16 px / 1.75 line-height / 0.02em tracking.
- **Headline:** `.name` uses `clamp(1.6em, 4vw, 2.4em)` and grows an
  animated cyan underline on first hover (the underline stays
  permanent — see `cursor.js`).
- **Section labels:** uppercase, 0.62em, 0.25em letter-spacing,
  white-30% color. Hidden on short laptop viewports (see Layout).

## Layout

The page is a fixed full-viewport container (`.nicol`) with a single
centered card (`.card`).

```
┌──────────────────────────────────────────┐  <-- 100vh
│  ┌────────────────────────────────────┐  │   .nicol = display:flex
│  │                                    │  │            align-items:center
│  │          Avatar + Name             │  │            justify-content:center
│  │             Tagline                │  │
│  │           Stats + Tags             │  │   .card = max-height: calc(100vh - 14em)
│  │              Bio                   │  │           => 7em margin above + below
│  │                                    │  │           when card hits its cap.
│  │     [Redes]      [Proyectos]       │  │
│  │       ¿Hablamos? · contact         │  │
│  └────────────────────────────────────┘  │
│                  ◯ CLIC                  │  <-- absolute bottom: 2em inside .nicol
└──────────────────────────────────────────┘
```

### Why `calc(100vh - 14em)`

Flex `align-items: center` with no spare room places the card flush
against one edge. Subtracting `14em` (≈ 224 px) from `100vh` gives
the card a 7em margin *above and below* even when the content is
tall enough to fill the cap. The CLIC button sits inside the lower
7em margin (`position: absolute; bottom: 2em` from `.nicol`).

### Short-viewport variant (≤ 920 px tall)

13–15 inch laptops (1280×800, 1366×768, 1440×900). The full layout
overflows on these by ~50–150 px, so a media query collapses the
following:

- `.links-label` (the "REDES" / "PROYECTOS" headings) → `display: none`.
- `.social-links--icons` (the personal-social row) → circular
  icon-only chips. Brand recognition does the labelling.
- `.avatar-wrap` → 56 × 56 px (was 96 px on desktop).
- `.tag` font 0.62em, padding 0.15em / 0.7em.
- `.contact-cta` → single dim 0.65em line under the project buttons.

Even tighter overrides kick in at `≤ 760 px` (1366×768 PC laptops):
avatar to 52 px, bio at 0.78em.

The mobile breakpoint (`≤ 768 px`) is a separate flow — the card
becomes natural-height, scrolls with the page, and the CLIC button
plus interest tags are hidden.

## Backgrounds

Two layered effects, both anchored to the viewport with
`position: fixed; inset: 0; z-index: 0`.

### `#fluid-canvas` — WebGL fluid simulation

Pavel Dobryakov's fluid sim, configured via `data-*` on the canvas
element. Mouse trails inject low-brightness dye; clicks fire a burst
of saturated splats. The bloom pass and dye dissipation give the
"smoky" quality. See [`fluid-canvas.md`](./fluid-canvas.md).

### `#pixel-canvas` — Pixel grid overlay

Sits on top of the fluid with the same z-index. Cells light up under
the cursor and fade through a four-stop blue/white gradient.
Click events emit an expanding ring of light. See
[`pixel-canvas.md`](./pixel-canvas.md).

Both effects are intentionally **subtle** — they animate
continuously but the card always remains the visual anchor.

## Cursor

Cursor is hidden globally (`cursor: none`); the visible cursor is a
1.5 px accent-blue ring (`#ball`) positioned by GSAP in `cursor.js`,
with a `0.5 s` smoothing on its translate. On touch devices the
ring is hidden and the native cursor is restored.

## Accessibility

- `aria-label` on the icon-only social chips (LinkedIn, TikTok,
  Instagram, X) so screen readers still announce the brand when the
  visible text is hidden by the short-viewport media query.
- `aria-hidden="true"` on the purely decorative layers (`.bg-blobs`,
  `.deco-circles`, `.dot-grid`).
- `prefers-reduced-motion: no-preference` gate is applied to the
  CLIC button hint pulse animation.
- The cursor ring has no `outline`, so keyboard focus styles still
  render on the underlying links.

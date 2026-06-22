# Particle text

A target text element renders as a grid of dots sampled from the
rasterized glyphs. Dots disperse from the cursor (repulsion within
a radius) and spring back to their origin via Hooke + damping. No
dependencies. Source: [`landing/assets/js/particle-text.js`](../landing/assets/js/particle-text.js).

Inspired by the Cursor-Driven Particle Typography component on
[componentry.fun](https://www.componentry.fun/docs/components/cursor-driven-particle-typography),
ported to a single 200-line IIFE so it runs as a plain `<script>`
tag with no build step.

## Usage

Mark any element with `data-particle-text` and the IIFE wraps it.
The element's own text is **kept in the DOM** (so screen readers and
search engines see "Nicolás Biondi", not a canvas) and is hidden
visually via the `.is-particleized` CSS class the script applies.

```html
<h1 class="name"
    data-particle-text
    data-particle-size="1.4"
    data-particle-density="4"
    data-dispersion="32"
    data-return-speed="0.08">
  Nicolás Biondi
</h1>

<script src="assets/js/particle-text.js"></script>
```

## `data-*` API

| Attribute               | Default     | Description                                                                  |
| ----------------------- | ----------- | ---------------------------------------------------------------------------- |
| `data-particle-size`    | `1.5`       | Radius of each dot in CSS pixels.                                            |
| `data-particle-density` | `5`         | Sampling step in CSS pixels. Lower = more particles (and more GPU per frame).|
| `data-dispersion`       | `28`        | Strength of the cursor push. Higher = bigger dispersion radius and force.    |
| `data-return-speed`     | `0.08`      | Spring constant pulling each dot back to its origin (0..1).                  |
| `data-damping`          | `0.85`      | Per-frame velocity multiplier. Lower = stops faster.                         |
| `data-color`            | inherits    | Dot fill color. Falls back to the host's pre-`.is-particleized` text color.  |

## How it works

1. **Wait for fonts** — `document.fonts.ready` resolves once the
   `@font-face` Montserrat (loaded from Google Fonts) is rasterizable.
   Sampling before this gives the fallback font's glyph shapes.
2. **Read the host's computed style** — font shorthand
   (`font-style font-variant font-weight font-size/line-height font-family`).
   This is what determines the glyph metrics, so we use exactly
   the same string when rendering to the off-screen sampling canvas.
3. **Rasterize text** onto an off-screen canvas the size of the
   host's bounding box, with `fillStyle: '#ffffff'` and `textBaseline:
   'middle'` so the glyphs land where they would in the page.
4. **Sample** every `particleDensity` px and create a particle
   wherever the alpha is > 128. ~700 particles for "Nicolás Biondi"
   at default density.
5. **Animate**: each frame, for each particle, apply
   - cursor repulsion (1 / distance falloff inside `dispersion * 4`)
   - spring back to origin (`vx += (ox - x) * returnSpeed`)
   - damping (`vx *= damping`)
   - integrate, draw as a filled circle.
6. **Re-sample on resize** — a `ResizeObserver` on the host
   regenerates the particle field when the host's bounding box
   changes (viewport rotation, font-size clamp recompute, etc).

## CSS contract

The script appends a `<canvas class="particle-text-canvas">` child
to the host and toggles `.is-particleized` on the host. Two CSS
rules wire this up:

```css
.name.is-particleized {
  color: transparent;          /* hide the source glyphs */
}

.particle-text-canvas {
  position: absolute;          /* overlay the host */
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;        /* don't intercept clicks */
  filter: drop-shadow(0 0 1px rgba(255,255,255,0.45));
}
```

The host must be `position: relative` (the `.name` already is, by
design — see `docs/design.md`) so the absolutely-positioned canvas
anchors to it.

## Customization

| Want                  | Tweak                                                  |
| --------------------- | ------------------------------------------------------ |
| More dense, finer dots| `data-particle-density="3"` and `data-particle-size="1.2"` |
| Softer interaction    | `data-dispersion="18"`                                 |
| Snappier spring back  | `data-return-speed="0.16"`                             |
| Looser, longer drift  | `data-damping="0.92"`, `data-return-speed="0.05"`      |
| Accent-color dots     | `data-color="#1AB6FF"`                                 |
| No effect on mobile   | `@media (max-width: 768px) .name.is-particleized { color: var(--title); } .particle-text-canvas { display: none; }` |

## Accessibility

- The host's original text stays in the DOM. Screen readers see
  the heading as plain text.
- The canvas has `aria-hidden="true"`.
- No keyboard focus is added — the element behaves like the
  original `<h1>` to keyboard nav.

## Performance

- 1 pass of `getImageData` on init (and on resize). For a 300×50 CSS
  pixel host at DPR 2 that's a single 600×100 read = 240 KB, ~1 ms.
- Per-frame work: O(particles) ≈ 700 iterations × (1 distance check
  + spring + damping + draw). Measured at 0.2 ms per frame on M1.
- `devicePixelRatio` is clamped to 2 so 3× retina screens render the
  canvas at half-density (visually indistinguishable on dots, ~2.25×
  cheaper).

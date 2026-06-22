# Pixel canvas

Background overlay that paints a grid of cells which light up under
the cursor and fade through a color gradient. Click events emit an
expanding ring of light through the grid. Vanilla JS, no
dependencies. Source: [`landing/assets/js/pixel-canvas.js`](../landing/assets/js/pixel-canvas.js).

Inspired by the Pixel Canvas component on
[componentry.fun](https://www.componentry.fun/docs/components/pixel-canvas)
— ported to a single `<canvas>` element plus a 200-line IIFE so it
runs as a plain `<script>` tag with no build step.

## Markup

```html
<canvas id="pixel-canvas"
  data-gap="14"
  data-decay="0.94"
  data-radius="100"
  data-click-radius="320"
  data-click-speed="14"
  data-variant="default"
  data-colors='["#0a1b30","#0EA0D9","#1AB6FF","#ffffff"]'></canvas>
```

Then load it as a normal script:

```html
<script src="assets/js/pixel-canvas.js"></script>
```

## CSS

The canvas must be a fixed full-viewport element so it tracks the
real cursor position. The script reads `window.innerWidth/Height`
and sets `canvas.width/height` to match (scaled by `devicePixelRatio`
clamped to 2 for retina sharpness without burning GPU).

```css
#pixel-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;            /* same plane as other background layers   */
  pointer-events: none;  /* clicks pass through to canvas / page    */
}
```

## `data-*` API

| Attribute          | Default                                                | Description                                                                 |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `data-gap`         | `14`                                                   | Cell size in CSS pixels. Lower = denser grid, higher GPU cost.              |
| `data-decay`       | `0.94`                                                 | Per-frame intensity multiplier. `0.9` = quick fade, `0.98` = long trails.   |
| `data-radius`      | `100`                                                  | Cursor influence radius in CSS pixels. Larger = wider trail.                |
| `data-click-radius`| `320`                                                  | Maximum ring radius on click (the ring stops expanding past this).          |
| `data-click-speed` | `14`                                                   | Ring expansion speed in px/frame at 60 Hz (so ~840 px/sec by default).      |
| `data-variant`     | `"default"`                                            | `"default"` = sharp squares, `"trail"` = rounded squares, `"glow"` = shadow.|
| `data-colors`      | `'["#0a1b30","#0EA0D9","#1AB6FF","#ffffff"]'`          | JSON array of hex stops. Intensity 0 → first stop, 1 → last stop.           |

> `data-colors` is `JSON.parse`d, so the attribute value MUST be valid
> JSON. Use single quotes around the attribute and double quotes inside.

## Behavior

```
intensity = 0 ────────────────────────────────► 1 (cursor center / click ring crest)
            colors[0] → colors[1] → ... → colors[n-1]
            (most transparent)              (most opaque)
```

Each frame:

1. The cursor "bumps" all cells within `radius` of the pointer up to
   intensity `1.0`, with a quadratic falloff at the rim.
2. Every active click ripple bumps cells in a thin ring at the
   current ring radius, fading with the ripple's life (1.2 s total).
3. Every cell's intensity is multiplied by `decay`, then the cell is
   drawn at `rgba(...)` sampled from the gradient.
4. Cells below `0.012` intensity are clamped to `0` and skipped
   (so a still grid renders zero pixels).

The cell iteration in (1) and (2) is **bounded by the affected
rectangle**, not the whole grid — so cost is `O(R² / gap²)` per
pointer, independent of canvas size. A 1920 × 1080 canvas with
`gap=14` is 137 × 78 = 10 686 cells, but only ~145 of those fall
inside a 100 px cursor radius.

## Customization

### Make it more or less subtle

| Effect            | Tweak                                                |
| ----------------- | ---------------------------------------------------- |
| Quieter idle      | Lower the first color's alpha (or use a darker hex). |
| Wider cursor halo | Raise `data-radius` and lower `data-decay`.          |
| Faster clicks     | Raise `data-click-speed`.                            |
| Larger pixels     | Raise `data-gap` (also fewer cells = cheaper).       |
| Sharper edges     | Set `data-variant="default"` (the current default).  |
| Rounded chips     | Set `data-variant="trail"`.                          |
| Soft glow         | Set `data-variant="glow"` (adds `shadowBlur=8`).     |

### Change the palette

The default gradient is `dark-blue → mid-blue → accent-blue → white`,
chosen to match the site's `--accent: #1AB6FF`. To match a different
accent, supply 3–5 stops via `data-colors`. Stops are interpolated
linearly in RGB space, so very different hues (e.g. red → green) will
pass through a muddy mid-tone — keep stops in a single hue family
unless you want a rainbow.

## Performance notes

- Uses a single `Float32Array` for cell intensities. No GC pressure
  in the render loop.
- Skips clear + paint for cells below `0.012` intensity; an idle
  canvas does the full-screen `clearRect` and then exits the loop
  on every cell.
- `devicePixelRatio` is clamped to 2 — on 3x retina screens the
  canvas is half-density. The visual difference is invisible on a
  pixel grid; the GPU cost saving is ≈ 2.25×.
- All event listeners are `{ passive: true }` so the page never
  blocks scrolling for the pixel canvas.

## Removing it

Just delete the `<canvas id="pixel-canvas">` element and the
`<script src="assets/js/pixel-canvas.js">` tag from
`landing/index.html`. The script is a no-op if the canvas is missing
(it checks for the element on init), so leaving the script tag
loaded without the canvas is also safe.

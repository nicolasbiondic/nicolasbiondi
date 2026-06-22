# Fluid canvas

WebGL2 fluid simulation that paints the dark background "blobs" of
smoke that drift around and react to the cursor and clicks. Adapted
from [Pavel Dobryakov's WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation).
Source: [`landing/assets/js/fluid-animation.js`](../landing/assets/js/fluid-animation.js).

## Markup

```html
<canvas id="fluid-canvas"
  data-fluid-bg="#02030F"
  data-sim-resol="128"
  data-quality="512"
  data-density="0.985"
  data-vorticity="30"
  data-splat-radius="0.5"
  data-transparent="false"></canvas>
```

```html
<script src="assets/js/fluid-animation.js"></script>
```

## CSS

```css
#fluid-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  display: block;
}
```

## `data-*` API

| Attribute             | Default     | Description                                                                                  |
| --------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `data-fluid-bg`       | `#02030F`   | Hex background color when `data-transparent="false"`.                                        |
| `data-sim-resol`      | `128`       | Simulation grid resolution (velocity / pressure). 128 ≈ ~16 K cells.                         |
| `data-quality`        | `512`       | Dye texture resolution. Higher = sharper splats, more GPU time.                              |
| `data-density`        | `0.985`     | Dye dissipation per frame. 1.0 = no fade, < 1 = exponential fade.                            |
| `data-vorticity`      | `30`        | Curl noise strength. Higher = more turbulent.                                                |
| `data-splat-radius`   | `0.5`       | Per-splat radius (`× 0.01` in shader space). Higher = bigger splats.                         |
| `data-transparent`    | `false`     | If `true`, use a checkerboard "background shader" instead of the solid color.                |

## Behavior

- **mousemove** at any point on the document adds a small splat at
  the cursor with the cursor's velocity, using a dim random HSV
  color (× 0.15 from `generateColor()`). This is the cursor trail.
- **click** anywhere fires 8 saturated splats (× 10 the cursor
  brightness) at random velocities around the click point — the
  "burst" effect.
- **touchstart / touchmove** mirror the mouse handlers but with
  scaled-down velocities for finger-friendly feel.
- **CLIC button** (`.nicol-boom`) fires `multipleSplats(amount)`
  with a random count in `[5, 25]`, scattered across the canvas.

## Internals

- WebGL2 context with half-float backing (`RGBA16F`) so the dye
  texture can store values > 1.0 (used by the bloom prefilter).
- 4 display shaders selected via the `SHADING` × `BLOOM` config
  matrix: `displayShader`, `displayBloomShader`,
  `displayShadingShader`, `displayBloomShadingShader`.
- Mobile devices (matched by `Mobi|Android` UA) force `SHADING:
  false` to save GPU.
- Browsers without `OES_texture_half_float_linear` also lose
  shading and bloom.

## Layering

The fluid canvas sits at `z-index: 0`. The pixel canvas (see
[`pixel-canvas.md`](./pixel-canvas.md)) sits on top at the same
z-index but is rendered later in the DOM, so it composites over
the fluid. Both are below the `.nicol` card (`z-index: 1`).

## Performance

A 1080 p frame at default settings runs ~0.4 ms on M1 GPU. The
expensive passes are:

1. Bloom mip chain (8 iterations, 256² → 8² and back)
2. Pressure Jacobi iterations (20 passes at 128²)
3. Display shader with shading + bloom (full screen)

The simulation is paused when `config.PAUSED = true` (no UI
toggle today, but the field exists).

# Web optimization — audit + plan

Audit of the portfolio's performance surface, with **measured** WebP/AVIF
savings on the actual photos, plus what's already good and what to do.
Pairs with [`cms-proposal.md`](./cms-proposal.md) — the image strategy
depends on which CMS path is chosen.

## Current state (audited 2026-06)

| Metric | Value |
|---|---|
| Portfolio images | **304 files, 74.7 MB** (303 JPG + 1 PNG) |
| WebP / AVIF present | **0** — everything is full-res JPEG |
| Largest images | g12 849 KB, g05 726 KB, proj-personal 677 KB |
| Typical source dimensions | **2048 px wide** (from `projects-manifest.json`) |
| `loading="lazy"` | **296 / 348 `<img>`** ✅ |
| `width`+`height` (no CLS) | **368** ✅ |
| `fetchpriority="high"` (LCP) | **18** (first image per gallery) ✅ |
| `srcset` / `<picture>` | **0** ❌ — no responsive images |
| Caching headers (`_headers`) | JPG/PNG/SVG/WebP `max-age=604800, immutable` ✅ |

## What's already correct (don't touch)

- **gzip/brotli is automatic.** Cloudflare Pages already serves Gzip and
  Brotli for text assets (HTML/CSS/JS). Nothing to configure.
- **"gzip for images" is a no-op.** JPEG/WebP/AVIF are already
  entropy-coded; transfer-compressing them saves ~0%. The real image win
  is **format conversion (AVIF/WebP) + resizing**, not gzip.
- **Lazy loading, explicit dimensions, and LCP priority** are already in
  place — good Core Web Vitals hygiene (no layout shift, deferred offscreen
  images, prioritized first paint).
- **Caching** is aggressive and correct for immutable photo assets.

## The opportunity — measured on the real photos

ffmpeg conversions of representative images (the actual files in the repo):

| Image | JPEG | WebP q80 | AVIF |
|---|---|---|---|
| img/g12 | 849 KB | 351 KB (−59%) | **213 KB (−75%)** |
| img/g05 | 726 KB | 158 KB (−78%) | **69 KB (−91%)** |
| personal/lima/05 | 491 KB | 407 KB (−17%) | **194 KB (−60%)** |
| personal/documental/21 | 529 KB | 457 KB (−14%) | **234 KB (−56%)** |
| comercial/empresarial/10 | 483 KB | 383 KB (−21%) | **157 KB (−67%)** |

**Takeaways:**
- **AVIF is the clear winner: −56% to −91%**, consistent across images.
- **WebP is irregular (−14% to −78%)** because the source JPEGs are already
  moderately compressed — WebP sometimes barely helps, AVIF always does.
- Sources are **2048 px** but the gallery displays far smaller. **Resizing
  to display width is an additional, large saving on top of format.**
- Projected: the 74.7 MB library → roughly **20–30 MB at AVIF** at full
  size, and **much less** once resized to the ~800–1400 px actually shown.

## The image strategy depends on the CMS choice

### If Sanity (primary recommendation)
**You do nothing special — the CMS image CDN handles it.** Photos are
served from `cdn.sanity.io/...?w=<displaywidth>&auto=format&q=75&fit=max`:
- `auto=format` → **AVIF/WebP by `Accept` header**
- `w=` → **resize to display size** (the big win)
- globally **edge-cached**

So choosing Sanity *is* the optimization. Templates emit `<img>` (or
`<picture>`) pointing at those URLs; no build script, no committed WebP.

### If Sveltia + Cloudflare (alternative)
Use **Cloudflare Transformations** (free plan):
- Repoint gallery images to
  `/cdn-cgi/image/width=1200,format=auto,quality=75/<origin-url>`
- `format=auto` → AVIF/WebP per browser; `width=` → resize.
- ~300 images × a few widths stays under the **5,000 free transforms/mo**.
- Originals live in **R2**; no WebP committed to Git.

### If staying static for now (no CMS yet) — free, portable
Build-time conversion + `<picture>`, committed to the repo:
1. `scripts/optimize_images.py` walks `landing/portfolio/projects/**` +
   `img/`, emits `NN.avif` + `NN.webp` (and an optional resized
   `NN@1200.{avif,webp}`) next to each `NN.jpg`.
2. Rewrite gallery `<figure>` to:
   ```html
   <picture>
     <source type="image/avif" srcset="…/NN.avif">
     <source type="image/webp" srcset="…/NN.webp">
     <img src="…/NN.jpg" width=".." height=".." loading="lazy">
   </picture>
   ```
3. JPEG stays as the universal fallback. Add `/*.avif` to `_headers`.
Tradeoff: ~2–3× the file count + a build step, but $0 and fully portable.

> Recommendation: **don't pre-commit a 304-image WebP/AVIF migration now** —
> it would be thrown away if you pick Sanity/Cloudflare (which generate
> optimized derivatives on the fly). Decide the CMS path first; the image
> optimization then comes essentially for free with it.

## Done now (safe, path-independent)

- `_headers`: added `/*.avif` with the same immutable 1-week cache as the
  other image types, so AVIF is ready whenever it's introduced (via any of
  the three strategies).

## Quick wins available immediately (independent of CMS)

1. **Enable Cloudflare Web Analytics** (Pages → Metrics, one click) — free
   visitor stats now, regardless of CMS timing.
2. **Convert `og-image.png` (157 KB)** to an optimized form — it's the
   social-share card; a JPEG/WebP version cuts it ~60%.
3. When the CMS lands, **serve resized derivatives** (display width, not
   2048 px) — the single biggest real-world saving for gallery scroll.

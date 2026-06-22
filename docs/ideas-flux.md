# Flux for nicolasbiondi.com — proposal

You are an **AI builder** with a static landing. Using **Flux**
(Black Forest Labs' image / image-edit / image-to-video family) on
this site does two things at once: it ships better visual assets,
and it demonstrates the capability in the medium itself — the
landing of an AI builder *should* be partly AI-built.

This document ranks concrete proposals by **impact / effort** so
you can grab the top ones first.

## TL;DR — top 3

1. **Per-route OG images** (1 day, ~$1 one-off). Bespoke share cards.
2. **Project hero banners** for `/portafolio.html` and each project
   page (1-2 days, ~$5 one-off). Replace generic photos with cohesive
   AI-rendered scenes in your palette.
3. **Tag illustrations** — small iconic art for each of the 6 interest
   tags (Ecommerce / IA / Crypto / Fotografía / Kendo / Bomberos)
   (1 day, ~$1 one-off). Turn the text chips into a visual signature.

Everything else below is optional follow-up.

---

## Quick wins (low effort, high visual impact)

### 1. Custom Open Graph images per route

The site currently serves the same `og-image.png` for every URL.
A custom OG card per route makes shares (LinkedIn, X, WhatsApp,
Slack) feel hand-crafted.

```text
landing/assets/img/og/
├── home.png             ← "Nicolás Biondi — Ecommerce + IA + Web3"
├── portfolio.png        ← "Fotografía — selected work"
├── kendo-photo.png      ← per-project (one file each)
└── lima-commercial.png
```

**Implementation**

- Add a build-time script `scripts/generate_og_images.py` that
  - reads a list of `{ route, title, accent_image }` from a JSON
  - calls Replicate's Flux.1 [dev] endpoint with a prompt template
  - downloads PNG, resizes to 1200×630, optimizes
  - writes to `landing/assets/img/og/<slug>.png`
- HTML per route already has `<meta property="og:image">` — wire
  the per-route value via the existing `scripts/generate_portfolio_html.py`.
- Run the script manually once + add to CI when new projects ship.

**Prompt template (starter)**

```text
A cinematic minimalist composition. Subject: {project_title}.
Style: ultra dark navy background (#0E0F1A), single electric-blue
(#1AB6FF) accent stroke. Negative space dominant, off-center subject.
35mm photograph, hard light from upper left, Kodak Portra. Text-safe
zone in the bottom 30%. 1200×630.
```

**Cost & latency**

- Flux.1 [dev] on Replicate: ~$0.030 per image, ~12 s.
- 8 routes × $0.03 = **$0.24** one-off. Re-runs cost the same.

### 2. Project hero banners on /portafolio.html

The portfolio currently uses scraped thumbnails from Portfoliobox
of inconsistent style and quality. Generate a **cohesive cover image
per project** that opens each project page and pairs with the
existing photo grid.

**Implementation**

- New `scripts/generate_project_covers.py` that walks
  `landing/portfolio/*/index.html`, extracts the project title and
  first photo, and generates a hero image conditioned on both:
  - Flux Kontext to re-style the actual photo in your palette (keeps
    the subject recognizable, changes the mood)
  - or Flux.1 [dev] from a text prompt that describes the project
- Each cover written to `landing/portfolio/<project>/cover.webp`.
- Add a `<div class="hero">` at the top of each portfolio page CSS.

**Cost**

- Kontext: ~$0.05 per image. 20 projects × $0.05 = **$1.00** one-off.

### 3. Tag illustrations

Replace the 6 text-only tag chips (Ecommerce / IA / Crypto /
Fotografía / Kendo / Bomberos) with a small (24×24 px) illustrated
icon **inside** each chip. Keeps the same chip shape but adds a
visual signature unique to this page.

**Implementation**

- Generate one image per tag at 256×256, vectorize with `vtracer` or
  `potrace`, save as SVG. Bake into `landing/assets/img/tags/<tag>.svg`.
- Update CSS `.tag::before { background-image: url('...'); }`.
- Use Flux.1 [dev] with a "single object, white background, line art"
  prompt for clean vectorization.

**Cost**

- 6 tags × $0.03 = **$0.18** one-off.

---

## Medium effort

### 4. Time-of-day adaptive background

Generate 4 static background images (dawn, day, dusk, night) that
match your color palette and swap based on the visitor's local time.
Subtle but feels alive across the day.

**Implementation**

- Generate at build time, write to `landing/assets/img/bg/<phase>.webp`.
- Tiny JS that sets `body::before { background-image: url('...') }`
  based on `new Date().getHours()`.
- No runtime API call, no latency.

**Trade-off**

- Adds 200-400 KB per image to first-paint payload. Worth it only
  if you want this kind of polish for the front page.

### 5. Stylized avatar variations

Take the existing `assets/img/profile.jpg` and produce 4-5 stylized
variations using Flux Kontext (image edit):

- "neon Lima night"
- "high-contrast Kendo dojo"
- "Bomberos uniform"
- "watercolor portrait"
- "anime / studio Ghibli"

**Implementation**

- Bake to `landing/assets/img/profile-<style>.jpg`.
- Either swap randomly per visit, expose via a toggle in the card,
  or use one for `<meta property="profile:image">` per route.

**Cost**

- Kontext: ~$0.05 × 5 = **$0.25** one-off.

### 6. Pixel-canvas palette from a photo

Make the pixel canvas's `data-colors` adapt to the dominant colors
of a Flux-generated reference image — e.g. a photo of Lima at the
current hour. The grid then changes hue across the day automatically.

**Implementation**

- Build-time: generate one reference image per phase (dawn/day/dusk/
  night), extract 4 dominant colors with a small Python script
  (`colorthief` or `extcolors`), write to a tiny JSON manifest.
- Runtime: JS picks the current phase, reads the manifest, sets
  `canvas.dataset.colors` before pixel-canvas.js initializes.

---

## Bigger swings

### 7. Animated hero with Flux + image-to-video

Replace (or sit beside) the WebGL fluid simulation with a 3-second
looping Flux-generated abstract video. Higher visual ceiling than the
fluid sim, zero CPU after first paint, no DOM canvas at all.

**Implementation**

- Build with Flux + Kling (or Runway, or Sora) for the video step.
- Output: `landing/assets/video/hero-loop.webm` (≤ 2 MB).
- `<video autoplay loop muted playsinline>` replaces `#fluid-canvas`.
- Re-run nightly via GitHub Action if you want it to change daily.

**Cost**

- One Flux still + one video gen: ~$0.50 per shot.
- Nightly regeneration: ~$15/month.

### 8. Per-visitor abstract "fingerprint"

On first visit, generate a unique 800×800 abstract image based on
the visitor's IP-derived locale, hour-of-day and a random seed.
Render it as the avatar's background ring or as the OG image of any
share they make from the site (so each X share becomes unique).

**Implementation**

- Cloudflare Worker endpoint `/api/fingerprint?seed=...` that proxies
  Flux.1 [dev] and caches in R2 with the seed as the key.
- Client embeds the resulting image as a CSS background or as a
  hidden OG image override.

**Cost**

- Replicate: $0.03/image. R2 cache makes repeat visitors free.
- ~$3 per 100 unique visitors. Cheap until you go viral.

### 9. Generative blog covers

You don't have a blog today but if/when you do, every new post can
get a cover image generated from the title + first paragraph. This
becomes the OG image, the hero, and the thumbnail in the index.

---

## Architecture recommendation

All proposals above use Flux at **build time**, not at runtime
(except #8, which is intentionally a runtime worker):

```
┌───────────────────────────────────────────────────────────┐
│  scripts/generate_*.py                                    │
│    │                                                      │
│    ├─ Reads project / route / palette config              │
│    ├─ Calls Flux via Replicate / fal.ai / BFL direct API  │
│    ├─ Downloads, resizes, optimizes (cwebp / pngquant)    │
│    └─ Writes to landing/assets/img/...                    │
│                                                           │
│  Triggered manually OR via a nightly GitHub Action.       │
│  Outputs committed to the repo as static assets.          │
└───────────────────────────────────────────────────────────┘
```

Why build-time:

- No API key in the browser
- No latency for users
- No per-visit cost
- Outputs are auditable (you see them in the diff before deploy)

Models worth considering:

| Model              | Best for                            | Cost / image | Where to call               |
| ------------------ | ----------------------------------- | -----------: | --------------------------- |
| **Flux.1 [dev]**   | High-quality text-to-image          |       ~$0.03 | Replicate, fal.ai           |
| **Flux.1 [pro]**   | Highest quality                     |       ~$0.05 | Replicate, fal.ai, BFL API  |
| **Flux Kontext**   | Image editing / restyling           |       ~$0.05 | BFL API, Replicate          |
| **Flux Schnell**   | Fastest, lower fidelity             |       ~$0.003| Replicate (1024 px, 4 steps) |

Recommended starter stack:

- **Replicate** for the API (simplest auth, billing, output URLs).
- **`scripts/_flux.py`** as a thin wrapper around the Replicate
  client with prompt templates per use case.
- A tiny **GitHub Action** with `secrets.REPLICATE_API_TOKEN` to
  run on `workflow_dispatch` so you can regenerate any asset on
  demand without local setup.

## Cost budget if you do everything in the "Top 3"

- OG images (8) + Project covers (20) + Tag illustrations (6) =
  **~$1.50 one-off** + same on each regeneration.
- Adding the time-of-day backgrounds and stylized avatars: another
  **~$1.00 one-off**.
- Total to ship the whole "static" tier: **under $3** and a couple
  of evenings.

## Want me to start?

Tell me which of #1, #2 or #3 you want first and I will:

1. Add `scripts/_flux.py` (Replicate client + prompt helpers)
2. Add the specific `scripts/generate_*.py`
3. Wire the outputs into `landing/index.html` (or the portfolio
   templates) with proper `<picture>` tags and srcsets
4. Add the GitHub Action so you can re-run from the Actions tab
5. Deploy

The only thing I need from you is `REPLICATE_API_TOKEN` in repo
Settings → Secrets.

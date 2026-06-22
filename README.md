# nicolasbiondi.com

Personal landing page for Nicolás Biondi — ecommerce operator, AI builder, Web3.
Live at <https://www.nicolasbiondi.com>.

This is a static site served from Cloudflare Pages. No build step, no
framework, no bundler — just plain HTML / CSS / JS authored by hand,
deployed automatically on `git push origin master`.

## Repository layout

```
nicolasbiondi/
├── landing/                  ← what gets deployed (Cloudflare Pages root)
│   ├── index.html            ← the landing page
│   ├── _headers              ← Cloudflare Pages cache & MIME headers
│   ├── _redirects            ← Cloudflare Pages URL rewrites
│   ├── server.py             ← local dev server (python3 -m http.server wrapper)
│   ├── portfolio/            ← /portafolio.html mirror + per-project pages
│   └── assets/
│       ├── img/              ← profile photo, OG image, favicon
│       ├── css/landing.css   ← single stylesheet for the landing
│       ├── css/font-awesome/ ← bundled Font Awesome 6 (icons)
│       ├── css/fonts/        ← Hero font fallback (Montserrat from Google Fonts)
│       └── js/
│           ├── fluid-animation.js   ← WebGL fluid background (Pavel Dobryakov port)
│           ├── pixel-canvas.js      ← Pixel grid background overlay (see docs/pixel-canvas.md)
│           ├── particle-text.js     ← Cursor-driven particle typography on .name (see docs/particle-text.md)
│           ├── cursor.js            ← Custom cursor ring + name underline hover
│           └── vendor/gsap.min.js   ← GSAP (used by cursor.js)
├── scripts/                  ← one-off scrapers for the portfolio / Instagram pages
├── .github/workflows/        ← CI: deploy.yml triggers Cloudflare Pages on push
├── docs/                     ← architecture & design docs (read these first)
└── README.md                 ← this file
```

## Local dev

```bash
python3 landing/server.py
# → http://localhost:8888
```

The wrapper just adds `Cache-Control: no-store` so iterations are
immediate.

## Deploy

`master` is the deploy branch. Pushing triggers
`.github/workflows/deploy.yml` which runs `wrangler pages deploy
landing --project-name=nicolasbiondi`. End-to-end takes ~30 s.

```bash
git push origin master
# wait ~30 s
curl -I https://www.nicolasbiondi.com
```

The workflow also copies `landing/portfolio/index.html` to
`landing/portfolio/portafolio.html` so both URLs serve the same
bytes — `index.html` is the single source of truth.

## Docs

Detailed design and architecture notes live in [`docs/`](./docs):

- [`docs/design.md`](./docs/design.md) — color, typography and layout system.
- [`docs/pixel-canvas.md`](./docs/pixel-canvas.md) — the pixel grid background overlay (API, perf, customization).
- [`docs/particle-text.md`](./docs/particle-text.md) — the cursor-driven particle typography effect on the "Nicolás Biondi" headline.
- [`docs/fluid-canvas.md`](./docs/fluid-canvas.md) — the WebGL fluid background (config flags).
- [`docs/deploy.md`](./docs/deploy.md) — Cloudflare Pages configuration and `_headers` rules.
- [`docs/ideas-flux.md`](./docs/ideas-flux.md) — proposals for using Flux (Black Forest Labs) to ship better visual assets and to "eat the dog food" of being an AI builder.
- [`docs/cms-proposal.md`](./docs/cms-proposal.md) — deep-research proposal for a CMS to create/edit photo collections in the 4 categories (login, cookies, drag-drop, visitor stats). Finalists: Sanity (primary) vs Sveltia + Cloudflare.
- [`docs/optimization.md`](./docs/optimization.md) — image/perf audit with measured AVIF/WebP savings on the real photos, and the optimization plan per CMS path.
- [`docs/sanity-setup.md`](./docs/sanity-setup.md) — Sanity CMS integration status + how to finish it (project `aqmgwuqn`, the `collection` schema, the migration script, Studio deploy).

See [`CHANGELOG.md`](./CHANGELOG.md) for what changed when.

## Contact

DM on [X](https://x.com/nicolasbiondic) or email <nicolas@lenz.pe>.

# Deploy

The site is hosted on **Cloudflare Pages** under the project
`nicolasbiondi`. The deploy root is the `landing/` directory of
this repo.

## Pipeline

```
git push origin master
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├─ actions/checkout@v4
        ├─ cp landing/portfolio/index.html landing/portfolio/portafolio.html
        │   (mirror the portfolio page so both URLs serve the same bytes)
        └─ wrangler-action v3 → `pages deploy landing --project-name=nicolasbiondi --branch=master`
                │
                ▼
        Cloudflare Pages (production)
        https://www.nicolasbiondi.com
```

Pipeline takes ~30 s end-to-end. There is no build step — wrangler
just uploads the `landing/` directory as-is.

## Cloudflare secrets (set in repo Settings → Secrets)

| Secret                  | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token with Pages: Edit on the `nicolasbiondi` project.     |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account ID.                                 |

## `_headers`

`landing/_headers` is read by Cloudflare Pages to set HTTP headers
per-path. Current rules:

```text
# HTML — always revalidate so users get fresh markup
/*.html             Cache-Control: public, max-age=0, must-revalidate
/                   Cache-Control: public, max-age=0, must-revalidate
/portfolio/         Cache-Control: public, max-age=0, must-revalidate

# CSS / JS — short cache, must revalidate
/*.css              Cache-Control: public, max-age=300, must-revalidate
/*.js               Cache-Control: public, max-age=300, must-revalidate

# Long-cached static assets
/*.jpg              Cache-Control: public, max-age=604800, immutable
/*.png              Cache-Control: public, max-age=604800, immutable
/*.svg              Cache-Control: public, max-age=604800, immutable
/*.webp             Cache-Control: public, max-age=604800, immutable
/*.woff2            Cache-Control: public, max-age=2592000, immutable
```

The CSS / JS `max-age=300` plus `must-revalidate` means browsers
will revalidate every 5 minutes; combined with the `?v=YYYYMMDD-...`
query string on the `<link rel="stylesheet">` and `<script>` tags
in `index.html`, this gives near-instant cache invalidation on
deploy.

## `_redirects`

Currently empty / minimal. The portfolio mirror is implemented at
build time by copying the file, not via a redirect.

## Domain

- Apex `nicolasbiondi.com` → Cloudflare Pages (proxied).
- `www.nicolasbiondi.com` → Pages (proxied).
- Both serve the same content; canonical URL in the HTML is
  `https://nicolasbiondi.com` (without `www`), but the site is
  reached at either.

## Verifying a deploy

```bash
# 1. GitHub Action status (latest two runs)
gh run list --workflow=deploy.yml --limit=2

# 2. Confirm a specific file has the new content
curl -s "https://www.nicolasbiondi.com/assets/css/landing.css?v=$(date +%s)" \
  | grep --color=auto "your-new-rule"

# 3. Headers + CDN cache
curl -sI https://www.nicolasbiondi.com/
```

If Cloudflare edge cache is serving stale assets after a deploy,
bumping the query string in the `<link>` / `<script>` tag in
`landing/index.html` and re-pushing forces a clean fetch.

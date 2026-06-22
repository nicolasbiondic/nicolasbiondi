# CMS + platform proposal — photography portfolio

Deep-research deliverable. Goal: turn the hand-authored static portfolio
(Cloudflare Pages, GitHub Actions deploy) into a **platform where Nicolás
can create/edit photo collections** inside the 4 categories — **Portafolio
(home), Comercial, Personal, Eventos** — with **login, session cookies,
drag-and-drop, and visitor statistics**, while the site gets **image
optimization (WebP/AVIF + resize)**.

> Research was run as 3 parallel investigations (git-based CMS, hosted
> headless CMS, Cloudflare-native + analytics + image strategies) plus a
> local audit of the repo's 304 images and a real WebP/AVIF conversion
> benchmark on the actual photos. Sources are the official docs of each
> product (fetched 2026-06).

---

## TL;DR

Two finalists, pick on one axis — **"least ops + best photo pipeline"**
vs **"own your data, 100% Cloudflare, free forever"**:

| | **Sanity** (recommended primary) | **Sveltia CMS + Cloudflare** (alternative) |
|---|---|---|
| Type | Hosted SaaS (headless) | Git-based, on your repo |
| Hosting/ops | **Zero** (no server, no DB) | Zero server; 1 small CF Worker + R2 bucket |
| Login | Built-in (Google/GitHub/email) | GitHub OAuth (via a CF Worker broker) |
| **Cookies/session** | **Real server session** ✅ | Token in localStorage (functionally same) |
| Drag-drop reorder + upload | ✅ native | ✅ best-in-class for git CMS |
| **Photo pipeline** | **Built-in CDN: auto AVIF/WebP + on-the-fly resize, globally cached** ✅✅ | Assemble separately (Cloudflare Transformations) |
| Where photos live | Sanity CDN | Cloudflare R2 (your account) |
| Where content lives | Sanity Content Lake (vendor cloud) | Your Git repo (`projects-manifest.json`) |
| Visitor stats | Cloudflare Web Analytics (free) | Cloudflare Web Analytics (free) |
| Cost | **$0** (free tier fits) | **$0** (CF Worker + R2 + Pages free tiers) |
| Main caveat | Content in a 3rd-party cloud | Sveltia is beta + single maintainer |

**Primary recommendation: Sanity.** It is the only option that collapses
**the CMS *and* the "optimiza las fotos (webp y demás)" requirement into a
single free, zero-ops product** — its image CDN auto-serves AVIF/WebP and
resizes on the fly (measured **−56% to −91%** on your own photos), so you
don't build or maintain a separate image pipeline. It meets all four hard
requirements natively, including real cookie sessions, at $0 for your scale.

**Choose the Sveltia + Cloudflare alternative if** keeping content in your
own Git repo / 100% on Cloudflare (no vendor cloud) matters more than
having the image pipeline handed to you.

---

## How each hard requirement is met

| Requirement | Sanity | Sveltia + Cloudflare |
|---|---|---|
| **Crear/editar colecciones en 4 categorías** | One `collection` document type with a `category` enum (`portafolio`/`comercial`/`personal`/`eventos`) + an ordered `images[]` array | `projects-manifest.json` modeled as a file collection: a `collections[]` list, each with `category` + nested `items[]` |
| **Login** | Studio login (Google/GitHub/email), roles | GitHub OAuth via `sveltia-cms-auth` Worker |
| **Cookies / sesión** | Server-issued session cookie | OAuth token in localStorage (stays logged in across reloads); Worker sets a transient state cookie during handshake |
| **Drag and drop** | Drag to reorder array items; drag images into the asset field | Drag-reorder of the `items[]`/`collections[]` lists; drag-drop upload straight to R2 |
| **Estadísticas de visitantes** | Cloudflare Web Analytics (free, cookieless, 1-click on Pages) | Same |

> **About "cookies":** modern analytics here are **cookieless** (no GDPR
> banner). The cookie you actually want is the **login/session cookie** of
> the editor — a strictly-necessary first-party cookie, exempt from
> consent. Sanity sets a real one; Sveltia keeps you signed in via a
> localStorage token. Both satisfy "stay logged in".

---

## Option A (PRIMARY) — Sanity

**What it is.** A hosted headless CMS. Content lives in Sanity's "Content
Lake"; the editing UI ("Studio", open-source React) is hosted free by
Sanity at a `*.sanity.studio` URL (password-protected). **Nothing runs on
your infrastructure.**

**Why it wins for a photographer.**
- **Image CDN is the photo pipeline you asked for, on the free tier:**
  upload full-res once, then request
  `cdn.sanity.io/...?w=1600&auto=format&q=75&fit=max`. `auto=format`
  returns **AVIF/WebP per the browser's `Accept` header**, resizes on the
  fly, focal-point crops, all **globally edge-cached**. This single
  feature delivers the "webp y demás mejoras de fotos" requirement with
  zero build scripts.
- **Zero servers/DB/patching** — the only true SaaS of the headless group.
- **Meets all 4 hard requirements natively** (login, cookie session,
  drag-reorder + drag-upload).

**Content model.**
```
document "collection"
  title        string
  slug         slug (from title)
  category     string  enum: portafolio | comercial | personal | eventos
  cover        image
  images[]     array of image  (drag to reorder)   ← gallery order
  publishedAt  datetime
```
The home **Portafolio** is just `category == "portafolio"` (or a curated
"featured" flag). Categories **Comercial / Personal / Eventos** are filters.

**Wiring to the current static site (keep Pages):**
- *Build-time (recommended):* Sanity **publish webhook → GitHub
  `repository_dispatch` → existing `deploy.yml`**. The build fetches JSON
  via GROQ and regenerates the gallery HTML, with `<img>`/`<picture>`
  pointing at `cdn.sanity.io?...&auto=format` (no images committed to the
  repo). Live in ~30–60 s — same flow as today.
- *Or runtime:* keep the static shell and fetch gallery JSON client-side
  from `apicdn.sanity.io` (public dataset, no token, CORS-friendly).

**Cost.** **$0.** Free tier = 20 seats, 10k documents, 100 GB assets,
100 GB bandwidth/mo, full image pipeline, free Studio hosting. A few
thousand images served as optimized thumbnails sit comfortably inside it.
Only reason to reach **Growth ($15/seat/mo)**: a private dataset, more
editor roles, or crossing ~10k images.

**Caveats.** Content lives in Sanity's cloud (vendor dependency); query
language is GROQ; the dataset is public on the free tier (fine — a
portfolio is public anyway; the Studio stays password-protected).

---

## Option B (ALTERNATIVE) — Sveltia CMS + Cloudflare-native

100% on your stack, nothing in a third-party content cloud.

```
┌──────────────────────── Cloudflare ────────────────────────┐
│                                                             │
│  Pages (static site, as today)                              │
│   └── /admin  → Sveltia CMS (one index.html + config.yml)   │
│                                                             │
│  Worker: sveltia-cms-auth   → GitHub OAuth login            │
│  R2 bucket: photo originals  (zero egress, direct uploads)  │
│  Transformations: /cdn-cgi/image/?width&format=auto         │
│       → AVIF/WebP + resize, 5,000 free transforms/mo        │
│  Web Analytics: visitor stats (free, cookieless)            │
│  Access (Zero Trust): optional extra gate on /admin (free)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        edits commit projects-manifest.json → Actions → deploy
```

**How it meets the requirements.**
- **Collections in 4 categories:** point Sveltia at `projects-manifest.json`
  (already a `collections[]` with a `category` field + nested `items[]`).
  Drag-reorder rewrites array order = gallery order.
- **Login + session:** `sveltia-cms-auth` Worker does GitHub OAuth; token
  in localStorage keeps you signed in. (Add **Cloudflare Access** in front
  of `/admin` for a real SSO cookie + a second factor, free up to 50 users.)
- **Drag-and-drop:** Sveltia has the best list-reorder + media DAM of the
  git-CMS family; **direct browser→R2 uploads (no proxy)** so binaries
  never bloat Git.
- **Photo pipeline:** **Cloudflare Transformations `format=auto`** —
  available on the **free** plan, your ~300 images are far under the
  **5,000 free transforms/month**, serves **AVIF/WebP by `Accept`** and
  **downscales** full-res to display size (where most of the 75 MB
  disappears). Repoint `<img>` to `/cdn-cgi/image/...` (or a rewrite rule
  so no per-image edits).
- **Visitor stats:** Cloudflare Web Analytics (free, cookieless, 1-click).

**Cost.** **$0** — Worker, R2 (10 GB + zero egress), Transformations
(<5k/mo), Pages, Web Analytics all on free tiers.

**Caveats.** Sveltia is **beta + primarily one maintainer** (pin a
version; it's Decap-config-compatible so **Decap CMS is the fallback**).
You assemble 4 Cloudflare pieces instead of buying 1 SaaS.

---

## Rejected options (why not)

| Option | Why not here |
|---|---|
| **Decap CMS** | Solid fallback, but external media is Cloudinary/Uploadcare only (no R2) → Git bloat or a 3rd-party image SaaS. Dated UX vs Sveltia. |
| **Pages CMS** | Real session cookies, but **media is repo-only** → worst Git-bloat for a big photo library. |
| **TinaCMS** | GraphQL data layer + build step designed for React/Next; heavy/awkward on hand-authored static HTML; freemium ($24+/mo). |
| **Directus** | Great RBAC + `format=auto` transforms, but **needs a Node server + Postgres** (self-host ~$10–20/mo + ops, or **$99/mo** Cloud). More babysitting than Sanity for the same outcome. |
| **Payload** | App-grade auth, but v3 lives inside a **Next.js app** + DB and Cloud is paused — only worth it if rebuilding the whole site as Next. |
| **Strapi** | Free tier is **non-commercial + cold starts**; weakest core image handling (no auto AVIF/WebP, fixed sizes); realistic cost ~$90/mo Pro. |

---

## Recommended decision

1. **Default to Sanity** — it satisfies all four hard requirements *and*
   the photo-optimization requirement in one free, zero-ops product. Best
   outcome for the least ongoing work.
2. **Pick Sveltia + Cloudflare** only if "content must stay in my Git repo
   / 100% Cloudflare, no vendor cloud" is a hard preference. Everything is
   free and self-owned, at the cost of assembling 4 pieces and accepting
   Sveltia's beta status.
3. **Visitor statistics (either path):** **Cloudflare Web Analytics** —
   free, cookieless, one-click on Pages, reports visits / pageviews / top
   pages / referrers / countries / device-browser-OS. Upgrade to
   self-hosted **Umami** (Node + free Neon Postgres, ~$0–5/mo) only if you
   want to *own* the dashboard.

See [`optimization.md`](./optimization.md) for the image/perf audit and the
exact optimization steps for whichever path is chosen.

## Suggested next step

Tell me which path (Sanity vs Sveltia+Cloudflare). Then I will:
- **Sanity:** scaffold the schema (`collection` type), a migration script
  that imports the existing `projects-manifest.json` + photos into Sanity,
  wire the publish-webhook → `deploy.yml`, and switch the gallery templates
  to `cdn.sanity.io?auto=format` URLs.
- **Sveltia:** add `/admin` (`index.html` + `config.yml`), deploy the
  `sveltia-cms-auth` Worker, create the R2 bucket + upload config, enable
  Cloudflare Transformations, and repoint the gallery `<img>` to
  `/cdn-cgi/image/`.
Both finish with Cloudflare Web Analytics enabled.

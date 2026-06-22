# Sanity setup — Nicolás Biondi portfolio CMS

Status of the Sanity integration and how to finish it. The decision and
rationale are in [`cms-proposal.md`](./cms-proposal.md) (Sanity = primary).

## Project

- **Project ID:** `aqmgwuqn`  (name: *NicolasBiondi*) — public, not a secret.
- **Dataset:** `production` (currently **empty**).
- These live in `studio/sanity.config.ts` and `scripts/sanity/migrate.mjs`.

## Status: MIGRATED + RENDERED ✅ (2026-06-22)

- **271 photos + 12 collections imported** into Sanity (`aqmgwuqn`/`production`).
- **Site galleries now render from Sanity** with `cdn.sanity.io?auto=format`
  images (AVIF/WebP + resize). Measured: a 293 KB JPEG → 129 KB WebP (−56%)
  straight from the CDN; AVIF in real browsers is smaller still.
- Slugs aligned to the existing URLs, so no links broke.

Remaining manual steps (need your action): **deploy the Studio**
(`cd studio && npx sanity deploy`) and **enable Cloudflare Web Analytics**
(dashboard toggle). Optionally automate re-render via a publish webhook.

### Editor token note

The first token shared was **Viewer (read-only)** — it could not write. The
second token (developer read+write) was used for the migration. Both were
pasted in chat: **rotate/revoke them** in sanity.io/manage → API → Tokens.

**Create a write token:**
1. <https://sanity.io/manage> → project **NicolasBiondi** → **API** → **Tokens**.
2. **Add API token** → name it e.g. `migration`, role **Editor** (or
   **Deploy Studio** if you also want me to deploy the Studio).
3. Paste it here, or set it locally:
   ```bash
   export SANITY_TOKEN="sk...editor..."
   ```

> Security: the previously-shared token was pasted in plain text, so it is
> in the chat history — **rotate/revoke it** in the same Tokens screen once
> the new one works. Tokens are never written into this repo (the
> migration reads `SANITY_TOKEN` from the environment only; `.gitignore`
> blocks `.env*` and `*.sanity-env`).

## What's already built (ready to run)

```
studio/                      ← Sanity Studio (the editor: login, cookies, drag-drop)
  sanity.config.ts           ← projectId aqmgwuqn / dataset production
  sanity.cli.ts              ← deploy target nicolasbiondi.sanity.studio
  schemaTypes/collection.ts  ← the data model (see below)
scripts/sanity/migrate.mjs   ← imports manifest + 271 photos into Sanity
```

### The content model — `collection`

One document per gallery:

| Field | Type | Notes |
|---|---|---|
| `title` | string | e.g. "Documental: Cementerio de Nueva Esperanza" |
| `slug` | slug | URL key, auto from title |
| `category` | string (radio) | `portafolio` / `comercial` / `personal` / `eventos` |
| `featured` | boolean | surface on the home Portafolio gallery |
| `order` | number | sort within a category (lower = first) |
| `cover` | image | optional; defaults to first photo |
| `images[]` | array of image (hotspot + alt) | **drag to reorder = gallery order; drag to upload** |
| `publishedAt` | datetime | |

This satisfies the requirements: **login + session cookies** (Studio),
**drag-and-drop** (the `images[]` grid), **4 categories** (the `category`
field). Visitor stats are a separate layer (Cloudflare Web Analytics).

## Steps to finish (once you give an Editor token)

### 1. Run the Studio locally (optional, to look around)
```bash
cd studio
npm install
npx sanity dev          # http://localhost:3333  (login with your Sanity account)
```

### 2. Migrate the existing portfolio into Sanity
```bash
# from repo root, with a write token in the environment:
export SANITY_TOKEN="sk...editor..."
node scripts/sanity/migrate.mjs            # uploads 271 photos + creates 12 collections
# dry run (no token, no writes) to preview the plan:
node scripts/sanity/migrate.mjs --dry-run
```
The script is **idempotent** (deterministic `_id` per collection via
`createOrReplace`; Sanity de-dupes identical assets), so re-running is safe.

Validated dry-run plan (all files present, nothing missing):

```
comercial  : Comercial / Empresarial (28), Retratos empresariales (10),
             Alimentos (12), Productos (10)
personal   : Documental: Cementerio de Nueva Esperanza (35),
             Retratos: Nueva Esperanza (11), Lifestyle (10), Lima (13), Film (32)
eventos    : Infantiles (16), Matrimonios (22), Mágico Engaño 2017 (72)
TOTAL      : 271 photos, 63.4 MB
```

### 3. Deploy the Studio (the hosted editor)
```bash
cd studio
npx sanity deploy        # publishes to https://nicolasbiondi.sanity.studio
```
This is the login-protected platform where Nicolás creates/edits
collections and drags photos to reorder. (Needs a Sanity login or a
Deploy-Studio token.)

### 4. Render the galleries from Sanity ✅ DONE
`scripts/sanity/render.mjs` queries Sanity (GROQ) and regenerates the 3
category pages + 12 gallery pages, matching the current markup exactly, with
images from the **Sanity image CDN** (`?w=1600&auto=format&q=72&fit=max` →
AVIF/WebP + resize). Re-run after editing in Studio:
```bash
source /tmp/opencode/.sanity-env   # (or export SANITY_TOKEN=…)
node scripts/sanity/render.mjs
git add landing/portfolio && git commit -m "render: sync from Sanity" && git push
```
To **automate**: add a Sanity **publish webhook → GitHub `repository_dispatch`**
that runs render in CI and commits — editing in Studio then republishes in
~30–60 s with no manual step. (Webhook needs the GitHub Action wired; ask me.)

### 4b. Auto-sync on publish (DONE — workflow live, webhook pending PAT)

`.github/workflows/sanity-sync.yml` renders from Sanity and deploys, on:
- `repository_dispatch` (type `sanity-publish`) — sent by a Sanity webhook
- `workflow_dispatch` — manual button in the Actions tab

It runs `npm ci` (scripts/sanity) → `node render.mjs` (uses the `SANITY_TOKEN`
repo secret) → commits the regenerated pages `[skip ci]` → mirrors
portafolio.html → `wrangler pages deploy`. **Tested end-to-end** (manual
dispatch + repository_dispatch both succeeded).

**Last hop — the Sanity webhook (needs a GitHub PAT):** GitHub's
`repository_dispatch` endpoint requires auth, so the webhook must carry a
**GitHub fine-grained PAT** with **Contents: Read and write** on the repo.

Option A — one command (after creating the PAT):
```bash
export SANITY_TOKEN=sk...           # manage-capable token
export GH_PAT=github_pat_...        # fine-grained, Contents: RW
node scripts/sanity/create-webhook.mjs
```
Option B — Sanity manage UI (sanity.io/manage → API → Webhooks → Create):
- **URL:** `https://api.github.com/repos/nicolasbiondic/nicolasbiondi/dispatches`
- **Dataset:** `production`  ·  **Trigger on:** Create, Update, Delete
- **Filter:** `_type == "collection"`
- **Projection:** `{"event_type": "sanity-publish"}`
- **HTTP method:** POST
- **Headers:** `Authorization: Bearer <GH_PAT>` and `Accept: application/vnd.github+json`

Once set, editing + publishing in the Studio rebuilds & deploys the site
automatically in ~1 min. Until then, trigger manually:
`gh workflow run sanity-sync.yml` (or the Actions tab button).

> The `SANITY_TOKEN` repo secret currently holds the read+write token used
> for migration. After you rotate tokens, replace it with a **Viewer
> (read-only)** token — render only needs read:
> `printf %s "<viewer-token>" | gh secret set SANITY_TOKEN`.

### 5. Visitor statistics
Cloudflare dashboard → Pages project → **Metrics** → enable **Web
Analytics** (free, cookieless, one click). Reports visits, pageviews, top
pages, referrers, countries, devices.

## Image optimization note

Migrating into Sanity *is* the photo optimization: originals upload once and
every `<img>` on the site points at the Sanity CDN with `?w=…&auto=format`,
which serves AVIF/WebP resized to display size. Measured savings on these
exact photos were **−56% to −91%** (AVIF) before even counting the resize.
So no build-time WebP/AVIF conversion or `<picture>` markup is needed.

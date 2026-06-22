/**
 * Create the Sanity → GitHub webhook so publishing in the Studio
 * auto-triggers the `sanity-sync` GitHub Action (render + deploy).
 *
 * The webhook POSTs a GitHub `repository_dispatch` event. GitHub requires a
 * token in the Authorization header, so this needs a GitHub fine-grained PAT
 * with **Contents: Read and write** on the repo.
 *
 * Usage:
 *   export SANITY_TOKEN=sk...          # manage-capable Sanity token
 *   export GH_PAT=github_pat_...       # fine-grained PAT, Contents: RW
 *   node scripts/sanity/create-webhook.mjs
 *
 * Re-running updates the existing hook (matched by name).
 */
const PROJECT = process.env.SANITY_PROJECT || 'aqmgwuqn'
const DATASET = process.env.SANITY_DATASET || 'production'
const REPO = process.env.GH_REPO || 'nicolasbiondic/nicolasbiondi'
const SANITY_TOKEN = process.env.SANITY_TOKEN
const GH_PAT = process.env.GH_PAT

if (!SANITY_TOKEN) { console.error('✗ SANITY_TOKEN required'); process.exit(1) }
if (!GH_PAT) {
  console.error('✗ GH_PAT required (GitHub fine-grained PAT, Contents: Read and write on ' + REPO + ')')
  console.error('  Create at: https://github.com/settings/personal-access-tokens')
  process.exit(1)
}

const API = `https://api.sanity.io/v2021-10-04/hooks/projects/${PROJECT}`
const NAME = 'GitHub auto-deploy (sanity-sync)'

const payload = {
  name: NAME,
  description: 'On publish, trigger the sanity-sync GitHub Action to re-render + deploy the portfolio.',
  url: `https://api.github.com/repos/${REPO}/dispatches`,
  dataset: DATASET,
  on: ['create', 'update', 'delete'],
  filter: '_type == "collection"',
  projection: '{"event_type": "sanity-publish"}',
  httpMethod: 'POST',
  apiVersion: 'v2021-06-07',
  includeDrafts: false,
  headers: {
    Authorization: `Bearer ${GH_PAT}`,
    Accept: 'application/vnd.github+json',
  },
}

const auth = {Authorization: `Bearer ${SANITY_TOKEN}`, 'Content-Type': 'application/json'}

// Find an existing hook with the same name (idempotent).
const existing = await (await fetch(API, {headers: auth})).json()
const found = Array.isArray(existing) ? existing.find((h) => h.name === NAME) : null

const method = found ? 'PUT' : 'POST'
const url = found ? `${API}/${found.id}` : API
const res = await fetch(url, {method, headers: auth, body: JSON.stringify(payload)})
const body = await res.json().catch(() => ({}))

if (res.ok) {
  console.log(`✅ Webhook ${found ? 'updated' : 'created'}: ${NAME}`)
  console.log(`   ${payload.url}  on [${payload.on.join(', ')}]  filter: ${payload.filter}`)
  console.log('\nPublish anything in the Studio to test — the sanity-sync Action should run.')
} else {
  console.error(`✗ Failed (${res.status}):`, JSON.stringify(body).slice(0, 400))
  console.error('\nIf the management API shape differs, configure it in the UI instead — see docs/sanity-setup.md.')
  process.exit(1)
}

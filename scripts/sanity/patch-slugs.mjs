/**
 * One-off: align each migrated collection's slug to the existing site URL
 * (the folder leaf), so regenerating the site from Sanity preserves the
 * current /portfolio/<category>/<slug>.html URLs and the breadcrumb fixes.
 *
 *   source /tmp/opencode/.sanity-env && node scripts/sanity/patch-slugs.mjs
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, resolve} from 'node:path'
import {createClient} from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..', '..')
const MANIFEST = join(REPO, 'landing', 'portfolio', 'projects-manifest.json')

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const client = createClient({
  projectId: process.env.SANITY_PROJECT || 'aqmgwuqn',
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))

// docId in migration = `collection-<slug-of-uri-or-title>`; recompute the same
function migratedDocId(col) {
  const title = (col.title || '').trim()
  const uriSlug = slugify(col.uri || '')
  const slug = uriSlug.length > 2 ? uriSlug : slugify(title)
  return `collection-${slug}`
}

const tx = []
for (const col of manifest.collections) {
  const leaf = (col.folder || '').split('/')[1] || slugify(col.uri)
  const urlSlug = slugify(leaf)
  tx.push({docId: migratedDocId(col), urlSlug, folder: col.folder})
}

for (const t of tx) {
  await client.patch(t.docId).set({slug: {_type: 'slug', current: t.urlSlug}}).commit()
  console.log(`  ✓ ${t.docId}  slug -> ${t.urlSlug}`)
}
console.log(`\n${tx.length} slugs aligned to existing URLs.`)

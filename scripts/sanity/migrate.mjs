/**
 * Sanity migration — imports the existing portfolio into Sanity.
 *
 * Reads landing/portfolio/projects-manifest.json, uploads each local photo
 * (landing/portfolio/projects/<folder>/<local>) as a Sanity image asset, and
 * creates one `collection` document per gallery with an ordered images[] array
 * (= gallery order) and its category.
 *
 * Idempotent: each collection doc uses a deterministic _id (`collection-<uri>`)
 * via createOrReplace, and uploaded assets are de-duplicated by Sanity content
 * hash, so re-running is safe.
 *
 * Usage:
 *   node scripts/sanity/migrate.mjs --dry-run     # validate, no writes, no token needed
 *   SANITY_TOKEN=xxx node scripts/sanity/migrate.mjs   # real migration (needs Editor token)
 *
 * Env:
 *   SANITY_TOKEN   write-capable token (Editor or higher)  [required for real run]
 *   SANITY_PROJECT defaults to aqmgwuqn
 *   SANITY_DATASET defaults to production
 */
import {readFileSync, existsSync, statSync, createReadStream} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, resolve} from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..', '..')
const PORTFOLIO = join(REPO, 'landing', 'portfolio')
const MANIFEST = join(PORTFOLIO, 'projects-manifest.json')

const DRY = process.argv.includes('--dry-run')
const PROJECT = process.env.SANITY_PROJECT || 'aqmgwuqn'
const DATASET = process.env.SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_TOKEN

const CATEGORY_LABELS = {
  comercial: 'Comercial',
  personal: 'Personal',
  eventos: 'Eventos',
  portafolio: 'Portafolio',
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Some manifest titles are stale (e.g. uri "m" for Mágico Engaño). Clean them.
function cleanTitle(col) {
  const t = (col.title || '').trim()
  if (!t || t.length <= 2) {
    // derive from folder leaf
    const leaf = (col.folder || col.uri || '').split('/').pop() || col.uri
    return leaf.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return t
}

function main() {
  if (!existsSync(MANIFEST)) {
    console.error('✗ manifest not found:', MANIFEST)
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const collections = manifest.collections || []

  console.log(`\nSanity migration ${DRY ? '(DRY RUN — no writes)' : '(LIVE)'}`)
  console.log(`  project: ${PROJECT}  dataset: ${DATASET}`)
  console.log(`  collections: ${collections.length}\n`)

  // Validate all local files exist + tally
  let totalImgs = 0
  let totalBytes = 0
  let missing = 0
  const plan = []

  for (const col of collections) {
    const title = cleanTitle(col)
    // Prefer a meaningful slug: fall back to the title when the uri is too
    // short/cryptic (e.g. uri "m" -> "magico-engano-2017").
    const uriSlug = slugify(col.uri || '')
    const slug = uriSlug.length > 2 ? uriSlug : slugify(title)
    const docId = `collection-${slug}`
    const items = (col.items || []).slice().sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
    const files = []
    for (const it of items) {
      const abs = join(PORTFOLIO, 'projects', col.folder, it.local)
      if (!existsSync(abs)) {
        console.warn(`  ⚠ missing file: projects/${col.folder}/${it.local}`)
        missing++
        continue
      }
      const sz = statSync(abs).size
      totalBytes += sz
      files.push({abs, name: it.local, w: it.w, h: it.h})
    }
    totalImgs += files.length
    plan.push({docId, title, slug, category: col.category, files})
    console.log(`  • ${title}  [${col.category}]  ${files.length} fotos  -> ${docId}`)
  }

  console.log(`\n  TOTAL: ${totalImgs} fotos, ${(totalBytes / 1048576).toFixed(1)} MB` +
    (missing ? `, ${missing} MISSING` : ''))

  if (DRY) {
    console.log('\n(dry run) No changes made. Re-run with a write token to migrate:')
    console.log('  source /tmp/opencode/.sanity-env && node scripts/sanity/migrate.mjs\n')
    return
  }

  if (!TOKEN) {
    console.error('\n✗ SANITY_TOKEN required for a live run (Editor or higher).')
    process.exit(1)
  }

  runLive(plan)
}

async function runLive(plan) {
  const {createClient} = await import('@sanity/client')
  const client = createClient({
    projectId: PROJECT,
    dataset: DATASET,
    token: TOKEN,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  let order = {}
  for (const col of plan) {
    // per-category incremental order
    order[col.category] = (order[col.category] ?? -1) + 1

    console.log(`\n▶ ${col.title} (${col.files.length} fotos)`)
    const imageRefs = []
    for (const f of col.files) {
      process.stdout.write(`   ↑ ${f.name} ... `)
      const asset = await client.assets.upload('image', createReadStream(f.abs), {
        filename: f.name,
        contentType: 'image/jpeg',
      })
      imageRefs.push({
        _type: 'image',
        _key: `${col.docId}-${f.name.replace(/\W/g, '')}`,
        asset: {_type: 'reference', _ref: asset._id},
      })
      console.log('ok')
    }

    const doc = {
      _id: col.docId,
      _type: 'collection',
      title: col.title,
      slug: {_type: 'slug', current: col.slug},
      category: col.category,
      featured: false,
      order: order[col.category],
      images: imageRefs,
      cover: imageRefs[0] ? {_type: 'image', asset: imageRefs[0].asset} : undefined,
      publishedAt: new Date().toISOString(),
    }
    await client.createOrReplace(doc)
    console.log(`   ✓ doc ${col.docId} (${imageRefs.length} imgs)`)
  }

  console.log('\n✅ Migration complete.')
}

main()

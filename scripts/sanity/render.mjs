/**
 * Render the portfolio category + sub-gallery pages FROM Sanity.
 *
 * Reads all `collection` docs and regenerates:
 *   landing/portfolio/<category>.html              (category index: project cards)
 *   landing/portfolio/<category>/<slug>.html       (gallery + lightbox)
 *
 * Images are served from the Sanity image CDN with `?auto=format` (AVIF/WebP
 * per browser) + `w=` resize — this IS the image optimization. width/height
 * attributes keep the ORIGINAL aspect ratio (no CLS); the delivered pixels
 * are resized/recompressed by the CDN.
 *
 * Matches the current (post-cleanup) markup exactly: nav, breadcrumb (›),
 * skip-link #gallery, footer, lightbox, portfolio.css?v / portfolio.js.
 *
 *   source /tmp/opencode/.sanity-env && node scripts/sanity/render.mjs
 * Read-only (only needs read access); safe to run anytime.
 */
import {writeFileSync, mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, resolve} from 'node:path'
import {createClient} from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..', '..')
const OUT = join(REPO, 'landing', 'portfolio')

const PROJECT = process.env.SANITY_PROJECT || 'aqmgwuqn'
const DATASET = process.env.SANITY_DATASET || 'production'
const CSS_VER = '20260622-cleanup'
const GALLERY_W = 1600   // gallery + lightbox image width
const COVER_W = 900      // category-card cover width

const CATEGORIES = {
  comercial: {title: 'Comercial', subtitle: 'Fotografía de producto, marca y arquitectura',
    description: 'Proyectos de fotografía comercial: empresarial, retratos corporativos, alimentos y productos.'},
  personal: {title: 'Personal', subtitle: 'Proyectos personales y documental',
    description: 'Series personales: documental social, retratos, lifestyle, paisaje urbano y film.'},
  eventos: {title: 'Eventos', subtitle: 'Bodas, infantiles y eventos sociales',
    description: 'Cobertura fotográfica de bodas, fiestas infantiles y eventos sociales.'},
}

const client = createClient({projectId: PROJECT, dataset: DATASET,
  token: process.env.SANITY_TOKEN, apiVersion: '2024-01-01', useCdn: false})

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// asset ref -> {hash, w, h}
function parseRef(ref) {
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/.exec(ref || '')
  if (!m) return null
  return {hash: m[1], w: +m[2], h: +m[3], ext: m[4]}
}
function cdn(ref, w) {
  const a = parseRef(ref)
  if (!a) return ''
  return `https://cdn.sanity.io/images/${PROJECT}/${DATASET}/${a.hash}-${a.w}x${a.h}.${a.ext}` +
    `?w=${w}&q=72&auto=format&fit=max`
}
function orient(w, h) {
  if (!w || !h) return 'landscape'
  const r = w / h
  return r > 1.1 ? 'landscape' : r < 0.9 ? 'portrait' : 'square'
}

const NAV = (active) => {
  const on = (k) => (active === k ? ' class="active" aria-current="page"' : '')
  return `
  <nav class="nav" id="nav">
    <a class="nav-logo" href="/portfolio/" aria-label="Nicolás Biondi — Inicio">
      <img src="/portfolio/img/logo.png" alt="Nicolás Biondi" width="120" height="28" />
    </a>
    <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">
      <span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
    </button>
    <ul class="nav-links" id="nav-links" role="list">
      <li><a href="/portfolio/"${on('portafolio')}>Portafolio</a></li>
      <li><a href="/portfolio/comercial.html"${on('comercial')}>Comercial</a></li>
      <li><a href="/portfolio/personal.html"${on('personal')}>Personal</a></li>
      <li><a href="/portfolio/eventos.html"${on('eventos')}>Eventos</a></li>
    </ul>
  </nav>`
}

const FOOTER = `
  <footer class="social-footer" role="contentinfo">
    <a href="https://www.facebook.com/nicolasbiondifoto" target="_blank" rel="noopener" aria-label="Facebook de Nicolás Biondi">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
    </a>
    <a href="https://www.instagram.com/nicolasbiondi" target="_blank" rel="noopener" aria-label="Instagram de Nicolás Biondi">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
    </a>
    <a href="https://www.linkedin.com/in/nicol%C3%A1s-biondi-97098210b/" target="_blank" rel="noopener" aria-label="LinkedIn de Nicolás Biondi">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
    </a>
  </footer>`

const LIGHTBOX = `
  <!-- LIGHTBOX v2 -->
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Galería ampliada">
    <div class="lb-bar">
      <span class="lb-counter" id="lb-counter" aria-live="polite" aria-atomic="true">01 / 01</span>
      <div style="display:flex; gap:0.5rem;">
        <button class="lb-zoom" id="lb-zoom" type="button" aria-label="Acercar foto">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <button class="lb-close" id="lb-close" type="button" aria-label="Cerrar galería">
          <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <button class="lb-prev" id="lb-prev" type="button" aria-label="Foto anterior">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <button class="lb-next" id="lb-next" type="button" aria-label="Foto siguiente">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div class="lb-img-wrap"><img id="lb-img" src="" alt="" /></div>
    <div class="lb-keyboard-hint" aria-hidden="true">
      <span><kbd>←</kbd> <kbd>→</kbd> Navegar</span>
      <span><kbd>Z</kbd> Zoom</span>
      <span><kbd>Esc</kbd> Cerrar</span>
    </div>
    <div class="lb-thumbs" id="lb-thumbs" role="tablist" aria-label="Miniaturas"></div>
  </div>`

function categoryPage(cat, cols) {
  const meta = CATEGORIES[cat]
  const cards = cols.map((c, i) => {
    const ref = (c.cover && c.cover.asset && c.cover.asset._ref) || (c.images[0] && c.images[0].asset._ref)
    const a = parseRef(ref) || {w: 1600, h: 1067}
    const fp = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'
    return `      <a class="project-card" href="/portfolio/${cat}/${c.slug}.html" aria-label="Ver ${esc(c.title)}">
        <span class="img-wrap"><img src="${cdn(ref, COVER_W)}" alt="${esc(c.title)}" width="${a.w}" height="${a.h}"${fp} /></span>
        <span class="project-card-label">${esc(c.title)}</span>
      </a>`
  }).join('\n')
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${meta.title} — Fotografía · Nicolás Biondi Fotógrafo</title>
  <meta name="description" content="${esc(meta.description)}" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="canonical" href="https://nicolasbiondi.com/portfolio/${cat}.html" />
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="stylesheet" href="portfolio.css?v=${CSS_VER}" />
</head>
<body>

  <a class="skip-link" href="#main">Ir al contenido</a>
${NAV(cat)}
  <header class="project-header">
    <nav class="project-breadcrumb" aria-label="Breadcrumb">
      <a href="/portfolio/">Portafolio</a>
      <span class="sep" aria-hidden="true">&rsaquo;</span>
      <span class="current">${meta.title}</span>
    </nav>
    <h1>${meta.title}</h1>
    <p>${esc(meta.subtitle)}</p>
  </header>

  <main class="projects-page" id="main">
    <div class="projects-grid">
${cards}
    </div>
  </main>
${FOOTER}
  <script src="portfolio.js?v=${CSS_VER}"></script>
</body>
</html>
`
}

function galleryPage(cat, c) {
  const meta = CATEGORIES[cat]
  const figs = c.images.map((im, i) => {
    const a = parseRef(im.asset._ref) || {w: 1600, h: 1067}
    const fp = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'
    const alt = im.alt ? esc(im.alt) : `${esc(c.title)} — foto ${i + 1}`
    return `    <figure class="gallery-item ${orient(a.w, a.h)}" data-index="${i}"><img src="${cdn(im.asset._ref, GALLERY_W)}" alt="${alt}" width="${a.w}" height="${a.h}"${fp} /></figure>`
  }).join('\n')
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(c.title)} — ${meta.title} · Nicolás Biondi Fotógrafo</title>
  <meta name="description" content="Proyecto fotográfico: ${esc(c.title)}. Galería completa de Nicolás Biondi." />
  <meta name="theme-color" content="#ffffff" />
  <link rel="canonical" href="https://nicolasbiondi.com/portfolio/${cat}/${c.slug}.html" />
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
  <link rel="stylesheet" href="/portfolio/portfolio.css?v=${CSS_VER}" />
</head>
<body>

  <a class="skip-link" href="#gallery">Ir al contenido</a>
${NAV(cat)}
  <header class="project-header">
    <nav class="project-breadcrumb" aria-label="Breadcrumb">
      <a href="/portfolio/">Portafolio</a>
      <span class="sep" aria-hidden="true">&rsaquo;</span>
      <a href="/portfolio/${cat}.html">${meta.title}</a>
      <span class="sep" aria-hidden="true">&rsaquo;</span>
      <span class="current">${esc(c.title)}</span>
    </nav>
    <h1>${esc(c.title)}</h1>
  </header>

  <main class="gallery sub-gallery" id="gallery" role="main" aria-label="Galería ${esc(c.title)}">
${figs}
  </main>
${LIGHTBOX}
${FOOTER}
  <script src="/portfolio/portfolio.js?v=${CSS_VER}"></script>
</body>
</html>
`
}

async function main() {
  const cols = await client.fetch(
    `*[_type=="collection" && category in ["comercial","personal","eventos"]]|order(category asc, order asc){
      title, "slug": slug.current, category,
      cover{asset}, images[]{alt, asset}
    }`
  )
  const byCat = {}
  for (const c of cols) (byCat[c.category] ||= []).push(c)

  let pages = 0
  for (const [cat, list] of Object.entries(byCat)) {
    writeFileSync(join(OUT, `${cat}.html`), categoryPage(cat, list))
    console.log(`  ✓ ${cat}.html (${list.length} colecciones)`)
    pages++
    mkdirSync(join(OUT, cat), {recursive: true})
    for (const c of list) {
      writeFileSync(join(OUT, cat, `${c.slug}.html`), galleryPage(cat, c))
      console.log(`    ✓ ${cat}/${c.slug}.html (${c.images.length} fotos)`)
      pages++
    }
  }
  console.log(`\n✅ ${pages} páginas generadas desde Sanity.`)
}
main()

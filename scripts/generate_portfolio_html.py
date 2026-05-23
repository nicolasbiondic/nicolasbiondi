#!/usr/bin/env python3
"""
Generate HTML pages from scraped manifest:
- 3 category index pages (comercial/personal/eventos) as collection-of-collections
- 12 sub-collection pages with photo galleries (lightbox-enabled)
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path("/home/xubuntu/nicolasbiondi/landing/portfolio")
MANIFEST = ROOT / "projects-manifest.json"
PROJECTS_DIR = ROOT / "projects"

CSS_VER = "20260523a"

# Category metadata
CATEGORIES = {
    "comercial": {
        "title": "Comercial",
        "subtitle": "Fotografía de producto, marca y arquitectura",
        "description": "Proyectos de fotografía comercial: empresarial, retratos corporativos, alimentos y productos.",
    },
    "personal": {
        "title": "Personal",
        "subtitle": "Proyectos personales y documental",
        "description": "Series personales: documental social, retratos, lifestyle, paisaje urbano y film.",
    },
    "eventos": {
        "title": "Eventos",
        "subtitle": "Bodas, infantiles y eventos sociales",
        "description": "Cobertura fotográfica de bodas, fiestas infantiles y eventos sociales.",
    },
}


def img_dim(path: Path) -> tuple:
    with Image.open(path) as im:
        return im.width, im.height


def orient_class(w: int, h: int) -> str:
    if w / h > 1.1:
        return "landscape"
    if w / h < 0.9:
        return "portrait"
    return "square"


def slugify(s: str) -> str:
    """Convert local folder name to URL slug."""
    return s.replace("/", "-").replace(" ", "-").lower()


# ─── Page templates ──────────────────────────────────────────────────────────

NAV = """
  <a class="skip-link" href="#main">Ir al contenido</a>

  <nav class="nav" id="nav">
    <a class="nav-logo" href="/portfolio/" aria-label="Nicolás Biondi — Inicio">
      <img src="/portfolio/img/logo.png" alt="Nicolás Biondi" width="120" height="28" />
    </a>
    <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">
      <span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
    </button>
    <ul class="nav-links" id="nav-links" role="list">
      <li><a href="/portfolio/">Portafolio</a></li>
      <li><a href="/portfolio/about.html">Acerca de mí</a></li>
      <li><a href="/portfolio/fotografia.html" class="active" aria-current="page">Fotografía</a></li>
      <li><a href="https://www.instagram.com/nicolasbiondi" target="_blank" rel="noopener">Instagram</a></li>
      <li><a href="/portfolio/contacto.html">Contacto</a></li>
    </ul>
  </nav>
"""

FOOTER = """
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
  </footer>
"""

LIGHTBOX = """
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
  </div>
"""


def render_category_page(category: str, collections: list) -> str:
    """Render the category index page (collection-of-collections)."""
    meta = CATEGORIES[category]
    title = meta["title"]
    cards_html = []
    for i, col in enumerate(collections):
        # Cover = first image
        cover = col["items"][0]
        cover_path = PROJECTS_DIR / col["folder"] / cover["local"]
        w, h = img_dim(cover_path)
        cover_src = f"projects/{col['folder']}/{cover['local']}"
        fetch_priority = ' fetchpriority="high"' if i == 0 else ''
        loading = '' if i == 0 else ' loading="lazy"'
        slug = slugify(col["folder"].split("/")[1])
        href = f"/portfolio/{category}/{slug}.html"
        cards_html.append(f'''      <a class="project-card" href="{href}" aria-label="Ver {col["title"]}">
        <span class="img-wrap"><img src="{cover_src}" alt="{col["title"]}" width="{w}" height="{h}"{fetch_priority}{loading} /></span>
        <span class="project-card-label">{col["title"]}</span>
      </a>''')
    cards_block = "\n".join(cards_html)
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>{title} — Fotografía · Nicolás Biondi Fotógrafo</title>
  <meta name="description" content="{meta['description']}" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="canonical" href="https://nicolasbiondi.com/portfolio/{category}.html" />
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="portfolio.css?v={CSS_VER}" />
</head>
<body>
{NAV}
  <header class="project-header">
    <nav class="project-breadcrumb" aria-label="Breadcrumb">
      <a href="/portfolio/fotografia.html">Fotografía</a>
      <span class="sep" aria-hidden="true">/</span>
      <span class="current">{title}</span>
    </nav>
    <h1>{title}</h1>
    <p>{meta['subtitle']}</p>
  </header>

  <main class="projects-page" id="main">
    <div class="projects-grid">
{cards_block}
    </div>
  </main>
{FOOTER}
  <script src="portfolio.js"></script>
</body>
</html>
"""


def render_subcollection_page(category: str, col: dict) -> str:
    """Render a sub-collection photo gallery page (with lightbox)."""
    folder = col["folder"]
    title = col["title"]
    slug = slugify(folder.split("/")[1])
    items_html = []
    for i, it in enumerate(col["items"]):
        local_path = PROJECTS_DIR / folder / it["local"]
        if not local_path.exists():
            continue
        w, h = img_dim(local_path)
        orient = orient_class(w, h)
        img_src = f"/portfolio/projects/{folder}/{it['local']}"
        fetch_priority = ' fetchpriority="high"' if i == 0 else ''
        loading = '' if i == 0 else ' loading="lazy"'
        items_html.append(
            f'    <figure class="gallery-item {orient}" data-index="{i}">'
            f'<img src="{img_src}" alt="{title} — foto {i+1}" width="{w}" height="{h}"{fetch_priority}{loading} /></figure>'
        )
    items_block = "\n".join(items_html)
    cat_meta = CATEGORIES[category]
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>{title} — {cat_meta['title']} · Nicolás Biondi Fotógrafo</title>
  <meta name="description" content="Proyecto fotográfico: {title}. Galería completa de Nicolás Biondi." />
  <meta name="theme-color" content="#ffffff" />
  <link rel="canonical" href="https://nicolasbiondi.com/portfolio/{category}/{slug}.html" />
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="/portfolio/portfolio.css?v={CSS_VER}" />
</head>
<body>
{NAV}
  <header class="project-header">
    <nav class="project-breadcrumb" aria-label="Breadcrumb">
      <a href="/portfolio/fotografia.html">Fotografía</a>
      <span class="sep" aria-hidden="true">/</span>
      <a href="/portfolio/{category}.html">{cat_meta['title']}</a>
      <span class="sep" aria-hidden="true">/</span>
      <span class="current">{title}</span>
    </nav>
    <h1>{title}</h1>
  </header>

  <main class="gallery sub-gallery" id="gallery" role="main" aria-label="Galería {title}">
{items_block}
  </main>
{LIGHTBOX}
{FOOTER}
  <script src="/portfolio/portfolio.js"></script>
</body>
</html>
"""


def main():
    manifest = json.loads(MANIFEST.read_text())
    by_cat: dict = {}
    for c in manifest["collections"]:
        by_cat.setdefault(c["category"], []).append(c)

    # Generate category index pages
    for cat, cols in by_cat.items():
        out = ROOT / f"{cat}.html"
        out.write_text(render_category_page(cat, cols))
        print(f"  ✓ {out.relative_to(ROOT)}")

    # Generate sub-collection pages — in /portfolio/{category}/{slug}.html
    for cat, cols in by_cat.items():
        cat_dir = ROOT / cat
        cat_dir.mkdir(exist_ok=True)
        for col in cols:
            slug = slugify(col["folder"].split("/")[1])
            out = cat_dir / f"{slug}.html"
            out.write_text(render_subcollection_page(cat, col))
            print(f"  ✓ {out.relative_to(ROOT)} ({len(col['items'])} fotos)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate landing/portfolio/instagram.html from instagram-manifest.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT     = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "landing" / "portfolio" / "instagram-manifest.json"
OUT      = ROOT / "landing" / "portfolio" / "instagram.html"
CSS_VER  = "20260522g"


def post_card(post: dict) -> str:
    is_vid = post.get("is_video") or post["type"] == "GraphVideo"
    badge_svg = (
        '<svg class="ig-card-badge" viewBox="0 0 24 24" aria-hidden="true">'
        '<polygon points="5,3 19,12 5,21"/></svg>'
        if is_vid else ""
    )
    label = "Reel" if is_vid else "Post"
    # Plain-text caption — strip newlines + truncate
    cap = " ".join((post.get("caption") or "").split())
    cap_short = (cap[:160] + "…") if len(cap) > 160 else cap
    aria = f"{label} de Instagram"
    if cap_short:
        aria += f": {cap_short[:80]}"
    return f'''      <a class="ig-card" href="{post["url"]}" target="_blank" rel="noopener" aria-label="{aria}">
        <span class="ig-card-thumb">
          <img src="{post["thumb_local"]}" alt="" width="{post["width"]}" height="{post["height"]}" loading="lazy" />
          {badge_svg}
        </span>
        <span class="ig-card-meta">
          <span class="ig-card-stats">
            <span class="ig-stat" aria-label="{post["likes"]} me gusta">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {post["likes"]}
            </span>
            <span class="ig-stat" aria-label="{post["comments"]} comentarios">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              {post["comments"]}
            </span>
          </span>
          <span class="ig-card-caption">{cap_short}</span>
        </span>
      </a>'''


def main() -> int:
    if not MANIFEST.exists():
        print(f"✗ Manifest not found: {MANIFEST}", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST.read_text())
    profile  = manifest["profile"]
    posts    = manifest["posts"]
    ig_url   = f'https://www.instagram.com/{profile["username"]}/'

    cards = "\n".join(post_card(p) for p in posts)
    bio_html = (profile["biography"] or "").replace("\n", "<br>")

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Instagram — @{profile["username"]} · Nicolás Biondi Fotógrafo</title>
  <meta name="description" content="Posts recientes de @{profile["username"]} en Instagram." />
  <meta name="theme-color" content="#ffffff" />
  <link rel="canonical" href="https://nicolasbiondi.com/portfolio/instagram.html" />
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="portfolio.css?v={CSS_VER}" />
</head>
<body>

  <a class="skip-link" href="#main">Ir al contenido</a>

  <nav class="nav" id="nav">
    <a class="nav-logo" href="/portfolio/" aria-label="Nicolás Biondi — Inicio">
      <img src="img/logo.png" alt="Nicolás Biondi" width="120" height="28" />
    </a>
    <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">
      <span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
    </button>
    <ul class="nav-links" id="nav-links" role="list">
      <li><a href="/portfolio/">Portafolio</a></li>
      <li><a href="/portfolio/about.html">Acerca de mí</a></li>
      <li><a href="/portfolio/proyectos.html">Proyectos</a></li>
      <li><a href="/portfolio/instagram.html" class="active" aria-current="page">Instagram</a></li>
      <li><a href="/portfolio/contacto.html">Contacto</a></li>
    </ul>
  </nav>

  <main class="ig-page" id="main">
    <header class="ig-header">
      <a class="ig-avatar" href="{ig_url}" target="_blank" rel="noopener" aria-label="Abrir perfil en Instagram">
        <img src="{profile["profile_pic_local"]}" alt="" width="120" height="120" />
      </a>
      <div class="ig-handle">
        <h1>@{profile["username"]}</h1>
        <p class="ig-bio">{bio_html}</p>
        <p class="ig-stats">
          <strong>{profile["post_count"]}</strong> publicaciones &nbsp;·&nbsp;
          <strong>{profile["followers"]}</strong> seguidores &nbsp;·&nbsp;
          <strong>{profile["following"]}</strong> seguidos
        </p>
        <a class="ig-follow" href="{ig_url}" target="_blank" rel="noopener">
          Seguir en Instagram
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>
        </a>
      </div>
    </header>

    <section class="ig-grid" aria-label="Publicaciones recientes">
{cards}
    </section>

    <p class="ig-footer-note">
      Actualizado {manifest["scraped_at"][:10]} · Mostrando {len(posts)} publicaciones más recientes
    </p>
  </main>

  <footer class="social-footer" role="contentinfo">
    <a href="https://www.facebook.com/nicolasbiondifoto" target="_blank" rel="noopener" aria-label="Facebook de Nicolás Biondi">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
    </a>
    <a href="{ig_url}" target="_blank" rel="noopener" aria-label="Instagram de Nicolás Biondi">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
    </a>
    <a href="https://www.linkedin.com/in/nicol%C3%A1s-biondi-97098210b/" target="_blank" rel="noopener" aria-label="LinkedIn de Nicolás Biondi">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
    </a>
  </footer>

  <script src="portfolio.js"></script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"✓ Wrote {OUT.relative_to(ROOT)} ({len(posts)} posts)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

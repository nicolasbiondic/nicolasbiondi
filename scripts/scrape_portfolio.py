#!/usr/bin/env python3
"""
Scrape all sub-collections from nicolasbiondi.portfoliobox.net.
Extract image lists from embedded JSON, download to local dir, output manifest.
"""
import json
import re
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

BASE = "https://nicolasbiondi.portfoliobox.net"
# CloudFront subdomain per S3LocationId — discovered from real page URLs
CDN_MAP = {
    0: "https://dvqlxo2m2q99q.cloudfront.net/000_clients/181353/page/",
    2: "https://dkemhji6i1k0x.cloudfront.net/000_clients/181353/page/",
    6: "https://dglb26w8rx2ld.cloudfront.net/000_clients/181353/page/",
}
OUT  = Path("/home/xubuntu/nicolasbiondi/landing/portfolio/projects")

# (uri, local_folder, title, category)
COLLECTIONS = [
    # Comercial — 4 sub
    ("comercialempresarial",  "comercial/empresarial",            "Comercial / Empresarial",       "comercial"),
    ("retratosempresariales", "comercial/retratos-empresariales", "Retratos empresariales",        "comercial"),
    ("portafolio-comida",     "comercial/alimentos",              "Alimentos",                     "comercial"),
    ("productos",             "comercial/productos",              "Productos",                     "comercial"),
    # Personal — 5 sub
    ("documental-cementerio-de-nueva-esperanza",
                              "personal/documental-nueva-esperanza", "Documental: Cementerio de Nueva Esperanza", "personal"),
    ("retratos-nueva-esperanza", "personal/retratos-nueva-esperanza", "Retratos: Nueva Esperanza", "personal"),
    ("lifestyle",             "personal/lifestyle",               "Lifestyle",                     "personal"),
    ("lima",                  "personal/lima",                    "Lima",                          "personal"),
    ("film",                  "personal/film",                    "Film",                          "personal"),
    # Eventos — 3 sub
    ("infantiles",            "eventos/infantiles",               "Infantiles",                    "eventos"),
    ("matrimonios",           "eventos/matrimonios",              "Matrimonios",                   "eventos"),
    ("m",                     "eventos/magico-engano-2017",       "Mágico Engaño 2017",            "eventos"),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="ignore")


def parse_gallery(html: str):
    """Extract GalleryItems list from inline JS pageJson."""
    # The pageJson is inside `pageJson : {...}` — find it
    m = re.search(r"pageJson\s*:\s*(\{.*?\}),\s*menuJson", html, re.DOTALL)
    if not m:
        return []
    page_json_text = m.group(1)
    # The text contains nested braces; we need to balance them properly
    # Start at the first { and count
    start = html.find("pageJson : {")
    if start < 0:
        return []
    start = html.index("{", start)
    depth = 0
    i = start
    in_str = False
    esc = False
    while i < len(html):
        c = html[i]
        if esc:
            esc = False
        elif c == "\\":
            esc = True
        elif c == '"':
            in_str = not in_str
        elif not in_str:
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        i += 1
    else:
        return []
    raw = html[start:end]
    try:
        page = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ✗ JSON parse error: {e}", file=sys.stderr)
        return []
    items = page.get("GalleryItems", [])
    # Each item has FileName, Width, Height, Idx, S3LocationId
    return [
        {
            "file": it["FileName"],
            "w": it["Width"],
            "h": it["Height"],
            "idx": it["Idx"],
            "s3": it.get("S3LocationId", 6),
        }
        for it in sorted(items, key=lambda x: x["Idx"])
    ]


def dl_image(url: str, dst: Path, fallback_urls=None):
    if dst.exists() and dst.stat().st_size > 0:
        return "cached"
    dst.parent.mkdir(parents=True, exist_ok=True)
    candidates = [url] + (fallback_urls or [])
    last_err = "unknown"
    for u in candidates:
        req = urllib.request.Request(u, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            dst.write_bytes(data)
            return "downloaded"
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}"
        except urllib.error.URLError as e:
            last_err = f"URLError {e.reason}"
    return last_err


def process_collection(uri: str, folder: str, title: str, category: str):
    print(f"  → {title}")
    html = fetch(f"{BASE}/{uri}")
    items = parse_gallery(html)
    if not items:
        print(f"    ✗ no items found for {uri}")
        return (uri, folder, title, category, [])
    local_dir = OUT / folder
    local_dir.mkdir(parents=True, exist_ok=True)
    # Download images — try declared S3LocationId first, then fall back to other CDNs
    saved = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {}
        for it in items:
            idx2 = f"{it['idx']+1:02d}"
            local_name = f"{idx2}.jpg"
            primary_cdn = CDN_MAP.get(it["s3"], CDN_MAP[6])
            primary_url = primary_cdn + it["file"]
            fallbacks = [cdn + it["file"] for sid, cdn in CDN_MAP.items() if sid != it["s3"]]
            dst = local_dir / local_name
            futures[pool.submit(dl_image, primary_url, dst, fallbacks)] = (local_name, it)
        for fut in as_completed(futures):
            local_name, meta = futures[fut]
            status = fut.result()
            saved.append({**meta, "local": local_name, "status": status})
    saved.sort(key=lambda x: x["idx"])
    print(f"    ✓ {len(saved)} images, {sum(1 for s in saved if s['status']=='downloaded')} new")
    return (uri, folder, title, category, saved)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"collections": []}
    print(f"Scraping {len(COLLECTIONS)} sub-collections...")
    for col in COLLECTIONS:
        result = process_collection(*col)
        uri, folder, title, category, items = result
        manifest["collections"].append({
            "uri": uri,
            "folder": folder,
            "title": title,
            "category": category,
            "items": items,
        })
    # Save manifest
    manifest_path = OUT.parent / "projects-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"\n✓ Manifest saved to {manifest_path}")
    print(f"✓ Images saved to {OUT}")
    # Summary
    total = sum(len(c["items"]) for c in manifest["collections"])
    print(f"\nTotal images: {total}")
    for c in manifest["collections"]:
        print(f"  [{c['category']}] {c['title']}: {len(c['items'])} fotos → {c['folder']}/")


if __name__ == "__main__":
    main()

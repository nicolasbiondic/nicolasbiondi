#!/usr/bin/env python3
"""Optimize all project images: resize to max 1800px longest side, quality 82."""
from pathlib import Path
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor

ROOT = Path("/home/xubuntu/nicolasbiondi/landing/portfolio/projects")
MAX_SIDE = 1800
QUALITY = 82

def process(p: Path):
    try:
        im = Image.open(p)
        ImageOps.exif_transpose(im)  # rotate if EXIF says so
        orig_w, orig_h = im.size
        scale = max(orig_w, orig_h) / MAX_SIDE
        if scale > 1.0:
            new_w = round(orig_w / scale)
            new_h = round(orig_h / scale)
            im = im.resize((new_w, new_h), Image.LANCZOS)
        # Convert to RGB (drop alpha if any)
        if im.mode in ("RGBA", "P", "LA"):
            im = im.convert("RGB")
        before = p.stat().st_size
        im.save(p, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        after = p.stat().st_size
        return (str(p.name), before, after, im.size)
    except Exception as e:
        return (str(p.name), 0, 0, str(e))


def main():
    images = list(ROOT.rglob("*.jpg"))
    print(f"Optimizing {len(images)} images...")
    saved_total = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, res in enumerate(pool.map(process, images)):
            name, before, after, size = res
            saved_total += (before - after)
            if i % 30 == 0:
                print(f"  [{i+1}/{len(images)}] {name}: {before//1024}KB → {after//1024}KB ({size})")
    print(f"\n✓ Total saved: {saved_total // 1024 // 1024} MB")


if __name__ == "__main__":
    main()

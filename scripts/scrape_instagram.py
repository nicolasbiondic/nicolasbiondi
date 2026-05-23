#!/usr/bin/env python3
"""
Scrape public Instagram profile via the official Web API endpoint
(`/api/v1/users/web_profile_info/`) used by instagram.com itself.

No authentication required. Pulls the latest posts (limit: ~12 returned by the
endpoint), downloads thumbnails to landing/portfolio/img/instagram/, and writes
a manifest (instagram-manifest.json) that the HTML generator consumes.

Usage:
    python3 scripts/scrape_instagram.py [username]

Env:
    IG_USERNAME — override target username (default: nicolasbiondi)
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ─── Config ──────────────────────────────────────────────────────────────────

ROOT     = Path(__file__).resolve().parent.parent
IMG_DIR  = ROOT / "landing" / "portfolio" / "img" / "instagram"
MANIFEST = ROOT / "landing" / "portfolio" / "instagram-manifest.json"
USERNAME = os.environ.get("IG_USERNAME") or (sys.argv[1] if len(sys.argv) > 1 else "nicolasbiondi")

# Instagram's public Web App ID (visible in any browser request to IG)
IG_APP_ID = "936619743392459"
API_URL   = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={USERNAME}"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/16.0 Safari/605.1.15")


# ─── HTTP helpers ────────────────────────────────────────────────────────────

def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "x-ig-app-id": IG_APP_ID,
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url: str, dst: Path) -> str:
    if dst.exists() and dst.stat().st_size > 0:
        return "cached"
    dst.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            dst.write_bytes(r.read())
        return "downloaded"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"
    except Exception as e:
        return f"err {type(e).__name__}"


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> int:
    # Optional: pre-supplied JSON path (useful if IP is rate-limited)
    cache_path = os.environ.get("IG_JSON_CACHE")

    print(f"Fetching Instagram profile: @{USERNAME}")
    if cache_path and Path(cache_path).exists():
        print(f"  → Using cached JSON: {cache_path}")
        data = json.loads(Path(cache_path).read_text())
    else:
        try:
            data = fetch_json(API_URL)
        except urllib.error.HTTPError as e:
            print(f"  ✗ HTTP {e.code}: {e.reason}", file=sys.stderr)
            if e.code == 429:
                print("  ↪ Tip: set IG_JSON_CACHE=/path/to/ig.json to bypass "
                      "(scrape it manually via headless browser).",
                      file=sys.stderr)
            return 1

    user = data.get("data", {}).get("user")
    if not user:
        print(f"  ✗ Profile not found or empty response", file=sys.stderr)
        return 1

    profile = {
        "username":      user["username"],
        "full_name":     user["full_name"],
        "biography":     user["biography"],
        "external_url":  user.get("external_url"),
        "followers":     user["edge_followed_by"]["count"],
        "following":     user["edge_follow"]["count"],
        "post_count":    user["edge_owner_to_timeline_media"]["count"],
        "is_verified":   user["is_verified"],
        "profile_pic":   user["profile_pic_url_hd"],
    }
    print(f"  ✓ @{profile['username']} — {profile['post_count']} posts, "
          f"{profile['followers']} followers")

    # Download profile pic
    pp_path = IMG_DIR / "profile.jpg"
    download(profile["profile_pic"], pp_path)
    profile["profile_pic_local"] = "img/instagram/profile.jpg"

    # Posts
    edges = user["edge_owner_to_timeline_media"]["edges"]
    print(f"  → {len(edges)} posts in response, downloading thumbnails…")

    posts = []
    dl_jobs = []
    for i, e in enumerate(edges):
        node      = e["node"]
        shortcode = node["shortcode"]
        kind      = node["__typename"]  # GraphImage | GraphVideo | GraphSidecar
        caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
        caption   = caption_edges[0]["node"]["text"] if caption_edges else ""
        thumb_url = node["display_url"]
        thumb_name = f"{i+1:02d}_{shortcode}.jpg"
        thumb_path = IMG_DIR / thumb_name
        dl_jobs.append((thumb_url, thumb_path))

        posts.append({
            "idx":       i,
            "shortcode": shortcode,
            "type":      kind,
            "url":       f"https://www.instagram.com/p/{shortcode}/",
            "caption":   caption,
            "likes":     node["edge_liked_by"]["count"],
            "comments":  node["edge_media_to_comment"]["count"],
            "width":     node["dimensions"]["width"],
            "height":    node["dimensions"]["height"],
            "is_video":  node.get("is_video", False),
            "video_url": node.get("video_url"),
            "thumb_local": f"img/instagram/{thumb_name}",
            "taken_at_ts": node.get("taken_at_timestamp"),
        })

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda j: download(*j), dl_jobs))
    new_count = sum(1 for r in results if r == "downloaded")
    print(f"  ✓ {new_count} new, {len(results) - new_count} cached/skipped")

    import datetime as _dt
    manifest = {
        "profile": profile,
        "posts":   posts,
        "scraped_at": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"  ✓ Manifest written to {MANIFEST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

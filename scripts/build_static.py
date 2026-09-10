#!/usr/bin/env python3
"""
Static site generator for 5 Ideas Daily Showcase.
Extracts all public pages into a static bundle suitable for GitHub Pages / static hosting.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from starlette.testclient import TestClient

import db
from app import app


BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
STATIC_DIR = BASE_DIR / "static"


def rewrite_html_links(html: str, base_path: str) -> str:
    """Adjusts root-relative links to respect the target base path (e.g. /5-ideas/)."""
    if base_path == "/":
        return html

    # Normalize base path to end with /
    if not base_path.endswith("/"):
        base_path += "/"

    # Replace root links
    replacements = [
        ('href="/"', f'href="{base_path}"'),
        ('href="/calendar"', f'href="{base_path}calendar/"'),
        ('href="/stream"', f'href="{base_path}stream/"'),
        ('href="/design-system"', f'href="{base_path}design-system/"'),
        ('href="/interactive/neondj"', f'href="{base_path}interactive/neondj/"'),
        ('href="/day/', f'href="{base_path}day/'),
        ('href="/static/', f'href="{base_path}static/'),
        ('src="/static/', f'src="{base_path}static/'),
        ('url(/static/', f'url({base_path}static/'),
    ]
    for old, new in replacements:
        html = html.replace(old, new)
    return html


def build_static(base_path: str = "/5-ideas/"):
    os.environ["HOSTED_STATIC"] = "1"

    # Ensure database has demo content
    db.init_db()
    if not db.get_all_days():
        db.seed_demo_data()

    client = TestClient(app)

    # Clean and re-create dist/
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    # Copy static assets
    dist_static = DIST_DIR / "static"
    shutil.copytree(STATIC_DIR, dist_static)

    # Static routes
    routes = [
        ("/", DIST_DIR / "index.html"),
        ("/calendar", DIST_DIR / "calendar" / "index.html"),
        ("/stream", DIST_DIR / "stream" / "index.html"),
        ("/design-system", DIST_DIR / "design-system" / "index.html"),
    ]

    # Dynamic day routes
    days = db.get_all_days()
    all_dates = [d["date"] for d in days]
    for d in days:
        date_str = d["date"]
        routes.append((f"/day/{date_str}", DIST_DIR / "day" / date_str / "index.html"))

    print(f"📦 Freezing {len(routes)} routes to {DIST_DIR} (base_path='{base_path}')...")

    for route_path, out_file in routes:
        resp = client.get(route_path)
        if resp.status_code != 200:
            print(f"⚠️ Failed route {route_path}: HTTP {resp.status_code}")
            continue

        out_file.parent.mkdir(parents=True, exist_ok=True)
        html = rewrite_html_links(resp.text, base_path)
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  ✓ {route_path} -> {out_file.relative_to(BASE_DIR)}")

    # Copy static streak.json and dates.json into dist
    streak_src = BASE_DIR / "streak.json"
    if streak_src.exists():
        shutil.copyfile(streak_src, DIST_DIR / "streak.json")

    import json
    with open(DIST_DIR / "dates.json", "w", encoding="utf-8") as f:
        json.dump(all_dates, f, indent=2)

    # GitHub Pages needs .nojekyll
    (DIST_DIR / ".nojekyll").touch()

    # Also create a custom 404 page pointing to index
    if (DIST_DIR / "index.html").exists():
        shutil.copyfile(DIST_DIR / "index.html", DIST_DIR / "404.html")

    print(f"🎉 Build complete! {len(routes)} pages frozen in {DIST_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Freeze site to static HTML bundle")
    parser.add_argument("--base-path", default="/5-ideas/", help="Base path for URL prefixing (default: /5-ideas/)")
    args = parser.parse_args()
    build_static(base_path=args.base_path)

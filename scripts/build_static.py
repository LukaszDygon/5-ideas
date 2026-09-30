#!/usr/bin/env python3
"""Freeze the site into dist/ for GitHub Pages (wrapper around showcase.static_site)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from showcase.static_site import DIST_DIR, build_static  # noqa: E402

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Freeze site to static HTML bundle")
    parser.add_argument("--base-path", default="/5-ideas/", help="Base path for URL prefixing (default: /5-ideas/)")
    parser.add_argument("--out", type=Path, default=DIST_DIR, help="Output directory (default: dist/)")
    args = parser.parse_args()
    build_static(out=args.out, base_path=args.base_path, log=print)

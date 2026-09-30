"""Freeze the site into static HTML for GitHub Pages.

Pages: the core site pages, every registry prototype page, and one /day/<date> page per day.
"""

from __future__ import annotations

import json
import re
import shutil
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path

from starlette.testclient import TestClient

from showcase import db, registry
from showcase.config import DIST_DIR, STATIC_DIR, Settings
from showcase.pages import CORE_PAGES
from showcase.web import create_app

# Root-relative URLs in attributes, CSS url(), and JS string literals pointing at /static/.
_ATTR_RE = re.compile(r"""(?P<lead>\b(?:href|src|action|poster)=(?P<q>["']))/(?!/)(?P<path>[^"']*)""")
_CSS_RE = re.compile(r"""(?P<lead>url\(\s*["']?)/(?!/)(?P<path>[^)"']*)""")
_JS_STATIC_RE = re.compile(r"""(?P<lead>["'`])/static/""")


def _page_path(path: str) -> str:
    """Page links get a trailing slash so they hit <dir>/index.html without a redirect."""
    cut = min((i for i in (path.find("?"), path.find("#")) if i >= 0), default=len(path))
    bare, tail = path[:cut], path[cut:]
    if bare and not bare.endswith("/") and "." not in bare.rsplit("/", 1)[-1]:
        bare += "/"
    return bare + tail


def rewrite_html_links(html: str, base_path: str) -> str:
    """Prefix root-relative URLs with the deployment base path (e.g. /5-ideas/)."""
    if base_path in ("", "/"):
        return html
    base = "/" + base_path.strip("/") + "/"
    prefix = base.lstrip("/")

    def attr(m: re.Match) -> str:
        path = m.group("path")
        if path.startswith(prefix):
            return m.group(0)
        if m.group("lead").startswith("href"):
            path = _page_path(path)
        return f"{m.group('lead')}{base}{path}"

    def css(m: re.Match) -> str:
        path = m.group("path")
        return m.group(0) if path.startswith(prefix) else f"{m.group('lead')}{base}{path}"

    html = _ATTR_RE.sub(attr, html)
    html = _CSS_RE.sub(css, html)
    return _JS_STATIC_RE.sub(lambda m: f"{m.group('lead')}{base}static/", html)


def rewrite_asset_links(text: str, base_path: str) -> str:
    """Same prefixing for extracted JS/CSS files: '/static/...' string literals and CSS url(/...)."""
    if base_path in ("", "/"):
        return text
    base = "/" + base_path.strip("/") + "/"
    prefix = base.lstrip("/")
    text = _CSS_RE.sub(
        lambda m: (
            m.group(0) if m.group("path").startswith(prefix) else f"{m.group('lead')}{base}{m.group('path')}"
        ),
        text,
    )
    return _JS_STATIC_RE.sub(lambda m: f"{m.group('lead')}{base}static/", text)


def page_routes(prototypes: list[registry.Prototype], days: list[dict]) -> list[str]:
    """Core pages, then every prototype page, then one page per day."""
    routes = list(CORE_PAGES) + [url for proto in prototypes for url, _ in proto.pages()]
    return routes + [f"/day/{d['date']}" for d in days]


def output_file(out: Path, route: str) -> Path:
    return out.joinpath(*route.strip("/").split("/"), "index.html") if route != "/" else out / "index.html"


def build_static(
    out: Path = DIST_DIR,
    base_path: str = "/5-ideas/",
    settings: Settings | None = None,
    log: Callable[[str], None] = lambda _msg: None,
) -> list[str]:
    """Writes the static site into `out` (replacing it) and returns the frozen routes."""
    settings = settings or Settings.from_env()
    out = Path(out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    shutil.copytree(STATIC_DIR, out / "static")
    prototypes = registry.discover(settings.prototypes_dir)
    for proto in prototypes:
        if proto.static_dir.is_dir():
            shutil.copytree(proto.static_dir, out / "static" / "prototypes" / proto.slug)
    for asset in (out / "static").rglob("*"):
        if asset.suffix in (".js", ".css"):
            asset.write_text(
                rewrite_asset_links(asset.read_text(encoding="utf-8"), base_path), encoding="utf-8"
            )

    failures: list[str] = []
    with TestClient(create_app(replace(settings, hosted=True))) as client:
        days = db.get_all_days(settings.db_file)
        routes = page_routes(prototypes, days)
        log(f"Freezing {len(routes)} routes to {out} (base_path={base_path!r})")
        for route in routes:
            resp = client.get(route)
            if resp.status_code != 200:
                failures.append(f"{route}: HTTP {resp.status_code}")
                continue
            target = output_file(out, route)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(rewrite_html_links(resp.text, base_path), encoding="utf-8")
            log(f"  {route} -> {target.relative_to(out)}")
    if failures:
        raise RuntimeError("static build failed for: " + ", ".join(failures))

    if settings.streak_file.exists():
        shutil.copyfile(settings.streak_file, out / "streak.json")
    (out / "dates.json").write_text(json.dumps([d["date"] for d in days], indent=2), encoding="utf-8")
    (out / ".nojekyll").touch()  # GitHub Pages: serve files as-is
    shutil.copyfile(out / "index.html", out / "404.html")
    log(f"Build complete: {len(routes)} pages in {out}")
    return routes
